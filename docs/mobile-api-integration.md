# Mobile API Integration — Changes for the Mobile Team

**Audience:** developers building the SmartTrack mobile app (driver, guest_driver, parent).
**Purpose:** this is a companion to [`school-admin-mobile-handoff.md`](./school-admin-mobile-handoff.md) — that doc still covers the full data model, the complete endpoint reference, and roles. This doc covers **only what changed** in the backend to close the gaps that handoff doc's Section 6 flagged, plus what mobile needs to know to integrate against them.

Base URL and auth are unchanged: `http://<host>/api`, `Authorization: Bearer <JWT>` on every route except `/api/auth/login`, `/forgot-password`, `/verify-otp`, `/reset-password`, and `/health`.

---

## 1. New: self-service push-token registration

```
PATCH /api/auth/fcm-token
Body: { "fcm_token": "string" }
Response: { "user": {...} }
```

Any authenticated role can call this to register its own device's push token — previously the only way to set `fcm_token` was the admin-only `PATCH /api/users/:id`, which a driver/guest_driver/parent app could never call for itself. Call this once after login (and again whenever the device token rotates, e.g. FCM's `onTokenRefresh`).

**Push sending is currently stubbed.** The backend stores the token and logs what it *would* send (`backend/src/utils/push.js`), but no real push is delivered yet — no Firebase project is wired up. Registering the token now means zero mobile-side work is needed later when real sending goes live; until then, treat notifications as in-app-inbox-only (`GET /api/notifications`, poll or rely on Socket.IO for freshness).

---

## 2. New: QR resolution

```
GET /api/qr/:code
Response: { "type": "student" | "bus" | "route", "entity": {...} }
404 if the code doesn't match anything in your school.
```

Resolves any of the three QR codes the backend already generates and returns on their respective entities — `students.student_qr_code`, `buses.safety_qr_code`, `routes.route_qr_code`. Use this for a generic "scan any SmartTrack QR" flow (e.g. scanning a bus's safety QR to pull up its live status, or a route QR to see its stop list).

For the specific "scan a student to mark them present" flow, use the dedicated endpoint below instead — it resolves *and* marks in one call.

---

## 3. New: scan-to-attendance

```
POST /api/attendance/scan
Roles: super_admin, school_admin, driver
Body: { "school_id"?: "string (super_admin only)", "trip_id": "string", "qr_code": "string", "stop_id"?: "string" }
Response: { "record": {...} }  (201)
```

Resolves the student by `student_qr_code`, then marks them **present** on the given trip — stamping `pickup_time` if the trip's `trip_type` is `pickup`, or `drop_time` if it's `drop`. Scanning the same student twice on the same trip upserts rather than erroring (same idempotent behavior as the existing `POST /api/attendance`).

Driver callers are restricted to trips they actually own (see §5) — a 403 means the scanned trip isn't yours.

---

## 4. Changed: parent accounts now auto-scope to "my children"

**No new endpoint — existing endpoints changed behavior for `role: 'parent'` only.** A parent account is matched to their child by their **login email matching an email on file in that student's parent contacts** (`parent_details.email`). This means:

- `GET /api/students`, `GET /api/students/:id` — a parent now only ever sees their own child(ren); previously any authenticated role saw every student in the school.
- `GET /api/leave`, `GET /api/leave/:id`, `POST /api/leave`, `PATCH /api/leave/:id`, `DELETE /api/leave/:id` — same scoping. Creating a leave request for a student that isn't theirs now fails; viewing/editing/deleting someone else's leave request 404s (not 403 — consistent with how the rest of the backend avoids leaking whether a record exists).
- `GET /api/attendance` — same scoping, so a parent's attendance history view only shows their own child(ren).

**Nothing changes for `super_admin`/`school_admin`** — the web console is unaffected. **Implication for onboarding:** a parent whose login email doesn't match the email on file in `parent_details` will see empty lists everywhere. Make sure school admins set up parent accounts with the *same* email that's already recorded as the parent contact for that student.

---

## 5. Changed: drivers now default to "my trips only"

**No new endpoint — existing endpoints changed behavior for `role: 'driver'` only.**

- `GET /api/trips` — a driver's own `drivers.id` (linked via `drivers.user_id`) is now resolved server-side and forced into the query; any `?driver_id=` you pass is ignored/overridden. You'll only ever see your own trips.
- `GET /api/attendance` — same forced scoping (via the trip's driver).
- `POST /api/attendance`, `POST /api/attendance/bulk`, `POST /api/attendance/scan`, `PATCH /api/attendance/:id`, `DELETE /api/attendance/:id` — all now verify the referenced trip belongs to you before allowing the write (403 otherwise). This is the same ownership check `PATCH /api/trips/:id` already enforced for a driver's own trip status.

If a driver account has no linked `drivers` row (`drivers.user_id` not set), these all behave as if they own zero trips — check with your school admin that the driver's user account is linked to their driver profile.

---

## 6. Changed: leave-request write access

`POST /api/leave`, `PATCH /api/leave/:id`, `DELETE /api/leave/:id` are now restricted to `super_admin`, `school_admin`, and `parent` (previously any authenticated role, including `driver`/`guest_driver`, could write any leave record in the school — that was an oversight, not an intended mobile capability). `GET` routes are unchanged — any role can still read leave records (e.g. a driver checking who's on leave today).

---

## 7. Changed: guest-trip ownership

`guest_trips` has no direct link to a `users` row — it's matched by **phone number** instead:

- `POST /api/guest-trips` — if the caller's role is `guest_driver`, any `guest_driver_name`/`guest_driver_phone` you send in the body is **ignored and replaced** with your own account's name/phone. This is intentional (prevents impersonating another guest driver) — don't rely on being able to set those fields yourself; they always come from your account.
- `GET /api/guest-trips`, `GET /api/guest-trips/:id` — a `guest_driver` caller only sees trips matching their own phone number.
- `PATCH /api/guest-trips/:id` — a `guest_driver` caller can only patch their own trip (404 otherwise), and cannot change `guest_driver_name`/`guest_driver_phone` via this route either (those fields are silently dropped from the request for that role). Status changes to `approved`/`rejected` are still admin-only, unchanged.

**Requirement:** your guest_driver account needs a `phone` set (via `users.phone`) — if it's missing, these endpoints return 400. Make sure school admins fill this in when creating guest driver accounts.

---

## 8. New: `tickets?mine=true`

```
GET /api/tickets?mine=true
```

Narrows the ticket list to just the caller's own reported tickets, regardless of role. Without it, the existing behavior is unchanged (non-super_admin sees their school's tickets *or* their own — this flag narrows to *only* their own, useful for a "My Tickets" mobile screen).

---

## 9. Changed: Socket.IO — finer-grained rooms

The old per-school room (`school:<id>`) still works exactly as before — nothing breaks if you don't change your client. New, additive events let you subscribe to just one trip or bus instead of receiving every bus's GPS ticks for the whole school:

```js
socket.emit('join:trip', tripId);   // socket.emit('leave:trip', tripId) to unsubscribe
socket.emit('join:bus', busId);     // socket.emit('leave:bus', busId) to unsubscribe
```

A driver/guest_driver's `bus:location` emit is now rebroadcast to **all three** rooms (`school:<id>`, `trip:<id>`, `bus:<id>`) — a parent app that only cares about one child's bus should `join:trip`/`join:bus` for that specific ride instead of filtering every event client-side.

---

## 10. Known limitations (not fixed in this pass — flagging so you don't build against them)

- **Push notifications are stubbed.** No real FCM/APNs delivery yet — see §1. In-app inbox (`GET /api/notifications`) and Socket.IO are the only real-time channels today.
- **OTP delivery is dev-only.** `POST /api/auth/forgot-password` returns the OTP directly in the response body outside production (`devOtp`) — no SMS/email provider is wired up. Don't build a "check your email/SMS for a code" flow expecting real delivery yet; the dev response is how you'll test the flow today.
- **Guest-driver trips are not integrated with `trips`/`attendance`/GPS.** `guest_trips` is a separate table with no link to `trips.driver_id` (which requires a real `drivers.id` row that guest drivers don't have). A guest driver's actual pickup/drop run — GPS reporting, attendance marking — has no schema path today; only the `guest_trips` request/approval lifecycle itself (§7) is scoped correctly. Building GPS/attendance for guest drivers requires a backend architecture decision first (e.g. provisioning a placeholder `drivers` row per approved guest trip) — flag this if/when guest-driver trip execution is on your roadmap.

---

## Quick reference — what's genuinely new

| Method & path | Purpose |
|---|---|
| `PATCH /api/auth/fcm-token` | Register your own push token |
| `GET /api/qr/:code` | Resolve any QR code to its entity |
| `POST /api/attendance/scan` | Scan a student QR → mark present |
| `GET /api/tickets?mine=true` | Only your own support tickets |
| `join:trip` / `leave:trip` / `join:bus` / `leave:bus` (socket events) | Subscribe to one trip/bus's GPS instead of the whole school |

Everything else in this doc is existing endpoints from the original handoff doc that now behave differently for `parent`/`driver`/`guest_driver` callers specifically — no new URLs to learn, just narrower results and a few new 403/400s to handle.
