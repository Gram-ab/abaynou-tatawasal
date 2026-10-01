# DEV-09 — Settings / Public / Legal Content Administration

Status: **APPROVED / FROZEN**

## Accepted implementation

- ADMIN-only management of the nine fixed public and legal pages: HOME, HOW_IT_WORKS, SERVICE_SCOPE, FAQ, CONTACT, USER_GUIDE, PRIVACY, ACCESSIBILITY, and TERMS. Public and legal lists are separate; no arbitrary pages, routes, drafts, or generic CMS were added.
- Publications require complete Arabic, French, and English bundles with constrained paragraphs and `##` headings, validated limits, and safely escaped rendering. Each publish atomically creates the next sequential immutable version, advances the current version, records audit evidence and an idempotent command receipt, and keeps bounded Admin history. Restoring older text requires a new publication.
- Privacy and Terms versions and existing Citizen acknowledgement evidence remain immutable. Publishing newer legal text does not automatically force existing Citizens to re-acknowledge.
- ADMIN-only Commune settings cover contact phone/email, the approved Chikaya destination, and localized Commune name, public address, and opening hours. The name appears in shared header branding and the public footer; the supplied logo asset and page publications are separate. Settings use revision checks, conflict handling, row locks, audit evidence, and idempotent commands. The Chikaya URL accepts only the approved HTTPS destination forms.
- Settings history displays actor, time, and localized changed-field names. It does not retain complete snapshots of old settings values. Initial page publications identify the local foundation initializer only when the recorded actor is SYSTEM; unknown attribution is labelled explicitly.
- Bootstrap-only initialization creates clean development content and preserves existing Admin publications, current pointers, revisions, and settings. Identity corruption fails safely.
- Server-side Admin authorization, DB-level session validation, FORCE RLS, narrow grants, and public current-version projections protect administration and history. Agents, Citizens, and anonymous visitors cannot mutate content or settings.
- Arabic RTL and French/English LTR, responsive desktop/tablet/mobile layouts, 320px reflow, keyboard and focus behavior, confirmation dialogs, and accessibility checks are part of the accepted UI. The Commune sidebar keeps identity and logout visible on shorter screens, and Admin password access is in Settings.
- DEV-10 functionality was not implemented.

## Project-owner approval

The project owner manually reviewed DEV-09, requested final note/content and UI adjustments, reviewed the resulting state, and approved the slice. This is slice-level approval. A separate complete platform-wide manual and technical review remains required after the development roadmap and before QA; that later checkpoint does not invalidate this approval.

## Verification record

- DEV-09 database checks: **22 passed**.
- Targeted unit/component/integration: **8 passed**.
- Focused DEV-09 E2E: **3 passed**.
- Database reconstruction: **403 passed**.
- Combined unit/component/integration: **186 passed**.
- DEV-01–DEV-09 combined E2E: **120 passed, 0 failed**.
- Typecheck: **PASS**. Lint: **PASS**. Production build: **PASS**.
- Changed-source security/secret review: **PASS / clean**.

The final shared branding and separate page-list corrections were functionally relevant, so focused verification was rerun after them: **16 unit/component/integration tests passed**, **3 DEV-09 E2E passed**, and the responsive Commune sidebar E2E **passed**. Lint and the production build passed. The combined historical regression was not rerun for the freeze.

## Frozen-source and release safety

- DEV-01 through DEV-08 migrations, previous acceptance records, frozen planning documents, and design/reference files are unchanged.
- No hosted Supabase project was created, linked, or modified. No production SMTP or hosting configuration was added.
- Local secrets, runtime data, build output, test reports, and generated artifacts remain outside the commit.
- Citizen account disabling is assigned to **DEV-10 — Administration Completion**. It is no longer unplaced, remains **not implemented**, and is required before the final end-of-development verification. DEV-10 has not started.

## Final development review checkpoint

After DEV-10 is implemented, approved, frozen, and pushed, perform a dedicated complete development review before QA. It will include global technical verification, cross-slice regression, security and authorization review, database and migration verification, manual review of the full platform and major DEV flows, and confirmation that each frozen MVP requirement is implemented or explicitly resolved. This checkpoint has not started.
