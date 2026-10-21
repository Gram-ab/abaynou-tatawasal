# Initial hosted Administrator setup

Project-owner authorization: 2026-10-21. Target: hosted staging project vdpflzhsohhvvwdrjzhd, with Arabic selected for the first Admin. Personal account details are operational inputs, not source fixtures.

## Scope and security

- This is an offline first-Admin bootstrap, not a public registration route or a replacement for staff administration.
- The ordinary Podman checkout stays unlinked. The runner validates the pinned isolated release workspace and uses the existing authenticated Supabase CLI profile.
- Migration 20261021000100 adds an explicit HOSTED_INITIAL_ADMIN_BOOTSTRAP audit source. Frozen migrations, RLS policies, runtime grants and Auth policies are unchanged.
- No pre-existing Admin or email may be present. The initializer refuses conversion of an existing Citizen/staff identity. It checks the exact newly operator-created Auth identity, email and private operation marker.
- Auth creation uses the provider Admin API, never direct Auth-table inserts. The owner-selected email is confirmed by the trusted operator for this bootstrap. A cryptographically random disposable password is generated only in process memory and never revealed or stored outside the provider's normal password hash.
- No provider/application login session is issued by bootstrap. The mailbox owner receives the existing scanner-safe Commune recovery link to choose their own password of at least 15 characters. The Agent-only invitation screen is not changed or used for Admin activation.
- Profile creation and its SYSTEM/STAFF_CREATED audit event commit atomically. The same advisory lock used by staff authority management prevents concurrent first-Admin creation.
- Existing CLI authorization and project server API keys are handled in memory only. CLI/provider diagnostics and private responses are not printed. No key, password or link is written to an environment file, fixture, report or source file.
- No reusable SQL function, browser provisioning endpoint or new runtime grant is added.

## Running the initializer

Apply the reviewed additive audit migration through the isolated linked release workspace first. Run this from the repository root using the chosen email, display name and language:

```powershell
pnpm exec tsx scripts/bootstrap-hosted-admin.ts --email "<unused-admin-email>" --name "<admin-display-name>" --language ar
```

Without --apply it only checks the pinned target, absence of Admin/email conflicts and migration readiness. Add --apply to create the initial identity/profile/audit and request the password-setting email. Never supply a password or API key as a command argument.

If Auth creation succeeded but profile creation failed, an unusable marked Auth-only identity may remain. Stop and inspect that exact identity before reconciliation; the runner deliberately does not overwrite passwords, convert accounts, delete identities or automatically retry provisioning.

If profile/audit creation succeeded but email delivery failed, use the deployed Commune forgot-password page to request a new link. Do not bootstrap again. Provider acceptance of an email is not proof of inbox delivery; Gmail spam filtering remains a separate delivery issue.

Additional Admins must use controlled authenticated staff-authority promotion after the initial Admin exists. This initializer always refuses a second bootstrap. The existing promotion CLI is local-only and still needs a separately reviewed hosted adaptation; no public Admin-promotion UI is introduced here.

## Verification

- Isolated local database reconstruction: all 28 migrations PASS, with no reset of the owner's database.
- First-Admin database safeguards: 10 PASS, covering wrong identity marker, runtime denial, Citizen conversion denial, rejected-operation rollback, simultaneous creation, exact profile/audit/session state, repeat refusal, runtime audit denial and required audit reason.
- Existing Admin password-reset integration tests: 9 PASS.
- Typecheck: PASS. Lint: PASS; targeted lint rerun on the final scripts also PASS.
- Secret/whitespace checks: PASS. No full historical regression suite was rerun for this offline administrative setup.
- Hosted migration 20261021000100: applied through CLI; only this one version was pending. No seeds, resets or role changes were applied.

Account readback and email acceptance are reported by the runner. The owner must complete the private password-setting link and verify the Arabic Commune dashboard; no authenticated browser verification or password collection is performed by the bootstrap.
