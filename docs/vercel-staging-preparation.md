# Vercel staging preparation — prepared 2026-10-16, updated 2026-10-18

Status: repository inspection complete; hosted application schema migrated by the owner; canonical catalogues and staging public data initialized by the owner; the owner has set both restricted runtime role passwords; private runtime connectivity, Auth/email configuration and Vercel deployment remain pending. The owner selected Vercel Hobby and confirmed that the Vercel account and hosted Supabase Free project already exist. The owner supplied the public Supabase URL below and confirmed the app repository has not yet been imported into Vercel. The owner supplied both read-only results: PostgreSQL 17.11, postgres execution role, role/schema creation allowed, provider Auth present, no application schema/migration history/custom roles/application public objects, and grantable SELECT on all five required Auth columns. The owner supplied a successful apply log for all 26 migrations and matching Local/Remote history on 2026-10-16. This confirms application schema deployment; runtime credentials, accounts and SMTP remain separate; the owner subsequently initialized the staging public content as recorded below. Netlify remains the documented backup candidate; current work focuses on Vercel.

This is an unfrozen follow-up checklist. No frozen architecture, migration or acceptance record is changed. Local QA is owner-confirmed as passed; repeat QA after staging deployment. No automatic commit, push, deployment, migration or schedule is authorized by this document.

## Confirmed target identifiers

- Supabase project URL: https://vdpflzhsohhvvwdrjzhd.supabase.co
- Supabase project ref: vdpflzhsohhvvwdrjzhd
- Supabase region: West EU (Ireland), owner-confirmed 2026-10-16. Project is newly created and empty according to the owner; owner-supplied read-only catalog checks confirm the empty application starting point and creation privileges; the owner subsequently applied all 26 migrations and supplied matching history; fresh-project state above describes the original preflight, not the current initialized schema.
- GitHub repository: https://github.com/Gram-ab/abaynou-tatawasal
- Git branch: main.
- Repository root contains package.json and next.config.ts; Vercel Root Directory is `./`.
- Vercel repository import: not yet performed, as confirmed by the owner.
- Suggested Vercel project name: abaynou-tatawasal-staging (availability not checked). Confirm the actual assigned origin before setting APP_ORIGIN/Auth callbacks.
- Local Git state at inspection: main is one commit ahead of the locally recorded origin/main, with monitoring/preparation changes still uncommitted. A fresh Git import would not include these local-only changes. Commit/push remain separate owner-authorized actions; no remote synchronization is claimed here.

The isolated CLI login/link/dry run succeeded according to owner-provided output. The owner completed the migration apply and history verification successfully. The owner then initialized the catalogues with expected 7/6 readback. The owner also supplied public-content readback 9/27/3. The owner has since confirmed restricted runtime role passwords are set; configure protected Vercel values using the private transfer helpers below. Hosted application writes have been performed by the owner, not the assistant. Do not infer project readiness from a successful API root response or run a reset against the hosted project.
## Findings from the current repository

| Area | Current state | Preparation needed |
| --- | --- | --- |
| Web application | Standard Next.js 16.3.5 App Router, server actions, next-intl proxy and self-hosted assets. | Vercel Next.js preset; verify deployed behavior. No custom server is needed for the application. |
| Node / package manager | Local Node 22.14.0; pnpm 12.4.2 is pinned in packageManager. engines.node is now 22.x for deployment. | Select/pin a supported Node major deliberately. The previous broad range could select Node 24; the new pin selects the local Node 22 major. Verify the actual deployed version. Enable Corepack to honor pnpm 12.4.2; use frozen lockfile installation. |
| Database access | Server-side restricted app_web/app_mailer identities with TLS verification for hosted connections. | Provision/verify the same application schema, reviewed migrations and restricted logins in the hosted project. Use hosted credentials, not local Podman values or the database owner in runtime. |
| Pooling | Code accepts a verified direct connection or shared session pooler; explicitly rejects shared transaction port 6543 for this driver configuration. | Start with the hosted session pooler (5432), using app_web.<project-ref> / app_mailer.<project-ref> identities when applicable. Verify custom-role authentication, TLS, connection limits and concurrency. Do not blindly paste the dashboard's postgres-owner connection string or weaken verification. |
| Authentication | SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, server-only service-role access for staff administration; APP_ORIGIN drives email redirects. | Configure exact staging origin and callback paths; reproduce approved Auth policy/templates using the hosted project's settings. Local config.toml does not automatically configure hosted Auth. |
| Complaint email | Durable DB outbox and a bounded drain API already exist. Current CLI unconditionally loads .env.local outside E2E; current SMTP adapter has no username/password authentication support. | Select sender/provider and implement the required authenticated SMTP or provider adapter. Prepare a hosted entrypoint using injected secrets, bounded execution and a protected scheduler. Copying local SMTP environment variables alone is insufficient. Preserve existing outbox semantics. |
| Scheduling | No hosted scheduler/worker route is configured. | Hobby cron is daily-only. Choose a verified independent execution option for timely email draining and proposed hourly monitoring. Do not deploy an infinite watch process inside a request function. |
| Health alerts | Verified local-only CLI, loopback targets, Mailpit transport and ignored filesystem state. | Hosted monitoring needs a separate configuration/transport and durable independent state/locking. Do not run the local-only command unchanged on Vercel or use its ephemeral filesystem as persistent alert state. |

## Proposed Vercel project settings

- Framework preset: Next.js.
- Root directory: ./ (verified Git root contains package.json and next.config.ts).
- Build command: pnpm build.
- Install command: pnpm install --frozen-lockfile, with ENABLE_EXPERIMENTAL_COREPACK=1 so the existing packageManager pin is honored.
- Output directory: Next.js preset default; do not change to a static public export.
- Runtime: Node.js 22.x is now pinned in package.json to match the verified local major. Keep PostgreSQL/Nodemailer on Node.js.
- Region: target Vercel Dublin (dub1 / eu-west-1) to match the owner-confirmed Ireland database. Verify availability and deployed function placement during project configuration; it has not been configured yet.
- Environment scope: dedicated staging/test database and credentials. Do not attach all preview branches or untrusted pull requests to operational credentials.
- Stable HTTPS staging URL: determine before configuring APP_ORIGIN and Auth callbacks. A Vercel deployment labeled Production can still be a staging application for this project; it must not silently become the official service.

## Protected configuration checklist

Do not paste values into chat, source, screenshots or this document. Configure them directly in the relevant provider's protected settings.

| Variable | Consumer | Purpose |
| --- | --- | --- |
| APP_ENV | Web / hosted worker | Use a deliberate hosted value such as staging; never local or e2e for hosted targets. |
| APP_ORIGIN | Web / worker | Exact stable HTTPS application origin, without locale path. |
| SUPABASE_URL | Web / worker connection validation | Hosted project API URL; its project ref must match pooled DB identity. |
| SUPABASE_PUBLISHABLE_KEY | Web server Auth adapter | Hosted public client key, still consumed server-side in this implementation. |
| SUPABASE_SERVICE_ROLE_KEY | Privileged server Auth adapter | Staff provisioning/administration only; never expose to the browser or general database queries. |
| DATABASE_URL | Web server | Restricted app_web hosted database connection with verified TLS. |
| AUTH_COOKIE_SECRET | Web server | Fresh staging secret for sealed Auth intent cookies; preserve across staging redeploys. |
| COMMAND_FINGERPRINT_SECRET | Web server | Fresh 64-character lowercase hex secret; preserve while command receipts depend on it. |
| MAILER_DATABASE_URL | Worker only | Separate restricted app_mailer hosted connection. |
| SMTP_HOST / SMTP_PORT / SMTP_SECURE / MAIL_FROM | Worker only | Provider-specific sender settings; authenticated credentials/adapter remain to be implemented after choosing the provider. |

Do not introduce NEXT_PUBLIC prefixes for credentials. Keep owner migration access outside the runtime app. Keep worker credentials off the web deployment if the worker executes separately. Supabase Auth's SMTP configuration is separate from the application's outbox sender; both must be tested.

## Auth callbacks and data preparation

Set the hosted Supabase Site URL to the agreed stable staging origin. Allow the six exact existing callback URLs under that origin:

- /ar/auth/confirm, /fr/auth/confirm, /en/auth/confirm
- /ar/commune/auth/confirm, /fr/commune/auth/confirm, /en/commune/auth/confirm

Preserve the scanner-safe confirmation pages and approved email templates, password/email-change policy and session rules. Avoid unrestricted callback wildcards. Verify what is already configured in the hosted project before changing it.

Check migration history and existing hosted data before applying anything. Initialize only reviewed canonical data and explicitly approved staging public content. Never run the local Podman reset/seed/bootstrap helpers against the hosted project, copy real local accounts as fixtures, or assume schema migrations alone create the hosted login secrets and initial administrator.

## Hosted preflight evidence

Owner-provided final result on 2026-10-16: SELECT is grantable (YES) on auth.users columns id, email, email_confirmed_at, last_sign_in_at and raw_user_meta_data. This supports the Auth-column SELECT grants used by the migrations. INSERT/UPDATE/REFERENCES entries are permissions of the SQL Editor execution role, not a grant to app_web or Citizen/Agent users. No runtime permission was changed by this preflight.

The owner subsequently supplied the single-row summary: postgres / 17.11, role and schema creation true, provider Auth true, app schema/history false, application roles and application/public objects empty. The read-only starting-point checks are now complete; this does not replace actual migration-execution verification. `deployment/supabase/02-read-only-summary.sql` combines those remaining catalog checks into one SELECT and one visible result row, avoiding SQL Editor multi-result confusion. Run it in the same explicitly selected hosted project and review the output before preparing apply commands. No repeat of the grant/summary queries or historical regression tests is required. An isolated local CLI workspace with all 26 checksum-verified migration copies is prepared; the owner subsequently completed login/link/dry-run and supplied the exact expected 26-file preview. The linked release target and checksums were reverified locally. Follow `deployment/supabase/04-apply-reviewed-migrations.md` for the owner-executed application step; the owner subsequently supplied successful application of all 26 files and matching Local/Remote migration history.

## Prepared hosted database artifacts

- `deployment/supabase/01-read-only-preflight.sql`: run in the SQL Editor of the explicitly selected project vdpflzhsohhvvwdrjzhd. It uses a read-only transaction with a five-second statement timeout and returns version/role, schema/table metadata, known runtime-role presence and grant metadata. It reads no Auth/Citizen/complaint rows and creates no objects. The owner should review all result sets; some SQL Editor clients display only the last one, so inspect each statement's results separately if needed.
- `deployment/supabase/migration-manifest.json`: ordered list and SHA-256 hashes of all **26** current migrations, for review/change detection. It is not a migration runner or proof they have been applied.

Expected starting point: provider Auth schema exists; application schema and custom application roles do not yet exist. If application objects or prior migration history are present, inspect them before selecting the apply strategy; do not reset the project. Absence of direct grant rows is not a standalone compatibility failure because inherited privileges/ownership also matter.

The apply plan remains: preserve migration order/history; verify managed PostgreSQL permissions for role creation, function ownership and Auth-column grants; provision fresh restricted login secrets; initialize the seven canonical categories and six locations plus approved staging public content; configure hosted Auth/templates; then provision the initial administrator through a reviewed hosted procedure. Existing local seed/bootstrap entrypoints cannot be used unchanged on hosted Supabase. Development publication fixtures carry explicit local-development audit provenance and must not be silently presented as final hosted/official content. At the original preflight-preparation stage, no hosted writes or migration apply had occurred; the subsequent owner-executed application and initializer results are recorded below.

The ordinary local checkout must remain unlinked: its maintenance/monitor commands deliberately reject a linked-project marker. Prepare any future CLI link/apply from an isolated release workspace instead of linking this Podman development checkout. Do not put owner connection strings or credentials in command examples, the manifest, Git or chat.
## Hosted application schema and staging catalogue initialization

Owner-provided evidence: attached command output on 2026-10-16 shows every one of the 26 migrations applied successfully, followed by a migration list with all 26 versions matching Local and Remote. No SQL failure was reported. No repeat migration push or historical QA rerun is needed for this evidence.

Prepared next artifact: `deployment/supabase/05-initialize-staging-catalogues.sql`. Run it in the explicitly selected project's SQL Editor as postgres. It writes only the seven canonical categories, six locations, 27 label rows and one constrained SYSTEM audit event per newly inserted item, in one transaction. A rerun preserves matching existing entries; identity conflicts abort. It requires an owner role with RLS bypass rather than weakening runtime authorization, and checks the final expected migration version. Expected final result for the fresh project is active_categories=7, active_locations=6.

This is deliberately **staging data from the approved DEV-04A development fixture**, not an official production content approval. The frozen audit constraint accepts the existing `LOCAL_CANONICAL_FIXTURE` source label; the initializer retains and documents that fixture provenance instead of inventing a new audit source, changing the constraint or pretending the seed came from an administrator action. Production/bootstrap provenance and Commune wording validation remain release decisions. No accounts, complaints, settings, legal publications or credentials are inserted by this artifact.

Focused local rehearsal: **4 checks PASS** — initial catalogue/label/audit counts, idempotent rerun, conflict rejection and complete rollback cleanup. It used a temporary scratch schema with cloned current catalogue/audit constraints; no owner rows or hosted data were changed. The rehearsal's migration guard used a synthetic scratch history row, so it is not a new full reconstruction or a hosted execution/RLS-policy test. No unrelated regression suite ran. The owner executed the catalogue initializer on hosted Supabase and supplied active_categories=7, active_locations=6. Catalogue initialization is complete according to that readback.

Remaining setup after catalogue initialization: fresh restricted runtime role credentials and application secrets; staging public settings/pages with explicit placeholder labeling; approved hosted Auth templates/policies/callbacks; initial administrator through a controlled hosted procedure; authenticated SMTP plus worker/monitor execution; Vercel import and deployed QA. Existing local scripts still must not be run against hosted Supabase.

## Prepared staging public settings/pages

`deployment/supabase/06-initialize-staging-public-content.sql` is ready for owner execution in the selected hosted project's SQL Editor. It initializes nine fixed public pages (27 AR/FR/EN translations) and one demonstration settings record with three translations. Expected final result: published_pages=9, current_page_translations=27, settings_languages=3.

The page data comes from a public-only snapshot of the currently published local pages, validated by the existing publication schema. No Citizen/staff/complaint/session data was exported. Six stale account-preview sentences were found in FAQ and USER_GUIDE (one per locale/page) and removed from the hosted staging copy only. No frozen fixture/design, application behavior or existing local publication was changed. Future intentional content updates should be made through the approved administration workflow rather than silently reseeding.

Settings explicitly retain demonstration/provisional naming, address and hours. The phone is +00000000000 and email commune@example.invalid, not real contact details. Privacy, Terms and Accessibility remain provisional Commune-owned content. The initializer deliberately retains the existing LOCAL_DEVELOPMENT_FIXTURE audit provenance, not an invented production approval. It publishes only missing pages and creates settings only if absent; existing publications/settings are preserved, and fixed-page/translation conflicts fail rather than being overwritten.

Focused local rehearsal: **4 checks PASS** — 9/27/3 initial publication/settings counts with 10 atomic audit events, idempotent rerun, preservation of an existing updated publication, and disposable database cleanup. The rehearsal reconstructed only the four unchanged foundation migrations with an empty minimal provider identity table and synthetic migration guard; it was not a full 26-migration regression/reconstruction or hosted execution test. No owner rows, hosted data or cluster roles were modified. The owner ran the public-content script and supplied published_pages=9, current_page_translations=27, settings_languages=3 on 2026-10-18. Staging public-content initialization is complete according to that readback.

After its hosted readback, prepare protected runtime credentials and Auth/administrator/email setup. The owner has been asked whether a controllable sender domain exists; no SMTP provider/domain has been selected or assumed while awaiting that information.

## Restricted runtime credentials — next owner step (2026-10-18)

Confirmed host from linked release metadata: aws-0-eu-west-1.pooler.supabase.com, session port 5432. The existing local container has psql 17.6. Its standard system CA bundle does not trust the pooler certificate, which chains to Supabase Root 2021 CA; the launcher now uses the official Supabase CA explicitly. `deployment/supabase/07-runtime-credentials.ps1` prepares a pinned connection via that client; it does not alter the Podman database. The first private prompt requests the hosted postgres database password.

From the project terminal:

```powershell
powershell -NoProfile -File deployment/supabase/07-runtime-credentials.ps1
```

After connection, check the execution role and TLS before changing passwords:

```sql
select current_user, (select ssl from pg_stat_ssl where pid=pg_backend_pid()) as tls;
```

Expect postgres / true. Then, at the psql prompt, run these separately:

```text
SET password_encryption = 'scram-sha-256';
\password app_web
\password app_mailer
\q
```

Use two different new random passwords saved in your password manager under their role names. Do not change postgres, app_reader, app_writer or app_mail_worker. These are application database service passwords, not Citizen/staff passwords. Enter values only in the hidden prompts. The psql password command encrypts passwords client-side to keep cleartext out of SQL history/server logs. Its history is additionally disabled for this session. No password is passed on the process command line or written into repository files.

Optional: generate a random 64-character hex value directly into the Windows clipboard from a separate project terminal. Save it in your password manager before another generation replaces the clipboard; generating it alone does not set any database password.

```powershell
powershell -NoProfile -File deployment/supabase/07-runtime-credentials.ps1 -NewSecret
```

Use distinct generated values for app_web, app_mailer, AUTH_COOKIE_SECRET and COMMAND_FINGERPRINT_SECRET. The last two are application secrets for later Vercel configuration, not database roles; COMMAND_FINGERPRINT_SECRET must remain 64 lowercase hex characters. Keep them stable across redeploys. This helper prints no values and writes no plaintext/encrypted secret file. A password manager/provider secret store holds the actual values; the clipboard is only a temporary transfer channel.

Clear it after transfer:

```powershell
powershell -NoProfile -File deployment/supabase/07-runtime-credentials.ps1 -ClearClipboard
```

The connection requires certificate and hostname verification against the official Supabase root CA, scoped to this psql invocation. The launcher downloads the public CA over verified HTTPS if missing, checks its pinned SHA-256, and copies only that public certificate to the client container; it does not install a global root or change database TLS settings. If TLS/login fails, stop and share only the safe error; do not disable verification or paste the password/connection string. Do not enable terminal transcripts or query logging of private inputs.

Validation completed: PowerShell syntax parse, Windows PowerShell -Check and -Help pass. -Check verifies the pinned linked release target, host/port and ordinary unlinked checkout offline. The client version and CA availability were checked locally. No credential was generated/copied and no role password changed by the assistant. Initial preparation opened no hosted connection. The subsequent certificate fix used public TLS diagnostics and a password-free authentication-stage probe only, with no SQL executed. The owner confirmed both app_web and app_mailer passwords changed successfully on 2026-10-18. Their values were not shared, inspected or saved by the assistant; authenticated runtime connectivity still needs private/deployed verification. No historical tests reran for this launcher.

Sources: [PostgreSQL psql password command](https://www.postgresql.org/docs/17/app-psql.html#APP-PSQL-META-COMMAND-PASSWORD), [TLS verification](https://www.postgresql.org/docs/17/libpq-ssl.html), [Supabase roles](https://supabase.com/docs/guides/database/postgres/roles).

## Credential launcher TLS correction — 2026-10-18

The owner reported `SSL error: certificate verify failed` before the psql connection completed. The first launcher incorrectly pointed libpq at the container's generic system CA bundle. A credential-free inspection confirmed the pooler's certificate is signed by Supabase Intermediate 2021 CA / Supabase Root 2021 CA, which is not trusted by that bundle. The reported attempt did not reach the password-change commands.

The launcher now uses the official public root from the URL configured in Supabase Studio's `ssl:certificate_url`, production environment: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt. Trust is established from that verified HTTPS source, not by trusting a certificate merely presented by the database server. The root is a CA, self-signature and validity checked locally (expires 2031-04-26). DER SHA-256: 807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa. Downloaded file SHA-256 pinned in the launcher: 700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7. These are public certificate identifiers, not credentials.

The CA file lives in ignored `.local/hosted-staging-vdpflzhsohhvvwdrjzhd/certs/supabase-root.crt`; the public copy in the existing client container is `/tmp/abaynou-staging-vdpflzhsohhvvwdrjzhd-root.crt`. The launcher checks its file checksum before any connection. It retains PGSSLMODE=verify-full, hostname checking, the pinned target and session port, hidden password prompts and disabled psql history. Certificate mismatch or legitimate future CA rotation fails closed for review. No trust-store installation, verification bypass, password generation, global CA change, migration, RLS/Auth change or database password update was performed.

Targeted verification: PowerShell syntax and Windows PowerShell offline -Check PASS; a verified TLS handshake to the pinned pooler PASS (TLS 1.3, chain and hostname verification OK); the actual container's psql with the explicit CA and no password reached the expected `no password supplied` authentication stage, proving its TLS check passed without executing SQL. The owner can rerun the unchanged launcher command and proceed with the private role-password prompts. No historical regression suite was rerun for this isolated tooling correction.

Deployment follow-up: the hosted web application, email worker and monitor must also trust this official CA in their own runtime before first connection. Fixing psql does not configure Node/Vercel trust. Current shared DB options retain verification; review the exact Node CA packaging/configuration during Vercel runtime preparation instead of disabling it.

Sources: [Supabase psql guide](https://supabase.com/docs/guides/database/psql), [official Studio download URL configuration](https://github.com/supabase/supabase/blob/7425d4930528931400fb3e656e860b1094cb224e/apps/studio/hooks/custom-content/custom-content.json).

## Prepared Vercel application configuration — 2026-10-18

`vercel.json` now selects Next.js, pnpm build/frozen-lock installation and Dublin dub1. package.json pins Node 22.x. No cron, worker, deployment hook or hosted automation is configured. The owner authorized committing/pushing the prepared changes on 2026-10-18, including the earlier approved local quality commit, so Git import can use the current configuration. Git history and remote-tracking state record the publication outcome.

The source-controlled `deployment/vercel/environment.example` contains names and public defaults only. Enter actual values directly into Vercel's protected environment settings for this dedicated staging app. Keep branch/untrusted preview scope restricted and do not copy the Podman .env.local. Required configuration:

| Name | Value / private transfer |
| --- | --- |
| ENABLE_EXPERIMENTAL_COREPACK | 1, to honor the existing pnpm 12.4.2 pin. |
| APP_ENV | staging. |
| APP_ORIGIN | The actual confirmed stable HTTPS Vercel project domain, without locale path. Do not treat the proposed project name as an already reserved URL. Confirm origin before Auth callbacks or user tests. |
| SUPABASE_URL | https://vdpflzhsohhvvwdrjzhd.supabase.co |
| SUPABASE_PUBLISHABLE_KEY | Copy the hosted project's public client key from Supabase settings directly into Vercel. |
| SUPABASE_SERVICE_ROLE_KEY | Hosted server-side Auth administration credential for staff provisioning; never expose to browsers or chat. |
| DATABASE_URL | Restricted app_web session-pooler connection, prepared with the private helper below. |
| DATABASE_CA_CERT | Full official root PEM, copied by the helper below. This is a public CA, not a private key. |
| AUTH_COOKIE_SECRET | A fresh distinct generated secret saved in the owner's password manager. |
| COMMAND_FINGERPRINT_SECRET | A different fresh 64-character lowercase hex value; preserve across redeploys. |

Private transfer commands (each deliberately replaces the Windows clipboard; paste/save before the next command):

```powershell
powershell -NoProfile -File deployment/supabase/07-runtime-credentials.ps1 -CopyConnection app_web
powershell -NoProfile -File deployment/supabase/07-runtime-credentials.ps1 -CopyCa
powershell -NoProfile -File deployment/supabase/07-runtime-credentials.ps1 -NewSecret
```

-CopyConnection prompts for the already-set database role password privately, URL-encodes it and copies DATABASE_URL without printing/saving it or making a connection. -CopyCa validates the official public CA and copies its PEM for DATABASE_CA_CERT. Run -NewSecret once per independent application secret, saving each name/value privately before generating the next. Neither operation modifies database passwords. -CopyConnection app_mailer prepares a worker-only URL when that host is selected; do not put it on the web app unnecessarily. Clear the clipboard after all transfers. No secret value has been generated or inspected by the assistant.

The new shared DB CA option accepts a single CA PEM (real or escaped newlines), rejects malformed/non-CA input with a safe fixed error, and passes rejectUnauthorized=true to the existing Postgres.js TLS connection; the driver retains its normal hostname/SNI handling. The test fixture `tests/fixtures/supabase-root-ca.crt` is the official **public** provider CA, not a credential/private key. Do not use sslmode=require, rejectUnauthorized=false or NODE_TLS_REJECT_UNAUTHORIZED=0 to work around trust errors.

Verification so far: 18 affected connection/health-probe tests PASS. Credential-free live Node checks PASS for the correct chain/hostname and for rejection of an incorrect hostname; no DB authentication or SQL was sent. PowerShell helper parsing, offline -Check and -Help PASS. Typecheck PASS; lint PASS; production build PASS on 2026-10-18 after the owner freed disk space (4.67 GiB available before retry). The retry completed compilation, TypeScript, page-data collection, static generation and final optimization successfully with exit code 0. The preceding attempt failed with ENOSPC on a full C: drive; only its generated Turbopack cache was cleared by the assistant, then the owner provided additional space. No historical tests were repeated for the disk-only retry. Final secret scan and frozen-source comparison are recorded below. The owner authorized Git publication after these checks on 2026-10-18; Vercel import/deployment and authenticated runtime QA remain pending provider setup. No full historical E2E rerun is needed for this hosted-only trust option with unchanged local/E2E semantics; deployed QA remains pending.

Final source safety review on 2026-10-18: 27 changed/untracked source files scanned; no secret findings, hardcoded credential candidates or forbidden artifact paths. git diff --check PASS. Frozen migrations, planning/acceptance records and design/reference sources have no tracked changes. At that prepublication review no files had been staged or committed, and main was one existing quality commit ahead of the locally recorded origin/main. The owner subsequently authorized committing/pushing this packet and the existing quality commit.

External SMTP, hosted Auth settings/callbacks, the initial administrator and independently executed outbox/health scheduling are still needed. A successful web build/import alone does not claim those services work or approve the official production release. Git publication is owner-authorized as recorded above; no Vercel deployment has been performed by this preparation.

## Execution order

1. Target identifiers and repository-import status are owner-confirmed. Verify hosted schema/roles using the prepared read-only preflight. Check the intended staging use against Hobby eligibility; official Commune production remains a separate release decision.
2. Prepare a reviewable migration/role/content/Auth setup for that hosted project after inspecting its current state. Select the SMTP provider and independent worker/monitor execution service; retain the $0 budget constraint.
3. Make only the specific deployment/runtime adaptations needed, then run checks appropriate to those changes. Do not repeat historical local QA solely for this checklist.
4. Perform the authorized Git/deployment steps only after the exact configuration and target are ready for owner review. No push or deployment was performed during this inspection.
5. Repeat QA on the deployed staging build, including Auth emails, application outbox delivery, hosted authorization, callbacks, locale/direction and responsive behavior. Isolate destructive database checks; comply with host restrictions on load/security testing.
6. Verify hosted failure/recovery alerts and durable independent state, then enable the approved schedule before inviting testers.

Sources checked 2026-10-16: [Vercel regions](https://vercel.com/docs/regions), [Vercel build settings](https://vercel.com/docs/builds/configure-a-build), [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [package managers](https://vercel.com/docs/package-managers), [Hobby cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres). Repository findings come from next.config.ts, package.json, src/shared/db/options.ts, src/server/auth/provider.ts, src/server/email/{outbox,smtp}.ts and scripts/process-email-outbox.ts.
