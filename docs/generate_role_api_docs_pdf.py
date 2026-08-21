#!/usr/bin/env python3
"""Split docs/SmartTrack-API.postman_collection.json into three role-scoped
PDF references (Student/Parent, School Admin, Driver) using the same
rendering as generate_api_docs_pdf.py.

Each request in the master collection is assigned to exactly one of the
three roles below via ROLE_ASSIGNMENTS (keyed by folder name -> request
name -> role). Requests not listed there (the Super Admin login, and the
few negative-test requests such as "expect 403"/"expect 404"/"spoofed ...
should be ignored") are intentionally left out of all three role docs --
they aren't part of a school-admin/driver/parent's real API surface, and
still live in the full SmartTrack_API_Documentation.pdf.
"""

import json
import os
import re

from _pdf_common import build_pdf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COLLECTION_PATH = os.path.join(BASE_DIR, "SmartTrack-API.postman_collection.json")

ROLE_ASSIGNMENTS = {
    "1. Auth": {
        "Login - School Admin": "school_admin",
        "Login - Driver": "driver",
        "Login - Guest Driver": "driver",
        "Login - Parent": "parent",
        "Get Me (driver)": "driver",
        "Update FCM Token (driver) [NEW]": "driver",
        "Forgot Password (parent)": "parent",
        "Verify OTP (parent)": "parent",
        "Reset Password (parent)": "parent",
        "Change Password (driver)": "driver",
        "Logout (driver)": "driver",
    },
    "2. Lookups (capture IDs)": {
        "List Students (school_admin)": "school_admin",
        "List Drivers (school_admin)": "school_admin",
        "List Buses (school_admin)": "school_admin",
        "List Routes (school_admin)": "school_admin",
    },
    "3. QR [NEW]": {
        "Resolve Student QR (driver)": "driver",
        "Resolve Bus QR (school_admin)": "school_admin",
        "Resolve Route QR (school_admin)": "school_admin",
    },
    "4. Trips": {
        "Create Trip (school_admin)": "school_admin",
        "List Trips (driver - scoped to own trips)": "driver",
        "Update Trip Status (driver - own trip)": "driver",
    },
    "5. Attendance": {
        "Mark Attendance (driver)": "driver",
        "Scan Attendance (driver) [NEW]": "driver",
        "Bulk Mark Attendance (school_admin)": "school_admin",
        "List Attendance (driver - own trips only)": "driver",
        "List Attendance (parent - own children only)": "parent",
    },
    "6. Leave": {
        "Create Leave Request (parent)": "parent",
        "List Leave (parent - own children only)": "parent",
        "Approve Leave (school_admin)": "school_admin",
    },
    "7. Lost & Found": {
        "Report Lost Item (driver)": "driver",
        "List Lost Items (parent)": "parent",
        "Claim Lost Item (parent)": "parent",
    },
    "8. Guest Trips": {
        "Create Guest Trip (guest_driver)": "driver",
        "List My Guest Trips (guest_driver)": "driver",
        "Approve Guest Trip (school_admin)": "school_admin",
    },
    "9. Notifications": {
        "List Notifications (parent)": "parent",
        "Unread Count (parent)": "parent",
        "Send Notification (school_admin -> parent) [triggers push stub]": "school_admin",
        "Mark All Read (parent)": "parent",
    },
    "10. Tickets": {
        "Create Ticket (guest_driver)": "driver",
        "List My Tickets (guest_driver) [NEW - mine=true]": "driver",
        "Reply to Ticket (school_admin)": "school_admin",
    },
}

ROLES = [
    {
        "key": "parent",
        "label": "Student / Parent",
        "pdf": "SmartTrack_API_Documentation_StudentParent.pdf",
        "description": (
            "Parent-facing slice of the SmartTrack API: everything a parent/guardian "
            "mobile or web client needs to log in, track their child's trips and "
            "attendance, request leave, and manage lost & found and notifications.\n\n"
            "How to use:\n"
            "1. Run \"Login - Parent\" first -- it saves `parent_token` as a collection "
            "variable that every other request in this doc authenticates with.\n"
            "2. `student_id`, `trip_id`, `attendance_id`, `leave_id` and similar ids are "
            "captured automatically as you exercise the flows (or ask a school_admin to "
            "share them from the Lookups folder in the full collection).\n\n"
            "Seeded demo account (see backend/src/db/seed.js): parent@smarttrack.ae."
        ),
    },
    {
        "key": "school_admin",
        "label": "School Admin",
        "pdf": "SmartTrack_API_Documentation_SchoolAdmin.pdf",
        "description": (
            "School-admin slice of the SmartTrack API: the CRUD/lookup and approval "
            "endpoints a school's admin console uses to manage students, drivers, "
            "buses, routes, trips, leave requests, guest-trip approvals, notifications "
            "and support tickets.\n\n"
            "How to use:\n"
            "1. Run \"Login - School Admin\" first -- it saves `school_admin_token` as a "
            "collection variable that every other request in this doc authenticates with.\n"
            "2. Run the Lookups folder to pull real ids (students, drivers, buses, "
            "routes) into collection variables for use in the rest of the requests.\n\n"
            "Seeded demo account (see backend/src/db/seed.js): admin@greenfield.ae."
        ),
    },
    {
        "key": "driver",
        "label": "Driver",
        "pdf": "SmartTrack_API_Documentation_Driver.pdf",
        "description": (
            "Driver-facing slice of the SmartTrack API, covering both regular drivers "
            "and guest drivers: login, trip status updates, attendance marking/QR scan, "
            "lost & found reporting, and the guest-driver-only guest-trip and ticket "
            "endpoints.\n\n"
            "How to use:\n"
            "1. Run \"Login - Driver\" (or \"Login - Guest Driver\" for the guest-trip / "
            "ticket endpoints) first -- it saves the matching `driver_token` / "
            "`guest_driver_token` collection variable used to authenticate the rest of "
            "the requests in this doc.\n"
            "2. `trip_id`, `student_id`, `student_qr_code` etc. are captured "
            "automatically as you exercise the flows.\n\n"
            "Seeded demo accounts (see backend/src/db/seed.js): driver@smarttrack.ae, "
            "guest@smarttrack.ae."
        ),
    },
]

VAR_REF_RE = re.compile(r"\{\{(\w+)\}\}")


def collect_used_vars(items):
    used = set()

    def walk(nodes):
        for node in nodes:
            if "item" in node:
                walk(node["item"])
            else:
                used.update(VAR_REF_RE.findall(json.dumps(node)))

    walk(items)
    return used


def filter_collection_for_role(collection, role_key, role_label):
    filtered_folders = []
    for folder in collection.get("item", []):
        folder_name = folder.get("name", "")
        allowed_names = ROLE_ASSIGNMENTS.get(folder_name, {})
        kept = [
            item
            for item in folder.get("item", [])
            if allowed_names.get(item.get("name")) == role_key
        ]
        if kept:
            filtered_folders.append({**folder, "item": kept})

    used_vars = collect_used_vars(filtered_folders)
    filtered_vars = [
        v
        for v in collection.get("variable", [])
        if v.get("key") == "baseUrl" or v.get("key") in used_vars
    ]

    info = dict(collection.get("info", {}))
    info["name"] = f"SmartTrack API - {role_label}"

    return {"info": info, "variable": filtered_vars, "item": filtered_folders}


def main():
    with open(COLLECTION_PATH, "r", encoding="utf-8") as f:
        collection = json.load(f)

    for role in ROLES:
        filtered = filter_collection_for_role(collection, role["key"], role["label"])
        request_count = sum(len(f["item"]) for f in filtered["item"])
        pdf_path = os.path.join(BASE_DIR, role["pdf"])
        build_pdf(
            filtered,
            pdf_path,
            footer_title=f"SmartTrack API Documentation - {role['label']}",
            description_override=role["description"],
        )
        print(f"PDF generated: {pdf_path} ({request_count} requests)")


if __name__ == "__main__":
    main()
