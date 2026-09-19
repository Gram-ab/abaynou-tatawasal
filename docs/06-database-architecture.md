# Abaynou Tatawasal — Database Technology & Operational Architecture

## Document control

| Field | Value |
| --- | --- |
| Project | Abaynou Tatawasal — أباينو تتواصل |
| Organization | Commune of Abaynou, Morocco |
| Phase | Step 6A — Database Technology & Operational Architecture |
| Status | **APPROVED / FROZEN** |
| Selected platform | Supabase Free managed PostgreSQL and Supabase Auth — APPROVED / FROZEN |
| Evidence review | 2026-09-15; official documentation linked below |
| Data model | Step 6B — not started |
| Implementation | Not started; no provider project created or configured |

## 1. Authority and scope

Governing frozen documents: [MVP Scope](01-mvp-scope.md), [Functional Specification](02-functional-specification.md), [Complaint Lifecycle](03-complaint-lifecycle.md), [Roles / Permissions / Security](04-roles-permissions-security.md), and [Technical Architecture](05-technical-architecture.md).

**Approval note:** Step 6A — Database Technology & Operational Architecture is now the authoritative database-platform and operational baseline for the Abaynou Tatawasal MVP. Future changes require explicit project-owner approval and must remain consistent with the five governing documents above, subject to the explicit DA-03 exception recorded in section 7.3. Production-readiness tasks do not leave Step 6A open.

This document defines technology, access boundaries, capacity, authentication, sessions, email, region, operations, recovery requirements, and portability. It does not define entities, tables, columns, relationships, indexes, triggers, schema names, SQL, migrations, RLS policies, or an ORM/query library. Persistence requirements below are inputs to Step 6B, not a data model.

The existing documents contain historical references to earlier steps still being pending, and Step 3 retains assignment examples superseded by the explicit Step-4 collaborative-work amendments. Step 5 section 25 also retains a draft-review sentence despite its frozen document-control status and approval boundary. These editorial inconsistencies do not reopen approved decisions. This analysis follows explicit approvals and amendments; the source files remain unchanged.

Binding requirements include private Citizen complaints; all authorized Agents sharing the Commune workload; per-action accountability; no assignment requirement; atomic lifecycle changes and history; preserved response versions; no reopening or hard deletion of submitted complaints; ar/fr/en and RTL/LTR; and the three approved complaint-email categories. Attachments, durable drafts, statistics, internal notes, two-way messaging, SMS, and realtime infrastructure remain excluded.

## 2. Approved platform and freeze boundary

**Supabase Free is selected and frozen** for managed PostgreSQL, Supabase Auth, API/data-access and RLS capabilities in development, testing, staging/pilot where appropriate, and initial low-volume production. Its integrated capabilities, managed operations and PostgreSQL portability fit the expected small text-based workload.

No current capacity or egress concern blocks the selected platform. Production does not automatically require a paid plan. Upgrade only for a concrete technical, operational, contractual, legal, security, capacity or reliability need.

DA-01 through DA-04 are approved/frozen. Server-enforced sessions and complementary RLS are approved; the native paid leaked-password feature is an accepted Free-tier limitation under DA-03. This freeze records architecture decisions, not an implemented or tested deployment.

Independent backups, production SMTP, CNDP formalities, ownership, hosting compatibility and security verification remain production-readiness gates. Their implementation does not block Step 6A freeze. Initial pausing/manual restoration and the current managed-backup limitation are consciously accepted risks, with independent recovery required before formal production delivery.

Classification vocabulary:

- **ACCEPTABLE:** fits the requirements without a material extra condition.
- **ACCEPTABLE WITH MITIGATION:** practical with the stated controls and accepted residual risk.
- **ACCEPTED FREE-TIER LIMITATION:** explicitly accepted by the owner for MVP; may justify a future security or operational upgrade.
- **MUST RESOLVE BEFORE PRODUCTION:** can remain open during analysis/model work, but must pass the production gate.
- **BLOCKER:** a confirmed incompatibility without an approved solution. None currently established.

## 3. Free-tier capacity and economics

All provider figures in this document carry this warning: **VERIFY AGAINST OFFICIAL SUPABASE DOCUMENTATION BEFORE FINAL FREEZE / PRODUCTION**. Reviewed on 2026-09-15; limits are not permanent commitments.

| Capability | Published Free allowance or limitation | Consequence for Abaynou |
| --- | --- | --- |
| Auth | 50,000 monthly active users | Citizen and staff identities are well within a plausible small-service envelope; this is not a forecast of actual users. |
| Database | 500 MB per project | Includes more than complaint text; allow for Auth, history, versions, notifications, and database overhead. |
| Egress | 5 GB uncached; separately 5 GB cached | Private database responses must be budgeted against uncached transfer, not treated as a combined 10 GB private-data allowance. |
| API requests | Advertised as unlimited | Does not mean unlimited throughput, compute, connections, Auth request rate, or egress. |
| Compute | Shared CPU and 500 MB RAM | Efficient bounded queries and modest concurrency are required. |
| Projects | Two active Free projects | Verify account/organization eligibility; plan isolated staging and production plus local development, not an additional hosted project per preview. |
| Recovery/support | No automatic backups/PITR included; community support | Independent recovery and named operational responsibility are necessary. |

Sources: [Supabase pricing](https://supabase.com/pricing) and [billing scope](https://supabase.com/docs/guides/platform/billing-on-supabase).

There is no approved numerical forecast of registered Citizens, daily concurrent users, complaints per month, or retention duration. The selected initial plan relies on the owner's low-usage assumption. Before launch, obtain a simple estimate and measure representative synthetic usage. Do not fabricate population or complaint projections.

### 3.1 Storage planning

Text-only complaints are favorable, but a 500 MB database is finite cumulative storage, not a monthly reset. Arabic and other Unicode text consume variable bytes. Histories, response corrections, notification fan-out to staff, Auth activity, and future session bookkeeping can exceed the size of the original complaint text. Record growth must be measured with the eventual model.

Illustration only: at an assumed total incremental footprint of 25–50 KB per completed complaint including related history, 2,000 complaints represent roughly 50–100 MB before shared account/configuration overhead. This is sensitivity arithmetic, not an asserted storage estimate or promised capacity. Step 6B and later synthetic testing must replace the assumption.

Supabase documents read-only behavior beyond the Free database-size allowance. This can stop submissions and lifecycle actions, so intervene before exhaustion. Do not delete complaint history to remain free; approved retention and preservation rules govern. [Database size and restrictions](https://supabase.com/docs/guides/platform/database-size).

### 3.2 Egress planning

Supabase-to-Next.js traffic still counts as outgoing Supabase data. Moving queries to the server improves control but does not remove this cost. Auth, database and other used services contribute to transfer; inspect the actual organization/project accounting rather than assuming every environment gets an independent allowance. Backup downloads must also be included in the eventual transfer budget. [Egress accounting](https://supabase.com/docs/guides/platform/manage-your-usage/egress).

No paid service is selected. Target approximately €0/$0 recurring platform cost where feasible. Domain registration, an SMTP mailbox/service, and independent recovery may have separate costs; neither owning a domain nor choosing Supabase makes these free. Resolve any unavoidable paid requirement explicitly rather than silently weakening security or claiming an all-inclusive zero-cost launch.

## 4. Database-access efficiency

**APPROVED / FROZEN principle: REDUCE REDUNDANT WORK — DO NOT REDUCE CORRECTNESS.** Optimize structurally without arbitrary Citizen restrictions or quota checks embedded in ordinary workflows.

The default is to read when server data is needed and write when an approved persistent change is confirmed. Security checks are necessary reads, not wasteful UI traffic.

| Interaction | Required access behavior |
| --- | --- |
| Open/close modal, dropdown, accordion; switch already-loaded tab | Local UI state only; fetch only if the newly requested view needs unavailable/stale server data. |
| Complaint wizard next/back, typing, language switch | Keep unsaved values in active browser memory. No durable draft, autosave, per-keystroke write, or remote wizard-step persistence. |
| Enter a private screen | Authorize and load a bounded projection required for that screen. |
| Revisit/focus a screen | Apply approved refresh behavior; coalesce simultaneous triggers and reuse current authorized results within their safe scope. Never reuse data after account change or expired authorization. |
| Submit/edit/withdraw, lifecycle/response/correction | Validate and authorize; commit the meaningful action with required history and notification/email intent. |
| Profile/configuration/language save | Persist confirmed changes only; revalidate current authority. |
| Notification read/mark-all | Persist idempotently; avoid rewriting already-read items and avoid one request per item. |
| Search and filters | Submit-based or debounced search; cancel superseded requests, filter on server, bound input and results. |
| Lists/history/notifications | Paginate or incrementally load bounded pages. Never download all records for browser filtering. |
| Dashboard workflow counters | Obtain authorized server/database aggregates; never download complaints to count them. |
| Categories, locations, published public configuration | Cache/reuse approved non-sensitive projections and invalidate after confirmed edits. Revalidate active selections on submission. |

One coordinated screen query should serve components needing the same data. Deduplicate mount/focus/poll requests; use confirmed mutation results to update affected local state and refresh only what is stale. Avoid one extra request per complaint to build a list. Fetch required attributes only, not every available value or repeated full history.

Private caches must be restricted to the correct authenticated actor/session and cleared on logout, disabling, expiry, or identity switch. No public CDN/shared cache may contain Citizen or Commune private content. An HTTP not-modified response still needs valid authorization and may still require a small database check.

Optimistic UI is limited to safely reversible presentation with rollback. Lifecycle, submission, response, withdrawal, and other security-sensitive operations are not permanently successful until the server confirms them. No quota API calls on each operation, artificial Citizen limits without evidence, microservices, or complex cache infrastructure are proposed.

## 5. Notification polling and health-check cost

Preserve TA-07: refresh after relevant actions and on navigation/focus; approximately two-minute Commune polling and five-minute Citizen polling. Pause/back off while hidden, offline, or failing, consistent with Step 5. Coalesce overlapping refreshes and avoid multiple polling loops on one screen. Optional coordination across open tabs can be added only if measurements justify its complexity.

Poll minimal authorized notification freshness/count information, not complaint bodies, lists, or complete histories. Fetch an affected list page only when needed. An unchanged unread count alone is not a reliable change detector: new/read events can offset each other. Step 6B must support a reliable small change indication without prescribing its representation here.

Illustrative 30-day calculation, not predicted traffic:

| Scenario | Poll requests/month | At assumed 1 KB total Supabase response data per poll |
| --- | --- | --- |
| 5 staff screens, 8 hours/day, every 2 minutes | 36,000 | About 36 MB |
| 100 Citizen visits/day, 15 minutes each, every 5 minutes | 9,000 | About 9 MB |
| Combined | 45,000 | About 45 MB; at 5 KB, about 225 MB |

Formula: active minutes divided by interval, multiplied by active screens/visits and days. Initial loads, focus/navigation, authentication, authorization/session reads, retries, normal work, protocol overhead and backups are additional. A browser request can require several bounded backend operations; measure their combined transfer and latency. At these assumptions polling is reasonable within the published uncached allowance, with no need for WebSockets.

Two to three health checks/day produce 60–90 checks/month. At an illustrative total 1 KB response each, that is 60–90 KB/month plus overhead. This is negligible compared with ordinary use. It must not become a high-frequency keep-alive loop.

## 6. Approved access and security boundary

### 6.1 Frozen high-level direction

Browser → Next.js trusted application use case → authorized persistence adapter → Supabase PostgreSQL. Next.js also communicates with Supabase Auth and the selected SMTP service through their adapters.

The browser manages UI state and sends intended actions. Next.js validates identity, the application session, active-account status, role, resource scope, lifecycle and expected revision. Supabase Auth proves identity; it does not decide Abaynou business permissions. Database controls provide a second enforcement boundary.

| Operation | Approved primary route |
| --- | --- |
| Published public information | Next.js public rendering/cache; direct public database reads are unnecessary. |
| Private complaints, profiles, responses, notifications, counters, history | Primarily through Next.js authorized queries; a later simple direct access path must satisfy every condition below. |
| All business writes | Through trusted use cases, with atomic state/history/notification/email intent and stale-update protection. |
| Authentication and recovery | Provider-managed identity flows coordinated by the server; preserve secure HttpOnly application sessions and safe callback handling. |
| Staff provisioning/disable | Administrator-authorized server action; any privileged Auth operation stays within a restricted adapter. |
| Health/maintenance | Separate narrowly scoped operational route; no private response data or business privileges. |

Direct authenticated client access may be used later only for a simple operation with meaningful architectural benefit, complete RLS protection and no bypass of business/security invariants, including application-session expiry and revocation. Ownership-only RLS plus a valid Supabase JWT is insufficient. Step 6B determines exact access paths per data area; the primary private/security-sensitive route remains the trusted server.

For private persistence, prefer a restricted server database connection with RLS enforced and authenticated actor context established only by the trusted server. Disable unused Data API exposure and deny any access path that bypasses required authorization. If a later HTTPS/RPC adapter is necessary for hosting, it must preserve the same non-bypassable gate; a publicly callable operation accepting only an ordinary provider token must not circumvent it. Exact transport, database privileges and policy implementation belong to Step 6B. [Data API controls](https://supabase.com/docs/guides/api/securing-your-api).

### 6.2 RLS requirements

RLS restricts which records a database operation may access. Database grants and RLS must be reviewed together; service-role/privileged access can bypass RLS. Thus routing everything through a service-role credential and claiming that RLS protects it would be incorrect. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

Step 6B must ensure:

- Citizen A cannot read, infer, change, count, search or receive notifications about Citizen B's resources.
- Active Agents have the frozen shared complaint access; Administrator operations remain restricted.
- Application-session expiry and account revocation cannot be bypassed through alternate data endpoints.
- Normal runtime credentials cannot bypass RLS, change security rules, erase history, or act as a database owner.
- Trusted actor context is isolated per transaction/request and cannot leak between pooled connections.
- The lifecycle state/revision and authorization decision remain valid at commit; concurrent edits cannot silently overwrite each other.
- Sensitive business mutations commit state, history and required notification/email intent atomically. Multiple independent REST writes are not an atomic transaction.

The database defends resource boundaries and integrity; application code owns the central domain rules and safe user-facing orchestration. Neither layer substitutes for testing the other. No RLS policy is defined here.

### 6.3 Credentials

Never expose Supabase service-role/secret keys, database passwords, SMTP credentials, management access tokens, signing secrets, or backup credentials to browser code, URLs, logs, screenshots or source control. Publishable/legacy anonymous keys are not authorization secrets and cannot protect private data by being hidden.

Privileged/service-role access is permitted only for narrowly defined trusted server operations where required; it must not routinely bypass RLS. Service-role credentials must never appear in public environment variables or frontend bundles.

Use environment-specific credentials, encrypted transport, narrow runtime privileges, rotation and restricted operator access. Commune business Administrator status does not grant Supabase dashboard access. Public registration cannot create staff authority. Do not send production complaint data into provider AI assistants or support channels without the approved exceptional-access process.

## 7. Integrated Auth and application sessions

### 7.1 Auth suitability

Supabase Auth Free is approved/frozen for email/password signup, verification, login/logout, password recovery/reset, verified login-email change, secure sessions, Agent/Admin authentication, account disable/revocation and a future MFA path. MFA remains outside the mandatory MVP policy. Account roles, disabling and resource permissions remain application-controlled; user-editable metadata cannot grant authority.

Verification/recovery callbacks must validate provider proof and allowed destinations, establish only the authorized flow, and resist replay and account confusion. Login-email change takes effect only after verification. Supabase defaults and sample implementations must be checked against the frozen behavior rather than copied as policy.

### 7.2 Session fit and consequences

Supabase documents paid native time-box/inactivity controls, refresh-token sessions and signed access tokens. Existing access tokens may outlive a logout until their expiry; token validation alone cannot prove current application authorization. [Supabase sessions](https://supabase.com/docs/guides/auth/sessions).

**APPROVED / FROZEN: Supabase identity plus trusted application-session enforcement, with the access boundary in section 6.** It entails durable session security state and testing, not frontend timers. This capability has not been implemented or verified in this task.

| Actor | Frozen inactivity target | Frozen absolute duration |
| --- | --- | --- |
| Citizen | Approximately 7 days | Approximately 30 days |
| Commune Agent / Administrator | Approximately 1 hour | Approximately 8 hours |

Persistence/security requirements for Step 6B:

1. A protected operation must identify a server-established application session linked to a validated provider identity/session. A missing, expired or revoked application session denies access even if the provider token is valid.
2. Server time controls inception, inactivity and absolute expiry. Refreshing a provider token cannot restart the absolute application duration or recreate an expired application session. Require fresh authentication after expiry.
3. Keep browser credentials in Secure, HttpOnly, appropriately SameSite cookies under the frozen architecture. Use a server-managed flow; do not copy an SDK pattern that requires reusable tokens in JavaScript/local storage. Supabase's [Next.js SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs) is integration context, not an override of this policy.
4. Only meaningful authenticated user activity may extend inactivity: user-initiated navigation, opening a workflow requiring server access, form submission, complaint/profile/lifecycle actions or another meaningful authenticated interaction. Two-minute Commune polling, five-minute Citizen polling, background refresh, token refresh, health/keep-alive checks and automated server jobs never extend user inactivity. Client timers, timestamps, React state or browser storage are not authoritative.
5. Account disabling and role revocation stop authorization promptly across devices; password reset revokes all application sessions, password change revokes others, and logout revokes the current session. Provider revocation is complementary, not the sole immediate control.
6. Concurrent sessions have independent expiry; no single-session-only feature is introduced. Concurrent refresh/activity updates must not resurrect revoked sessions or lose revocation. Recent reauthentication is distinct from mere token refresh.
7. Every server action, route, private render, notification query and alternative database path must obey the same gate. Current account/session checks cannot be replaced by long-lived cached role claims.
8. Session bookkeeping should be small and updates coalesced without allowing expired access. A session lookup is legitimate security work. Do not add writes for unrelated local UI changes.

### 7.3 Approved password policy and accepted Free-tier limitation

**DA-03 — APPROVED / FROZEN WITH ACCEPTED FREE-TIER LIMITATION.** Use Supabase Auth Free with a strong configurable password policy, secure recovery, rate limiting/abuse controls and safe authentication errors. Preserve Step 5's minimum 15 Unicode characters, acceptance of at least 64, passphrase/password-manager support and absence of composition rules; verify provider length/Unicode behavior during implementation and production security review.

Supabase's native leaked/compromised-password detection is not required for MVP because the built-in feature requires a paid plan. Do not add another SaaS solely for this detection. This is an **ACCEPTED FREE-TIER LIMITATION** and a **POSSIBLE FUTURE SECURITY UPGRADE TRIGGER**, not a blocker to Supabase selection. [Password security](https://supabase.com/docs/guides/auth/password-security).

**Explicit owner-approved policy exception:** Step 5 section 7.4 says to block commonly compromised values. The current DA-03 approval accepts the absence of the paid detection feature and does not require a replacement detection service as a condition of MVP selection. This is a traceable exception to that earlier requirement, recorded here under the owner's explicit authority; Step 5 itself has not been edited. No other password/session requirement is weakened. Any separate provider incompatibility discovered during implementation must be reported rather than silently changing the policy.

## 8. Email / SMTP

Supabase's default Auth mail is for limited testing: current docs restrict recipients to project team addresses and state two messages/hour with no delivery SLA. It is not a Citizen production sender. Do not grant ordinary testers project/dashboard membership just to receive test mail. Use existing authorized test addresses, later local mail capture, or suitable testing SMTP. [Custom SMTP and default limits](https://supabase.com/docs/guides/auth/auth-smtp).

The approved production direction is a Commune-owned domain plus an actual SMTP-capable provider/mail service, configured with authenticated sending and appropriate SPF, DKIM and DMARC. Domain/DNS ownership alone provides neither a mailbox nor SMTP. Check automated transactional-use terms, permitted sender, daily/burst limits, credentials/TLS, quotas, bounce handling, diagnostics, outages, and recipient-domain deliverability.

Evaluate one suitable SMTP service for both Supabase Auth emails and the three application-email categories. Configuring SMTP in Supabase Auth does not turn Auth into a general complaint-email API; the Next.js email adapter must separately deliver application messages through that service. Hosting must support the selected SMTP protocol/ports and background retry execution. A mailbox requiring interactive OAuth-only access may not fit Supabase's SMTP credential configuration; verify compatibility.

Preserve signup verification, recovery and login-email verification. Complaint email stays limited to receipt, response (including correction/non-acceptance under Step 3) and closure; no withdrawal email or second closure email for `NOT_ACCEPTED`. Follow Step 5's minimal reference/authenticated-link content, without full complaint bodies or responses in email.

The provider choice and actual credentials are **MUST RESOLVE BEFORE PRODUCTION** and before external-user email testing. Supabase Auth rate limits remain relevant even with custom SMTP. Test ar/fr/en templates, confirmation links, scanner/prefetch behavior, expiry, duplicates and retries. Email failure must not roll back confirmed complaint state; a durable delivery intent and monitored retry execution are required. Resend remains an optional fallback only if the Commune's SMTP is unsuitable.

## 9. Pausing and operational monitoring

The owner has accepted Free-plan pausing and manual restoration for initial low-volume production. Current [pausing documentation](https://supabase.com/docs/guides/platform/free-project-pausing) describes low activity over seven days and says a few daily database requests are typically sufficient. This is not a guarantee that two or three health checks will prevent pausing.

Use two to three legitimate external readiness checks daily, performing one small database operation without private data, writes, full scans, or expensive aggregates. A cached/static health page alone does not establish database readiness. Protect the endpoint against abuse, bound its execution, return minimal availability information, and keep credentials in the application. The external monitor receives no Supabase secret or private content. Reuse the eventual uptime capability; no scheduler/service is selected now.

If pausing occurs, show safe temporary-unavailability states, preserve safe unsaved inputs, and alert the named operator. Resume manually through Commune-owned Supabase administration and verify database, Auth and pending email processing. Do not mark failed submissions successful or create duplicates during retry.

Current documentation describes a one-year dashboard restoration window, while older official material described 90 days. Treat the current published window as changeable and verify it again; never rely on an indefinite restoration promise. [Current restoration guidance](https://supabase.com/docs/guides/troubleshooting/restore-project-after-90-days-pause).

Two or three checks/day may leave hours before detecting an outage. The accepted manual recovery strategy needs a named primary/backup operator, monitored provider warning emails and a tested recovery checklist before launch. Review usage periodically and on provider alerts; do not query quota metrics during every Citizen operation. Initial logs must exclude secrets and unnecessary personal data; business audit remains separate. Sentry is optional.

Supabase-managed Free Auth/log retention is not the authoritative long-term audit system. Abaynou must retain its own durable history for lifecycle transitions, responses/corrections, configuration changes, Citizen disabling, staff/account administration and other frozen security/business-critical actions. Exact structures belong to Step 6B.

## 10. Independent backup and recovery requirement

The lack of included managed Free backups is an **ACCEPTED CURRENT ARCHITECTURE RISK** and **MUST RESOLVE BEFORE FORMAL PRODUCTION DELIVERY** through independent recovery. The requirement is approved; technology remains deferred to final deployment/production hardening. Frozen Step 5 also requires restore testing before production acceptance, so the safe delivery gate is to have the strategy operational before accepting live Citizen complaints for the official service. No backup provider, tool, schedule or implementation is selected here.

Require an independent, automated, encrypted, monitored and tested backup/restore strategy covering application data, required history, Supabase Auth recovery, configuration and secret recovery procedures, off-provider storage, retention, and lawful processing locations. Define acceptable data loss and recovery time during deployment planning. Data export alone does not restore Auth configuration, signing credentials, SMTP configuration, or active sessions; rehearsals must address these separately and safely invalidate sessions as appropriate.

Supabase recommends off-site exports for Free projects. Its managed recovery should not be assumed to cover the independent requirement. [Backup guidance](https://supabase.com/docs/guides/platform/backups).

PostgreSQL export/restore makes independent recovery feasible in principle. Avoid dependencies on provider-only recovery or retaining only provider logs. Do not copy production data into ordinary staging/CI. Backups themselves contain private data and require encryption, access control, deletion/retention handling and CNDP review. No backup destination is approved.

## 11. Region, CNDP and personal data

**DA-04 — APPROVED / FROZEN: APPROVED PREFERRED REGION — Paris/France, SUBJECT TO FINAL PRODUCTION LEGAL/PROCESSOR VALIDATION and technical availability.**

The owner has approved compliance with Moroccan Law 09-08/CNDP requirements. Complete applicable processing and international-transfer formalities before official production when data is hosted abroad. The [CNDP transfer guidance](https://www.cndp.ma/transfert-de-donnees-a-letranger/) states that the underlying processing must have the required approved declaration/authorization; selecting an adequate-protection jurisdiction does not waive formalities.

France appears in [CNDP deliberation 236-2015](https://www.cndp.ma/wp-content/uploads/2023/12/deliberation-n-236-2015-18-12-2015.pdf). Supabase lists Paris (`eu-west-3`) as a specific region. Prefer that specific region if available and legally appropriate; a broad Europe grouping is not a guarantee of France. [Supabase regions](https://supabase.com/docs/guides/platform/regions).

Paris controls the primary-data direction, not the location of every support, logging, email, hosting or backup operation. The Commune's legal/administrative review must examine the current DPA, actual subprocessors and processing purposes, access from other jurisdictions, email service, host, logs and backup destinations. Obtain applicable processor documentation rather than assuming GDPR claims establish Moroccan compliance. [Supabase DPA](https://supabase.com/legal/customer-resources/data-processing-addendum).

Names, emails, optional phones, complaint text, location and account/history data require minimization, lawful retention, rights handling, access control and auditability. Although intended collection is ordinary personal information, free text can contain sensitive content unexpectedly. Future guidance should discourage unnecessary CIN, health, religion, political information and secrets. Passwords belong only in secure authentication flows, never complaint text or logs. No legal UI, extra sensitive-data fields or automatic moderation feature is added.

**MANUAL ACTION REQUIRED — before production:** the Commune/project authority must arrange the relevant CNDP and legal review, complete required filings/approvals, approve processor/region arrangements and public privacy information, and validate retention/rights procedures. No filing or legal sign-off has occurred in this task.

## 12. Hosting, environments and portability

Supabase supplies the selected database/Auth platform, not the full Next.js application host. TA-05 remains conditional. The host must support approved Next.js behavior, secure cookies, protected server use cases, database connectivity, SMTP delivery and reliable retry execution within permitted terms. Do not assume Cloudflare/edge and Node SMTP/database libraries are interchangeable.

For serverless connections, evaluate the shared connection pooler, bounded connection counts, encrypted transport and transaction isolation. Supabase documents IPv4 availability through shared pooling and transaction-pooling limitations including prepared statements and persistent connection state. Avoid accidental paid IPv4 requirements; validate the chosen runtime/driver combination later. Actor authorization context must never survive into another pooled request. [Connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).

Use isolated staging and production with synthetic local/testing data. Free project eligibility and shared quotas need confirmation under the Commune-owned account; do not merge staging with production to save a project slot. No automatic hosted preview database, branching product, Edge Function or realtime service is required by this analysis.

Keep domain rules and UI independent of Supabase SDK payloads. PostgreSQL data is reasonably portable, while Auth identities, session handling, provider helpers, recovery procedures and operational settings require a deliberate migration. Exporting data does not guarantee seamless identity/session migration to a different provider. Maintain practical adapters and a future exit rehearsal, not a generic abstraction framework. Database-level RLS is useful PostgreSQL security; Supabase-specific helper dependence should be isolated. ORM/query selection remains for Step 6B.

The Commune/project owns service accounts, recovery contacts and access governance. Review Free organization permissions and contractual terms before provisioning, with least-privilege operational access. No personal developer account should become the sole recovery route. [Supabase terms](https://supabase.com/terms) and [fair-use limitations](https://supabase.com/docs/guides/platform/billing-faq) require launch-time review; this analysis found no explicit personal-use-only restriction, but does not constitute legal approval of the service contract.

## 13. Accepted limitations and production-readiness assessment

| ID | Concern | Classification | Treatment |
| --- | --- | --- | --- |
| A | Citizen/staff and complaint capacity | ACCEPTABLE WITH MITIGATION | Low usage is plausible; confirm planning envelope and measure synthetic activity later. |
| B | Database storage | ACCEPTABLE WITH MITIGATION | Monitor total growth with headroom; preserve histories rather than delete to fit. |
| C | Egress | ACCEPTABLE WITH MITIGATION | Bounded projections and all-service transfer budget, including backups. |
| D | Integrated Auth | ACCEPTABLE WITH MITIGATION | Selected integrated Auth; DA-02/DA-03 approved; validate flows and account disabling before production. |
| E | Native session limits unavailable on Free | ACCEPTABLE WITH MITIGATION | DA-02 frozen: trusted application sessions plus complementary RLS; persistence in 6B and security tests before production. |
| F | SMTP | MUST RESOLVE BEFORE PRODUCTION | Actual sender/service, authentication/complaint delivery and all three locales tested. |
| G | Inactivity pausing | ACCEPTABLE WITH MITIGATION | Owner accepts risk; modest checks and manual restoration, no availability guarantee. |
| H | Backup limitation | MUST RESOLVE BEFORE PRODUCTION | Accepted during preparation; automated independent restore-tested recovery before production acceptance. |
| I | Residency/CNDP | MUST RESOLVE BEFORE PRODUCTION | Paris preferred; complete filings and processing-chain/legal review. |
| J | RLS/security fit | ACCEPTABLE WITH MITIGATION | Least privilege plus server gate; no normal RLS bypass or exposed private alternate route. |
| K | Next.js integration | ACCEPTABLE WITH MITIGATION | Server-only session integration; host/pooler/SMTP compatibility to verify. |
| L | Request efficiency | ACCEPTABLE | Local UI state, bounded server operations, pagination, deduplication and aggregates. |
| M | Polling | ACCEPTABLE WITH MITIGATION | Frozen intervals reasonable; small change checks and no inactivity renewal. |
| N | Lock-in | ACCEPTABLE WITH MITIGATION | Adapters; identity and operational settings need migration planning. |
| O | Migration feasibility | ACCEPTABLE WITH MITIGATION | PostgreSQL export/restore feasible; prove Auth/configuration recovery later. |
| P | Commune operational burden | ACCEPTABLE WITH MITIGATION | Named operators, monitored warnings, recovery access and runbooks before launch. |
| Q | Free production suitability | ACCEPTABLE WITH MITIGATION | Conditional on production gates and current terms; no automatic upgrade requirement. |
| R1 | Native leaked-password detection | ACCEPTED FREE-TIER LIMITATION | DA-03 frozen: paid detection not required in MVP; possible future security upgrade. Other password/Unicode requirements remain implementation checks. |
| R2 | Two-project quota and isolation | MUST RESOLVE BEFORE PRODUCTION | Confirm eligibility before provisioning; keep local/staging/production isolation. |
| R3 | Background email retry execution and host SMTP support | MUST RESOLVE BEFORE PRODUCTION | Select a supported, reliable execution path; no best-effort work lost when a server request ends. |
| R4 | Limited logs/support, restrictions and terms changes | ACCEPTABLE WITH MITIGATION | Small privacy-safe operational monitoring and concrete upgrade triggers. |

No current blocker or unresolved Step-6A decision remains. A later security, legal or provider incompatibility must be reported; the accepted DA-03 limitation is not a blocker.

## 14. Frozen Step 6A decision matrix

| Area | Current direction | Rationale | Status / unresolved issue |
| --- | --- | --- | --- |
| Database provider | Supabase Free managed PostgreSQL | Low-volume text workload; integrated services | APPROVED / FROZEN; DA-01 |
| Auth | Supabase Auth Free | Avoid redundant identity SaaS | APPROVED / FROZEN; DA-01–DA-03 |
| Session enforcement | Trusted application sessions with frozen durations | Free native controls insufficient | APPROVED / FROZEN; DA-02 |
| Email | Commune SMTP first for Auth and application adapter | Minimum suitable services | Approved direction; sender/provider validation before production |
| Hosting | Compatible free-first Next.js host | Preserve TA-05 and avoid unnecessary costs | Final provider conditional; connectivity/SMTP/retry checks |
| Region | Specific Paris/France if available/appropriate | Owner direction and legal context | APPROVED PREFERRED REGION; DA-04; final production legal/processor validation |
| API/data access | Private access through server use cases | Central expiry, revocation, lifecycle and audit | APPROVED / FROZEN; DA-02; exact access paths in 6B |
| RLS | Database defense complementary to server checks | Citizen isolation and least privilege | Required direction; actual policies in 6B |
| Polling | Two-minute Commune/five-minute Citizen plus approved refresh | Sufficient freshness and limited traffic | Already approved; keep lightweight |
| Inactivity handling | Two to three small health checks/day; manual resume | Owner accepts Free operational risk | Accepted risk; implement/test later |
| Backup | Independent automated encrypted off-provider recovery | Free provider recovery is insufficient alone | Required; provider/tool deferred |
| Monitoring | Minimal logs, warnings, uptime and usage review | Small operational footprint | Required; named operators and tool configuration later |
| Portability | PostgreSQL plus practical provider adapters | Reasonable exit path | Approved principle; migration details later |
| Free-tier suitability | Conditional initial production | Low usage, no paid-by-default assumption | APPROVED / FROZEN for initial low-volume use; production gates retained |

Upgrade only for actual storage/egress/Auth growth, performance/connection pressure, unacceptable pausing, recovery/support needs, security, legal/contractual requirements or another concrete operational need. Review capacity with a safe margin and trend, not only at exhaustion. No arbitrary user restriction, automatic paid upgrade or fixed threshold is approved here.

## 15. Project-owner-approved decisions and production tasks

| ID | Final status | Frozen decision |
| --- | --- | --- |
| DA-01 | **APPROVED / FROZEN** | Supabase Free managed PostgreSQL, Supabase Auth, API/data-access and RLS capabilities for development/test/staging/pilot where appropriate and initial low-volume production. |
| DA-02 | **APPROVED / FROZEN** | Primarily Next.js server-mediated private/security-sensitive access, complementary RLS, trusted application-enforced session durations and user-activity-only inactivity renewal. Conditional simple direct access must preserve every invariant. |
| DA-03 | **APPROVED / FROZEN** | Strong Free-tier password policy; paid native leaked-password detection is an accepted non-blocking limitation and possible future upgrade trigger. Explicit Step-5 exception in section 7.3. |
| DA-04 | **APPROVED / FROZEN** | Paris/France preferred region, subject to availability and final production legal/processor validation. |

No genuine Step-6A project-owner decision remains. The DA-03 discrepancy with Step 5 is expressly recorded as the current owner's policy exception, not silently resolved by editing an earlier document.

Free-first, minimum services, data minimization, structural request efficiency, lightweight polling, accepted pausing/manual restoration, independent recovery and practical portability are approved architecture requirements.

### 15.1 Intentionally deferred production-readiness tasks

Before official production, complete or validate:

- actual SMTP service, sender/domain authentication, sending terms, rates, deliverability and error handling;
- independent automated, encrypted, off-provider, monitored, retention-controlled backup/recovery and restore testing;
- CNDP processing and international-transfer formalities, privacy documentation, and the complete provider/subprocessor processing chain;
- Commune/project service-account, domain/DNS and recovery ownership;
- final hosting compatibility and production-use terms, database connectivity and reliable email retry execution;
- actual quota usage, operational alerts and named recovery operators;
- production security review, including session expiry/revocation, RLS, password behavior and access-path tests.

These are production-readiness tasks and do not block Step 6A freeze. Backup provider/technology, final hosting provider, actual SMTP provider, monitoring configuration and recovery objectives remain intentionally undecided. No data-model or policy implementation is defined.

## 16. Validation and next gate

- Frozen Steps 1–5 are the governing baselines and were not modified.
- Supabase Free and Supabase Auth are selected and APPROVED / FROZEN.
- DA-01–DA-04 are APPROVED / FROZEN; accepted limitations and production-readiness tasks remain explicit.
- Citizen isolation, collaboration, lifecycle rules, history preservation, minimum services and approved languages remain binding.
- Session/polling durations are unchanged; automatic traffic cannot silently defeat inactivity expiry.
- No mandatory Clerk, WorkOS, Resend, paid monitoring or Vercel Pro was introduced.
- No database model, entities, SQL, schema, relationships, indexes, policy definitions, migrations, framework files, dependencies, application code or provider configuration were created.
- No backup provider was selected and no backup, legal filing, delivery test or deployment was claimed complete.

Step 6A is now APPROVED / FROZEN. Future database-technology or operational-architecture changes require explicit project-owner approval and consistency with Steps 1–5, with the specific DA-03 exception above retained. This freeze does not start or authorize implementation of Step 6B; the data model remains a separate next task.
