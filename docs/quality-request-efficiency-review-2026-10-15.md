# Request efficiency improvements and measurement review

Date: 2026-10-15
Status: implementation verified; query/capacity proposals await owner approval.
Scope: the approved first seven improvements, followed by measurement only.

## Implemented changes

| Area | Result |
| --- | --- |
| Database connections | Shared session-pooler role names are accepted only for the configured Supabase project; hosted connections verify TLS. Restricted app_web/app_mailer roles and pool limits of 5/1 remain. |
| Unsupported connection mode | Shared transaction pooling is explicitly rejected because current Supabase guidance documents a Postgres.js pipelining incompatibility. A real hosted connection test still depends on the hosting choice. |
| Staff Auth lookups | Exact Admin-authorized identity lookup plus getUserById replaces first-1,000-user lookups. Activation status reads are bounded to the displayed staff profiles, with a 50-profile database cap. Full Auth directory downloads are removed. |
| Staff target binding | Status commands use the trusted database profile's email and revision before changing provider access, rather than trusting a submitted hidden email. |
| Published content | Request deduplication plus tagged 300-second data caching. Successful publication/settings writes immediately expire their tags. No private identity/session data enters the shared cache; legal acceptance queries remain live. |
| Sessions | Passive/meaningful checks are deduplicated within an RSC render. Mutation actions bypass that cache. Security state is not cached across requests, and renewal is independently authorized. Database command authorization remains intact. |
| Email worker | Connection and SMTP transport are reused across drains. Idle polling backs off to 60 seconds; work resets the interval to 5 seconds. Leases, fencing, retry bounds and HELD behavior are unchanged. E2E uses a 5-second cap for deterministic email checks. |
| Navigation | Complaint, staff and Citizen filters and the existing page selector use next/form client navigation. Query, result and pagination semantics are unchanged. Redundant catalogue/content-editor client refreshes are removed; server invalidation supplies updated data. |
| Notification polling | One in-flight poll per bell, coalesced focus/visibility events, abort on cleanup and monotonic revision handling. Existing Citizen/Commune intervals, passive session behavior and immediate read-action synchronization remain. |

### Intentional retained behavior

- Language changes retain the existing full-document navigation. The current root document owns HTML language/direction and locale persistence; replacing this with a plain Next link broke saved-locale and RTL/LTR checks. A broader locale-layout refactor was not introduced.
- The complaint wizard retains its existing router refresh after result navigation. A regression test proved this still refreshes the shared notification header after submission/recovery.
- The public cache uses the supported unstable_cache compatibility API. Enabling Cache Components across the existing dynamic/authenticated routes would be a broader architectural change. The installed Next.js documentation was consulted.
- Idle receipt pickup can take up to approximately one minute before SMTP delivery. No SMTP delivery SLA or provider throughput was inferred.

## Source and data safety

A single new migration, 20261015000100_targeted_staff_auth_reads.sql, adds guarded Admin Auth projections. It changes no complaint table, index, lifecycle command or pagination query. It was reconstructed and exercised in the disposable stack, then applied as the sole pending migration to the normal local database using migration up --local. No reset or seed was run against owner data.

Read-only before/after fingerprints matched for owner Auth accounts, application profiles, complaints, settings, publications and catalogues. Earlier migrations, frozen planning/acceptance documents and design references were not edited by this work. No hosted project was created, linked or modified. No commit or push was performed.

The generated development cache was cleared after stopping this task's dev server to recover about 1.15 GB of disk space. Source files, credentials and database volumes were preserved.

## Verification record

| Check | Result |
| --- | --- |
| Full unit/component/integration run | 217 passed, 0 failed, 37 files |
| Follow-up staff security and publication-invalidation checks | 10 passed, 0 failed; includes two added status-binding cases |
| Initial full browser run | 123 total: 115 passed, 5 failed, 3 skipped |
| Corrected affected browser groups | 16 passed, 0 failed, 0 skipped |
| Additional measured navigation checks | 4 passed: Admin GET filter and Citizen section navigation in AR/FR/EN |
| New database Auth boundary checks | 5 passed, 0 failed, with more than 1,000 Auth identities |
| Typecheck | PASS |
| Lint | PASS, including adjusted tests/measurement tooling |
| Production builds | PASS |
| Isolated database reconstruction | PASS |
| Owner data fingerprint comparison | PASS |
| Restored localhost | AR/FR HTTP 200; no visible information-load error |

The five initial browser failures comprised two filter-navigation test races, the wizard's necessary header refresh, and two language-navigation checks. The required behaviors were restored and filter tests now wait for navigation. The 16-case rerun covers all five failed and all three skipped cases, plus related regressions. Thus all 123 cases have a successful result across the full run and corrected focused run. A second historical full-suite run was deliberately avoided.

## Measurement method and limitations

- A production Next.js build connected only to the separate disposable Supabase stack: app port 55300, API 55321, database 55322 and Mailpit 55324.
- Local host: 4 logical CPUs and 16 GiB RAM. This is not hosted Supabase Nano compute, and the load generator shares the local machine.
- Five active synthetic staff; 100/1,000 synthetic Citizens at 1,000/10,000 submitted complaints, respectively. Each Citizen has ten complaints.
- Real guarded submission commands and integrity constraints remained enabled. There were ten additional regression complaints already present in this disposable database.
- Complaint bodies used short-to-medium repeatable AR/FR/EN paragraphs. Compression, brief responses and the assumed account/staff ratio limit storage extrapolation.
- Each database case had one warm-up and 30 timed calls. Times include the guarded database function and loopback round trip. No query, index, planner setting or production pool-size tuning was applied.
- Inner-query EXPLAIN ANALYZE was captured under app_writer with the proper staff context. It describes the equivalent inner SQL, not a nested plan trace of every PL/pgSQL call.
- The email worker was stopped before synthetic generation, so 10,000 test receipts were not delivered.
- Browser sessions, passwords and credentials remained in memory. No measurement screenshots, traces, saved cookies or storage-state files were produced.
- HTTP tests are short bursts of authenticated full-page requests, not end-user paint measurements or sustained/soak tests.
- JSON result sizes approximate data payload; they exclude PostgreSQL/TLS/Auth overhead and are not Supabase's metered egress.

## Query results

P95 means the 95th-percentile observed duration. These are local measurements.

| Existing guarded operation | 1,000 complaints P95 | 10,000 complaints P95 |
| --- | ---: | ---: |
| Citizen list, limit 20 (10 owned records in fixture) | 5.75 ms | 6.70 ms |
| Commune first page | 17.69 ms | 189.27 ms |
| Commune deep page | 11.12 ms | 135.54 ms |
| Commune selective substring search | 11.92 ms | 118.63 ms |
| Commune Arabic substring search | 28.62 ms | 156.26 ms |
| Dashboard counts | 16.29 ms | 40.64 ms |
| Staff unread summary | 13.44 ms | 54.90 ms |

At 10,000 complaints, the unfiltered equivalent plan scanned 10,010 complaint rows, joined profiles, evaluated a full window count, and sorted before returning 20 rows. Its measured execution time was 142.27 ms. Selective and Arabic searches also scanned the complaint set; corresponding plan execution times were 162.19 ms and 135.26 ms.

These plans confirm growing scan/count costs. They do not establish that a particular proposed index will be selected or that splitting a count will improve every workload.

## HTTP concurrency results

Full-page Citizen complaint-list requests after login:

| Concurrent sessions | Requests | Median | P95 | Errors | Throughput | Peak app_web connections |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 5 | 285 ms | 521 ms | 0 | 2.76 requests/s | 2 |
| 5 | 25 | 773 ms | 1,180 ms | 0 | 5.85 requests/s | 5 |
| 10 | 50 | 1,152 ms | 1,451 ms | 0 | 8.22 requests/s | 5 |
| 20 | 100 | 2,471 ms | 3,397 ms | 0 | 8.05 requests/s | 5 |

The throughput plateau and latency rise at 20 sessions merit a hosted test before promising a service level. They do not establish a 20-user product limit: normal users pause between actions, and ordinary Next client navigation can reuse layouts instead of requesting a full document.

No connection-limit increase is recommended from these local results alone.

## Storage and transfer

| Synthetic submitted complaints | Entire local database | Application tables/indexes | Incremental application bytes per complaint |
| --- | ---: | ---: | ---: |
| 1,000 | 20.45 MB | 7.55 MB | 6.27 KB |
| 10,000 | 76.28 MB | 62.47 MB | 6.12 KB |

MB/KB above use decimal units. A sample of 100 review → processing → short official response → closure lifecycles added approximately 10.16 KB per completed complaint. The combined submitted-plus-completed sample is therefore approximately 16.28 KB per complaint under this fixture pattern.

This is not a guaranteed production footprint. Long Arabic text, corrections/response versions, more staff notification recipients, a different new-account ratio and accumulating operational records can increase it.

For illustration only, a hypothetical 300 MB growth budget with a conservative 25–50 KB allowance per completed complaint represents about 6,000–12,000 complaints. At 1,000 completed complaints/month, that is roughly 6–12 months before other growth. No such budget or threshold was configured, and no actual traffic forecast was assumed.

Observed JSON payloads:
- Citizen list of ten records: approximately 3.6 KB.
- Commune list of twenty records: approximately 8.5 KB.
- Dashboard counts/unread summary: approximately 0.1 KB each.

The full HTML averaged about 58 KB per page in the HTTP test; that belongs to application-host transfer, not directly to Supabase database egress. It must not be used as a measured Supabase egress figure.

## Proposals awaiting owner approval — NOT implemented

1. **Prioritize Commune page/count work.** Evaluate matching sort indexes together with a narrower page/count strategy so full joined row data is not processed only to return twenty rows. Preserve exact numbered pagination and security context. A matching index alone may not eliminate the window-count scan.
2. **Evaluate substring-search indexing/query structure.** Test selective reference/subject/Citizen-name searches in AR/FR/EN. Preserve current substring semantics; do not silently substitute different full-text-search behavior.
3. **Keep the Citizen list unchanged for now.** Its measured P95 remains under 7 ms in this dataset. No speculative index or query rewrite is justified by these results.
4. **Monitor dashboard/unread aggregation.** The tested operations remain modest. Consider a different counter strategy only if realistic staff backlogs demonstrate a material problem; any change must retain race safety.
5. **Validate on the selected hosting platform and a hosted Free project before promising user capacity.** Measure representative journeys, actual egress, CPU/RAM, connection usage and longer-running workloads. Include distinct users and realistic text/response distributions.
6. **Set approved monitoring and growth thresholds after the pilot.** Track database size, egress, latency and account/history growth. No retention deletion, automatic upgrade, pool increase or quota change was made.
7. **Resolve remaining launch gates separately.** Real hosted connection/TLS compatibility, server-side Auth IP/rate behavior, production SMTP, independent backup/restore and operational ownership still require deployment verification.

Supabase Free remains a plausible small-pilot choice. These results do not certify a daily/monthly user maximum or justify an automatic paid upgrade.

## Reproduction and references

The existing isolated runner accepts a test selection and --measure. It reconstructs only the disposable stack, builds the app, runs the selected browser checks, stops the test mail worker and executes scripts/measure-quality.ts. It must not be pointed at owner or hosted data.

Full aggregate measurements and sanitized plans are recorded in [the measurement JSON](./quality-request-efficiency-measurements-2026-10-15.json).

Provider references checked during this work:
- [Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Postgres.js compatibility guidance](https://supabase.com/docs/guides/database/postgres-js)
- [Supabase Free allowances](https://supabase.com/pricing)
- [Database size restrictions](https://supabase.com/docs/guides/platform/database-size)
- [Egress accounting](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
