# DEV-05 — Citizen Tracking & Shared Commune Intake

Status: **APPROVED / FROZEN**

The project owner approved the final functional implementation on 2026-09-27.

## Accepted implementation

- Authenticated Citizens have a **My Complaints** area with owner-only complaint listing, detail, immutable history, reference/subject search, status filtering, and bounded load-more pagination.
- Citizen complaint detail preserves localized category/location snapshots, original authored text, status, submission/update times, and revisioned history without exposing internal complaint identifiers.
- A Citizen may edit or withdraw only their own `SUBMITTED` complaint. Both operations use idempotency fingerprints, expected-revision optimistic concurrency, immutable complaint/audit events, and atomic database commands.
- Citizen edit and withdrawal become unavailable after `UNDER_REVIEW`. Edit-versus-review and withdrawal-versus-review races have one valid winner; stale operations fail without partial changes or data loss.
- Agent and Administrator users share one Commune inbox and the same authorized complaint visibility. There is no assignment or ownership model in DEV-05.
- The Commune inbox supports reference, subject, or Citizen-name search; status and location filters; and bounded page-based Previous, Next, and direct-page navigation.
- Commune complaint detail includes the authorized Citizen contact context and complaint history needed for intake review.
- Authorized active staff can explicitly move a complaint from `SUBMITTED` to `UNDER_REVIEW`. The command is revision protected, idempotent, audited, and rejects every other source state.
- New submissions fan out one in-application `NEW_COMPLAINT` notification to each active Agent and Administrator in the transaction. Withdrawals similarly fan out `COMPLAINT_WITHDRAWN`.
- Starting review creates one `COMPLAINT_UNDER_REVIEW` notification for the owning Citizen. Staff added later receive no historical notifications; no historical backfill is performed.
- Staff notification read actions update the Commune header badge immediately. Existing passive polling remains a background synchronization fallback and does not replace action-driven refresh.
- DEV-05 adds no email type or email delivery behavior.
- Citizen and Commune navigation exposes the accepted tracking and intake routes. Lists use accessible table semantics on larger screens and responsive labeled rows on smaller screens.
- State-changing confirmations use the platform dialog rather than browser-native confirmation prompts.
- Arabic, French, and English are supported. Arabic uses RTL; French and English use LTR. References and user-authored content preserve safe bidirectional behavior.
- Core controls remain keyboard accessible, have visible focus behavior, and reflow across desktop, tablet, mobile, and 320px widths.
- DEV-06 lifecycle processing, responses, closure, rejection, assignment, analytics, and related functionality did not start.

## Data, authorization, and concurrency

DEV-05 adds three migrations:

1. `20260927000100_complaint_tracking_projections.sql`
2. `20260927000200_shared_workload_notifications.sql`
3. `20260927000300_pre_review_commands.sql`

The migrations add owner-only Citizen projections, authorized shared-staff projections, bounded staff pagination, edit/withdraw/start-review commands, lifecycle event integration, and staff/Citizen notification fanout. Trusted commands revalidate the application session, current profile role/status/security epoch, complaint state, revision, command fingerprint, and catalogue data as applicable. FORCE RLS, narrow grants, immutable events, atomic transactions, and server-side authorization remain authoritative.

## Deferred platform UI/UX refinement

The project owner approved DEV-05's functional implementation. Remaining non-blocking UI/UX polish is intentionally deferred to a platform-wide UI/UX refinement phase after the remaining functional development slices are complete.

Deferred work may include spacing and alignment refinement, visual hierarchy, card/table presentation, responsive polish, navigation consistency, visual consistency between Citizen, Commune, and public areas, and small interaction refinements.

This deferral does not include broken functionality, security or authorization problems, inaccessible core controls, data-loss risks, lifecycle errors, or blocking responsive defects. Any such finding remains a blocker rather than deferred polish.

## Final verification record

- Isolated clean database reconstruction: **PASS** — all 17 migrations applied, canonical initialization and idempotent rerun succeeded, and the disposable verification database was removed.
- DEV-05 database boundary: **24 checks passed**, including owner isolation, shared Agent/Admin visibility, filtered and paged staff projections, disabled-staff denial, lifecycle concurrency, revision protection, notification fanout, and runtime-table denial.
- Unit/component/integration: **150 passed across 17 files**.
- Focused final DEV-05 E2E: **3 passed, 0 failed**, covering Citizen list/edit/withdraw, designed confirmations, Commune intake/review, notification fanout and immediate staff badge synchronization, locale direction, accessibility, and representative mobile reflow.
- Final combined DEV-01 through DEV-05 E2E regression: **109 passed, 0 failed**.
- Typecheck: **PASS**.
- Lint: **PASS**.
- Production build: **PASS**.
- Final changed-source credential scan and Git safety review: **PASS**. Matches were limited to environment-variable access and runtime-generated disposable test credentials; no real or reusable credential was found.

The complete historical E2E regression was not repeated solely for freeze. The already successful 109-test combined run remains authoritative, while the final accepted table, confirmation, pagination, and Commune badge refinements were covered by the focused E2E, component, typecheck, lint, and isolated database checks recorded above.

## Frozen-source and scope confirmation

- DEV-01 and DEV-02 migrations are unchanged.
- The DEV-03 migration is unchanged.
- DEV-04A and DEV-04B migrations are unchanged.
- Prior acceptance records, frozen planning documents, and design/reference files are unchanged.
- No hosted Supabase project was created, linked, or modified.
- No production SMTP credential, token, password, session secret, or fingerprint secret is committed.
- Ignored local environment files, Supabase/runtime files, build output, dependencies, test reports, screenshots/videos, logs, caches, and local database artifacts remain excluded.
- DEV-06 did not start.
