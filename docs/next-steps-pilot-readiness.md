# Next steps — local preparation and zero-budget pilot readiness

Updated: 2026-10-16 (Africa/Sao_Tome).
Status: local QA stages PASSED, as confirmed by the project owner on 2026-10-16. Local monitoring preparation and Mailpit rehearsal are complete. Repeat QA after staging/UAT deployment; hosted setup and activation have not started.

This is a follow-up execution plan. It preserves the frozen requirements, development roadmap, acceptance records and design references. It records the owner-confirmed local QA result without inventing new test counts or changing frozen acceptance records. It does not mark deployed QA/release gates complete, authorize deployment, create provider accounts, enable schedules, send emails, or authorize a Git push.

## Current position

- DEV-01 through DEV-10 have acceptance records. The owner confirms that the QA stages passed locally and requests a repeat after deployment. Local QA is not reopened by this plan update; no tests were rerun or new counts claimed. Deployed verification and production acceptance remain pending.
- The owner approved the recent quality, performance, pagination and dropdown refinements. Commit `c724be8` records the accumulated updates; local `main` is one commit ahead of `origin/main` as checked on this date. Nothing from that commit has been pushed.
- The working app is local Podman/Supabase. The owner confirmed on 2026-10-16 that the Vercel account and hosted Supabase Free project already exist. The owner supplied public project URL https://vdpflzhsohhvvwdrjzhd.supabase.co and confirmed the app Git repository is not yet imported into Vercel. The owner then confirmed it is new/empty in West EU (Ireland). The owner completed read-only preflight, applied all 26 application migrations and supplied matching Local/Remote history. The owner also initialized canonical catalogues and supplied 7 active categories / 6 active locations. The owner initialized staging public pages/settings with 9/27/3 readback on 2026-10-18. Runtime credentials, Auth/email configuration and Vercel deployment remain pending; see the Vercel staging checklist. The assistant has not created, linked or modified a hosted project. The owner linked only the isolated release workspace and applied the reviewed migrations; the ordinary local Podman checkout remains unlinked.
- Supabase Free remains the selected backend for the pilot and possible short-term low-volume operation. The budget is $0; no paid plan or automatic upgrade is assumed.
- The owner selected Vercel Hobby as the primary application-hosting target on 2026-10-16 and requested a Plan B. Netlify Free is the proposed backup host, subject to compatibility and quota verification. The owner subsequently confirmed both accounts/project prerequisites exist; this work has not created accounts or deployed the app. See [Vercel staging preparation](vercel-staging-preparation.md) for repository findings and remaining configuration.
- Neon remains a contingency candidate, not an approved migration. Its Auth/security compatibility and worker compute consumption would require a separate assessment before migration approval.
- Existing verification evidence is in [request-efficiency review](quality-request-efficiency-review-2026-10-15.md) and [Commune query/UI review](commune-query-pagination-review-2026-10-15.md). Reuse that evidence; do not rerun historical suites solely to update this plan.

## Ordered next steps

| Order | Work | Completion evidence / boundary |
| --- | --- | --- |
| 1 | Prepare the health-check and failure/recovery reporting locally — PREPARED. | Manual Podman probe PASS, 24 focused preparation tests passed, independent local state/locking and opt-in Mailpit-only transport. See [local monitor instructions](local-health-monitor.md). No scheduler or real email enabled. |
| 2 | Test monitoring locally using Mailpit — COMPLETE. | 14 checks PASS, five actual local SMTP messages verified by exact ID/content in Mailpit, including failure/reminder/recovery, duplicate suppression and pending SMTP retry. Simulated time/outcomes; final real read-only database probe PASS. Owner services/accounts and normal monitor state preserved. |
| 3 | Local QA stages — PASSED (owner confirmation). | Confirmed by the owner on 2026-10-16. Retain the existing local verification evidence; do not repeat historical local QA solely for this planning update. |
| 4 | Prepare an explicitly approved hosted staging/UAT pilot under REL-01. | Prepare the owner-selected Vercel Hobby target and validate Netlify Free as the backup; confirm applicable eligibility and select an external scheduler/alert mechanism, then inspect and configure the existing owner-confirmed Supabase Free project, apply reviewed migrations/canonical initialization, configure restricted database connectivity, Auth URLs and external SMTP. Deploy the reviewed application through the chosen Git/deployment process. Use synthetic or specifically approved test data. |
| 5 | Repeat QA-01 through QA-04 against the deployed staging/UAT environment. | Verify the deployed build, hosted database permissions/RLS, authentication redirects and sessions, email/worker delivery, Citizen and Commune workflows, responsive/accessibility and AR/FR/EN behavior. Use disposable test accounts/data and a separately scoped database for destructive reconstruction checks; never reset the shared pilot database. Record results and resolve failures before opening the pilot to testers. |
| 6 | Configure and activate monitoring on the deployed pilot. | Set hosted endpoints, restricted credentials, sender and owner-selected alert recipient in protected configuration. Test failure/recovery delivery, scheduler run history and persistence outside Supabase. Only then enable the schedule. |
| 7 | Operate a controlled one- to two-month pilot and review actual usage. | Invite testers in batches; review database size, transfer, errors, email delivery and performance weekly. Initial 50%/70% usage warning levels are proposed operational thresholds, not configured alerts. Keep provider warning emails monitored and rehearse manual resume. |
| 8 | Complete the formal release gates before accepting official live Citizen complaints. | REL-02 legal/content/operational readiness; REL-03 hosting, SMTP, secrets, monitoring and encrypted off-provider Auth-inclusive backup/restore evidence; then separately approved REL-04 production deployment. Decide whether continued Free operation remains feasible from actual usage and accepted recovery arrangements. |

## Monitoring behavior to prepare

- Run one small genuine database read with a strict timeout and restricted application permissions. A cached homepage or a successful web-server response alone is not proof of database availability.
- No private complaint data, full-table scans, quota aggregates, complaint writes, account changes or meaningful session-activity updates in the probe.
- Provide a manual command with a clear PASS/FAIL result, timestamp and elapsed time; use safe failure categories rather than connection strings or raw exception payloads.
- Retry a failed probe once after a bounded short delay. Treat only the persistent failure as an incident.
- Keep private run history. No routine success emails.
- Send one failure email per incident, at most one reminder per day while it continues, and one recovery email when a subsequent check succeeds.
- Store incident/reminder state outside the database being checked. The alert sender must work without Supabase Auth and without the application's database-backed email outbox. Keep concurrent runs from sending duplicate alerts.
- Local tests use Mailpit and disposable/local notification state. They must not send to a real inbox or leave a running schedule.
- Keep secrets outside source control and logs. A public readiness response, if used, exposes only minimal availability information and is protected against abusive repeated probes; the external monitor receives no database credentials or private data.
- After deployment, configure and verify delivery to the owner-selected recipient before activating the schedule. No recipient or email/scheduler provider has been selected by this document.

### Check frequency and inactivity

The latest discussion proposes hourly availability checks: 24/day, 168/week, plus bounded failure retries. This is an operational planning target, not an enabled schedule. Expected detection can take about an hour plus scheduler delays; it is not an immediate-alert guarantee.

The frozen database architecture records two to three checks/day for inactivity handling. This follow-up explicitly records the later hourly availability-monitoring proposal instead of silently rewriting that frozen source. The exact hosted frequency, provider limits and $0 feasibility must be confirmed in the activation configuration before enabling it.

Successful real database queries provide activity and may reduce the chance of Free-plan pausing. No specific count guarantees prevention. A probe cannot resume an already-paused project, bypass quotas, increase capacity, or replace backups. Local Podman has no hosted inactivity-pausing rule.

## Hosting and delivery decisions still required

- Vercel Hobby is the owner-selected primary target. Its published rules require non-commercial personal use; the owner describes the platform as a non-commercial public service; whether development/maintenance is paid has not been established, and official Commune operational eligibility is not established by the service being free. Confirm the intended use with Vercel before relying on Hobby for official operation. Preserve the frozen architecture record; this follow-up records the later hosting choice.
- Vercel Hobby's daily-only cron capability cannot provide the proposed hourly monitoring or timely outbox processing. An independently verified $0 execution option is required if that platform is used for a permitted pilot.
- The existing continuous email worker needs an explicit hosting/execution strategy. Do not assume deploying the Next.js app also runs the worker. Preserve durable intent, bounded retries, leases/fencing, HELD handling and email privacy.
- Supabase Auth verification/recovery/invitation emails and application complaint emails need a suitable SMTP provider and separate configuration. Mailpit remains local testing only. Monitor alert delivery is independently executable even if the database is unavailable.
- Select the database connection mode/region and verify restricted roles, TLS, pooling and server-side Auth rate behavior on the actual host.
- Set independent encrypted backup ownership, destination, retention, acceptable data loss/recovery time and a tested restore procedure before official live complaints. Database dumps alone do not restore all Auth/configuration/secrets.

## Primary hosting and Plan B

Owner decision, 2026-10-16: prefer **Vercel Hobby** for the Next.js application. Prepare **Netlify Free** as the backup candidate. This is a hosting decision and preparation plan, not a deployment or Git-push instruction. Netlify has not yet been tested with this working tree.

| Responsibility | Primary | Plan B / portability requirement |
| --- | --- | --- |
| Next.js application | Vercel Hobby, subject to permitted use and deployed QA. | Same reviewed Git revision deployed through Netlify's Next.js adapter; validate this exact Next.js version, server actions, redirects, caching and restricted database connectivity before calling the backup ready. |
| Database and identity | Hosted Supabase Free, once separately provisioned. | Keep the same Supabase project, restricted database roles and Auth identity store; switching app hosts requires no complaint/account migration. A staging rehearsal uses test data and approved restricted credentials. |
| Application email | Selected external sender plus durable existing outbox. | Same sender/outbox; execute short bounded drain runs using a separately verified scheduler/runtime. Do not assume a continuous worker runs inside either serverless app host. Preserve retries, leases, fencing, HELD handling and privacy. |
| Monitoring | Independently reachable scheduler/sender with durable state outside Supabase. | Monitor the active host and database, and remain able to report if the application host is unavailable. The local filesystem monitor must be adapted before hosted activation. |

### Preparation before inviting testers

1. Keep application behavior portable: provider-specific deployment configuration stays separate from complaint/Auth logic. No application rewrite or database migration is authorized by this plan.
2. Define a protected configuration checklist for both hosts: application origin, Supabase URLs, restricted connection strings, Auth callback allowlist, email sender and relevant cryptographic secrets. Store actual values only in provider secret stores; do not copy `.env.local` or secrets into source/documents. Verify connection mode, TLS and connection limits on each host.
3. Verify Vercel eligibility and Netlify account/repository eligibility. Netlify Free currently has a 300-credit monthly cap shared by deployments, compute and traffic; reaching the cap pauses sites. Assess the new-project Netlify badge against the approved design. A backup on a separate host still has its own quotas.
4. Prepare the Vercel staging deployment first. Then, with owner authorization for the external deployment, rehearse the same build on a separate Netlify test URL. Verify sign-in, email callbacks, complaint submission/readback, staff access, locale/direction, notification refresh and outbox delivery. This is a targeted host-compatibility rehearsal; repeat the planned full QA stages on the selected deployed staging environment.
5. Record exact build/config versions, fallback URL and measured switch steps. If an owner-controlled custom domain is available, use it to keep the user-facing address stable. Otherwise document the changed URL and update exact Auth callback/site URLs, generated email links and allowed origins. Switching hostnames may require users to sign in again; already-issued links to the old host must be considered.
6. Validate independent monitoring state and a single effective worker schedule. Avoid competing deployments launching uncontrolled drain loops; retain database lease/fencing protections. No schedules are enabled during preparation.

### When and how to switch

Use Plan B if Vercel confirms the intended use is ineligible, a quota prevents service, an extended outage exceeds the owner's accepted downtime, or deployed compatibility cannot be resolved. Switch only after the backup build and configuration have passed the rehearsal; until then this is a candidate backup, not a ready failover service.

The manual runbook is: select the verified backup build, provision its protected configuration, update the domain/origin and Auth/email callback settings as needed, move the worker schedule if required, verify database access and key Citizen/Commune flows, then point independent monitoring at the active host. Keep the previous deployment available for rollback where possible. There is no automatic failover and no zero-downtime guarantee; DNS propagation, changed hostnames or already-suspended services can affect recovery.

An application-host switch does **not** resolve a Supabase pause, database quota or Supabase outage, because both hosts use the same backend. Supabase recovery/backups and the separately assessed Neon contingency remain distinct work.

Sources checked 2026-10-16: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Vercel fair-use rules](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage), [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Netlify pricing](https://www.netlify.com/pricing/), [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [Netlify scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/), [Netlify badge policy](https://www.netlify.com/changelog/2026-08-19-pre-launch-toolbar-and-powered-by-netlify-badge/).
## Verification scope and activation gates

During local monitoring preparation, run focused probe/reporting/state tests, Mailpit delivery checks, typecheck and lint, plus a production build if application/runtime configuration changes. No historical full E2E rerun is required merely for this new plan or an isolated monitoring helper. If shared Auth/session/database/outbox behavior changes, expand checks according to that actual impact. Local QA is owner-confirmed as passed. Repeat the applicable QA stages on deployed staging/UAT as requested, including environment-specific integration checks; reconstruction checks must use a separate disposable database.

Before hosted activation, verify a real database read, a simulated persistent failure, a single failure alert, suppressed duplicates, reminder timing and a single recovery alert. Check safe public output/private logs, scheduler execution and email delivery failure handling. Do not pause the real pilot database just to test an alert when an injected test failure is sufficient.

Before the first official live complaint, the release checklist must include recoverability, approved content/legal decisions, permitted hosting, working external email and a named primary/backup operator. A monitored Free pilot does not by itself satisfy those release gates.

## Current authorization boundary

The owner authorized steps 1 and 2 on 2026-10-16. Preparation has 24 passing focused tests and a successful real read-only Podman probe. The actual local Mailpit rehearsal has now passed 14 checks and verified five failure/reminder/recovery messages with isolated state and simulated time/outcomes. No owner database outage or account change was required. See the local monitor instructions for evidence and the preliminary verifier corrections. The owner subsequently confirmed that local QA stages passed and requested repeating QA after deployment. The next preparation step is hosted staging/UAT under REL-01, followed by deployed QA. The owner then selected Vercel as the primary application host and requested preparation of a Plan B; this plan proposes Netlify Free as the backup candidate. This update neither runs deployed QA nor authorizes hosted changes.

Hosted setup, real-recipient email testing, scheduling activation, Git commit/push and production promotion remain separate actions requiring owner instruction and the applicable roadmap gates. No frozen planning, acceptance or design document was edited.
