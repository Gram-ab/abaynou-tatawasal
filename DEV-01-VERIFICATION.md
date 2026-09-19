# DEV-01 verification report

Project: Abaynou Tatawasal — أباينو تتواصل. Date: 2026-09-19.

Status: DEV-01 implementation and required automated verification complete. Awaiting project-owner review/approval; DEV-01 is not owner-approved/frozen yet. This report covers DEV-01 only.

## Result and environment

The local Next.js multilingual public foundation is implemented. Git is initialized locally, with no remote configured and no commit created by this task. pnpm is the only package manager and pnpm-lock.yaml is preserved. Supabase CLI 2.117.0 is project-scoped.

The original failure was Podman 6.0.2 Windows/WSL port forwarding: PostgreSQL was healthy inside its container and accessible through the machine IP, but Windows 127.0.0.1:54322 refused connections. The owner upgraded the client/server and recreated the machine. Verified client/server 6.1.2, running rootful default machine, 4 CPUs, 8 GiB, 100 GiB. Windows 127.0.0.1:54322 is now reachable, and Supabase starts successfully. Missing project-local Studio mount directories were also created; no system workaround or port change was needed.

Local endpoints: application http://127.0.0.1:3000/ar, API http://127.0.0.1:54321, database 127.0.0.1:54322, Studio http://127.0.0.1:54323. Configured service health checks pass. REST and Edge Runtime containers run without a container healthcheck. Disabled imgproxy/pooler are not failed services.

No hosted Supabase project was created, linked, or targeted. No deployment, remote push, DNS, SMTP, GitHub remote, or production resource was created.

## Database and fixtures

Four ordered migrations:

1. `20260919000100_identity_audit.sql` — final structural profiles, provider Auth FK, audit foundation, restricted roles, RLS and immutable audit history.
2. `20260919000200_public_publications.sql` — fixed-key page/version/translation model, same-page publication pointer, complete immutable language bundles, audited offline publisher and public projection.
3. `20260919000300_commune_settings.sql` — singleton typed public settings, translations, guarded audited offline configuration, safe public projection.
4. `20260919000400_fixed_public_pages.sql` — nine fixed identities; no temporary informational/legal copy in migrations.

Final development state after clean reset and idempotent fixture rerun:

| Application entity | Rows |
| --- | ---: |
| application_profiles | 0 |
| audit_events | 10 |
| public_pages | 9 |
| public_page_versions | 9 |
| public_page_translations | 27 |
| commune_settings | 1 |
| commune_settings_translations | 3 |

Exactly seven application entities exist. Supabase provider tables are infrastructure, not added application entities. No profile signup or provisioning behavior exists.

The application schema is not exposed through the Data API. app_web is non-owner, non-superuser, non-BYPASSRLS, and can execute only the two narrow read functions. Their non-owner app_reader owner remains subject to RLS. Public projections exclude identity, revision, version/audit linkage, actors, and historical/unpublished content. Parameterized server-only PostgreSQL access and strict Zod result validation supplement database controls.

Offline maintenance functions use a separate non-login app_writer. They require complete ar/fr/en bundles, reject stale revisions, preserve immutable publication history and create SYSTEM audit evidence atomically. Public callers cannot execute them or assume reader/writer roles. General audit and profile access is denied. No CMS or administrative UI was added.

`fixtures/public-content.ts` contains unmistakable development copy in all three languages. Privacy/Terms explicitly await approval; contact values are synthetic, with a reserved .invalid email domain. Fixture reruns produced zero new publications and no settings changes. Runtime credentials stay in ignored .env.local. The reset helper renews that credential, and seeding can restore it after a bare local reset.

Clean reconstruction passed with `supabase db reset --local` and with the documented `pnpm db:reset` helper: empty local database → four migrations → nine publications/settings/audit fixtures → successful integrity/security tests. SQL auto-seeding is disabled because the separate validated TypeScript fixture runner performs publication through the trusted write functions.

## Public application

Nine pages are available under /ar, /fr and /en: Home, How it works, Service Scope, FAQ, Contact, User Guide, Privacy, Accessibility and Terms. Layout/navigation are code-owned; informational copy and public settings come from current database projections. Server rendering is dynamic, avoiding stale shared publication caches or silent language fallback.

Arabic has lang=ar and RTL layout; French and English use LTR. Language links preserve the current page, and the root honors a supported saved locale with Arabic fallback. next-intl provides localized system states and an Africa/Casablanca date/number formatting foundation; no fixed Morocco UTC offset is used.

Shared primitives cover cards, callouts, buttons/links, failure states, loading placeholders, language links, header, mobile disclosure navigation, footer and FAQ disclosures. Missing publication, missing/malformed settings, database errors, unknown routes and unavailable future features fail safely with localized copy. Unknown routes return 404. Sign-in/create-account/submit CTAs lead to an explicit unavailable page, without forms or fake authentication.

The supplied green/white/beige visual direction, public layout, generous reading space and Arabic-first arrangement are preserved. Responsive checks cover 320, 375, 768 and 1440 CSS-pixel widths. Logical spacing properties and stacked layouts support RTL/LTR. Browser screenshots were visually reviewed for Arabic desktop and French mobile.

Accessibility includes semantic landmarks, skip navigation, visible focus, keyboard disclosure/menu operation, appropriate language/direction, contrast, reflow and reduced-motion support. Automated axe checks are smoke checks, not a claim of comprehensive accessibility certification.

Fonts: locally served Noto Sans Arabic and Noto Sans, selected for readable Arabic shaping and a compatible Latin appearance. The original screenshot font is unknown. Font choice remains subject to owner visual review.

Assets: original logo/hero source assets were absent. A provisional text/letter brand and simple original SVG line illustration are used. No raster screenshot was cropped or misrepresented as an original production asset.

## Verification

| Check | Result |
| --- | --- |
| Dependency installation / exact lockfile | Passed |
| Unit + component + mocked persistence tests | 28 passed across 4 files |
| Migration 1 integrity/security | 30 checks passed |
| Publication/settings/projection/security | 76 checks passed |
| Live HTTP failure/secret-isolation integration | 8 checks passed; temporary grants/state restored |
| Final Playwright suite | 50 passed (1.7 minutes), including 18 axe smoke scenarios |
| Typecheck | Passed |
| ESLint | Passed, no source errors/warnings |
| Production build | Passed (Next.js 16.3.5) |
| Explicit local clean reset + helper reconstruction | Passed |
| Deterministic fixture rerun | 0 new publications; settings unchanged |
| OneDrive file watching | Passed: live CSS changed without page reload; source restored |
| Frozen-file SHA-256 comparison | 32 files checked; 0 changed |

Database negative checks cover profile/audit/raw-table denial; no runtime mutations or role switching; immutable history; stale publication rejection; same-page pointer FK; incomplete publication rejection at commit; singleton settings; unsafe URL rejection; required atomic settings audit; unique publication/audit linkage; current-only RLS; historical/unpublished isolation; and absence of internal metadata in projections.

Live HTTP checks also simulate database permission failures, missing settings and an unpublished required page, verify localized safe states, and scan public HTML/browser bundles for the generated runtime credential and internal metadata. These destructive-to-test-state scenarios run only against the disposable local database and restore state before browser verification.

Browser coverage includes all 27 page/language combinations, language persistence, unknown and unsupported routes, unavailable CTAs, internal links, Chikaya validation, keyboard skip link, FAQ interaction, responsive navigation, 320px reading/reflow, and axe WCAG A/AA smoke checks.

## Review decisions, limitations and owner actions

- Approve the visual implementation, font pairing and provisional brand/illustration, or provide original approved source assets.
- Supply/review official public copy, Privacy/Terms, institutional contact details and all translations before any public launch. Development fixtures are not official approvals.
- Review with real assistive technology and target devices; automated Chromium/axe checks do not replace that review.
- ESLint 10 uses the official @eslint/compat bridge for Next's bundled older React/import/a11y plugins. Their upstream peer ranges still produce pnpm warnings. Remove the bridge after compatible upstream releases. The deprecated whatwg-encoding package is a jsdom test-only dependency.
- The public CSP retains Next-compatible inline script/style allowances; all stored text is escaped, and no raw-HTML execution is supported. A stricter nonce policy can be evaluated with later authenticated work, without claiming it is already present.
- Current SYSTEM development writers are offline-only. Later authorized slices must add their own reviewed USER-authorized mutation paths; these functions are not public administration endpoints.
- No environment repair remains required. Local runtime services are left available for owner review. Restart Next after a database reset because its connection pool must reload the generated credential.

Frozen documents and supplied screenshots were not modified. DEV-02 was not started. No signup/login, application sessions, legal acknowledgment records, complaints, reference catalogues, notifications, outbox, staff administration or workflow functionality exists.

## Owner review checklist

1. Open /ar, /fr and /en; inspect the header, hero, fonts, footer and overall correspondence to supplied designs.
2. Visit all nine pages and switch languages on FAQ or Privacy; confirm the same page remains selected and Arabic direction is correct.
3. Check mobile/tablet navigation, long French text, contact cards, FAQ expansion and long-form reading pages.
4. Navigate with Tab/Enter, use the skip link, and check focus visibility and zoom/reflow.
5. Try sign-in/create-account/submit CTAs; confirm they show the unavailable notice, not a real form.
6. Review the development labels and identify the official content/assets needed before launch.
7. Approve DEV-01 or provide corrections. No DEV-02 work begins without separate authorization.

## Exact installed packages

| Package | Version |
| --- | --- |
| @fontsource/noto-sans | 5.3.0 |
| @fontsource/noto-sans-arabic | 5.3.0 |
| next | 16.3.5 |
| next-intl | 4.14.5 |
| postgres | 3.4.9 |
| react | 19.3.0 |
| react-dom | 19.3.0 |
| react-hook-form | 7.88.0 |
| server-only | 0.0.1 |
| zod | 4.6.5 |
| @axe-core/playwright | 4.13.0 |
| @eslint/compat | 2.1.1 |
| @playwright/test | 1.63.0 |
| @tailwindcss/postcss | 4.3.3 |
| @testing-library/jest-dom | 6.9.1 |
| @testing-library/react | 16.3.3 |
| @types/node | 22.20.3 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| eslint | 10.11.0 |
| eslint-config-next | 16.3.5 |
| jsdom | 26.1.0 |
| supabase | 2.117.0 |
| tailwindcss | 4.3.3 |
| tsx | 4.23.13 |
| typescript | 5.9.3 |
| vitest | 5.0.1 |

## File inventory

All implementation/support files below were created during DEV-01. Earlier drafts of these same files were updated during verification. No original docs/design file was modified. Local .git, node_modules, .next, test reports, screenshots, logs and .env.local are generated/ignored artifacts rather than source inventory.

- `.env.example`
- `.gitignore`
- `AGENTS.md`
- `CLAUDE.md`
- `DEV-01-STARTUP-DIAGNOSIS.md`
- `DEV-01-VERIFICATION.md`
- `eslint.config.mjs`
- `fixtures/public-content.ts`
- `next-env.d.ts`
- `next.config.ts`
- `package.json`
- `playwright.config.ts`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `postcss.config.mjs`
- `README.md`
- `scripts/check-watcher.ts`
- `scripts/local-target.ts`
- `scripts/local.ts`
- `scripts/seed-local.ts`
- `src/app/[locale]/[[...slug]]/page.tsx`
- `src/app/[locale]/error.tsx`
- `src/app/[locale]/layout.tsx`
- `src/app/[locale]/not-found.tsx`
- `src/app/[locale]/unavailable/page.tsx`
- `src/app/global-error.tsx`
- `src/app/layout.tsx`
- `src/app/not-found.tsx`
- `src/features/public-content/components/public-page.tsx`
- `src/features/public-content/markdown.ts`
- `src/features/public-content/model.ts`
- `src/features/public-content/repository.ts`
- `src/proxy.ts`
- `src/shared/db/public.ts`
- `src/shared/i18n/messages.ts`
- `src/shared/i18n/navigation.ts`
- `src/shared/i18n/request.ts`
- `src/shared/i18n/routing.ts`
- `src/shared/ui/footer.tsx`
- `src/shared/ui/header.tsx`
- `src/shared/ui/primitives.tsx`
- `src/shared/ui/public-loading.tsx`
- `src/styles/globals.css`
- `supabase/.gitignore`
- `supabase/config.toml`
- `supabase/functions/.gitkeep`
- `supabase/migrations/20260919000100_identity_audit.sql`
- `supabase/migrations/20260919000200_public_publications.sql`
- `supabase/migrations/20260919000300_commune_settings.sql`
- `supabase/migrations/20260919000400_fixed_public_pages.sql`
- `supabase/snippets/.gitkeep`
- `tests/components/public-ui.test.tsx`
- `tests/database/foundation.ts`
- `tests/database/http-failures.ts`
- `tests/database/public-boundary.ts`
- `tests/e2e/public.spec.ts`
- `tests/integration/public-repository.test.ts`
- `tests/unit/markdown.test.ts`
- `tests/unit/public-model.test.ts`
- `tsconfig.json`
- `vitest.config.mts`
