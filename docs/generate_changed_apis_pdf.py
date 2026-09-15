#!/usr/bin/env python3
"""Builds short PDFs covering ONLY the API endpoints that changed as part of
the bus/route/driver decoupling + leave auto-approval work, one per role
(Driver, Student/Parent, School Admin) -- unlike generate_role_api_docs_pdf.py,
which documents each role's entire API surface, this is a changes-only
companion.

Pulls the actual request/response definitions from the same master
collection (SmartTrack-API.postman_collection.json) so the two stay in sync;
only the item selection and intro copy differ.
"""

import json
import os
import re

from _pdf_common import build_pdf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COLLECTION_PATH = os.path.join(BASE_DIR, "SmartTrack-API.postman_collection.json")

VAR_REF_RE = re.compile(r"\{\{(\w+)\}\}")


def collect_used_vars(folders):
    used = set()
    for folder in folders:
        used.update(VAR_REF_RE.findall(json.dumps(folder)))
    return used

# folder name -> item names to include, per output PDF. Only endpoints whose
# request/response shape or behavior actually changed -- not the full role
# surface (see generate_role_api_docs_pdf.py for that).
CHANGE_SETS = [
    {
        "key": "driver",
        "label": "Driver",
        "pdf": "SmartTrack_API_Changes_Driver.pdf",
        "items": {
            "2. Lookups (capture IDs)": ["List Drivers (school_admin)", "List Buses (school_admin)", "List Routes (school_admin)"],
            "3. QR [NEW]": ["Resolve Bus QR (school_admin)", "Resolve Route QR (school_admin)"],
            "4. Trips": ["Take Over Trip after Breakdown (driver) [NEW]"],
            "7. Lost & Found": ["Report Lost Item (driver)"],
        },
        "description": (
            "Changed-APIs-only reference for the driver app -- covers just the endpoints "
            "affected by decoupling buses, routes and drivers into independent entities "
            "(a bus/driver/route are now only ever linked together via a live trip). For "
            "the full driver API surface, see SmartTrack_API_Documentation_Driver.pdf "
            "instead; this doc is a focused diff.\n\n"
            "Summary of what changed:\n"
            "- Buses and drivers no longer reference each other. Wherever you fetch a "
            "driver or bus record (including your own), assigned_bus_id / "
            "assigned_bus_number / driver_id / driver_name are gone -- a driver only has "
            "a bus for as long as a trip is actually running.\n"
            "- Routes still return bus_id / bus_number / driver_id / driver_name, but "
            "only for whichever trip is currently in progress on that route -- expect "
            "them absent between runs, not just null.\n"
            "- QR scans return less. A bus's safety QR no longer includes driver_id; a "
            "route's QR no longer includes bus_id / driver_id.\n"
            "- Take Over Trip after Breakdown is newly documented below -- it already "
            "existed, but this collection never had it. Scan the ORIGINAL (breakdown) "
            "bus's safety QR, not the replacement bus's.\n"
            "- Report Lost Item's bus_id auto-fill now comes from your current/most "
            "recent trip instead of a persistent assignment."
        ),
    },
    {
        "key": "parent",
        "label": "Student / Parent",
        "pdf": "SmartTrack_API_Changes_StudentParent.pdf",
        "items": {
            "2. Lookups (capture IDs)": ["List Routes (school_admin)"],
            "6. Leave": ["Create Leave Request (parent)"],
        },
        "description": (
            "Changed-APIs-only reference for the parent app -- covers just the endpoints "
            "affected by two recent changes: leave no longer has an approval stage, and "
            "buses/routes/drivers were decoupled into independent entities. For the full "
            "parent API surface, see SmartTrack_API_Documentation_StudentParent.pdf "
            "instead; this doc is a focused diff.\n\n"
            "Summary of what changed:\n"
            "- Leave requests are pre-approved. Create Leave Request now comes back with "
            "status \"approved\" immediately, for every caller -- there is no pending/"
            "review stage left at all. Don't build a \"waiting for approval\" state "
            "around it anymore; an admin can still reject/revoke one afterward.\n"
            "- A child's route may show no bus/driver between runs. bus_number / "
            "driver_name on a route are now populated only while a trip is actually in "
            "progress on it -- there's no persistent assignment to fall back on."
        ),
    },
    {
        "key": "school_admin",
        "label": "School Admin",
        "pdf": "SmartTrack_API_Changes_SchoolAdmin.pdf",
        "items": {
            "2. Lookups (capture IDs)": ["List Drivers (school_admin)", "List Buses (school_admin)", "List Routes (school_admin)"],
            "3. QR [NEW]": ["Resolve Bus QR (school_admin)", "Resolve Route QR (school_admin)"],
            "6. Leave": ["Approve Leave (school_admin)"],
        },
        "description": (
            "Changed-APIs-only reference for the school admin console -- covers just the "
            "endpoints affected by decoupling buses, routes and drivers into independent "
            "entities, plus leave no longer having an approval stage. For the full admin "
            "API surface, see SmartTrack_API_Documentation_SchoolAdmin.pdf instead; this "
            "doc is a focused diff.\n\n"
            "Summary of what changed:\n"
            "- Buses, drivers and routes no longer reference each other. "
            "assigned_bus_id / assigned_bus_number (drivers), driver_id / driver_name "
            "(buses), and bus_id / driver_id (routes, on create/update) are gone from "
            "every one of these records -- there is no more \"assign a driver to a bus\" "
            "or \"assign a bus to a route\" step. POST/PATCH requests that still send "
            "those fields aren't rejected -- they're just silently ignored, since nothing "
            "is left to write them to.\n"
            "- List Routes still returns bus_id / bus_number / driver_id / driver_name, "
            "but now only for whichever trip is currently in progress on that route -- an "
            "idle route simply won't have them, not just null values.\n"
            "- QR scans return less. A bus's safety QR no longer includes driver_id; a "
            "route's QR no longer includes bus_id / driver_id.\n"
            "- Approve Leave is now Reject Leave in practice. Every leave request comes "
            "back status \"approved\" the moment it's created (parent or admin), so "
            "there's nothing left in a pending queue to approve -- PATCH .../leave/:id "
            "with status: \"rejected\" is now the only reason to call this.\n"
            "- Bus Transfer now requires you to name a standby driver. Assigning a "
            "replacement bus (POST /bus-transfers or PATCH /bus-transfers/:id/assign) "
            "used to auto-fill new_driver_id from the replacement bus's assigned driver; "
            "that assignment doesn't exist anymore, so new_driver_id must be sent "
            "explicitly, or the standby driver's take-over scan will 403. (Not shown as "
            "a request below -- bus-transfers isn't in this collection yet -- but the "
            "field itself was already optional/accepted, so no schema change.)"
        ),
    },
]


def build_filtered_collection(collection, items_by_folder, label):
    filtered_folders = []
    for folder in collection.get("item", []):
        wanted = items_by_folder.get(folder.get("name", ""))
        if not wanted:
            continue
        kept = [it for it in folder.get("item", []) if it.get("name") in wanted]
        if kept:
            filtered_folders.append({**folder, "item": kept})

    used_vars = collect_used_vars(filtered_folders)
    filtered_vars = [
        v
        for v in collection.get("variable", [])
        if v.get("key") == "baseUrl" or v.get("key") in used_vars
    ]

    info = dict(collection.get("info", {}))
    info["name"] = f"SmartTrack API Changes - {label}"
    return {"info": info, "variable": filtered_vars, "item": filtered_folders}


def main():
    with open(COLLECTION_PATH, "r", encoding="utf-8") as f:
        collection = json.load(f)

    for change_set in CHANGE_SETS:
        filtered = build_filtered_collection(collection, change_set["items"], change_set["label"])
        request_count = sum(len(f["item"]) for f in filtered["item"])
        pdf_path = os.path.join(BASE_DIR, change_set["pdf"])
        build_pdf(
            filtered,
            pdf_path,
            footer_title=f"SmartTrack API Changes - {change_set['label']}",
            description_override=change_set["description"],
        )
        print(f"PDF generated: {pdf_path} ({request_count} requests)")


if __name__ == "__main__":
    main()
