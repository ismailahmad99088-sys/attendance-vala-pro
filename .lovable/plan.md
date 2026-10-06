# Attendance Vala — Phased Build Plan

Scope: attendance management only. Real backend (Lovable Cloud), no mock data outside clearly-labelled demo seed rows.

## Phase 1 — Foundation + full UI/UX (this build)
- Enable Lovable Cloud (database, auth, server functions).
- Visual direction: dark-ink enterprise "command center" — deep slate surfaces, signal-green/amber/red status accents, Space Grotesk headings + DM Sans body, dense data tables.
- App shell with sidebar: Dashboard, Today's Attendance, Employees, Calendar, History, Corrections, Rules, Locations, Devices, Reports, Audit Logs, Settings.
- Login page: username, password, license key, backup key, show/hide password, loading/invalid/locked states. License + backup key validated server-side (hashed in DB, never in frontend code).
- Super Admin demo account created through real auth.
- Database: employees, departments, attendance_rules, attendance_locations, attendance_devices, attendance_events (immutable), attendance_breaks, attendance_corrections, attendance_alerts, attendance_audit_logs, user_roles (separate table, RBAC via has_role), licenses.
- Demo seed (flagged `is_demo = true`): 1 org, 30 employees, 3 locations, 2 rules, ~30 days of events incl. late/early/overtime/breaks, sample corrections, devices marked NOT_CONFIGURED.
- Dashboard cards + live status table computed from DB; realtime subscription on attendance_events.
- Web check-in / check-out / break start-end with server timestamps, duplicate prevention, "Valid check-in not found." handling.
- Daily, monthly, calendar, employee profile pages wired to real queries.

## Phase 2 — Workflows
- Correction request/approve/reject with immutable history.
- Manual attendance (reason mandatory, flagged MANUAL).
- Rules, locations, devices CRUD; audit log viewer.
- GPS check-in with real browser geolocation + geofence (shows LOCATION NOT AVAILABLE when denied).
- Signed, expiring QR attendance tokens.

## Phase 3 — Reports, import, intelligence
- 12 attendance reports with filters; CSV/XLSX/PDF export from real queries.
- CSV/XLSX import with row-by-row validation.
- Alerts + insights (late patterns, missing punches, long breaks) showing the source records.
- Device sync architecture (shows NOT CONFIGURED until a real provider is connected).

## Phase 4 — Hardening & tests
- Rate limiting on login, RBAC tests, calculation/timezone/DST tests, no-fake scan, production build.

## Technical details
- Times stored as timestamptz (UTC); org timezone setting drives all day boundaries and late/early math, computed server-side.
- Status (PRESENT, LATE, ON_BREAK, CHECKED_OUT, EARLY_CHECKOUT, OVERTIME, ABSENT, NOT_MARKED) derived from events in server functions, never sent by the client.
- Note: the requested username "Softwarevala@admim.com" will be used exactly as given (looks like a typo of "admin" — confirm if needed).
