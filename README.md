# Abaynou Tatawasal — DEV-01

Local multilingual public foundation. This is a development preview, not a launched service. Public content, translations, legal notices, contact information and the provisional visual assets require owner approval.

## Local setup (Windows / Podman)

Prerequisites: Node 22.14+ in the Node 22 line (or another supported Node release), pnpm 12.4.2, working WSL2 and Podman. Verified here with Podman client/server 6.1.2, rootful podman-machine-default, 4 CPUs and 8 GiB. Windows loopback forwarding must work; the old 6.0.2 regression is described in DEV-01-STARTUP-DIAGNOSIS.md.

From this repository:

```powershell
pnpm install --frozen-lockfile
pnpm db:start
pnpm db:seed
pnpm dev
```

Open http://127.0.0.1:3000/ar (also /fr and /en). The helper uses the project-scoped Supabase CLI and the documented local Podman installation. It does not link or push a hosted project. Supabase may display local credentials; do not copy them into reports or commits.

`db:seed` writes a generated restricted app_web credential to ignored `.env.local`. It is not a service-role credential. After reset, the helper regenerates it; restart Next.js so its connection pool uses the new credential. Never put secrets in NEXT_PUBLIC variables.

## Checks

```powershell
pnpm db:status
pnpm db:verify
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install chromium
pnpm start
# In another terminal, while the production server runs:
pnpm test:e2e
```

For a clean disposable LOCAL reconstruction:

```powershell
# Stop the Next.js server first.
pnpm db:reset
pnpm db:verify
pnpm db:seed
pnpm start
```

`db:reset` checks local status and absence of a linked-project marker before `supabase db reset --local`, then runs the deterministic development fixtures. It destroys only this disposable local database. Never use it with production data.

The live HTTP failure checks (`tests/database/http-failures.ts`) temporarily change local read grants and the Privacy publication pointer, restoring them in finally blocks. Run them exclusively, with the production server on port 3000, after local verification; do not run them alongside browser tests or an owner review. A clean reset restores the expected fixture state if a test process is forcibly interrupted.

## Implementation boundaries

- Exactly seven application tables in non-exposed schema app. Provider auth.users is external infrastructure; no app profiles are provisioned.
- app_web can execute only the two safe public read functions. It cannot select raw tables, publish, modify settings, assume reader/writer roles, or access audit/profile/history data.
- Read functions use a non-owner, non-BYPASSRLS app_reader. RLS, grants and explicit projections select current complete publications only.
- Offline, restricted development writers publish all three languages atomically with SYSTEM audit evidence. No public Admin editor, account backend, session, complaint or later-slice module exists. Public authentication screens are explicitly non-submitting interface previews.
- Fixtures are separate from schema migrations and rerun without duplicate publications. Immutable publication IDs remain stable until a clean reset or a material copy change. Official content replaces development fixtures only after separate owner approval.
- Public pages render dynamically from the database, without a shared publication cache. Missing data and read failures show localized states; no fixture fallback masks a failure.
- The Markdown subset is paragraph text and level-two section headings; React escapes text. Arbitrary HTML and a page-builder are unsupported.
- IBM Plex Sans Arabic 400/500/600/700 is self-hosted. The public mark, architecture and zellige use unchanged transparent assets from the approved handoff.

## Review and limitations

All nine public pages exist in Arabic, French and English. Sign-in, account and submit buttons lead to the requested public authentication screens. These explain that account services are not yet enabled and never submit or store entered data. Demo contact values are deliberately non-official and not usable for contacting the Commune. Privacy and Terms are placeholders, not legal advice or approved legal text.

ESLint 10 uses the official @eslint/compat bridge because Next's bundled React/import/accessibility plugins still declare older peer ranges. Lint is verified with the bridge; pnpm may still report these upstream peer-range warnings. Remove the bridge when those packages support the current APIs. jsdom also includes the deprecated whatwg-encoding transitive package; it is test-only.

The implementation is local only. Production hosting, institutional contact verification, legal approval, authentication backend and complaints are outside this public restyle.

## Public design handoff update

The public restyle and authentication interface previews are documented in [PUBLIC-DESIGN-IMPLEMENTATION.md](PUBLIC-DESIGN-IMPLEMENTATION.md). See [design-qa.md](design-qa.md) for the latest visual verification. This supersedes the original DEV-01 report's provisional-font/asset descriptions. Account services remain unimplemented; the new forms do not submit or persist data.

