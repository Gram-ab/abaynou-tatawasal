# Apply the reviewed staging migrations

Target: Supabase project vdpflzhsohhvvwdrjzhd, West EU (Ireland).

The owner supplied a successful CLI login/link and migration dry run on 2026-10-16. All 26 expected migrations were pending in the same order as the reviewed manifest. A subsequent local check confirmed the linked project ref and all source/copy SHA-256 hashes; the ordinary Podman checkout remains unlinked. No application migrations have been applied by the assistant.

## Owner-executed apply

Run from the repository terminal. This command **changes the hosted staging database**, applying the 26 reviewed application migrations and recording their history. It does not seed fixture data, configure Vault secrets, deploy Vercel, or push Git.

```powershell
pnpm exec supabase db push --linked --skip-vault --workdir .local/hosted-staging-vdpflzhsohhvvwdrjzhd
```

Review the CLI migration list and confirm its prompt only if it shows the same 26 expected files and target. Enter any requested password privately. Do not add include-seed/include-roles or use local reset/bootstrap helpers. If a migration fails, stop and share only the safe error and migration filename; keep successful migration history intact. Do not reset the hosted project, repair history, skip a migration or weaken permissions to continue.

After successful completion, list history:

```powershell
pnpm exec supabase migration list --linked --workdir .local/hosted-staging-vdpflzhsohhvvwdrjzhd
```

All 26 versions should appear in both Local and Remote columns. Share that result and the safe completion/error summary, without secrets or debug output. Then prepare the separate canonical-data/publication initialization, runtime role passwords, Auth configuration and initial administrator. Migration completion alone does not make the app usable or production-ready.
