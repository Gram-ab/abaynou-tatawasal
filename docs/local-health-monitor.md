# Local database health monitor

Prepared 2026-10-16. Local-only manual command; no scheduled execution and no hosted activation.

## Run a check

```powershell
pnpm health:check
pnpm health:check --help
```

The command reads the existing ignored `.env.local`, verifies the normal unlinked local project and restricted `app_web` connection on loopback port 54322, and performs a small read of the existing public-settings projection. It checks that the actual database transaction is read-only. It does not read private complaint contents, call Auth, update sessions, change records or run migrations.

Example output:

```text
PASS | 2026-10-16T10:48:42.320Z | AVAILABLE | 255 ms | attempts=1
Alerts: disabled; SMTP accepted=0. Local history: .local/monitoring/local/history.ndjson
```

Each invocation exits. A failed probe is retried once after one second. Each connection is limited to one client, a three-second connect timeout, a two-second statement timeout, a six-second hard client deadline, and bounded cleanup. The normal invocation does not send email.

## View results

```powershell
Get-Content .local/monitoring/local/history.ndjson -Tail 10
```

- `history.ndjson`: private JSON-line run history with PASS/FAIL, safe category, UTC timestamp, elapsed milliseconds, attempt count and alert outcome.
- `state.json`: independent incident, pending-notice and reminder state. It contains no database credential, raw exception or Citizen data.
- `run.lock`: prevents overlapping invocations from probing/sending concurrently. It is released when a run finishes.
- History rotates at approximately 256 KiB and keeps one previous file. These files are operational evidence, not application audit records or backups.

All files live in the existing ignored `.local/monitoring/local` directory. They are outside Supabase. Treat them as private local operational files; do not commit them.

## Optional local-only alert delivery

```powershell
pnpm health:check --notify-local
```

This opt-in can send pending notices only to the normal local Mailpit SMTP listener at `127.0.0.1:54325`. The sender is `health@abaynou.test` and recipient is `operator@abaynou.test`. Inspect captured mail at <http://127.0.0.1:54324>.

The command intentionally ignores application SMTP host/credentials, has no real-recipient override, refuses hosted/E2E/owner-role database targets, and refuses a linked local project. No Supabase service-role key is used. This is not a hosted alert-delivery implementation. Mailpit itself must be running to capture local alerts; if all of Podman is down, SMTP delivery also fails and the notice stays pending. Hosted alerts must use an independently reachable sender.

A healthy check never sends a routine success message. Opting into delivery does not itself create a test email. Actual failure/reminder/recovery delivery through Mailpit was verified in the isolated rehearsal below.

### Incident behavior

1. A failure must persist through the immediate retry before an incident is created.
2. The first pending failure notice is submitted once in normal operation; continued failures do not queue another copy.
3. After a successfully accepted notice, one reminder becomes eligible after 24 hours. No reminder backlog accumulates while the first failure email remains undelivered.
4. Recovery removes obsolete pending failures/reminders and queues one recovery notice if a failure notice was previously accepted. A recovery with no previously sent failure produces no unnecessary email.
5. SMTP errors leave notices pending for a later manual attempt. State is persisted before sending and after each accepted notice. A stable Message-ID is retained on retries.
6. Accepted means the SMTP server accepted the message; it does not prove inbox delivery. SMTP acceptance and file updates cannot be atomic: an ambiguous send failure or crash immediately after acceptance can still produce a duplicate on retry. No exactly-once delivery claim is made.

A corrupt/unreadable state file fails closed instead of silently resetting incident history. Storage failure after SMTP acceptance is surfaced rather than hidden.

## Exit codes and troubleshooting

| Code | Meaning |
| --- | --- |
| 0 | Database PASS and no alert-delivery error. |
| 1 | Persistent database FAIL; the result is recorded even when email is disabled. |
| 2 | Invalid local configuration, storage/runtime error, or alert-delivery failure. |
| 3 | Another run holds the monitor lock; no overlapping probe/sender is started. |

Database categories are AVAILABLE, NOT_READY, TIMEOUT, UNREACHABLE, AUTHORIZATION and CHECK_FAILED. Only sanitized categories reach console/history/email; never paste a connection string or secret into a report.

If a process crashes and leaves `run.lock`, inspect its recorded PID and confirm that no monitor invocation is still running before removing only that lock file. Do not blindly delete state or the monitoring directory: doing so loses incident/deduplication history. Malformed state requires operator review. Ordinary test runs must not stop/reset the owner's Podman database just to generate an error.

## Verification and next boundary

Preparation coverage: 24 focused unit/integration tests covering read-only probe options/deadline, retry behavior, local-only targets/SMTP, safe error results, notification state, daily reminders, recovery, SMTP failure/retry, filesystem persistence, bounded history and overlapping runs. The manual Podman probe also passed with actual read-only transaction mode; no messages were sent.

Typecheck: PASS. Targeted lint: PASS. Existing frozen migrations, Auth/session code and business records were preserved. New source and local operational state remain uncommitted; no push was performed.

### Completed local Mailpit rehearsal — 2026-10-16

```powershell
pnpm health:rehearse
```

The command uses the same guarded local-only SMTP adapter, incident handling and filesystem store with a fresh ignored `.local/monitoring/rehearsal-*` directory. Database outcomes and the 24-hour reminder clock are simulated; it does not stop services, change accounts, reset data or alter the normal monitor state. It sends five synthetic messages to `operator@abaynou.test`, then performs one real read-only database probe. No new dependency or scheduler is introduced.

Final result: **14 checks PASS, 0 failed; five SMTP messages captured and verified once each in Mailpit**. Project typecheck and targeted lint for the rehearsal script both PASS; final source secret scan has no findings. Verified scenarios: quiet healthy runs, transient failure/retry without email, persistent failure alert, repeated-failure suppression, reminder boundary before/at 24 simulated hours, duplicate-reminder suppression, one recovery, quiet subsequent success, injected SMTP rejection with a retained pending notice, stable Message-ID on successful retry, and final recovery. API verification checks exact Message-IDs, sender/recipient, subject and text/HTML. The final real database probe was AVAILABLE in read-only mode.

Final run evidence: `.local/monitoring/rehearsal-bYinhb/result.json`, with separate `state.json` and `history.ndjson`. The final state has no active incident or pending notice. The regular `.local/monitoring/local` state is untouched by the simulation.

Two preliminary attempts completed the send scenarios but failed the capture verifier because SMTP normalizes text to CRLF and Mailpit's search `total` is the whole-mailbox total; the verifier now normalizes line endings and checks filtered `messages_count`. Those attempts left ten earlier synthetic emails; the final successful run added five. Existing owner emails were not deleted or changed. Search `to:operator@abaynou.test` in Mailpit to inspect these local test alerts. Re-running the rehearsal intentionally sends five more synthetic messages with fresh IDs.

The SMTP rejection is injected before sending; actual local SMTP acceptance and Mailpit capture are verified on the following retry. This does not claim an external-provider outage test, hosted scheduling, or real inbox delivery. Scheduling remains disabled. Next: close the global review and follow the gated QA plan; hosted activation remains separate.

No application pages, HTTP health endpoint, database migrations, Auth/session rules, complaint transaction or outbox processing were changed. No historical E2E suite or production build is required for this isolated CLI addition: focused tests, typecheck and lint cover the changed execution surface. A hosted monitor still requires a separately selected scheduler, durable external state/locking, protected configuration, sender/recipient, and verified alert delivery. Ephemeral application-host filesystem storage is not an approved replacement for that durable state.

Hourly checks (168/week) remain a proposed activation target in the [pilot-readiness plan](next-steps-pilot-readiness.md), not a running schedule or guarantee against Supabase inactivity pausing.
