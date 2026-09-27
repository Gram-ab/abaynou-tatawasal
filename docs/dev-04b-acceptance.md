# DEV-04B Acceptance Record

## Status

**DEV-04B — Citizen Notifications & Receipt Email: APPROVED / FROZEN**

Owner approval includes the final unread-badge synchronization correction. This record describes the final implementation accepted on 2026-09-27.

## Approved implementation

- Durable Citizen `COMPLAINT_RECEIVED` notifications with recipient-scoped sequencing and state.
- Notification bell with an accessible unread badge in the approved Citizen header.
- Citizen notification center with empty, error, read, and unread states.
- Idempotent individual-read behavior and authorized complaint deep links.
- Race-safe **Mark all as read**, bounded by the recipient's captured sequence so concurrently created notifications remain unread.
- Immediate shared header-badge and notification-list synchronization after individual-read and mark-all actions, without requiring a manual refresh.
- Approximately five-minute background polling, plus focus/online refresh and bounded backoff. Passive polling does not extend meaningful application-session activity or create a session.
- One atomic complaint-submission transaction creates the complaint, complaint event, audit event, command receipt, receipt notification, notification-state update, and `RECEIPT` email-outbox intent. Idempotent replay creates no duplicate notification or outbox row.
- Durable `email_outbox` processing with bounded retries, leases, fencing tokens, concurrent-worker safety, stable Message-ID values, stale-lease rejection, and `HELD` handling.
- Provider-independent Nodemailer SMTP adapter and local receipt delivery through Mailpit. SMTP delivery occurs after the complaint transaction commits.
- Current verified Supabase Auth email resolution before first dispatch and revalidation before retries. Changed, disabled, or unverified recipients are held safely.
- Privacy-minimal receipt email containing only service identity, receipt confirmation, complaint reference, received status, authenticated complaint link, and simple sign-in guidance. Complaint subject, description, location clarification, phone, SLA, and processing promises are excluded.
- The Citizen's `preferred_language` is snapshotted when the outbox intent is created.
- Arabic, French, and English rendering; Arabic RTL and French/English LTR behavior.
- Responsive behavior through desktop, tablet, mobile, and 320px widths, with keyboard and accessibility support.
- No historical notification or receipt-email backfill.
- No staff/Commune notifications or staff email.
- No DEV-05 complaint tracking, lifecycle, response, closure, assignment, or analytics functionality.

## Data and migration scope

DEV-04B adds exactly three additive migrations:

1. `20260926000400_citizen_notifications.sql`
2. `20260926000500_email_outbox.sql`
3. `20260926000600_complaint_receipt_integration.sql`

The approved new entities are `notifications`, `notification_state`, and `email_outbox`. Existing DEV-01, DEV-02, DEV-03, and DEV-04A migrations were not edited.

## Final verification

- Database reconstruction: **PASS**
- Unit/component/integration: **141 passed**
- Full combined E2E: **106 passed, 0 failed**
- Typecheck: **PASS**
- Lint: **PASS**
- Production build: **PASS**

The final unread-badge synchronization correction was verified separately because it changed only UI invalidation behavior:

- Notification component and action-state tests: **10 passed**
- Targeted Citizen notification E2E: **2 passed, 0 failed**
- Individual notification open/read immediately updates the shared header badge and persisted row state: **PASS**
- Mark all as read immediately updates applicable rows and the shared header badge: **PASS**
- Typecheck: **PASS**
- Lint: **PASS**
- Production build: **PASS**

The historical regression suite was not repeated after this isolated correction because it did not change database schema, RLS, authentication, sessions, complaint transaction behavior, or outbox delivery behavior.

## Security and frozen-source confirmation

- Notification commands retain verified Citizen identity, active profile, valid application-session, security-epoch, ownership, and role enforcement.
- Notification and outbox tables use forced RLS, narrow grants, trusted functions, and worker-only delivery authority.
- Browser clients cannot create arbitrary notifications, alter destinations, read the raw outbox, or invoke worker functions.
- DEV-01, DEV-02, DEV-03, and DEV-04A migrations are unchanged.
- Prior acceptance records and frozen planning documents are unchanged.
- Design and reference files are unchanged.
- No hosted Supabase project was created, linked, or modified.
- No production SMTP provider or credential was configured.
- Local secrets, runtime files, generated reports, screenshots, videos, caches, logs, and build outputs are excluded from source control.
- DEV-05 was not started.

## Delivery semantics and remaining release gates

Email delivery is durable at-least-once. Stable logical uniqueness, leasing, fencing, retry limits, and Message-ID values reduce duplicates, but an SMTP-accepted message with an uncertain network result may be retried. Final Commune-approved sender identity and copy, production SMTP, hosting, and other production/legal decisions remain future release gates.
