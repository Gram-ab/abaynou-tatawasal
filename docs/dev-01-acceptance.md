# Abaynou Tatawasal — DEV-01 Acceptance & Freeze Record

**Status:** APPROVED / FROZEN

## Slice

DEV-01 — Multilingual Application & Public Foundation

## Owner decision

The project owner completed the final technical, visual, and manual review and explicitly approved DEV-01. The slice is recorded as **APPROVED / FROZEN**.

## Scope accepted

The accepted DEV-01 baseline consists of the production-quality Next.js application foundation, pnpm project setup, local Supabase development environment, multilingual public information experience, restricted public data access, responsive and accessible presentation, local development fixtures, and the supporting verification and operating documentation.

## Accepted visible result

The application provides the approved public foundation through nine public pages in Arabic, French, and English. Arabic renders right-to-left; French and English render left-to-right. The accepted result includes locale-preserving navigation, responsive desktop/tablet/mobile layouts, accessible keyboard behavior and system states, the approved public visual language, and clearly unavailable non-submitting account interface previews.

## Accepted database scope

DEV-01 contains exactly these seven application entities:

1. `application_profiles`
2. `audit_events`
3. `public_pages`
4. `public_page_versions`
5. `public_page_translations`
6. `commune_settings`
7. `commune_settings_translations`

## Migration baseline

The accepted ordered migration baseline is:

1. `20260919000100_identity_audit.sql`
2. `20260919000200_public_publications.sql`
3. `20260919000300_commune_settings.sql`
4. `20260919000400_fixed_public_pages.sql`

## Verification summary

- Unit, component, and integration tests: **28/28 PASS**
- Migration and integrity tests: **30/30 PASS**
- Publication, constraint, RLS, and grant tests: **76/76 PASS**
- Live failure and secret-isolation integration tests: **8/8 PASS**
- Database checks total: **106 PASS**
- Final Playwright tests: **67/67 PASS**
- Required page/locale routes: **27/27 PASS**
- Typecheck: **PASS**
- ESLint: **PASS**
- Production build: **PASS**
- Clean local Supabase reset and reconstruction: **PASS**
- Frozen requirements and supplied design files: **unchanged**

## Local environment baseline

- Supabase is local only.
- No hosted Supabase project is linked.
- The development container environment uses Podman.
- No production deployment was performed.
- The runtime database identity is restricted to safe public projections.

## DEV-01 exclusions confirmed

The accepted baseline contains no Citizen authentication backend, application sessions, complaints, categories or locations persistence, notifications, email outbox, Commune processing workflow, staff administration, or public-content administration UI. The public sign-in, registration, and recovery pages are interface previews only and do not submit or persist entered information.

## Accepted design and localization baseline

The accepted design baseline is the public implementation derived from the approved public handoff, its design tokens, supplied transparent assets, and the frozen written requirements. It includes the compact shared header, public navigation, Arabic typography, green/beige/neutral visual system, public page hierarchy, Chikaya orientation banner directly above the footer, responsive layouts, and shared information-page treatment.

The accepted localization baseline is Arabic as the default locale with RTL direction, and French and English with LTR direction. Locale switching preserves the equivalent public page. IBM Plex Sans Arabic weights 400, 500, 600, and 700 are self-hosted.

## Non-blocking production items carried forward

- Commune-approved phone, email, address, and opening hours.
- Final approved service wording.
- Approved Privacy and Terms content.
- Final accessibility statement and barrier-reporting channel.
- Final official Arabic, French, and English content.
- Production ownership, hosting, deployment, monitoring, backup, and operating requirements.

These items do not block the DEV-01 freeze, but they must be resolved through the appropriate approved future work before public production launch.

## Freeze boundary

DEV-01 requirements, accepted behavior, schema baseline, security guarantees, and visible public foundation are frozen.

Future slices may extend shared code and database structures where explicitly planned, but must not regress or silently change the accepted DEV-01 behavior.

Any intentional change to the frozen DEV-01 behavior requires explicit project-owner approval.

## Development baseline commit

The accepted source baseline is the local Git commit identified below. The value is recorded after creation of the initial baseline commit so that it refers to an immutable commit object.

**Baseline commit:** `262bfd3784ed55603ade6d0cfc072080fa291f8f`

## Next slice status

**DEV-02 has NOT started.**
