# DEV-06 — Processing, Response, NOT_ACCEPTED, Correction & Closure

**Status:** APPROVED / FROZEN
**Owner approval:** 2026-09-27

## Accepted scope

DEV-06 implements the following complaint lifecycle transitions:

- `UNDER_REVIEW → IN_PROCESSING`
- `IN_PROCESSING → RESPONSE_SENT`
- `RESPONSE_SENT → CLOSED`
- `UNDER_REVIEW → NOT_ACCEPTED`
- `IN_PROCESSING → NOT_ACCEPTED`

`CLOSED`, `NOT_ACCEPTED`, and `WITHDRAWN` are terminal. Complaints cannot be reopened.

Commune responses are stored as immutable `response_versions` with independent identifiers, contiguous version numbers, and `NORMAL` or `NOT_ACCEPTED` kinds. Response bodies accept at most 2,000 Unicode code points. Corrections create a new immutable version without reopening the complaint, require a correction reason of at most 500 Unicode code points, and require current-password/provider reauthentication before every correction. Corrections are permitted while a complaint is `RESPONSE_SENT`, `CLOSED`, or `NOT_ACCEPTED`, and the complete response history remains available to authorized users.

Citizen lifecycle notifications and `RESPONSE`/`CLOSURE` email-outbox intents are created atomically with their complaint event and audit data. Receipt emails remain privacy-minimal. A complete `NOT_ACCEPTED` explanation is available only on the authenticated platform, and `NOT_ACCEPTED` does not produce a later closure email.

Commands use revision checks, row locking, command fingerprints, and durable command receipts for concurrency protection and idempotency. Event, audit, notification, response-version, and outbox changes are committed atomically. RLS and authorization preserve owner-only Citizen access and authorized Commune staff access.

The accepted interface supports Arabic, French, and English, including Arabic RTL and French/English LTR behavior, responsive layouts, keyboard use, visible focus, and accessibility checks. DEV-07 functionality is not included.

## Final NOT_ACCEPTED checkbox correction

The owner approved the final confirmation-control correction. A generic lifecycle input rule had incorrectly applied full-width and minimum-height field styling to checkboxes.

The final control uses a 20×20px visual checkbox inside a 44px clickable label area. Clicking the label toggles the required checkbox, keyboard focus remains visible, Arabic aligns naturally in RTL, French and English align naturally in LTR, and the control does not introduce horizontal overflow.

This was a presentation and accessibility correction only. It did not change lifecycle rules, commands, validation, database objects, migrations, authorization, or security behavior.

## Verification record

- Isolated database reconstruction: **PASS**
- Complaint boundary: **62 checks passed**
- DEV-06 boundary: **29 checks passed**
- Notification boundary: **25 checks passed**
- Unit/component/integration: **158 passed**
- Focused DEV-06 E2E: **2 passed**
- Authoritative complete combined E2E: **111 passed, 0 failed**
- Typecheck: **PASS**
- Lint: **PASS**
- Production build: **PASS**
- `git diff --check`: **PASS**
- Changed-source secret scan: **PASS**

A later combined rerun encountered local `ENOSPC` disk exhaustion and one transient Commune login failure. That attempt recorded 96 passed, two environmental/transient failures, and 13 skipped tests. Recovery verification passed the affected public test 1/1 and the complete Commune Auth file 20/20. Every scenario covered by the authoritative 111-test run therefore retains passing post-change coverage.

The final checkbox correction was verified separately:

- Confirmation-control component test: **1 passed**
- Targeted `NOT_ACCEPTED` E2E: **1 passed**
- Arabic RTL at 390px: **PASS**
- French LTR at 1440px: **PASS**
- No horizontal overflow: **PASS**
- Typecheck: **PASS**
- Lint: **PASS**

## Frozen-source and release boundaries

- DEV-01, DEV-02, DEV-03, DEV-04A, DEV-04B, and DEV-05 migrations remain unchanged.
- Earlier acceptance records, frozen planning documents, and design/reference files remain unchanged.
- No hosted Supabase project was linked or modified.
- No DEV-07 functionality was started.
- Remaining non-blocking platform-wide visual polish stays deferred to the dedicated platform-wide UI/UX refinement phase established during DEV-05.
- Production hosting, production email delivery, and other release-owned configuration remain outside this freeze.
