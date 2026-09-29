# DEV-08 — Category & Location Administration

Status: **APPROVED / FROZEN**

## Accepted implementation

- ADMIN-only category administration and ADMIN-only location administration, presented as separate Commune dashboard entries and pages.
- Create, edit, activate, deactivate, and reactivate catalogue values without hard deletion.
- Opaque, server-generated, immutable `CAT_` and `LOC_` catalogue codes.
- Category activation requires approved Arabic, French, and English labels.
- Location activation requires the authoritative Arabic label; approved French and English translations remain optional.
- No automatic transliteration or invented translation.
- Revision and concurrency protection for catalogue mutations.
- Idempotent create, edit, and state-change commands.
- Immutable catalogue administration audit history.
- Complaint category and location snapshots remain historically immutable.
- Citizen editing permits retention of the complaint's current inactive category or location while excluding other inactive values.
- Complaint-linked inactive locations remain available to authorized staff as historical inbox filters.
- The canonical initializer now has bootstrap-only behavior: it creates missing canonical records, preserves legitimate Admin label and state changes, and fails safely on true identifier or code corruption.
- Arabic, French, and English operation; RTL/LTR layout; responsive and accessible administration flows.
- No DEV-09 functionality was implemented.

## Project-owner approval

The project owner manually reviewed and approved DEV-08. The accepted review covers category and location administration; activation, deactivation, and reactivation; translation behavior; historical snapshot preservation; Citizen selector behavior; inactive-current complaint editing; authorization; and localized, responsive operation.

Remaining non-blocking platform-wide UI/UX polish is deferred to the later platform-wide refinement phase.

## Verification record

- Database reconstruction and boundaries: **381 passed**
- Unit, component, and integration tests: **178 passed**
- Final targeted checks: **9 passed**
- DEV-08 focused E2E: **2 passed**
- Full combined E2E: **117 passed, 0 failed**
- Typecheck: **PASS**
- Lint: **PASS**
- Production build: **PASS**
- Changed-source secret scan: **CLEAN**

The final approved Categories/Locations dashboard split was additionally confirmed by the 9 targeted checks, both focused DEV-08 E2E journeys, typecheck, lint, and a production build. The historical regression suite was not rerun solely for freeze.

## Frozen-source and release safety

- DEV-01 through DEV-07 migrations are unchanged.
- Prior acceptance records and frozen planning documents are unchanged.
- Design and reference files are unchanged.
- No hosted Supabase project was created, linked, or modified.
- No DEV-09 functionality was started.
- Local secrets and runtime artifacts remain excluded from source control.

## Tracked deferred requirement

Citizen account disabling remains a frozen but unplaced MVP administration requirement. It is not implemented by DEV-08, is not marked complete, and must be explicitly assigned before final QA and release.
