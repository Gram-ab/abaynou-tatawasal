# Hosted Auth schema compatibility correction — 2026-10-18

Status: owner approved the hosted correction and Git publication on 2026-10-18. The additive migration is applied to hosted project vdpflzhsohhvvwdrjzhd. Hosted permissions, bindings and restricted-role RLS smoke checks pass. Authenticated deployed-page owner retesting remains pending.

## Observed failure

The owner reported that Citizen account access works, while Citizen home, complaint list and new-complaint pages show the generic information-loading error. The investigation did not use or save the offered test-account credentials.

Read-only diagnostics used the existing Supabase CLI login and the isolated linked workspace, pinned to project vdpflzhsohhvvwdrjzhd (Ireland). Results:

- app_writer has SELECT on the five previously approved Auth identity columns.
- app_writer does not have USAGE on the managed auth schema.
- postgres cannot delegate that schema USAGE privilege.
- app_web can execute both complaint listing and command recovery, and cannot read auth.users directly.
- Auth users RLS is enabled. The 12 affected functions are owned by app_writer and are SECURITY DEFINER.

Citizen account rendering resolves application session/profile data. Complaint listing and new-command recovery additionally call require_complaint_citizen, which reads auth.users to revalidate verification. The missing namespace access fails at that read. Local maintenance already compensates through ensureLocalComplaintAuthUsage using the local schema-owner socket; that owner privilege is unavailable on the hosted project. Successful migration history alone did not validate the effective hosted grant.

## Applied correction

New migration: supabase/migrations/20261018000100_managed_auth_projection.sql. All 26 existing migrations remain unchanged.

- Binds the existing Auth table once through app.provider_auth_users, projecting only id, email, email_confirmed_at, last_sign_in_at and raw_user_meta_data.
- Explicit security_invoker=true retains the restricted caller's underlying column grants and RLS policies. security_barrier=true is also explicit. It does not execute reads with the migration owner's elevated table permissions.
- Only app_writer receives SELECT on the projection. Web, anonymous, authenticated, service-role, reader and mailer logins receive no direct projection access or write grants.
- Rewrites only the internal relation name in an explicit list of 12 existing protected functions. Guards check their expected owner, SECURITY DEFINER and empty search path, then verify owner/execute ACL preservation. Three functions had revoked even owner execution; the non-superuser migration executor receives temporary EXECUTE solely for replacement validation, revoked before commit with exact original ACL equality checked. No application role gains permissions.
- Covers the same namespace problem in Citizen complaints/recovery, staff directories/identity checks, and mail-recipient revalidation without changing those functions' authorization or business rules.
- Does not grant Auth schema usage, role inheritance, BYPASSRLS, Auth writes, or owner credentials to the runtime. Does not alter password/email policies, UI, frozen sources, complaint lifecycle or outbox semantics.

PostgreSQL resolves the base relation at view creation; view users need namespace access to the view's schema, while security-invoker views retain base-table permissions and RLS: https://www.postgresql.org/docs/17/sql-createview.html.

## Targeted verification

scripts/verify-managed-auth-projection.ts uses a uniquely named empty local database and synthetic identities. It reconstructs the 26 prior migrations, reproduces the hosted missing-USAGE condition, applies the new migration, and drops the disposable database in finally. It never resets the owner's local database, changes existing identities, sends emails, uses hosted credentials, or grants cluster-wide role memberships. Existing role presence is required before reconstruction. The final migration is applied as non-superuser postgres in the scratch database, reproducing hosted function-validation restrictions rather than relying on the local superuser. Scratch-only schema/column grants match the migration executor access; no cluster-wide role membership changes are made.

Latest successful verification: 36 checks PASS. Includes the before-fix 42501 complaint-list/recovery failures with a still-working account resolver; after-fix empty states, catalogues, persisted submission/tracking/recovery, cross-Citizen and wrong-proof denial, no direct Auth/view access for app_web or public/provider roles, Auth RLS row scoping, five-column projection, no view write grants, unchanged function owners/ACLs/search paths, Admin reads, Agent denial and worker recipient revalidation. Scratch reconstruction uses a minimal synthetic Auth table rather than copying provider users or secrets; live hosted behavior still needs confirmation after application.

Typecheck PASS. The linked dry run PASS proposes exactly one migration (20261018000100_managed_auth_projection.sql), with no seeds or role changes. All original 26 source/release copies match their recorded SHA-256 hashes, and the new release copy matches its source. The three intended source files pass the secret scan with no findings; frozen planning, acceptance and design sources are unchanged. Lint PASS. No frontend code or dependency changed, so another production bundle build or full historical E2E run is not required for this SQL-only correction. Deployed QA remains incomplete.

## Hosted application evidence

The first apply attempt rolled back atomically because PostgreSQL function validation denied execution on an owner-revoked function. No partial view/function change or migration-history entry remained. The corrected migration passed the same 36 local checks using non-superuser postgres; a fresh linked dry run still proposed exactly this one migration.

Owner-authorized CLI application then succeeded on 2026-10-18 using the isolated linked release workspace. No seeds, resets, role provisioning or existing-data edits were performed. Hosted read-only verification confirms:

- 27 migration-history entries; latest version 20261018000100.
- Exactly five approved projection columns, with security_invoker and security_barrier enabled.
- SELECT granted to app_writer; view write privileges denied.
- No direct projection SELECT for app_web, app_reader, app_mailer, app_mail_worker, anon, authenticated or service_role.
- app_writer still lacks Auth schema USAGE; app_web still lacks direct Auth table SELECT.
- All 12 expected functions use the projection and retain their original owner, SECURITY DEFINER, empty search path and exact execute ACLs.
- Temporary migration validation execution grants are absent.
- Auth users RLS remains enabled. Actual SELECT under app_writer succeeds through the projection and returns no rows for both unscoped and nonexistent synthetic identity scopes; the check rolls back and does not expose personal data.

The ordinary local Supabase checkout remains unlinked. Original migrations, planning/acceptance documents and design sources remain unchanged. Git publication is limited to the additive migration, disposable verifier and this record. Final secret scan and Git whitespace review pass with no findings; runtime/local artifacts and credentials are excluded.

## Remaining deployed QA

The owner should reload Citizen home, complaint list and new-complaint pages and verify account access still works. Authenticated browser QA was not performed with the offered credentials; local functional tests and hosted metadata/RLS smoke checks do not substitute for that final browser review. No frontend bundle change is needed for the database correction. Worker scheduling remains a separate unfinished setup item. Gmail spam placement remains an open delivery issue, deferred while correcting this failure.
