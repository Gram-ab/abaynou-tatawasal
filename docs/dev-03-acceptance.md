# DEV-03 — Commune Authentication & Protected Shells

Status: APPROVED / FROZEN.

Freeze date: 2026-09-25.

The project owner approved the final DEV-03 implementation and authorized one local freeze commit, with no push and no DEV-04 work. This record describes the final approved behavior and supersedes earlier DEV-03 implementation proposals.

## Accepted implementation

- Dedicated localized Commune Agent/Admin sign-in and sign-out. No staff signup or public role picker. Wrong-audience credentials receive a neutral invalid-credentials response without disclosing staff membership.
- Scanner-safe staff recovery: email-link GET records a sealed, short-lived intent; explicit confirmation verifies it. Reset requires Commune-audience proof bound to the verified provider session and an ACTIVE staff profile; all application sessions are revoked and fresh login is required.
- Staff password change requires current-password reauthentication, rotates the current application secret and revokes other sessions. Staff passwords require 15–1024 Unicode characters, support spaces/passphrases and have no composition or periodic-rotation rule. Citizen minimum remains 10 characters.
- Staff sessions use the existing application_sessions model with a 1-hour inactivity timeout and an 8-hour absolute lifetime. Passive checks and prefetch do not renew activity. Expired, revoked, disabled and stale sessions fail closed; provider authentication alone does not recreate an application session. Logout revokes the current session.
- Server-side authentication binds verified provider identity/session, application-cookie digest, database role/profile, ACTIVE status, security epoch and deadlines. Citizen, Commune and Admin guards are independent; AGENT cannot pass the ADMIN boundary. Protected pages and actions authorize independently of layout and navigation.
- Protected Commune home/account/password shell, read-only staff name/email/role/status, and own preferred-language/password editing. There is no staff email-change or staff-management interface.
- Arabic, French and English throughout the shell and entry/safety states. Arabic RTL; French/English LTR. Preferred-language changes update the current account route and shell immediately.
- Responsive desktop/tablet/mobile layouts, self-hosted IBM Plex Sans Arabic, keyboard focus, accessible controls, skip navigation and empty/loading/error states. The Commune mobile drawer supports backdrop dismissal, Escape, focus trapping/restoration and inert background content. Public/Citizen menus support outside pointer/touch dismissal, Escape and navigation dismissal; transitions respect reduced motion.
- Role-aware public navigation: guests see Citizen sign-in/registration and the small Commune footer link; valid Citizens see their account name/sign-out and no Commune footer link; valid staff see their staff account name/sign-out and retain the footer link. Authenticated names link to the correct localized account page on desktop and mobile. Public pages remain browsable.
- Valid sessions entering Citizen login/registration or Commune login return to their own space. Entry actions also guard before provider mutation, preventing stale/old login tabs from switching an active account. Invalid or provider-only sessions are not treated as authenticated entry sessions.
- Local-only interactive staff bootstrap rejects linked/remote/mismatched projects, hides password entry, creates verified local Auth identities/profiles and SYSTEM STAFF_CREATED audit evidence, remains idempotent without overwriting credentials, rejects identity/role conflicts, and reconciles only explicitly marked interrupted fixtures.
- Existing forced RLS, non-login function owners and restricted app_web execute permissions are retained. The additive migration introduces no new table. Audit operations use actual database roles; denial telemetry uses fixed event names without credentials or personal identifiers.

## Final verification

Final successful results for the approved implementation and test-only safety cleanup:

| Check | Result |
| --- | --- |
| Database verification | 198 passed, 0 failed: 30 foundation + 76 public + 40 Citizen + 52 Commune |
| Directly affected unit/integration tests | 33 passed, 0 failed (4 files) |
| Full unit/component/integration suite | 91 passed, 0 failed (10 files) |
| Affected public-design E2E | 20 passed, 0 failed |
| Affected Citizen Auth E2E | 9 passed, 0 failed |
| Affected Commune Auth E2E | 20 passed, 0 failed |
| Full combined E2E | 99 passed, 0 failed, 0 skipped: 70 public regressions + 9 Citizen + 20 Commune (8.3 minutes) |
| Typecheck | PASS |
| Lint | PASS |
| Production build | PASS |
| Clean local database reconstruction/reset | Previously passed with the additive DEV-03 migration; no reset repeated during freeze, preserving owner review accounts |

Final successful verification date: 2026-09-25. The earlier four focused account-link browser checks passed before freeze safety cleanup; the final affected and combined suites include those scenarios. Final counts supersede earlier pre-refinement reports. The final affected run passed all 49 tests together (0 failed, 0 skipped). Its report JSON contained no generated 32-character password values. Final browser validation uses Chromium on the local production server with local Supabase and Mailpit.

The ordinary database verification command stopped at the frozen public test's clean-seed requirement of zero profiles, because review and E2E accounts now exist. Final database verification therefore ran the unchanged assertions against a uniquely named disposable database on the same verified local PostgreSQL instance. Only Auth/application schema was copied, public development content was seeded, and test connection construction was redirected to that database. No private identities, password hashes, sessions or tokens were copied; no application schema or assertion was altered. All 198 checks passed. The scratch database and temporary runner/source copies were removed. The review database and owner accounts were preserved. This verifies current database boundaries without claiming a new Supabase reset; the prior successful migration reconstruction/reset remains the reset evidence.

## Freeze-safety correction

Runtime-generated disposable password inputs replace fixed literals in:

- tests/e2e/citizen-auth.spec.ts
- tests/e2e/commune-auth.spec.ts
- tests/e2e/public-design.spec.ts
- tests/integration/commune-actions.test.ts
- tests/integration/auth-entry-actions.test.ts
- tests/unit/commune-model.test.ts
- tests/unit/local-target.test.ts

Built-in Node crypto is sufficient; no dependency or package-lock change was required. Valid account passwords contain 32 characters. Deliberately invalid lengths remain for negative validation tests, including the provider-accepted but staff-policy-rejected fixture. Lowercase/space, Unicode, maximum-length and mismatched-confirmation checks retain their purpose.

Generated plaintext remains in memory and is not written to source, fixtures or environment files. Browser tests disable traces, automatic screenshots/video and failure DOM snapshots; private locator checks avoid matcher-generated page snapshots. Password input waits for React hydration, uses native input events without value-bearing fill logs, and compares values using boolean results. Explicit visual captures mask credential fields. Accessibility failure reports include rule identifiers only. Local Auth stores hashes needed for disposable authentication fixtures.

During verification, an initial bootstrap run exceeded its 90-second timeout under concurrent local test load; it passed in isolation without application changes. A subsequent test-helper failure exposed an invalid disposable input in a generated diagnostic snapshot. That generated output was removed, input hydration and private assertion handling were corrected, and final suites were rerun. No real credential was found or committed.

## Frozen-source and scope confirmation

Compared with DEV-02 baseline 12563b328528eec514d865af527c66859f051334:

- DEV-01 and DEV-02 migration files are unchanged; DEV-03 uses only the additive 20260922000100_commune_auth.sql migration.
- Frozen planning documents, DEV-01/DEV-02 acceptance records and design/reference assets/screenshots are unchanged.
- No hosted Supabase project was created, linked or modified; local configuration remains unlinked.
- No production SMTP/service was configured.
- DEV-04 and DEV-07 staff management have not started; no complaint functionality was implemented.
- Production/legal/contact confirmation, hosting, SMTP and release readiness remain future gates.

## Git and secret safety

Only intended DEV-03 source, additive migration, tests, local source configuration, localization/navigation and acceptance/implementation documentation belong in the freeze commit. Local owner-review Agent/Admin accounts remain local; their email addresses/passwords are not committed as source credentials.

Excluded: .env.local, .local, Supabase temporary/branch/runtime data, Mailpit data, node_modules, .next, test-results, playwright-report, screenshots/videos/traces, coverage, logs, caches, tsbuildinfo, editor/OS files and private key/certificate files. Generated diagnostics from intermediate failed runs are not staged.

Final source secret scan: PASS; no plausible real password, key, token, private key, session secret or reusable bootstrap secret found in intended sources. No forbidden runtime/sensitive artifact path is included. The final full E2E report contains 99 successful tests and no generated 32-character password values. Final staged-file review: PASS, exactly 64 intended DEV-03 files, no runtime/sensitive artifacts, no unstaged or untracked source files, and no changes to frozen baseline documents/designs/migrations. Pattern scanning is supplemented by review of credential-related code; configuration environment references and clearly nonfunctional mock markers are not real secrets.

The authorized freeze is one local commit named `DEV-03 approved and frozen` on main. origin/main must remain at the DEV-02 baseline, with local main ahead by one commit. No push is authorized. Stop after verifying the local freeze commit and clean working tree.
