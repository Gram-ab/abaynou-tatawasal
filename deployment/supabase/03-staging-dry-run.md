# Hosted staging migration dry run

Prepared 2026-10-16 for project `vdpflzhsohhvvwdrjzhd`, West EU (Ireland).

The owner-supplied read-only preflight reports PostgreSQL 17.11, execution role postgres, role/schema creation allowed, provider Auth present, no app schema/history/custom app roles/public application objects. The earlier grant result confirms grantable SELECT on the five required Auth columns. This is a suitable starting point for migration preview; it does not prove every managed-host permission or migration will execute successfully.

## Local preparation completed

An isolated CLI workspace exists at `.local/hosted-staging-vdpflzhsohhvvwdrjzhd`. Its 26 migration copies match every SHA-256 in `deployment/supabase/migration-manifest.json`. It targets PostgreSQL 17 and automatic seeding is disabled. It contains no copied local environment, database passwords, Auth keys, accounts or data. It is ignored by Git. Neither it nor the original Podman checkout was linked during preparation; no hosted command ran.

Do not link the repository's ordinary `supabase/` folder: local tools deliberately reject linked projects. The commands below use the isolated workspace explicitly.

## Run in your own project terminal

From the repository root, run each command in order. Complete the CLI login in your own browser/terminal. If asked for the database password, enter it in the CLI's private prompt; do not place it in command text or send it in chat.

```powershell
pnpm exec supabase login
pnpm exec supabase link --project-ref vdpflzhsohhvvwdrjzhd --workdir .local/hosted-staging-vdpflzhsohhvvwdrjzhd
pnpm exec supabase db push --linked --dry-run --skip-vault --workdir .local/hosted-staging-vdpflzhsohhvvwdrjzhd
```

Stop if login/link fails or if a different project is shown. Do not add --debug, --include-seed, --include-roles, --yes, or remove --dry-run. Do not run reset, seed or local staff-bootstrap commands against this workspace.

The dry run lists migrations that would be applied; it does not apply the 26 application migrations or seed business data. `--skip-vault` avoids synchronizing configured Vault secrets. Login/link and CLI remote inspection are not a claim of completely write-free provider activity: provider login-role or migration bookkeeping may be involved. No application schema/content initialization is authorized by running this preview. Actual application of migrations remains a subsequent explicit step after reviewing the result.

Expected result: all 26 current migrations pending, from `20260919000100_identity_audit.sql` through `20261015000200_commune_complaint_paging.sql`. Share only the migration list and safe success/error summary. Do not share access tokens, passwords, keys, connection strings, or full debug logs.

If the preview differs from the manifest or reports a permission/history conflict, stop for inspection. Do not skip migrations, repair history, loosen grants or edit frozen SQL to force it through. A dry run plans order/history; actual hosted SQL execution still needs verification when apply is separately authorized.

## After successful preview

Review the exact 26-file snapshot, then authorize the hosted application-migration step separately. Afterwards verify migration history, restricted roles/RLS and schema; prepare fresh runtime credentials, canonical data/staging publications, initial administrator and hosted Auth/email configuration. There is no migration-apply command in this guide and no hosted seed/bootstrap runner has yet been prepared. No commit/push or Vercel deployment occurred.
