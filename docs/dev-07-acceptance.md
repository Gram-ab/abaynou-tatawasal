# DEV-07 — Staff Account Administration

Status: **APPROVED / FROZEN**

## Accepted implementation

- ADMIN-only staff list and detail views with search, filtering, and pagination.
- Secure AGENT provisioning by invitation, with scanner-safe activation and no plaintext temporary passwords.
- Approved Agent profile editing and localized administrative feedback.
- ACTIVE/DISABLED account management with immediate session and security-epoch revocation.
- Reactivation requires a fresh login and never revives an earlier session.
- Controlled CLI/server ADMIN authority changes with current-Admin reauthentication, revision checks, and an audit reason.
- Self-disable, self-demotion, and last-active-Admin protections.
- Staff self-service login-email change with current-password reauthentication, new-email verification, session revocation, and fresh login.
- Correction of an unused Agent invitation email while preserving the provider identity.
- Admin-initiated password recovery.
- Professional confirmation and server-confirmed success dialogs for invitations, disabling, reactivation, recovery, and invitation-email correction.
- Immutable audit history and concurrency/revision protection.
- Notification fanout only to staff who are currently active, with no historical backfill.
- Arabic, French, and English; RTL/LTR; responsive and accessible behavior.
- Citizen disabling remains explicitly deferred and unplaced.
- No DEV-08 functionality was started.
## Local database reset deviation

During DEV-07 implementation, an earlier local database reset rebuilt the local development stack. Preservation of ad-hoc owner local review accounts and data therefore could not be confirmed. No hosted Supabase project was modified, frozen source history was not altered, and review accounts can be recreated locally through the existing interactive staff bootstrap. This record does not claim that previous local review accounts or data were preserved.

## Verification record

- Database: **353 checks passed**
- Unit/component/integration: **162 passed**
- Final targeted model checks: **3 passed**
- Focused DEV-07 E2E: **4 passed**
- Final combined E2E: **115 passed, 0 failed**
- Typecheck: **PASS**
- Lint: **PASS**
- Production build: **PASS**
- Secret scan: **PASS**
- Final administrative confirmation/success-dialog browser verification: **2 passed**

The project owner accepts DEV-07 based on the scoped implementation and current verification. A complete end-to-end verification of all development slices will be performed after the remaining development steps are complete and before entering the Quality/QA phase. This deferral does not waive security blockers, broken core functionality, data-loss risks, authorization failures, or migration failures.

## Frozen-source and release safety

- DEV-01 through DEV-06 migrations are unchanged.
- Prior acceptance records and frozen planning documents are unchanged.
- Design and reference files are unchanged.
- No hosted Supabase project was created, linked, or modified.
- No production SMTP configuration was added.
- Local service-role configuration remains server-only and secret values remain in ignored local environment files.
- No DEV-08 functionality was started.
