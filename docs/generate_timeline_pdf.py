#!/usr/bin/env python3
"""Generate SmartTrack Day-Based Development Timeline PDF."""

from fpdf import FPDF
import os

TOTAL_DAYS = 35  # Day 1 through Day 35
OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "SmartTrack_Development_Timeline.pdf",
)


def day_range(start, end):
    return f"Day {start} - Day {end}"


def phase_days(phase):
    """Phase 1-5 maps to 7-day blocks: Day 1-7, Day 8-14, etc."""
    start = (phase - 1) * 7 + 1
    end = phase * 7
    return day_range(start, end)


class TimelinePDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, "SmartTrack Development Timeline (Day 1 - Day 35) | PRD v1.1 | AKIRA PLC", align="C")
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def cover_page(self):
        self.add_page()
        self.set_fill_color(15, 76, 129)
        self.rect(0, 0, 210, 80, "F")
        self.set_y(25)
        self.set_font("Helvetica", "B", 32)
        self.set_text_color(255, 255, 255)
        self.cell(0, 14, "SmartTrack", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 16)
        self.cell(0, 10, "School Bus Tracking System", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(20)
        self.set_text_color(30, 30, 30)
        self.set_font("Helvetica", "B", 22)
        self.cell(0, 12, "35-Day Development Timeline", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)
        self.set_font("Helvetica", "", 12)
        self.set_text_color(80, 80, 80)
        self.cell(0, 8, "Backend  |  Web Frontend  |  Mobile Apps - Complete Delivery", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(12)
        self.set_font("Helvetica", "", 11)
        meta = [
            ("Reference Document", "SmartTrack PRD v1.1"),
            ("Prepared By", "AKIRA PLC | Muhammed"),
            ("Total Duration", "35 Days (Day 1 - Day 35)"),
            ("Launch Target", "Day 35"),
        ]
        for label, value in meta:
            self.set_font("Helvetica", "B", 10)
            self.set_text_color(50, 50, 50)
            self.cell(55, 8, label + ":", align="R")
            self.set_font("Helvetica", "", 10)
            self.cell(0, 8, "  " + value, new_x="LMARGIN", new_y="NEXT")
        self.ln(6)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(100, 100, 100)
        self.multi_cell(
            0, 5,
            "Accelerated 35-day delivery plan leveraging the existing React web UI prototype (80% complete). "
            "All workstreams run in parallel from Day 1. MVP-first approach covers all PRD v1.1 core flows; "
            "advanced analytics and Phase 2 roadmap items deferred to post-launch.",
        )

    def section_title(self, title, color=(15, 76, 129)):
        self.ln(4)
        self.set_fill_color(*color)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(255, 255, 255)
        self.cell(0, 9, "  " + title, fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def subsection(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(15, 76, 129)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5, text)
        self.ln(2)

    def phase_header(self, title, days_label):
        self.set_fill_color(15, 76, 129)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(255, 255, 255)
        self.cell(0, 8, f"  {days_label}: {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def squad_table(self, rows):
        widths = [22, 48, 55, 65]
        headers = ["Squad", "Focus", "Deliverables", "PRD Reference"]
        self.set_font("Helvetica", "B", 7)
        self.set_fill_color(240, 244, 248)
        self.set_text_color(40, 40, 40)
        for i, h in enumerate(headers):
            self.cell(widths[i], 6, " " + h, border=1, fill=True)
        self.ln()
        for idx, row in enumerate(rows):
            fill = idx % 2 == 0
            self.set_fill_color(248, 250, 252) if fill else self.set_fill_color(255, 255, 255)
            self.set_font("Helvetica", "B", 7)
            self.cell(widths[0], 6, row[0], border=1, fill=fill)
            self.set_font("Helvetica", "", 7)
            for i, val in enumerate(row[1:], 1):
                self.cell(widths[i], 6, " " + val[:50], border=1, fill=fill)
            self.ln()
        self.ln(3)

    def gantt_bar(self, label, start_day, duration_days, color=(15, 76, 129)):
        """start_day is 0-indexed (Day 1 = 0). duration_days is inclusive span."""
        bar_area = 120
        x_label, x_bar = 10, 70
        y, row_h = self.get_y(), 6
        self.set_font("Helvetica", "", 7)
        self.set_text_color(40, 40, 40)
        self.set_xy(x_label, y)
        self.cell(58, row_h, label[:32])
        self.set_fill_color(230, 230, 230)
        self.rect(x_bar, y + 1, bar_area, row_h - 2, "F")
        unit = bar_area / TOTAL_DAYS
        self.set_fill_color(*color)
        self.rect(x_bar + start_day * unit, y + 1, max(duration_days * unit, 1), row_h - 2, "F")
        self.set_y(y + row_h + 1)


def build_pdf():
    pdf = TimelinePDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.cover_page()

    # --- Executive Summary ---
    pdf.add_page()
    pdf.section_title("1. Executive Summary - 35-Day Sprint Plan")
    pdf.body_text(
        "This accelerated plan delivers the complete SmartTrack platform in 35 days (Day 1 - Day 35) by running "
        "parallel development workstreams simultaneously, reusing the existing React web UI (already 80% built), "
        "and adopting an MVP-first strategy that covers all critical user journeys from PRD v1.1."
    )
    pdf.subsection("Sprint Strategy")
    for item in [
        "Parallel workstreams: Backend, Web Integration, Mobile (Driver + Parent), Mobile (Admin + Guest)",
        "Existing web UI saves significant time - focus shifts to API wiring and mobile builds only",
        "Shared OpenAPI contract published Day 1; all teams integrate against mock server until Day 8",
        "Daily standups + milestone demos on Day 7, Day 14, Day 21, Day 28",
        "MVP scope: all core flows live; bulk import, advanced reports, training centre = post-launch v1.1",
    ]:
        pdf.body_text("- " + item)

    pdf.subsection("Current Assets (Head Start)")
    assets = [
        ("Web UI Prototype", "DONE", "Public site, Super Admin (11 pages), School Admin (16 pages), Auth flows"),
        ("Mock Data Layer", "DONE", "Full data models in TypeScript - maps directly to PostgreSQL schema"),
        ("Component Library", "DONE", "Tables, charts, maps UI, forms, layout, theme system"),
        ("Backend API", "NOT STARTED", "Day 1-14 priority"),
        ("Flutter Apps", "NOT STARTED", "Day 1-28 parallel build"),
    ]
    pdf.set_text_color(40, 40, 40)
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_fill_color(240, 244, 248)
    for h, w in [("Asset", 40), ("Status", 22), ("Details", 128)]:
        pdf.cell(w, 6, " " + h, border=1, fill=True)
    pdf.ln()
    for asset, status, detail in assets:
        pdf.set_font("Helvetica", "B", 7)
        pdf.cell(40, 6, " " + asset, border=1)
        color_fill = (220, 252, 231) if status == "DONE" else (254, 249, 195)
        pdf.set_fill_color(*color_fill)
        pdf.set_font("Helvetica", "B", 7)
        pdf.cell(22, 6, status, border=1, fill=True, align="C")
        pdf.set_fill_color(255, 255, 255)
        pdf.set_font("Helvetica", "", 7)
        pdf.cell(128, 6, " " + detail, border=1)
        pdf.ln()

    # --- Day-by-Day Schedule (grouped in 7-day phases) ---
    pdf.add_page()
    pdf.section_title("2. Day-by-Day Master Schedule")

    pdf.phase_header("Foundation & Kickoff", phase_days(1))
    pdf.squad_table([
        ("Backend", "DB + Auth", "PostgreSQL schema (22 tables), JWT auth, user roles, school/plan CRUD", "PRD Sec.8, Sec.11"),
        ("Backend", "Core APIs", "Students, drivers, buses, routes, stops endpoints", "PRD Sec.4.2-4.5"),
        ("Web Squad", "API Layer", "Axios client, auth interceptors, replace mockData imports", "PRD Sec.2-4"),
        ("Web Squad", "Onboarding", "Wire onboarding form + plan selection to live API", "PRD Sec.2.1"),
        ("Mobile A", "Driver App Setup", "Flutter project, auth, dashboard, FCM token registration", "PRD Sec.6.1-6.2"),
        ("Mobile B", "Parent App Setup", "Flutter project, auth, home dashboard cards", "PRD Sec.7.1-7.2"),
        ("Mobile C", "Admin Mobile", "Flutter project, auth, dashboard summary cards", "PRD Sec.5.1"),
        ("DevOps", "Infrastructure", "AWS staging, CI/CD pipelines, S3 buckets, env configs", "-"),
    ])

    pdf.phase_header("Core Features Live", phase_days(2))
    pdf.squad_table([
        ("Backend", "Trip Engine", "Trips, attendance, QR generation (Safety/Route/Student)", "PRD Sec.10"),
        ("Backend", "Real-time", "Socket.IO setup, bus_locations ingestion endpoint", "PRD Sec.4.6"),
        ("Web Squad", "Super Admin", "Connect all 11 Super Admin pages to live APIs", "PRD Sec.3"),
        ("Web Squad", "School Admin", "Students, drivers, buses, routes pages connected", "PRD Sec.4.2-4.5"),
        ("Mobile A", "Driver Trips", "QR scanner, pickup trip flow (6 steps), GPS tracking", "PRD Sec.6.3"),
        ("Mobile B", "Parent Tracking", "Live bus map (5s updates), morning/evening cards", "PRD Sec.7.3"),
        ("Mobile C", "Admin Mobile", "Live bus map, bus status list, notification centre", "PRD Sec.5.2-5.3"),
        ("QA", "Smoke Tests", "Auth flows, CRUD operations, API contract validation", "-"),
    ])

    pdf.phase_header("Trip Flows & Notifications", phase_days(3))
    pdf.squad_table([
        ("Backend", "Notifications", "FCM push (all 18 triggers), email SMTP, WhatsApp templates", "PRD Sec.9"),
        ("Backend", "Transfers", "Bus transfer module, guest_trips, guest driver approval API", "PRD Sec.4.14-4.15"),
        ("Web Squad", "Operations", "LiveMap Socket.IO, attendance, leave, lost & found APIs", "PRD Sec.4.6-4.11"),
        ("Web Squad", "Messaging", "Compose message, notification centre, bus transfer UI", "PRD Sec.4.9-4.14"),
        ("Mobile A", "Driver Drop", "Drop trip flow, bus breakdown alert, lost & found report", "PRD Sec.6.4-6.7"),
        ("Mobile A", "Guest Driver", "Guest login, student QR scan, submit for approval", "PRD Sec.6B"),
        ("Mobile B", "Parent Features", "Leave application, proximity alerts, location pin update", "PRD Sec.7.4-7.7"),
        ("Mobile C", "Admin Approvals", "Leave approval, guest driver approval, bus transfer mobile", "PRD Sec.5.5-5.10"),
        ("QA", "Integration", "End-to-end pickup trip: driver scan -> parent notification", "-"),
    ])

    pdf.phase_header("Full Integration & Polish", phase_days(4))
    pdf.squad_table([
        ("Backend", "Remaining APIs", "Subscriptions, billing, support tickets, training modules", "PRD Sec.3.3-3.9"),
        ("Backend", "Reports", "Attendance export, route performance, revenue reports", "PRD Sec.4.13"),
        ("Web Squad", "Final Pages", "Subscriptions, reports, guest drivers, support tickets wired", "PRD Sec.3-4"),
        ("Web Squad", "QR + Files", "QR download/print, S3 photo uploads, bulk student import", "PRD Sec.10.3"),
        ("Mobile A", "Driver Polish", "Compose message, help/emergency alerts, profile, offline sync", "PRD Sec.6.8-6.10"),
        ("Mobile B", "Parent Polish", "Attendance history, lost & found claims, compose message, student QR", "PRD Sec.7.8-7.11"),
        ("Mobile C", "Admin Polish", "Bulk messaging, compose message, support tickets read-only", "PRD Sec.5.6-5.9"),
        ("QA", "Full Regression", "All user roles, all trip types, notification delivery verified", "-"),
    ])

    pdf.phase_header("QA, UAT & Launch", phase_days(5))
    pdf.squad_table([
        ("All Squads", "Bug Fixes", "P0/P1 bugs only; feature freeze after Day 30", "-"),
        ("QA", "UAT", "Pilot school walkthrough: onboard -> trip -> parent tracking", "-"),
        ("QA", "Performance", "Load test: 50 concurrent buses, 500 parents tracking", "-"),
        ("DevOps", "Production", "Production deploy, SSL, domain, monitoring dashboards", "-"),
        ("DevOps", "App Stores", "Play Store + App Store submission (Driver + Parent apps)", "-"),
        ("PM", "Go-Live", "Credential delivery to pilot school, training session, launch sign-off", "-"),
    ])

    # --- Gantt ---
    pdf.add_page()
    pdf.section_title("3. 35-Day Gantt Chart (Parallel Tracks)")
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, "All tracks run simultaneously. Bar length = active days.", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    for day in [1, 7, 14, 21, 28, 35]:
        pdf.set_xy(70 + ((day - 1) / TOTAL_DAYS) * 120 - 4, pdf.get_y())
        pdf.set_font("Helvetica", "", 6)
        pdf.cell(12, 4, f"D{day}")
    pdf.ln(6)
    gantt = [
        ("Backend APIs", 0, 28, (15, 76, 129)),
        ("Real-time / Socket.IO", 7, 21, (15, 76, 129)),
        ("FCM / Email / WhatsApp", 14, 14, (15, 76, 129)),
        ("Web API Integration", 0, 28, (34, 139, 34)),
        ("Driver App (Flutter)", 0, 28, (128, 0, 128)),
        ("Guest Driver Module", 14, 14, (128, 0, 128)),
        ("Parent/Student App", 0, 28, (128, 0, 128)),
        ("School Admin Mobile", 0, 28, (128, 0, 128)),
        ("QA & Testing", 7, 28, (200, 100, 0)),
        ("Deploy & Launch", 28, 7, (180, 50, 50)),
    ]
    for label, start, dur, color in gantt:
        pdf.gantt_bar(label, start, dur, color)
    pdf.ln(3)
    pdf.set_font("Helvetica", "I", 7)
    pdf.cell(0, 4, "Blue=Backend | Green=Web | Purple=Mobile | Orange=QA | Red=Launch", new_x="LMARGIN", new_y="NEXT")

    # --- Workstreams ---
    pdf.section_title("4. Development Workstreams")
    workstreams = [
        ("Backend Core", "Node.js, PostgreSQL, JWT, all REST APIs, Socket.IO"),
        ("Integrations", "FCM, email SMTP, WhatsApp API, S3, QR generation"),
        ("Web Integration", "Connect existing React UI to APIs, live map, file uploads"),
        ("Driver + Guest Mobile", "Driver Flutter app + guest driver flow"),
        ("Parent Mobile", "Parent/Student Flutter app, live tracking, leave"),
        ("School Admin Mobile", "School Admin mobile app"),
        ("QA & Testing", "Test plans from Day 1, automation, UAT coordination"),
        ("DevOps", "CI/CD, AWS, staging + production environments"),
    ]
    for name, scope in workstreams:
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(15, 76, 129)
        pdf.cell(45, 6, name)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 6, scope, new_x="LMARGIN", new_y="NEXT")

    # --- Deliverables per layer ---
    pdf.add_page()
    pdf.section_title("5. Deliverables by Layer")

    pdf.subsection("5.1 Backend (Node.js + Express + PostgreSQL) - Day 1-28")
    for item in [
        "Day 1-7: DB schema (22 tables), JWT auth, schools/plans/users CRUD",
        "Day 1-7: Students, drivers, buses, routes, stops APIs + QR code generation",
        "Day 8-14: Trip engine (pickup/drop state machine), attendance marking, Socket.IO",
        "Day 15-21: FCM notifications (18 triggers), email + WhatsApp credential delivery",
        "Day 15-21: Bus transfer, guest driver approval, lost & found, leave management",
        "Day 22-28: Subscriptions/billing, support tickets, training modules, reports/export",
    ]:
        pdf.body_text("- " + item)

    pdf.subsection("5.2 Web Frontend (React) - Day 1-28")
    for item in [
        "Day 1-7: API client setup, auth integration, onboarding flow live",
        "Day 8-14: Super Admin (11 pages) + School Admin core pages (students, drivers, buses, routes)",
        "Day 15-21: LiveMap real-time, attendance, leave, messaging, bus transfer, guest drivers",
        "Day 22-28: Subscriptions, reports, QR print/download, bulk import, file uploads, polish",
    ]:
        pdf.body_text("- " + item)

    pdf.subsection("5.3 Driver Mobile App (Flutter) - Day 1-28")
    for item in [
        "Day 1-7: Project setup, login, dashboard, FCM registration",
        "Day 8-14: Safety QR + Route QR scanner, full pickup trip flow with GPS",
        "Day 15-21: Drop trip flow, bus breakdown alert, lost & found, guest driver module",
        "Day 22-28: Emergency alerts, compose message, notifications, profile, offline sync",
    ]:
        pdf.body_text("- " + item)

    pdf.subsection("5.4 Parent/Student App (Flutter) - Day 1-28")
    for item in [
        "Day 1-7: Login, home dashboard (bus status, morning/evening activity cards)",
        "Day 8-14: Live bus tracking map with 5-second GPS updates and ETA",
        "Day 15-21: Leave application, proximity alerts, pickup/drop location pin update",
        "Day 22-28: Attendance history, lost & found claims, student QR, messaging, profile",
    ]:
        pdf.body_text("- " + item)

    pdf.subsection("5.5 School Admin Mobile App (Flutter) - Day 1-28")
    for item in [
        "Day 1-7: Dashboard, auth, notification badge",
        "Day 8-14: All buses live map, bus status list with driver info",
        "Day 15-21: Leave approval, guest driver trip approval, bus transfer from mobile",
        "Day 22-28: Bulk messaging, compose message, support tickets, final polish",
    ]:
        pdf.body_text("- " + item)

    # --- Milestones ---
    pdf.section_title("6. Key Milestones")
    milestones = [
        ("Day 1", "Project kickoff; OpenAPI spec started; all repos and environments ready"),
        ("Day 2", "OpenAPI contract frozen; staging database live"),
        ("Day 5", "All apps authenticate; core CRUD APIs functional"),
        ("Day 7", "Phase 1 complete; foundation demo to stakeholders"),
        ("Day 10", "First end-to-end pickup trip: driver scans QR -> parent gets notification"),
        ("Day 14", "Phase 2 complete; Super Admin + School Admin web connected"),
        ("Day 15", "All 3 mobile apps in beta; real-time GPS tracking live"),
        ("Day 21", "Phase 3 complete; bus transfer + guest driver flows working"),
        ("Day 28", "Phase 4 complete; full platform integrated; feature freeze begins"),
        ("Day 30", "Feature freeze; P0/P1 bug fixes only"),
        ("Day 33", "UAT passed with pilot school"),
        ("Day 35", "Production deployed; app stores submitted; go-live"),
    ]
    for day, desc in milestones:
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(15, 76, 129)
        pdf.cell(20, 6, day)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 6, desc, new_x="LMARGIN", new_y="NEXT")

    # --- MVP vs Post-Launch ---
    pdf.section_title("7. MVP Scope vs Post-Launch (v1.1)")
    pdf.set_text_color(40, 40, 40)
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_fill_color(220, 252, 231)
    pdf.cell(95, 6, "  IN SCOPE (Day 1 - Day 35)", border=1, fill=True)
    pdf.set_fill_color(254, 226, 226)
    pdf.cell(95, 6, "  POST-LAUNCH (v1.1+)", border=1, fill=True)
    pdf.ln()
    in_scope = [
        "All auth flows (login, OTP, reset password)",
        "School onboarding + Super Admin approval",
        "Student/driver/bus/route CRUD",
        "Pickup + drop trip flows (driver app)",
        "Live GPS tracking (web + mobile)",
        "FCM push notifications (core triggers)",
        "QR codes (Safety, Route, Student)",
        "Attendance + leave management",
        "Bus transfer + guest driver flows",
        "Lost & found reporting + claims",
        "Parent live tracking + proximity alerts",
        "School Admin mobile (core features)",
        "Compose messaging (admin/driver/parent)",
    ]
    post_launch = [
        "Bulk school Excel/CSV import",
        "Advanced analytics & revenue forecasting",
        "Training & Resource Centre module",
        "Scheduled message delivery",
        "Audit logs (full history)",
        "Multi-language (Arabic, Malayalam, etc.)",
        "Facial recognition attendance",
        "In-app threaded chat",
        "Driver rating system",
        "White-label branding per school",
        "AI route optimisation",
        "IoT GPS hardware fallback",
        "Fleet maintenance module",
    ]
    max_rows = max(len(in_scope), len(post_launch))
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(40, 40, 40)
    for i in range(max_rows):
        pdf.set_fill_color(240, 253, 244)
        pdf.cell(95, 5, "  " + (in_scope[i] if i < len(in_scope) else ""), border=1, fill=True)
        pdf.set_fill_color(255, 241, 242)
        pdf.cell(95, 5, "  " + (post_launch[i] if i < len(post_launch) else ""), border=1, fill=True)
        pdf.ln()

    # --- PRD Reference ---
    pdf.add_page()
    pdf.section_title("8. PRD v1.1 Feature Coverage (35-Day Plan)")
    prd_ref = [
        ("Sec.2", "Public Website & Onboarding", "Day 1-7", "Web UI done + API Day 1-7"),
        ("Sec.3", "Super Admin Panel", "Day 8-28", "Web UI done + APIs Day 8-28"),
        ("Sec.4", "School Admin Panel", "Day 8-28", "Web UI done + APIs Day 8-28"),
        ("Sec.5", "School Admin Mobile", "Day 1-28", "New Flutter build"),
        ("Sec.6", "Driver Mobile App", "Day 1-28", "New Flutter build"),
        ("Sec.6B", "Guest Driver Flow", "Day 15-21", "Within Driver app"),
        ("Sec.7", "Parent/Student App", "Day 1-28", "New Flutter build"),
        ("Sec.8", "Database Schema", "Day 1-3", "22 tables on staging"),
        ("Sec.9", "Notifications (18 triggers)", "Day 15-21", "FCM + email + WhatsApp"),
        ("Sec.10", "QR Code System", "Day 1-14", "Server-generated HMAC QRs"),
        ("Sec.11", "Common Features", "Day 1-28", "Auth, offline, profile across all apps"),
        ("Sec.12", "Future Roadmap", "Post-launch", "Phase 2-4 out of scope"),
    ]
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_text_color(40, 40, 40)
    pdf.set_fill_color(240, 244, 248)
    for h, w in [("PRD", 12), ("Feature", 75), ("Days", 22), ("Notes", 81)]:
        pdf.cell(w, 6, " " + h, border=1, fill=True)
    pdf.ln()
    for ref, area, days, notes in prd_ref:
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(12, 6, ref, border=1)
        pdf.set_font("Helvetica", "", 7)
        pdf.cell(75, 6, " " + area, border=1)
        pdf.cell(22, 6, days, border=1, align="C")
        pdf.cell(81, 6, " " + notes, border=1)
        pdf.ln()

    pdf.ln(4)
    pdf.section_title("9. Critical Success Factors")
    for item in [
        "Existing web UI prototype eliminates significant frontend build time",
        "OpenAPI contract frozen by end of Day 2 - no API changes after Day 8",
        "Feature freeze at Day 30 - only P0/P1 bug fixes on Day 31-35",
        "Pilot school identified before Day 1 for UAT on Day 33",
        "Google Maps SDK keys, FCM project, WhatsApp Business API pre-approved before Day 1",
        "Daily standups + integration demo on Day 7, Day 14, Day 21, Day 28",
    ]:
        pdf.body_text("- " + item)

    pdf.ln(2)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0, 4,
        "Reference: SmartTrack PRD v1.1 | AKIRA PLC | Muhammed\n"
        "Sprint Duration: Day 1 - Day 35",
    )

    pdf.output(OUTPUT_PATH)
    return OUTPUT_PATH


if __name__ == "__main__":
    path = build_pdf()
    print(f"PDF generated: {path}")
