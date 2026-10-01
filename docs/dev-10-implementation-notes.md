# DEV-10 implementation notes — Citizen account disabling

Status: implemented and approved by the project owner. The freeze record is `docs/dev-10-acceptance.md`.

The preparation review identified Citizen account disabling as the remaining confirmed missing frozen-MVP function. DEV-10 adds an Admin-only Citizen list and detail, reasoned disable/reactivate commands, session revocation and security epoch handling, provider ban/unban coordination with a retry action, restricted audit history, and disabled-recipient communication suppression. The existing complaint, legal, and audit histories remain intact. Citizen status is authoritative in the application database; provider synchronization is a second step, and a provider failure does not restore application access.

The additive DEV-10 migration keeps profile-first then application-session locking for Citizen operations. The database command uses expected revision, row locking, a fingerprinted idempotency receipt, and one transaction for status, epoch, session revocation, and audit. Existing queued complaint emails become HELD if the worker reaches them while the recipient is disabled. Reactivation does not release those historical jobs or backfill missed notifications. The local review database received only the pending DEV-10 migration; it was not reset.

Lightweight end-of-development inventory: no other confirmed missing frozen-MVP feature was identified during this implementation. Remaining work belongs to production and commune-owned content gates, frozen post-MVP exclusions, QA/release tasks, and deferred platform-wide UI/UX polish. The dedicated global pre-QA review and QA have not started.
