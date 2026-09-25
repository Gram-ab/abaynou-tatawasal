# DEV-03 — Commune Authentication & Protected Shells

Owner manual review: approved. Final freeze status and verification are recorded in [DEV-03 acceptance](dev-03-acceptance.md).

## Implemented boundaries

- Shared server application-user resolver binds verified Supabase identity and provider session to the hashed application cookie, database profile, ACTIVE status, security epoch, idle deadline and absolute deadline.
- Independent Citizen, Commune staff and Admin guards. Protected pages and server actions authorize independently of the layout. Citizen account commands retain database role checks.
- AGENT/ADMIN use the existing application_sessions table: 1 hour inactivity, 8 hours absolute. Citizen policy remains 7 days / 30 days. Prefetch and passive resolver calls do not refresh activity; no polling or health endpoint renews sessions.
- Independent sessions coexist. Logout revokes the current session; recovery revokes all; password change rotates the current application secret, retains the reauthenticated current session and revokes other sessions.
- Dedicated /{locale}/commune/login; no public staff signup, role selector or Citizen/Commune switcher. Following owner review, a small localized Commune link is present in the public footer for guests and staff, and hidden during a valid Citizen session. Citizen credentials at staff login receive a neutral denial. Staff credentials at Citizen login now receive the same invalid-credentials message as a wrong email/password, without identifying their role or linking to staff login.
- Dedicated scanner-safe recovery: the email GET stores a sealed, short-lived intent; explicit confirmation consumes the proof. Reset requires a bound provider recovery session, ACTIVE staff profile and Commune audience, then requires a fresh login.
- Staff password minimum: 15 Unicode characters; Citizen minimum remains 10. Staff login, bootstrap, reset and change enforce the staff minimum. Spaces/paste/password managers are supported; no composition or periodic rotation rule.
- Staff identity is read-only. Own language and password are editable. No email, name, role, status or other staff-account administration is exposed.
- Disabled, expired, revoked and stale sessions fail closed. Invalid Commune authentication state is cleared through a dedicated route without recreating application access from provider authentication.
- Non-login function owners, restricted app_web runtime, forced RLS and reviewed function grants are retained. No table was added. Local fixture provisioning is absent from web/runtime entry points.
- Successful issuance, logout, profile-language and credential-security operations record the actual database actor role. Local fixture creation uses an exact SYSTEM source marker. Denials use fixed-name telemetry without identifiers, passwords, tokens or proofs.

## UI and scope

Arabic, French and English; RTL for Arabic and LTR for French/English. The Commune shell follows the supplied dark-green sidebar, compact white topbar, pale workspace and bordered panels. The sidebar is fixed on desktop and becomes a focus-managed drawer on tablet/mobile, with Escape, focus restoration, focus trapping and an inert workspace.

Only home, own account and password/security navigation is enabled. Fake complaints, search, counters, notifications, charts, staff lists and management links from later-slice screenshots are intentionally omitted as required by the approved scope. The supplied existing brand asset is reused without regeneration. No dedicated staff-auth or mobile design was supplied; these use the existing typography, color, control and responsive conventions.

Routes: commune; commune/login; commune/forgot-password; commune/reset-password; commune/auth/confirm; commune/auth/end-session; commune/account; commune/account/password; commune/account-disabled; commune/session-expired; commune/access-denied. Localized loading and error boundaries are included.

## Local bootstrap

`pnpm staff:bootstrap` is an explicit interactive local command. It refuses linked projects, unexpected local project configuration and non-loopback/mismatched Auth/database targets. It creates verified Auth users, matching profiles and STAFF_CREATED audit evidence. Password input is hidden and never logged or accepted as a command-line argument. Matching fixtures are idempotent without overwriting credentials; conflicting Citizen/role/unmanaged identities are rejected. Marked Auth-only interrupted fixtures may be reconciled for the same staff role.

The owner created local Agent/Admin review accounts. Their credentials are not source data and are not included in this document or Git. No reset is performed during final freeze verification, preserving those accounts.

## Final public navigation and entry behavior

Guests see Citizen sign-in/registration and the small localized Commune footer link. Valid Citizens see their clickable account name and sign-out, with no Commune footer link. Valid staff see their clickable staff account name and staff sign-out, and retain the Commune footer link. Names open the appropriate localized account page on desktop and mobile; selecting a mobile link closes the menu. Public pages remain browsable while authenticated.

Citizen login/registration and Commune login redirect an existing valid application session to its own role's space. Server actions repeat this check before provider mutation, preventing stale login tabs from switching the active account. Invalid, disabled, expired, revoked and provider-only sessions do not pass these entry checks. Return destinations are fixed or explicitly allowlisted. Protected routes/actions authorize independently.

Public and Citizen mobile menus dismiss on outside pointer/touch, Escape and navigation. Transitions respect reduced-motion preferences; hidden menus are inert. The Commune drawer additionally traps and restores keyboard focus and makes the workspace inert while open.

## Freeze-safety test cleanup

Automated password inputs use built-in Node crypto at runtime. Valid account passwords contain 32 characters. Short invalid inputs remain only where required to prove policy rejection (including the provider-accepted, application-rejected staff fixture). Unicode, lowercase/space, confirmation-mismatch and maximum-length validation semantics are preserved. No dependency was added.

Password-bearing browser tests disable traces, automatic screenshots, video and failure DOM snapshots. Password entry uses native input events without exposing values in fill-call diagnostics; equality checks report booleans. Explicit visual captures mask credential fields, and accessibility failure output reports rule identifiers. Runtime values are not written into source, fixtures, environment files or logs. Local Auth stores password hashes as required for disposable account authentication.

The cleaned files are the three E2E specs (Citizen, Commune and public design), Commune actions and stale-entry integration tests, Commune model tests, and the local-target mock URL tests. Shared support helpers hold generation and private-input behavior.

## Scope and release gates

No hosted Supabase project, production SMTP, complaint implementation, DEV-04 or DEV-07 staff management is included. Production email/hosting/security operations, legal/contact confirmation and production release acceptance remain future gates. Frozen DEV-01/DEV-02 migrations, planning documents, acceptance records and design handoff/reference files are unchanged. Validation uses the local Supabase/Mailpit stack and Chromium; other-browser certification is not claimed.
