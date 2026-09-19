# Abaynou Tatawasal — Vertical-Slice Development & Delivery Plan

## 1. Document control, authority, and scope

| Field | Value |
| --- | --- |
| Project | Abaynou Tatawasal — أباينو تتواصل |
| Organization | Commune of Abaynou, Morocco |
| Phase | Development and delivery roadmap |
| Status | **APPROVED / FROZEN** |
| Development status | **NOT STARTED** |
| First implementation slice | DEV-01 — separately prepared and separately authorized |

This document is the authoritative development-sequencing and delivery-gate roadmap for the Abaynou Tatawasal MVP. The project owner has explicitly approved and frozen the vertical-slice strategy, DEV-01 through DEV-09, QA-01 through QA-04, REL-01 through REL-04, and the approval and manual-action rules recorded here.

This plan is governed by, and must remain consistent with:

- [Step 1 — MVP Scope](01-mvp-scope.md), **APPROVED / FROZEN**;
- [Step 2 — Functional Specification](02-functional-specification.md), **APPROVED / FROZEN**;
- [Step 3 — Complaint Lifecycle](03-complaint-lifecycle.md), **APPROVED / FROZEN**;
- [Step 4 — Roles / Permissions / Security](04-roles-permissions-security.md), **APPROVED / FROZEN**;
- [Step 5 — Technical Architecture](05-technical-architecture.md), **APPROVED / FROZEN**;
- [Step 6A — Database Technology & Operational Architecture](06-database-architecture.md), **APPROVED / FROZEN**; and
- [Step 6B — Database Data Model](06b-database-data-model.md), **APPROVED / FROZEN**.

The frozen written requirements are authoritative. Designs remain supporting visual references. If a design conflicts with a frozen requirement, the frozen requirement governs. This roadmap does not reopen or alter any frozen requirement, choose unresolved production providers, create a schema or migration, or authorize implementation.

Future roadmap changes require explicit project-owner approval. Recording this plan does **not** authorize DEV-01.

## 2. Approved development philosophy

Development will use vertical slices, not a database-first, backend-second, UI-last sequence. Each meaningful capability will combine the relevant:

- production database migration and integrity work;
- trusted server-side behavior and business rules;
- RLS and authorization controls;
- visible, responsive user interface;
- Arabic, French, and English behavior;
- loading, empty, error, success, permission, session, and conflict states;
- automated tests and technical verification; and
- owner-visible demonstration.

The governing cycle is:

```text
Prepare one slice
→ implement only that slice
→ verify technically
→ demonstrate the working result
→ project-owner review
→ corrections if required
→ explicit project-owner approval/freeze
→ only then prepare the next slice
```

The application must become visibly useful throughout development. Vertical slicing does not permit temporary architecture, weakened integrity, incomplete security, or deferred basic UI quality. MVP limits features, not engineering quality.

## 3. Mandatory approval-gate workflow

Every DEV, QA, REL, and handover gate is independently reviewable and requires explicit project-owner authorization before the following gate begins.

For each implementation slice:

1. Prepare its exact implementation scope and resolve only decisions assigned to that preparation.
2. Identify any required manual action before depending on it.
3. Implement only the approved slice.
4. Run and record the required technical verification.
5. Demonstrate the working and visible result.
6. Stop for project-owner review.
7. Correct identified issues within the same slice.
8. Obtain explicit project-owner approval/freeze.
9. Do not begin the following slice automatically.

Every implementation slice must end with:

> **STOP — awaiting project-owner review/approval.**

## 4. Approved development sequence

### DEV-01 — Multilingual Application & Public Foundation

**Goal**

Create the real production-quality application foundation and make the approved public platform visibly usable.

**Visible result**

The project owner can open the real responsive application and navigate the approved public experience in Arabic, French, and English using the established visual language. The public pages, navigation, locale behavior, and required public system states are functional.

**Database scope**

- Establish the real incremental migration workflow.
- Introduce only the frozen Step-6B persistence genuinely required by this slice.
- Expected public capability may require `public_pages`, `public_page_versions`, `public_page_translations`, `commune_settings`, `commune_settings_translations`, and their required audit integrity.
- Do not create all twenty entities merely because the logical model is known.
- Do not create temporary substitute tables or deliberately weaken constraints for later repair.

**Mandatory migration-order preparation decision**

The frozen model gives audit events an optional actor relationship to `application_profiles`, while public publication versions require audit evidence. Before any migration is written, DEV-01 preparation must choose and justify the simplest professional ordering that preserves the frozen model and complete integrity. The evaluation must include at least:

1. introducing the minimal final-form `application_profiles` persistence foundation in DEV-01, while leaving Citizen Auth behavior to DEV-02; or
2. another coherent ordering that preserves the final Step-6B foreign keys and audit guarantees without a throwaway schema or weakened integrity.

This roadmap does not select between those options. The decision belongs to DEV-01 preparation and must be presented before migrations are authorized.

**Backend/business logic**

- Next.js App Router foundation using the frozen modular-monolith architecture.
- Locale-prefixed routing and approved public-page retrieval.
- Safe published-content and public-setting projections only.
- Safe handling of absent or malformed optional public values.
- Fixed public page identities; no general CMS or arbitrary routes.

**UI scope**

- Public navigation, header, footer, language controls, and approved pages.
- Home, How it works, service scope, FAQ, Contact, User Guide, Privacy, Accessibility, and Terms.
- Reusable production design primitives based on the supplied visual system.
- Public loading, error, and not-found states.

**Security scope**

- No private or unpublished data in public projections or caches.
- Validate the public Chikaya HTTPS destination.
- No public route may imply access to private complaint or administrative data.

**Localization/responsive scope**

- Arabic RTL; French and English LTR.
- Responsive desktop, laptop, tablet, and mobile navigation and page layouts.
- Accessible semantics, keyboard navigation, focus, contrast, zoom, and readable structure.
- Do not invent official translations.

**Testing/verification**

- Framework/build/type/lint checks established for later slices.
- Clean migration verification for the selected DEV-01 persistence subset.
- Public projection and content-version tests.
- Locale-routing and RTL/LTR tests.
- Public-page accessibility and responsive checks.
- Verification that no private data is exposed.

**Dependencies**

- Frozen Steps 1–6B.
- DEV-01 preparation approval.
- Completion and confirmation of the first manual environment action before the first real migration is applied.

**Manual actions**

**MANUAL ACTION REQUIRED:** DEV-01 preparation must recommend either local Supabase/PostgreSQL first or a linked development Supabase project, explain the trade-off, provide exact setup actions, and stop for confirmation before applying the first migration. No environment is assumed to exist.

**Owner approval gate**

Review the real public application in all three languages and representative viewport sizes; inspect migration ordering, public data boundaries, accessibility, and system states.

**Explicit exclusions**

- Citizen authentication behavior.
- Commune authentication.
- Complaints and notifications.
- Public-content administration.
- Production infrastructure or legal readiness claims.

> **STOP — awaiting project-owner review/approval.**

### DEV-02 — Citizen Identity, Sessions & Account Access

**Goal**

Deliver the complete Citizen authentication and account foundation.

**Visible result**

A Citizen can sign up, acknowledge the current Terms and Privacy versions, verify email, sign in and out, recover/reset/change the password, perform a verified login-email change, view/edit approved profile information, save optional contact phone and preferred language, and use the authenticated Citizen shell. Disabled and expired access is handled safely.

**Database scope**

- Introduce or complete `application_profiles`, depending on the approved DEV-01 ordering.
- Introduce `application_sessions` and `legal_acknowledgements`.
- Preserve the frozen independent application identity and Supabase Auth mapping.
- Preserve immutable legal-version evidence and session/security-epoch behavior.

**Backend/business logic**

- Supabase Auth email/password signup, one-time account verification, login/logout, recovery/reset, password change, and verified email change.
- Idempotent, fail-closed Auth/profile provisioning reconciliation.
- Citizen application-session enforcement using the frozen inactivity and absolute-duration policy.
- Current Terms and Privacy version acknowledgment during signup.
- Active/disabled access behavior and secure session revocation.

**UI scope**

- Signup, verification confirmation, login, forgot/reset password, account profile, password, email, and language views.
- Authenticated Citizen shell.
- Authentication-required, disabled-account, expired-session, loading, error, and success states.
- Email-only login wording; phone remains optional contact information only.

**Security scope**

- Strong configurable password policy, secure recovery, safe errors, rate limiting/abuse protection, and secure session cookies.
- No phone authentication, public role selection, or exposure of provider credentials.
- Citizen profile isolation and non-enumerating authentication behavior.
- Accepted free-tier limitation for automated leaked-password checking remains unchanged.

**Localization/responsive scope**

- Complete ar/fr/en identity and account behavior.
- Correct RTL/LTR forms and directional controls.
- Responsive and accessible interaction across supported devices.

**Testing/verification**

- Auth and profile integration tests.
- Verification, recovery, password, and email-change tests.
- Legal acknowledgment/version evidence tests.
- Session inactivity, absolute expiry, revocation, and disabled-account tests.
- Cross-account profile isolation and enumeration-resistance tests.
- Responsive, accessibility, and localization checks.

**Dependencies**

- DEV-01 approved/frozen.
- Approved Supabase development environment available.

**Manual actions**

**MANUAL ACTION REQUIRED:** Configure development Auth URLs, callback destinations, email templates/settings, and required secrets when the slice preparation identifies the exact values. Stop for confirmation before depending on dashboard configuration.

**Owner approval gate**

Complete the Citizen account journey in all locales and inspect security, disabled-account, recovery, and session-expiry behavior.

**Explicit exclusions**

- Commune login and roles.
- Complaint submission.
- Notification center.
- Self-service account deletion.
- Mandatory MFA.

> **STOP — awaiting project-owner review/approval.**

### DEV-03 — Commune Authentication & Protected Application Shells

**Goal**

Deliver secure Agent/Admin access and the real authenticated Citizen and Commune application structures.

**Visible result**

Authorized Agent and Administrator accounts can sign in to the responsive Commune area and see role-aware navigation. Citizen, Agent, Admin, disabled-account, expired-session, and permission-denied boundaries are visible and testable.

**Database scope**

- Extend the existing final-form profile, session, security-epoch, and audit behavior for Agent/Admin identities.
- No new speculative role or staff-assignment entity.

**Backend/business logic**

- Administratively provisioned Commune identities.
- Frozen AGENT/ADMIN distinction and active-status enforcement.
- Frozen staff session durations and safe login/logout/recovery behavior.
- Trusted route and use-case guards.

**UI scope**

- Commune sign-in and applicable recovery/password views.
- Citizen and Commune authenticated shells.
- Protected navigation and role-appropriate layouts.
- Permission-denied, disabled-account, expired-session, loading, and error states.

**Security scope**

- No public staff registration.
- Server-side authorization; UI visibility is not authorization.
- No routine Technical Administrator application role.
- Direct-URL and manipulated-request protection.

**Localization/responsive scope**

- Arabic, French, and English shells and authentication states.
- RTL/LTR correctness and responsive desktop/tablet/mobile layouts.

**Testing/verification**

- Citizen-to-Commune denial.
- Agent/Admin route and role-boundary tests.
- Disabled-account, expiry, revocation, and direct-request tests.
- Responsive, accessibility, and localization checks.

**Dependencies**

- DEV-02 approved/frozen.

**Manual actions**

**MANUAL ACTION REQUIRED:** Securely bootstrap the initial Administrator and representative Agent identities through the approved provisioning mechanism. Explain and verify the exact procedure before relying on those accounts.

**Owner approval gate**

Verify all account types, protected navigation, denial behavior, staff-session behavior, and responsive shells.

**Explicit exclusions**

- Staff-management UI.
- Complaint processing.
- Assignment or workload ownership.

> **STOP — awaiting project-owner review/approval.**

### DEV-04A — Canonical Data & Real Complaint Submission

**Goal**

Allow a Citizen to submit a real persisted complaint through the actual product UI and immediately read back the persisted complaint.

**Visible result**

The Citizen opens New Complaint, selects real active category and location data, enters the approved fields, reviews and confirms the complaint, submits once, receives a unique complaint reference, sees the success state, and immediately opens the newly persisted complaint detail.

This slice must visibly prove:

```text
UI → validation → trusted server → database → audit/history
→ persisted complaint → authorized UI readback
```

**Database scope**

- Introduce `categories`, `category_translations`, `locations`, and `location_translations`.
- Introduce `complaints` and `complaint_events`.
- Complete the audit structures required for submission.
- Introduce `command_receipts` and the approved idempotency behavior required for safe submission.
- Preserve canonical references, immutable historical label snapshots, unique complaint references, revision control, and required event/audit linkage.
- Do not automatically introduce notifications or email unless DEV-04A preparation proves a strict minimal dependency.

**Backend/business logic**

- Three-step active-browser wizard state; no durable draft.
- Server-authoritative Unicode code-point validation.
- Active category/location revalidation at commit.
- Atomic complaint, event, audit, and command-receipt creation.
- Safe retry and idempotent result handling.
- Authorized complaint-detail readback after success.

**UI scope**

- Description, location, review, submission, success, and immediate complaint-detail screens.
- Preserve active-flow values when navigating forward/back or after recoverable failure.
- Loading, validation, failure, uncertain-result, success, and conflict feedback.
- No attachment controls.

**Security scope**

- Authenticated verified Citizen only.
- Ownership fixed to the authenticated application identity.
- Citizen can read only the newly created complaint that they own.
- RLS and server authorization introduced and tested with the resource.
- No cross-Citizen existence disclosure through references or IDs.

**Localization/responsive scope**

- ar/fr/en form labels, validation, review, success, and complaint readback.
- RTL/LTR and responsive wizard/detail behavior.
- Do not invent official category/location translations; use only approved values and approved fallback behavior.

**Testing/verification**

- Product text-limit and whitespace validation.
- Database constraints and migration verification.
- Idempotent retry and duplicate-submission tests.
- Active-reference and historical-snapshot tests.
- Atomic rollback tests.
- Cross-Citizen complaint-isolation tests.
- UI-to-database-to-readback end-to-end test.
- Responsive, accessibility, and localization checks.

**Dependencies**

- DEV-03 approved/frozen.
- Approved initial canonical data sufficient for a three-language test experience, without invented official wording.

**Manual actions**

**MANUAL ACTION REQUIRED:** Apply and verify the approved DEV-04A migration and canonical development data only after exact instructions are presented. Commune validation of official production labels remains required before production.

**Owner approval gate**

Submit representative complaints and verify the unique reference, persisted values, audit/history, readback, isolation, retry safety, and responsive multilingual experience.

**Explicit exclusions**

- Durable drafts and attachments.
- Notification center and receipt email.
- Staff notification fanout.
- Citizen complaint list/search and Commune intake.
- Lifecycle processing beyond initial `SUBMITTED` creation.

> **STOP — awaiting project-owner review/approval.**

### DEV-04B — Citizen Notifications & Receipt Email

**Split rationale**

DEV-04B is intentionally separate from DEV-04A so the core persisted complaint path can be proven first without coupling its acceptance to delivery infrastructure. DEV-04B then adds the Citizen notification and email consequences of an already-working submission. This keeps both slices meaningful, visible, and safely reviewable.

**Goal**

Add the approved Citizen in-platform notification and receipt-email behavior associated with complaint submission.

**Visible result**

After complaint submission, the Citizen receives an in-app receipt notification with read/unread state and timestamp. Opening it marks it read and deep-links to the authorized complaint. Mark all as read works. The approved minimal receipt email is delivered through the authorized development/test transport.

**Database scope**

- Introduce `notifications`, `notification_state`, and `email_outbox`.
- Preserve recipient sequence, change marker, deduplication, delivery intent, retry state, lease/fencing, and source-audit relationships.
- No notification body copies of complaint or response content.

**Backend/business logic**

- Atomic Citizen receipt notification and email intent for successful submission.
- Recipient-scoped unread/read and mark-all behavior.
- Authorized complaint deep-link resolution.
- Reliable outbox dispatch, stable message identity, bounded retries, and safe failure classification.
- Minimal reference/link-based email; no complaint body.

**UI scope**

- Citizen notification badge and center/list.
- Unread/read indication that does not rely on color alone.
- Individual open/mark-read and mark-all-read.
- Empty, loading, error, retry, and inaccessible-destination states.

**Security scope**

- Strict notification-recipient isolation.
- Reauthorize the underlying complaint on every deep-link open.
- No private complaint text in notification persistence, email, logs, or arbitrary stored URLs.
- No browser access to outbox internals.

**Localization/responsive scope**

- Localized notification templates and receipt emails in ar/fr/en.
- RTL/LTR, responsive center/list, and accessible unread semantics.

**Testing/verification**

- Recipient-isolation and manipulated-ID tests.
- Read, individual-open, and mark-all concurrency tests.
- Duplicate fanout and email-intent prevention.
- Outbox lease/retry/failure tests.
- Email privacy/content checks.
- Deep-link authorization and UI-state tests.

**Dependencies**

- DEV-04A approved/frozen.
- Authorized development/test email transport available.

**Manual actions**

**MANUAL ACTION REQUIRED:** Configure and verify the authorized development/test email transport and secrets before live delivery is tested. Production SMTP is not selected or configured in this slice.

**Owner approval gate**

Submit a complaint and inspect the in-app receipt, unread/read and mark-all behavior, deep link, minimal email, retries, and privacy boundaries.

**Explicit exclusions**

- Staff submission notification fanout; it begins in DEV-05 when its destination workflow is functional.
- Response and closure emails.
- SMS, advanced automation, or notification preferences.

> **STOP — awaiting project-owner review/approval.**

### DEV-05 — Citizen Tracking & Shared Commune Intake

**Goal**

Connect the Citizen complaint experience to the real shared Commune intake workflow.

**Visible result**

Citizens have a dashboard, My Complaints, search/basic filters, complaint details/history, edit while `SUBMITTED`, and withdrawal while `SUBMITTED`. Active authorized Agents/Admins have operational counters, a shared complaint list, search/basic filters, complaint details, and an explicit start-review action. Citizens see the resulting state/history and lose edit/withdraw rights after successful review start.

**Database scope**

- Complete bounded/keyset list, search/filter, counter, history, edit, withdrawal, review-start, and notification queries/commands over the existing entities.
- Add only justified measured indexes.
- Introduce approved staff notification fanout for successful submission and `SUBMITTED` withdrawal.
- No new assignment or analytics entity.

**Backend/business logic**

- Citizen-owned dashboard/list/detail/search/filter behavior.
- Shared Agent/Admin complaint workload.
- `SUBMITTED → WITHDRAWN` and `SUBMITTED → UNDER_REVIEW` only.
- Citizen edit and withdrawal only while current state is `SUBMITTED`.
- Staff in-app notification to every currently active authorized Agent/Admin for successful submission and withdrawal only.
- Stale revision rejection and safe conflict reload.

**UI scope**

- Citizen dashboard, My Complaints, list/search/filter, detail/history, edit, and withdrawal confirmation.
- Commune dashboard counters, shared complaint list/search/filter, detail/history, and start-review control.
- Staff notification destination becomes functional.
- Empty, no-results, loading, error, permission, unavailable, and stale/conflict states.
- Superseded assignment, internal-note, chat, clarification, and Awaiting Citizen elements are absent.

**Security scope**

- Citizen A can never read, search, count, infer, edit, withdraw, or receive notifications about Citizen B's complaint.
- All active authorized Agents can access the shared workload and full operational complaint details.
- No assignment-based authorization.
- Notification fanout excludes disabled users and does not backfill newly activated accounts.
- State-aware authorization and optimistic concurrency enforcement.

**Localization/responsive scope**

- Frozen citizen-facing status labels in ar/fr/en.
- Responsive dashboards, list/table-to-mobile patterns, details, history, filters, and notification destinations.
- RTL/LTR, accessible controls, and localized timestamps.

**Testing/verification**

- Cross-Citizen isolation through routes, queries, counts, filters, references, and manipulated requests.
- Shared-Agent access and disabled-user denial.
- Edit/withdraw lock-boundary tests.
- Terminal withdrawal tests.
- Staff fanout recipient and deduplication tests.
- Counter/search/filter/keyset query tests.
- Concurrent Agent/Citizen stale-update tests.
- Citizen submission-to-Commune-review end-to-end verification.

**Dependencies**

- DEV-04B approved/frozen.

**Manual actions**

- No new provider action is assumed. Any migration application must still be explicitly explained, applied, and verified.

**Owner approval gate**

Review the first connected Citizen/Commune workflow, privacy isolation, shared-Agent access, edit/withdraw lock, staff notification policy, counters, and conflicts.

**Explicit exclusions**

- `IN_PROCESSING`, response issuance, closure, `NOT_ACCEPTED`, and response correction.
- Staff email, assignment, workload analytics, and advanced search.

> **STOP — awaiting project-owner review/approval.**

### DEV-06 — Processing, Response, Exceptional Outcomes & Closure

**Goal**

Complete the frozen Citizen-to-Commune core lifecycle, response, exceptional outcomes, correction, and closure behavior.

**Visible result**

A real complaint can move from submission through review and processing to an issued Commune response and closure. The Citizen sees authorized history, response, correction, and closure. `NOT_ACCEPTED` outcomes work with the approved controlled reasons and secure full explanation.

**Database scope**

- Introduce `response_versions`.
- Complete atomic lifecycle, response, correction, history, notification, email-intent, audit, command-receipt, and revision behavior.
- Preserve independent event/version/audit IDs and frozen required unique relationships.

**Backend/business logic**

Implement only:

```text
UNDER_REVIEW → IN_PROCESSING
IN_PROCESSING → RESPONSE_SENT
RESPONSE_SENT → CLOSED
UNDER_REVIEW → NOT_ACCEPTED
IN_PROCESSING → NOT_ACCEPTED
```

- Require a response before normal closure.
- Support `OUT_OF_SCOPE` and `INSUFFICIENT_INFORMATION` as controlled `NOT_ACCEPTED` reasons.
- Keep the full non-acceptance explanation in the authenticated platform.
- Perform controlled response correction without reopening or changing state.
- Preserve every response version, reason, actor, and timestamp.
- Generate approved Citizen status/response/closure notifications and RESPONSE/CLOSURE email intents.
- Use only the frozen three application email categories and minimal email content.

**UI scope**

- Lifecycle-valid Agent/Admin controls.
- Processing, response composition/issuance, `NOT_ACCEPTED`, correction, and closure interfaces.
- Citizen response, corrected response, non-acceptance explanation, status, and closure display.
- Pending, success, failure, invalid-transition, terminal, permission, and stale/conflict states.

**Security scope**

- State-aware authorization at trusted boundaries.
- Any authorized Agent may continue another Agent's work, with the actual actor recorded.
- Recent reauthentication for response correction.
- No lifecycle bypass by Admin and no silent response overwrite.
- Terminal states have no outgoing transition.

**Localization/responsive scope**

- All states, reasons, response/correction controls, notifications, and emails in ar/fr/en.
- Correct RTL/LTR, responsive detail/actions, and accessible validation/status announcements.

**Testing/verification**

- Complete allowed and invalid transition matrix.
- Response-before-closure enforcement.
- `NOT_ACCEPTED` reason/explanation requirements.
- Immutable response-version and correction tests.
- Terminal/no-reopening tests.
- Concurrent Agent and stale revision tests.
- Notification/email privacy, deduplication, and exactly-three-category tests.
- Normal and exceptional full end-to-end journeys.

**Dependencies**

- DEV-05 approved/frozen.

**Manual actions**

- Apply/verify the approved migration and test delivery configuration only after exact instructions and confirmation.

**Owner approval gate**

Review normal closure, both approved non-acceptance reasons, response correction, notifications/emails, audit attribution, concurrency, and Citizen visibility.

**Explicit exclusions**

- Reopening, chat, clarification, Awaiting Citizen, internal notes, assignments, attachments, SLA, escalations, and advanced workflow.

> **STOP — awaiting project-owner review/approval.**

### DEV-07 — Staff Account Administration

**Goal**

Give Commune Administrators the frozen staff-management capability.

**Visible result**

An Administrator can view staff, provision Agents as permitted, edit staff, change approved role/status, disable/re-enable access, and initiate approved recovery behavior. Agents cannot enter or invoke these functions.

**Database scope**

- Complete guarded profile, role, status, security-epoch, session-revocation, command-receipt, revision, and audit behavior using existing final-form entities.
- No staff workload, assignment, or Technical Administrator entity.

**Backend/business logic**

- Admin-authorized staff provisioning and approved profile updates.
- Role/status changes with required rationale and audit.
- Disable/re-enable and immediate session/security-epoch revocation.
- Secure recovery without viewing or setting existing passwords.
- Preserve historical actor attribution.

**UI scope**

- Staff list and add/edit/account-state views.
- Dedicated active/disabled terminology.
- Confirmations, reauthentication, recovery, loading, empty, error, success, permission, and conflict states.
- No employee workload analytics.

**Security scope**

- Admin-only management.
- No password visibility or reusable credentials.
- Protection against unauthorized privilege elevation and loss of all recoverable Administrator access.
- Every meaningful administrative action audited.

**Localization/responsive scope**

- Complete ar/fr/en and RTL/LTR staff administration.
- Responsive table/card and accessible form/confirmation behavior.

**Testing/verification**

- Agent denial and privilege-escalation tests.
- Provisioning/recovery tests.
- Disable/re-enable, active-session revocation, and historical-attribution tests.
- Audit, reauthentication, concurrency, and validation tests.

**Dependencies**

- DEV-06 approved/frozen.

**Manual actions**

- Any Auth dashboard or initial-governance action must be described exactly and confirmed before use.

**Owner approval gate**

Review provisioning, role/status changes, disable/re-enable, recovery, revocation, Admin-only access, and audit evidence.

**Explicit exclusions**

- Routine Technical Administrator application role.
- Assignment, workload analytics, staff passwords, and infrastructure administration.

> **STOP — awaiting project-owner review/approval.**

### DEV-08 — Category & Location Administration

**Goal**

Allow Administrators to manage configurable canonical complaint categories and locations safely.

**Visible result**

An Administrator can add, edit, activate, and deactivate categories and locations with approved multilingual labels. Active changes affect future selection while historical complaints retain their stored labels.

**Database scope**

- Complete catalogue code/translation uniqueness, revision, audit, command-receipt, activation/deactivation, and historical-snapshot behavior.
- Preserve historically referenced rows; no ordinary hard deletion.

**Backend/business logic**

- Admin-only catalogue commands.
- Stable language-neutral codes.
- Active values only for new selection.
- Safe deactivation and stale-update handling.
- Restricted Agent historical projections.

**UI scope**

- Category and location lists and add/edit views.
- Proper active/inactive terminology.
- Multilingual label editing, validation, warnings, and loading/error/success/conflict states.

**Security scope**

- Admin-only mutation.
- Citizens receive safe active/selectable values in context.
- Agents receive active/selectable values and complaint-linked historical references only, not unrestricted inactive/admin/audit catalogue data.

**Localization/responsive scope**

- Independent approved ar/fr/en labels; no automatic or invented translations.
- Responsive and accessible catalogue administration with correct RTL/LTR.

**Testing/verification**

- Role/RLS tests.
- Code/translation uniqueness and validation.
- Activation/deactivation and new-selection tests.
- Historical complaint snapshot preservation.
- Concurrency and audit tests.
- Responsive/localization checks.

**Dependencies**

- DEV-07 approved/frozen.

**Manual actions**

**MANUAL ACTION REQUIRED:** Obtain and record Commune-approved production labels, especially missing French/English location values, before production initialization. Do not machine-invent them.

**Owner approval gate**

Edit and deactivate representative entries and verify authorization, new selection, historical display, terminology, audit, and localization.

**Explicit exclusions**

- Hard deletion, imports, exports, machine translation, analytics, and reporting.

> **STOP — awaiting project-owner review/approval.**

### DEV-09 — Commune Settings & Public/Legal Content Administration

**Goal**

Complete the approved secondary Admin-managed configuration and fixed public-content capabilities.

**Visible result**

An Administrator can manage approved Commune public settings and publish complete multilingual versions of fixed public/legal pages. Confirmed publications become visible on the public site while prior versions and legal acknowledgments remain preserved.

**Database scope**

- Complete guarded setting updates and immutable public-page publication behavior over the DEV-01 final-form entities.
- Preserve page/version relationships, current-version integrity, revisions, audit evidence, and existing `legal_acknowledgements` links.

**Backend/business logic**

- Atomic complete ar/fr/en publication bundle.
- Fixed page-key allowlist.
- Validated public contact values and Chikaya HTTPS destination.
- Publication concurrency protection and cache invalidation.
- Existing signup acknowledgment evidence remains tied to the exact acknowledged versions.

**UI scope**

- Secondary Settings → Public Content / Legal & Information placement.
- Commune public settings and fixed-page editing/publication.
- Multilingual validation, preview where approved, loading, error, success, and stale/conflict states.
- Complaint operations remain the primary Commune navigation purpose.

**Security scope**

- Admin-only settings/content mutation.
- Public access only to current published safe projections.
- Constrained Markdown/no executable HTML.
- Complete attribution of material settings and publication actions.

**Localization/responsive scope**

- Three-language content management and public rendering.
- Correct RTL/LTR, responsive behavior, and accessible editing/publication feedback.

**Testing/verification**

- Admin/Agent authorization and RLS tests.
- Atomic publication and missing-locale rejection.
- Stale publication/setting conflict tests.
- Legal acknowledgment version-preservation tests.
- Malformed URL and unsafe-content rejection.
- Public projection/cache update and multilingual rendering tests.

**Dependencies**

- DEV-08 approved/frozen.

**Manual actions**

**MANUAL ACTION REQUIRED:** Final public/legal wording, official public settings, and all production translations require Commune and appropriate legal/organizational approval before production publication.

**Owner approval gate**

Publish controlled updates and verify public display, immutable versions, preserved acknowledgments, authorization, navigation priority, and multilingual behavior.

**Explicit exclusions**

- General CMS, arbitrary routes, media library, content-approver role, editorial workflow, persistent drafts, publication scheduling, and automatic translation.

> **STOP — awaiting project-owner review/approval.**

DEV-09 approval establishes **MVP FEATURE COMPLETE**, not production readiness.

## 5. Approved milestones

| Milestone | Slice | Meaning |
| --- | --- | --- |
| First demonstrable milestone | **DEV-01** | The real multilingual responsive public product is visible. |
| First real persisted Citizen product flow | **DEV-04A** | A Citizen submits a real complaint and immediately views the authorized persisted result. |
| First connected Citizen/Commune workflow | **DEV-05** | The Citizen submits; the Commune sees and begins review; the Citizen sees the resulting state/history. |
| First full end-to-end core workflow | **DEV-06** | Citizen signup/submission → Commune review/process/response → Citizen sees response → Commune closure → Citizen sees closure; exceptional outcomes and correction also work. |
| MVP feature complete | **DEV-09** | All frozen MVP functionality exists; production readiness is not implied. |

## 6. Incremental database strategy

The frozen Step-6B model contains twenty application entities, but implementation is incremental:

- introduce physical persistence only when the approved slice needs it;
- use final-form structures compatible with Step 6B;
- maintain coherent migration ordering and complete referential integrity;
- do not create temporary substitute tables or deliberately incomplete security models;
- do not implement future-feature tables;
- verify every migration from a clean environment and against the preceding approved migration chain;
- apply RLS, grants, trusted commands, indexes, constraints, audit, concurrency, and idempotency with the capability that depends on them; and
- do not claim a migration was applied until the target environment was explicitly identified and verification succeeded.

The DEV-01 `audit_events`/`application_profiles` dependency must be resolved during DEV-01 preparation before migration authoring. The choice must minimize rework without weakening the frozen model.

## 7. Rules applied inside every development slice

### 7.1 Testing

Testing is part of each slice and may include, as relevant:

- unit/domain and validation tests;
- migration and database-constraint tests;
- RLS and authorization tests;
- session and revocation tests;
- integration and UI tests;
- concurrency and stale-update tests;
- idempotency and retry tests;
- end-to-end verification;
- localization/RTL tests; and
- responsive/accessibility checks.

Later QA is an additional assurance layer, not the first time these concerns are tested.

### 7.2 Security

Security is introduced with the protected capability:

| Slice | Required security focus |
| --- | --- |
| DEV-02 | Citizen Auth, application sessions, profile isolation, disabling, recovery, and legal evidence |
| DEV-03 | Agent/Admin role boundaries, staff sessions, protected routes, and no public staff signup |
| DEV-04A | Complaint ownership, RLS, safe references, idempotent submission, and trusted readback |
| DEV-04B | Notification-recipient isolation, authorized deep links, and private email/outbox boundaries |
| DEV-05 | Cross-Citizen isolation, shared Commune access, state-aware edit/withdraw/review, and staff fanout |
| DEV-06 | Lifecycle authority, terminal-state protection, immutable response versions, and correction reauthentication |
| DEV-07 | Admin-only staff management, role/status controls, revocation, and audit |
| DEV-08 | Admin-only catalogue mutation and restricted inactive/historical projections |
| DEV-09 | Admin-only settings/content publication and safe public projections |

Frontend visibility never replaces trusted server/data authorization.

### 7.3 UI quality

Every slice must include its relevant:

- Arabic RTL and French/English LTR behavior;
- responsive desktop, laptop, tablet, and mobile behavior;
- loading, empty, error, success, permission, session-expiry, and stale/conflict states;
- accessible labels, semantics, keyboard behavior, focus, contrast, and validation;
- existing green/beige/neutral design language, spacing, typography, cards, controls, tables, badges, navigation, and density; and
- removal/adaptation of screenshot elements superseded by frozen requirements.

Final QA may improve quality but must not rescue an unusable slice.

## 8. Post-feature-complete assurance gates

Each QA gate requires explicit project-owner approval before the next gate begins.

### QA-01 — Integrated Regression & Migration Chain

Verify:

- clean-environment reconstruction;
- the full ordered migration chain;
- integrated feature behavior;
- complete end-to-end journeys; and
- cross-feature session, authorization, and error behavior.

> **STOP — awaiting project-owner review/approval.**

### QA-02 — Accessibility, Multilingual & Device Review

Verify Arabic, French, English, RTL/LTR, keyboard interaction, visible focus, semantic accessibility, contrast, zoom, representative screen-reader behavior, mobile, tablet, laptop, desktop, and supported browsers.

> **STOP — awaiting project-owner review/approval.**

### QA-03 — Security & Privacy Verification

Verify RLS, horizontal-access attacks, vertical privilege escalation, manipulated direct requests, session expiry/revocation, disabled-account enforcement, role enforcement, audit/history immutability, safe errors/logs, and sensitive-data exposure.

> **STOP — awaiting project-owner review/approval.**

### QA-04 — Reliability, Concurrency & Capacity

Verify stale-update conflicts, concurrent Agents, idempotency, duplicate submissions, outbox retry/fencing, query plans, indexes, notification polling, egress, storage behavior, and Supabase Free assumptions.

QA-04 does not replace the full production backup and recovery gate.

> **STOP — awaiting project-owner review/approval.**

## 9. Production and release gates

Each release gate requires explicit project-owner approval before the next gate begins.

### REL-01 — Staging / UAT

- Deploy a production-like staging environment.
- Use representative or synthetic test data.
- Complete formal Commune acceptance testing.

**MANUAL ACTION REQUIRED:** Approve and configure the staging environment and designated UAT participants.

> **STOP — awaiting project-owner review/approval.**

### REL-02 — Legal & Operational Readiness

Resolve:

- CNDP processing formalities;
- international-transfer formalities;
- retention and privacy-rights procedures;
- final Privacy, Terms, and Accessibility content;
- official multilingual content; and
- named operational responsibilities.

**MANUAL ACTION REQUIRED:** The project owner/Commune completes or confirms the required legal, organizational, and content approvals. No implementation claim substitutes for those actions.

> **STOP — awaiting project-owner review/approval.**

### REL-03 — Infrastructure Readiness

Finalize and verify:

- production hosting;
- Commune/project-owned Supabase;
- domain, DNS, and HTTPS;
- production SMTP;
- production secrets and recovery access;
- privacy-safe monitoring;
- encrypted independent off-provider backups;
- Auth-inclusive recovery; and
- full restore testing.

**MANUAL ACTION REQUIRED:** Provider accounts, ownership, billing/recovery, DNS, SMTP, secrets, backup destinations, and restore authorization require explicit owner actions and confirmation.

> **STOP — awaiting project-owner review/approval.**

### REL-04 — Controlled Production Deployment

Perform only after approval:

- approved production migrations;
- approved canonical data initialization;
- production configuration;
- Commune account initialization;
- post-deployment smoke and security checks; and
- controlled launch authorization.

**MANUAL ACTION REQUIRED:** Present exact commands/dashboard actions and expected verification before each production mutation. Stop whenever the next operation depends on owner confirmation.

> **STOP — awaiting project-owner review/approval.**

## 10. Commune handover and delivery

After production acceptance, complete separately gated:

- Agent and Administrator training;
- operational documentation;
- account recovery and access-revocation procedures;
- incident response procedure;
- backup/restore procedure and evidence;
- deployment and maintenance documentation;
- repository ownership/access transfer or verification;
- Supabase ownership/access transfer or verification;
- domain/DNS ownership/access transfer or verification;
- SMTP ownership/access transfer or verification;
- secrets and recovery governance;
- formal delivery/sign-off; and
- the agreed initial post-launch support and monitoring period.

Every handover gate stops for owner acceptance. Future V1 features remain separate from MVP delivery and require their own scope and roadmap approval.

## 11. Manual-action policy

Whenever manual intervention is required, the implementation task must state exactly:

> **MANUAL ACTION REQUIRED**

It must then:

1. identify the exact owner action;
2. explain why it is needed and which gate depends on it;
3. provide the exact command or dashboard path where appropriate;
4. state the expected verification result;
5. avoid claiming completion until verification succeeds; and
6. stop for project-owner confirmation when the next operation depends on it.

The first manual environment action occurs during DEV-01 preparation, before the first real database migration. DEV-01 preparation must recommend local Supabase/PostgreSQL first or a linked development Supabase project and explain why. No Supabase environment, migration, secret, dashboard setting, provider account, SMTP setup, domain/DNS action, backup, legal action, or deployment may be silently assumed.

## 12. Sequencing risks and dependencies

| Risk/dependency | Required treatment |
| --- | --- |
| DEV-01 audit/profile migration ordering | Resolve explicitly during DEV-01 preparation without temporary schema or weakened FK/audit integrity. |
| Supabase environment timing | Select and confirm the development approach before the first migration; do not wait until DEV-02 if DEV-01 persists data. |
| Terms/Privacy before Citizen signup | Current immutable versions must exist before DEV-02 can record valid acknowledgments. |
| Auth/profile/session cross-boundary reconciliation | Implement idempotently and fail closed; test incomplete provider/application outcomes. |
| Missing official localized domain labels | Do not invent translations; obtain Commune approval before production and use only approved fallback behavior during development. |
| DEV-04A scope | Immediate authorized complaint-detail readback is mandatory; a generic success screen alone is insufficient. |
| Notifications separated from submission | DEV-04A proves persistence first; DEV-04B adds Citizen receipt notification/email; staff submission/withdrawal fanout waits for functional Commune intake in DEV-05. |
| Atomic complaint operations | Commit state/data, event, audit, notification/email intent, and command receipt atomically whenever the slice introduces them. |
| External email acceptance | Use outbox fencing and stable message identity; acknowledge that SMTP cannot provide mathematical exactly-once delivery. |
| Shared Agent concurrency | Use frozen revision/conditional mutation behavior; never add assignment as a workaround. |
| Free-tier assumptions | Measure storage, egress, polling, queries, and operational limitations before production; do not weaken security/history to stay free. |
| Feature complete vs production ready | DEV-09 completes features only; QA, legal, infrastructure, restore, UAT, and deployment gates remain mandatory. |

If DEV-04A or DEV-06 proves too large during preparation, any further split requires explicit project-owner approval and must leave each proposed sub-slice meaningful, visible, secure, and independently reviewable. No split may change the frozen feature or lifecycle scope.

## 13. Validation checklist

- [x] The development plan is **APPROVED / FROZEN**.
- [x] Development remains **NOT STARTED**.
- [x] DEV-01 through DEV-09 are recorded.
- [x] DEV-04A and DEV-04B are separate slices with an explicit rationale.
- [x] DEV-04A requires immediate persisted complaint detail/readback.
- [x] Staff notification fanout begins in DEV-05 when its Commune destination is useful.
- [x] DEV-01 carries the audit/profile migration-order issue into mandatory slice preparation.
- [x] The first Supabase/manual environment gate occurs before the first migration requiring persistence.
- [x] Database implementation is incremental and remains conformant with the frozen twenty-entity model.
- [x] Testing, security, localization, responsive behavior, accessibility, and system states are incremental.
- [x] DEV-01 is the first demonstrable milestone.
- [x] DEV-04A is the first real persisted Citizen flow.
- [x] DEV-05 is the first connected Citizen/Commune workflow.
- [x] DEV-06 is the first full end-to-end workflow.
- [x] DEV-09 is MVP feature complete, not production ready.
- [x] QA-01 through QA-04 are separate approval gates.
- [x] REL-01 through REL-04 are separate approval gates.
- [x] Every DEV, QA, REL, and handover gate requires explicit project-owner approval.
- [x] Superseded features—assignment, chat, clarification, Awaiting Citizen, internal notes, attachments, statistics/analytics, SLA, reopening, advanced notification automation, and SMS—are not restored.
- [x] No SQL, migration, code, configuration, dependency installation, or provider resource is created by this plan.

## 14. Approval boundary

This development and delivery roadmap is **APPROVED / FROZEN** and authoritative for implementation sequencing.

Approval of the roadmap does **not** authorize any development implementation. DEV-01 must be separately prepared, must resolve its migration-order and first-environment questions, and must receive separate project-owner authorization before work begins.

Future roadmap changes require explicit project-owner approval and must remain consistent with frozen Steps 1–6B.

**DEV-01 has not started.**
