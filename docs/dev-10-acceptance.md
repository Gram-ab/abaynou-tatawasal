# DEV-10 — Administration Completion: Citizen Account Disabling

Status: **APPROVED / FROZEN**

## Accepted implementation

- ADMIN-only Citizen administration provides bounded, stable list/search by name or verified email, ACTIVE/DISABLED filtering, and minimal account detail. AGENT, Citizen, and public callers are denied at the server and database boundaries. No Citizen deletion or additional MVP feature was added.
- ACTIVE → DISABLED and DISABLED → ACTIVE require an administrative reason of 3–1000 Unicode code points, current Admin password confirmation, and an explicit UI confirmation. The reason remains restricted audit information.
- The authoritative database command uses a profile row lock, expected revision, fingerprinted idempotent command receipt, and one transaction. Disable increments `security_epoch` and revision, revokes all Citizen application sessions, and writes immutable `ACCOUNT_DISABLED` audit evidence. Reactivation increments revision, preserves the epoch, writes `ACCOUNT_ENABLED` evidence, and never restores an old session. A fresh login is required.
- Citizen commands that lock both profile and application session follow profile-first lock ordering. Disabled status denies current and new application sessions, protected access, complaint submission/edit/withdrawal, and authenticated profile mutation. Pending recovery or email-change verification cannot restore access.
- The supported server-only provider adapter applies a ban after database disable and clears it after reactivation. The application database remains authoritative if provider synchronization fails; Admin receives a typed warning and can safely retry reconciliation. No Auth identity is deleted, and no new durable reconciliation entity was added.
- Complaint ownership, lifecycle, events, response versions, audit history, and legal acknowledgements remain intact; Commune processing continues. New Citizen notification and complaint-email fanout is suppressed while disabled. Existing queued complaint emails are HELD when the worker reaches them; reactivation neither releases HELD jobs nor backfills missed communications.
- The accepted Admin routes and navigation support Arabic/French/English, RTL/LTR, desktop/tablet/mobile reflow, keyboard interaction, visible focus, and accessible status and confirmation controls.

## Project-owner manual approval

The project owner manually reviewed and approved Citizen lookup/detail, disable and reactivate with reasons, existing-session rejection, new-login denial while disabled, complaint preservation and continued Commune processing, communication suppression, old-session rejection after reactivation, successful fresh login, Agent denial, AR/FR/EN, and desktop/mobile behavior. This is DEV-10 slice-level approval.

## Verification record

- DEV-10 isolated database checks: **41 passed**.
- Complete isolated DEV-01–DEV-10 database reconstruction and verification: **PASS**.
- Unit/component/integration: **196 passed**.
- Final combined DEV-01–DEV-10 E2E: **123 passed, 0 failed**.
- Typecheck: **PASS**. Lint: **PASS**. Production build: **PASS**.
- Changed-source secret/security review: **PASS**; no plausible real credential was found.

The first combined E2E attempt encountered a stopped local email worker and interrupted Podman localhost forwarding. After restoring the local stack, the affected email tests passed and the complete combined suite passed. This was a local test-environment interruption, not an application failure. The complete regression was not rerun merely for this freeze record.

## Frozen-source and local-data safety

- The owner's normal local database was not destructively reset; existing review data was preserved. Testing added disposable local fixture accounts and complaints only. Database reconstruction used a separate disposable database.
- DEV-01 through DEV-09 migrations and acceptance records, frozen planning documents, and design/reference files remain unchanged.
- No hosted Supabase project was created, linked, or modified. Local secrets, SMTP credentials, runtime data, build output, and test reports remain outside this source commit.

## End-of-development checkpoint

DEV-10 completes the confirmed frozen-MVP functional development scope. No other confirmed true missing frozen-MVP functionality was found during DEV-10 preparation or implementation. Remaining items are production and commune-owned content gates, frozen post-MVP exclusions, QA/release work, and deferred platform-wide UI/UX polish. This is **not** a production-readiness claim.

After DEV-10 is frozen and pushed, the next stage is the **END-OF-DEVELOPMENT GLOBAL REVIEW**, before QA. That separate checkpoint will cover migration reconstruction, database verification, security/RLS/authorization, full automated regression, cross-role workflows, complete manual platform review, AR/FR/EN and responsive behavior, frozen-MVP completeness, and production-gate/deferred-item inventory. The global review and QA have not started.
