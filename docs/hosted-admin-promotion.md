# Hosted Admin promotion

Use this controlled terminal command to promote an existing, activated Agent in hosted project `vdpflzhsohhvvwdrjzhd`. It is separate from the one-time initial-Admin bootstrap and remains an optional alternative to the Admin dashboard action.

## Recommended: Admin dashboard

On the deployed website, an active Admin opens **Staff accounts → View details** for an activated, active Agent, then uses **Promote to Administrator**. Supply a reason, your current Admin password, and the explicit permissions acknowledgement; review the named recipient in the platform confirmation dialog before confirming. A success dialog confirms completion. Pending invitations, disabled members, Citizens and existing Admins are not eligible.

The server validates all submitted fields, authorizes the cookie-bound Admin session, verifies the current password in a separate temporary provider session, signs out that temporary session only, then rechecks the original application session. A restricted `app_web` transaction re-reads the target and activation evidence and calls the existing audited `PROMOTE` command with the expected revision. Changed accounts fail closed; the role change is not retried automatically. The existing command atomically updates the role/security epoch, revokes the target’s application sessions and records the actor and reason. The member signs in again to receive Admin access. The acting Admin’s browser session remains intact.

The dashboard requires deploying the updated Next.js app to Vercel. It uses existing hosted protected database functions; no migration, RLS change, extra database grant, additional environment variable or runtime CLI invocation is required. No hosted account is promoted as part of local testing. The terminal command below remains available for owners who prefer it.

## Before running the optional terminal command

1. Invite the person as an Agent through the existing staff administration page.
2. They must accept the invitation and finish choosing their password first.
3. Run from the project root on the trusted deployment workstation. The existing isolated linked workspace and pinned public Supabase CA must be present, and Supabase CLI must already be logged in.
4. Have your active Admin login and the restricted `app_web` database password available privately. The latter is the service credential saved while configuring Vercel's `DATABASE_URL`.

Offline readiness check (no network/login/account changes):

```powershell
pnpm staff:promote:hosted --check
```

Start the interactive operation:

```powershell
pnpm staff:promote:hosted
```

Enter your Admin email, the Agent email and a required reason. Your current Admin password and the restricted database password are requested at separate hidden prompts. Review the resolved name, email, profile ID, revision and role change; type the exact `PROMOTE <agent-email>` confirmation shown. Any different response cancels. Ctrl+C at the confirmation prompt cancels and runs session cleanup.

The promoted person must sign in again to obtain an Admin application session. Their email, profile identity and preferred language are retained. No second Citizen/staff identity is created.

## Controls

- Fixed hosted project, Ireland session pooler, restricted `app_web` identity, TLS certificate verification and pinned public root-CA hash. Local Podman configuration is not repurposed or overwritten.
- Uses only a selected public/publishable Auth key for provider operations. Existing CLI output is captured privately; credentials are never printed, accepted as command arguments, saved to fixtures/env files or sent through SQL command-line arguments.
- Fresh password sign-in is bound to the verified provider user and claims/session ID. Both the account and application role must be active Admin. Staff password policy remains minimum 15 Unicode characters.
- A fresh random application proof is kept in memory. The command creates and closes its own temporary application session and signs out only its own provider login; existing browser sessions of the acting Admin remain intact.
- Promotion accepts only a confirmed active Agent with completed activation. Citizen accounts, pending invitations, disabled accounts, existing Admins, missing accounts and self-targeting are refused.
- The exact confirmed target is read again before mutation. Changed details/revision fail closed. Confirmation must finish within five minutes of authentication.
- The existing `app.manage_staff_authority` procedure performs the role change using the confirmed expected revision and mandatory reason. Its atomic role/security-epoch update, target-session revocation, locking, authority checks and immutable ROLE_CHANGED audit are retained.
- No owner database role, service-role Auth operation, schema migration, new grant, RLS change or public provisioning endpoint is added. Other authority operations and the existing local CLI remain unchanged.
- Normal success, cancellation and handled failures attempt both application/provider session cleanup. Cleanup failures are explicitly reported. If a command response is lost, inspect the staff account before retrying; the tool never retries a role change automatically. Forced process termination or an unavailable database can prevent immediate cleanup; existing session expiry remains the fallback.

## Verification

Focused orchestration/provider tests cover Admin and target eligibility, confirmation/cancellation, revision races, activation recheck, authentication freshness, generated proof, cleanup and public-key/provider-identity binding. The offline check validates the actual prepared workstation configuration. A read-only hosted preflight checks that the seven required protected functions exist and are executable by `app_web`.

No real account is promoted during development verification. The first live promotion requires the owner's private interactive authentication and exact target confirmation. The CLI does not require a Vercel redeployment because it uses the already deployed protected database procedure.

Latest verification: 30 focused tests PASS across two files; typecheck PASS; lint PASS, with final focused lint on the changed scripts/tests; actual offline pinned-configuration check PASS; existing CLI public-key lookup PASS (no key displayed); read-only hosted preflight PASS for all seven required protected functions. No live account promotion was performed. Those results describe the original terminal-only implementation. Dashboard verification is recorded separately below.

## Dashboard verification — 2026-10-21

- Focused promotion component/action/repository tests: **40 passed**, 0 failed across three files. Includes confirmation/cancellation, password proof and cleanup, refreshed Admin authorization, original-session binding, stale revisions, exact targets, pending/disabled/Citizen rejection and success feedback surviving the role refresh.
- Existing staff invitation/status/model/presentation checks: **12 passed**, 0 failed across three files.
- Targeted isolated production-build E2E: **7 passed**, 0 failed (four existing DEV-07 staff-administration cases plus three promotion cases in AR/FR/EN). Promotion cases cover cancellation/Escape, wrong password, recipient confirmation, dialog accessibility, 1440/820/390/320px reflow, RTL/LTR, one persisted ROLE_CHANGED audit, target-session revocation and Admin access after a new sign-in.
- Typecheck: **PASS**. Lint: **PASS**. Production build: **PASS**, as part of the isolated E2E runner.
- Temporary-unavailable route checks: **PASS** in AR/FR/EN, performed by the existing isolated runner.
- Changed-file secret-safety scan: **PASS** across 19 files; no credential-like literals found. No new dependency or environment variable.
- Frozen migrations, acceptance records and design/reference files: unchanged. Only the disposable E2E database was reconstructed; the owner-review database and hosted accounts/schema were not modified.
- Dashboard implementation is local and uncommitted/unpushed at this verification point. A normal Vercel deployment of these application changes is required before the button appears online. The optional terminal promotion command is retained.
