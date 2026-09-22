# DEV-02 Acceptance Record

**Work package:** DEV-02 — Citizen Identity, Sessions & Account Access

**Status:** APPROVED / FROZEN

**Owner approval date:** 2026-09-22

## Approved implementation

- Citizen signup creates the provider identity and Citizen record, records the accepted legal versions, and requires email verification before account access.
- Email verification is scanner-safe: opening a link does not consume the action, and the Citizen must explicitly confirm it. Verification does not silently create an authenticated application session.
- Sign-in and sign-out use Supabase Auth together with the application session model.
- Password recovery, reset, and authenticated password change are implemented. The approved password policy is 10–1024 Unicode characters, with no composition rules; spaces, paste, and password managers are supported, while an explicit set of obvious weak values is rejected.
- Login-email change requires the current password, verifies the new address once, keeps the old address authoritative until confirmation, uses the scanner-safe confirmation step, and revokes existing application sessions when completed.
- Citizen profile supports the approved name fields, optional phone number, and preferred language. A language change immediately keeps the Citizen on the corresponding logical route in Arabic, French, or English. The duplicate preferred-language account section was removed.
- Terms and privacy acknowledgements are stored against the exact published legal versions accepted during registration or registration completion.
- Application sessions are bounded and server-validated. Disabled accounts and expired or revoked sessions are denied and routed to the approved account/session states.
- Incomplete provider registrations are reconciled through the approved complete-registration flow without creating duplicate Citizen identities.
- The authenticated Citizen shell, account navigation, and account forms are implemented for Arabic, French, and English, with RTL for Arabic and LTR for French and English.
- The approved responsive layout, keyboard access, visible focus behavior, form labelling, status messaging, and minimum interactive sizing are implemented.

## Local Auth and email configuration

- Local Supabase Auth requires confirmed email, enables secure password change, uses a 10-character minimum password, and does not require character-class composition.
- Login-email changes require confirmation of the new address only (`double_confirm_changes = false`).
- Local redirect allowlists cover the locale-aware confirmation and recovery routes.
- Custom confirmation, email-change, email-changed, password-changed, and recovery templates are source-controlled.
- Mailpit is the approved local email-capture and testing path. Production SMTP is not configured.
- Local environment generation is restricted to the unlinked local Supabase stack and writes runtime credentials only to ignored `.env.local` state.

## Authorization and security model

- Supabase Auth is the identity provider; the application database owns Citizen profile, legal-acknowledgement, and application-session records.
- Application sessions use an opaque client secret with only its hash stored server-side, secure HTTP-only cookie handling, expiry/revocation checks, and account security-version invalidation.
- Sensitive identity commands execute through server-controlled database functions and validate the authenticated provider identity.
- Row-level security and grants restrict Citizen-owned records and prevent public or cross-Citizen access. Security behavior is covered by database boundary checks.
- Authentication and account lifecycle events are audit-recorded without storing passwords, tokens, or session secrets.

## Final verification results

The final approved implementation passed:

- **Clean local database reset:** passed; all seven migrations (four frozen DEV-01 and three DEV-02) applied and local seed completed.
- **Database verification:** 146/146 checks passed: 30 foundation, 76 public-boundary, and 40 Citizen/Auth checks.
- **Unit/component/integration:** 32/32 tests passed across 5 files.
- **Combined E2E:** 75/75 tests passed, 0 failed.
  - DEV-01 public regression: 67/67 passed.
  - DEV-02 Citizen/Auth: 8/8 passed.
- **Typecheck:** passed.
- **Lint:** passed.
- **Production build:** passed.

After the combined run, the approved not-found internationalization correction passed its focused 2/2 E2E checks, and the browser-extension hydration compatibility correction passed its focused 1/1 login E2E check. Typecheck and lint also passed after each correction.

## Frozen-source and scope confirmation

- DEV-01 migrations were not modified.
- Frozen planning documents were not modified.
- The approved design handoff and reference files were not modified.
- No hosted Supabase project was created, linked, or modified.
- DEV-03 was not started.
- No complaint submission, management, upload, feed, or messaging functionality was implemented.
- No production SMTP service was configured.
- Production hosting, production Supabase, SMTP, commune-owned contact details, and final legal publication remain future release gates.

This record freezes the final implemented DEV-02 decisions and supersedes earlier DEV-02 preparation or pre-refinement decisions where they differ.
