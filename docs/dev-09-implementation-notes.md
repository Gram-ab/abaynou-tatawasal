# DEV-09 implementation notes

Status: **APPROVED / FROZEN** after project-owner manual review and focused verification of the final corrections. See `docs/dev-09-acceptance.md`.

DEV-09 administers the nine fixed public and legal pages and the approved Commune settings. It adds immutable multilingual publication versions, bounded Admin history, revision and idempotency safeguards, audited settings updates, bootstrap preservation, and narrow public-route revalidation. It does not add arbitrary pages, persistent drafts, rich text, uploads, or a generic CMS.

The latest review correction displays the localized Commune name in shared header branding and the public footer, separates public and legal page lists, labels bootstrap publications from their recorded system actor, and explains that settings history contains actor, time, and changed fields rather than old value snapshots. The logo image and previously published page text remain code-defined or versioned separately.

Citizen account disabling is explicitly assigned to **DEV-10 — Administration Completion**. DEV-10 occurs after DEV-09 and before the complete pre-QA development verification. Citizen account disabling is no longer unplaced, but it remains **not implemented**. DEV-10 and pre-QA verification have not started.

After DEV-10 is implemented, approved, frozen, and pushed, the project owner requires a dedicated complete development review before QA. That checkpoint covers technical verification, cross-slice regression, security and authorization, the database migration chain, manual review of the major flows, and resolution of all frozen MVP requirements. It has not been performed as part of DEV-09.
