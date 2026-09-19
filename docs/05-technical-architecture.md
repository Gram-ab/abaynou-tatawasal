# Abaynou Tatawasal — Technical Architecture

## Document control

| Field | Value |
| --- | --- |
| Project | Abaynou Tatawasal — أباينو تتواصل |
| Organization | Commune of Abaynou, Morocco |
| Step | Step 5 — Technical Architecture |
| Status | **APPROVED / FROZEN** |
| Governing scope | [`docs/01-mvp-scope.md`](01-mvp-scope.md), **APPROVED / FROZEN** |
| Governing functional specification | [`docs/02-functional-specification.md`](02-functional-specification.md), **APPROVED / FROZEN** |
| Governing lifecycle | [`docs/03-complaint-lifecycle.md`](03-complaint-lifecycle.md), **APPROVED / FROZEN** |
| Governing roles/security model | [`docs/04-roles-permissions-security.md`](04-roles-permissions-security.md), **APPROVED / FROZEN** |
| Implementation status | Not started |
| Database architecture status | Deferred entirely to Step 6 |

## 1. Purpose, authority, and boundaries

This document proposes the production application architecture for Abaynou Tatawasal. It defines the frontend, server/application boundaries, authentication approach, authorization enforcement, domain logic, concurrency, audit generation, notifications, email, localization, accessibility, security, testing, environments, deployment, CI/CD, monitoring, source organization, dependency strategy, and application-side operating model.

The frozen documents define product scope, behavior, lifecycle, roles, privacy, and security policy. This architecture must implement those decisions without changing them.

This document deliberately does **not**:

- select a database technology or provider, including Supabase, Neon, or any alternative;
- choose ORM versus SQL-first development;
- define entities, tables, columns, relationships, indexes, database constraints, row-level policies, retention structures, backup implementation, or migrations;
- create application code, framework files, folders, configuration, environments, or service accounts;
- add attachments, internal notes, statistics, two-way messaging, assignment, or any other deferred feature;
- authorize implementation or Step 6.

Database-related statements in this document are requirements that Step 6 must satisfy, not database decisions.

**Approval note:** This document is now the authoritative application-architecture baseline for the Abaynou Tatawasal MVP. Future changes to this frozen architecture require explicit project-owner approval and must remain consistent with [`docs/01-mvp-scope.md`](01-mvp-scope.md), [`docs/02-functional-specification.md`](02-functional-specification.md), [`docs/03-complaint-lifecycle.md`](03-complaint-lifecycle.md), and [`docs/04-roles-permissions-security.md`](04-roles-permissions-security.md). Final authentication, email, and hosting provider selections remain intentionally conditional on Step 6 as recorded in section 25.1; these deferrals do not leave Step 5 open.

### 1.1 Sources reviewed

The four governing documents were read completely. All 24 supplied design screenshots were inventoried; the representative public, Citizen, and Commune dashboard designs were visually inspected for route, layout, component, density, and RTL context. Designs remain supporting visual context and were not modified.

Current official technical references used for this draft include:

- [Next.js App Router](https://nextjs.org/docs/app), [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), and [deployment options](https://nextjs.org/docs/app/getting-started/deploying);
- [Clerk authentication strategy configuration](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options) and [custom MFA-capable flows](https://clerk.com/docs/guides/development/custom-flows/authentication/multi-factor-authentication);
- [next-intl](https://next-intl.dev/) and [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs);
- [Vercel environments](https://vercel.com/docs/deployments/environments), [Vercel plans](https://vercel.com/docs/plans), and [Vercel terms](https://vercel.com/legal/terms);
- [Netlify pricing](https://www.netlify.com/pricing/) and [Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/);
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [Next.js deployment guidance](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/);
- [Resend domain authentication](https://resend.com/docs/dashboard/domains/introduction);
- [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html) and the OWASP references already identified in the frozen security model;
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing), [Vitest](https://vitest.dev/), and [GitHub dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review).

These references guide implementation quality. Exact package versions must be selected and compatibility-checked when implementation is authorized.

## 2. Recommended architecture at a glance

Use one full-stack **modular monolith** built with the current supported Next.js App Router, React, and strict TypeScript. Keep it deployable on a standard compatible managed Node.js runtime and select the exact host only after free-tier terms, security, Next.js compatibility, and Step 6 connectivity are verified. Use Server Components by default, narrowly scoped Client Components for interaction, Server Actions for same-application mutations, and Route Handlers only for explicit HTTP boundaries such as signed webhooks, health checks, and future approved integrations.

Use:

- Tailwind CSS plus CSS custom properties as design tokens, with small scoped CSS where utilities are not the clearest expression;
- internal reusable components and selective accessible headless primitives, not a large opinionated visual UI framework;
- `next-intl` for Arabic, French, and English routing/messages;
- React Hook Form for interactive form state and Zod for reusable input-shape validation;
- managed authentication, preferring a secure integrated capability of the Step 6 platform when it satisfies every frozen requirement, otherwise a separate managed provider with a usable free tier;
- built-in secure authentication email flows and the fewest possible email services, adding a provider such as Resend only if integrated delivery is insufficient;
- ordinary request/refresh plus lightweight polling for notifications, not WebSockets;
- Vitest, React Testing Library, Playwright, and axe-based automated accessibility checks;
- GitHub Actions within usable free limits, provider/application logs, and basic uptime monitoring; optional Sentry free-tier integration only if it adds useful value.

The modular monolith must maintain clear internal boundaries so domain policy is independent of Next.js routes, authentication, email, monitoring, hosting, and the later persistence choice.

## 3. Architectural principles

1. **Server-authoritative:** clients request actions; trusted server use cases authorize, validate, and decide outcomes.
2. **Deny by default:** no protected read or mutation succeeds without explicit policy approval.
3. **One deployable application:** public, Citizen, and Commune areas share one codebase and deployment while remaining separate route and authorization areas.
4. **Modular domain core:** complaint rules, lifecycle, account policy, notifications, and audit obligations live in feature/application modules rather than page components.
5. **Database-neutral application boundary:** persistence is accessed through narrow repository/unit-of-work ports defined by application needs; Step 6 chooses their implementation.
6. **Transactional intent:** state change, audit event, notification creation, and required email intent must commit consistently or fail safely.
7. **Privacy by construction:** private pages are dynamically authorized, not publicly cached or indexed, and logs avoid complaint content and personal data.
8. **Accessible and multilingual by default:** locale, direction, semantics, keyboard behavior, and responsive behavior are architectural concerns, not later patches.
9. **Free-first, not quality-last:** all services needed to develop, test, demonstrate, stage, and initially launch should be open source, free, or offer a genuinely usable free tier. A paid-only service must not be an initial requirement.
10. **Professional does not mean paid by default:** professional production quality comes from sound architecture, security, authorization, validation, testing, auditability, recovery, maintainability, monitoring, and disciplined delivery. A free tier is acceptable when its terms, security, quotas, reliability, recovery posture, and operational dependency are acceptable.
11. **Minimum external services:** use the fewest managed providers reasonably possible and prefer one approved platform capability that safely covers multiple needs. Do not trade away security, privacy, reliability, maintainability, or deliverability merely to reduce provider count.
12. **Operational simplicity:** managed services and a modular monolith are preferred over custom identity, microservices, queues, or real-time infrastructure without an MVP need.
13. **Provider portability:** keep proportionate adapters around authentication, email, monitoring, persistence, and hosting-specific integrations so a provider can be replaced without rewriting lifecycle, permissions, domain logic, or the Citizen/Commune UI. Do not create speculative abstraction layers.

Project-owner approval is recorded for the free-first principles in items 9–10, the minimum-external-services principle in item 11, and the portability principle in item 13.

## 4. Frontend architecture

### 4.1 Framework, language, and routing

Recommend the current supported **Next.js App Router with React and strict TypeScript**.

- Use an explicit locale segment for every route: `/ar/...`, `/fr/...`, and `/en/...`.
- Use route groups/layouts for public, Citizen, Commune, and authentication experiences.
- Keep public and authenticated navigation visually separate while sharing brand and primitive components.
- Use typed route helpers for internal destinations. Only validated same-origin return destinations may survive authentication redirects.
- Public URLs should use canonical metadata and language alternates. Private Citizen/Commune routes must be non-indexable.
- Do not expose personal data, raw technical identifiers, tokens, or state-changing secrets in URLs.

### 4.2 Rendering model

| Content | Rendering recommendation |
| --- | --- |
| Public informational pages | Static generation or controlled revalidation for SEO, performance, and resilience. Revalidate only after confirmed content publication. |
| Citizen pages | Dynamic Server Components with authorization on every request; private data uses no shared/public cache. |
| Commune pages | Dynamic Server Components with role/account checks on every request; no shared/public cache. |
| Forms and local interaction | Small Client Components only where browser state, event handlers, focus management, or progressive interaction is required. |
| Mutations | Server Actions calling application use cases; Route Handlers for webhooks or explicit HTTP contracts. Every entry point repeats trusted validation and authorization. |

Server Components reduce client JavaScript and keep initial private data access on the server. A Client Component boundary must never imply trust: all data and actions still require server enforcement.

### 4.3 Data fetching and state

- Fetch initial page data through server-side application queries.
- Use URL search parameters for shareable list search/filter/page state, after validating and bounding every value.
- Keep client state local to the component or form that owns it. Do not introduce a global state library for server data.
- Use SWR only for the narrow notification-count/list polling case or another clearly recurring client refresh need; do not duplicate server-fetching logic broadly.
- Never preload another Citizen's records or a broader unfiltered private dataset into the browser.
- Paginate operational lists server-side. Exact page size and persistence query implementation are later implementation/Step 6 details.

### 4.4 Styling and component system

Use Tailwind CSS with semantic CSS custom properties for the approved green, beige, neutral, typography, spacing, radius, border, focus, and status tokens.

- Create internal primitives for buttons, links, inputs, selects, text areas, checkboxes, dialogs, alerts, badges, cards, tables, pagination, skeletons, empty/error states, and navigation.
- Build public header/footer, Citizen header, and Commune sidebar as composed application components.
- Use accessible headless primitives selectively for difficult controls such as dialogs or menus; do not adopt a visual component kit that overrides the supplied designs.
- Components must support `dir="rtl"` and `dir="ltr"`, logical CSS properties, bidirectional text, zoom, keyboard operation, visible focus, and responsive reflow.
- Desktop tables must transform into an accessible small-screen pattern without dropping required information or actions.

### 4.5 Forms and validation

Use React Hook Form for complex interactive forms and Zod for reusable structural schemas and stable validation issue codes.

- Client validation improves usability; it is never authoritative.
- Server use cases parse again, reject unknown/invalid fields, authorize the actor/resource/state, and enforce domain rules.
- Map stable issue codes to `next-intl` messages rather than embedding one language in schemas.
- Preserve the active complaint wizard in browser memory only while the flow remains open. Do not persist drafts locally or remotely.
- Disable duplicate submission in the interface and enforce server-side idempotency for high-value mutations.

## 5. Application and backend architecture

### 5.1 Deployment model

Use one Next.js application as a **modular monolith**. It provides public rendering, authenticated UI, trusted server use cases, HTTP/webhook endpoints, and provider adapters in one deployable unit.

This is preferable to separate frontend/backend applications because the MVP has one team, one browser client, cohesive transactional workflows, modest expected volume, and no approved public API. It lowers deployment, security, versioning, and operating complexity without collapsing internal boundaries.

### 5.2 Conceptual modules

| Module | Responsibility |
| --- | --- |
| Identity and accounts | Identity-provider integration, profile/account state, verification linkage, session-sensitive actions. |
| Authorization | Actor/resource/action/state policy evaluation and deny-by-default helpers. |
| Citizens | Own-profile and own-notification use cases. |
| Complaints | Submission, Citizen-owned queries, allowed pre-review edits and withdrawal. |
| Lifecycle | Frozen state machine and transition prerequisites. |
| Commune operations | Shared-workload queries and lifecycle-valid Agent operations. |
| Responses | Issue response, expose current response, controlled version-preserving correction. |
| Audit/history | Mandatory business audit-event generation and authorized projections. |
| Notifications | Persistent in-platform notification intent, read/unread behavior, deep-link policy. |
| Email | Localized transactional-email intent and provider delivery adapter. |
| Categories and locations | Canonical language-neutral values and localized labels. |
| Public content/settings | Secondary administrative content and operational configuration. |
| Staff administration | Administrator-controlled staff provisioning, role/account status, and revocation. |

These are code/module boundaries, not services, database entities, or tables.

### 5.3 Layered request flow

```text
Route / Server Action / Route Handler
  → authenticate identity
  → load active application actor context
  → parse and validate untrusted input
  → authorize actor + action + resource + current state
  → execute application use case and centralized domain policy
  → commit state change + audit + notification/email intent consistently
  → return a typed, localized-safe result
```

Route components may orchestrate display but must not directly implement lifecycle policy or bypass application use cases. Provider-specific code belongs behind adapters.

## 6. Domain and business-rule enforcement

Centralize the following as framework-independent policies/use cases:

- Citizen creation and one-time verification prerequisites;
- own-resource complaint and notification access;
- `SUBMITTED`-only Citizen edit/withdrawal;
- the frozen allowed-transition matrix and terminal-state protection;
- mandatory response before normal closure;
- mandatory controlled reason and Citizen explanation for `NOT_ACCEPTED`;
- response issuance and version-preserving correction;
- Citizen/Commune account disabling and access revocation;
- per-action audit requirements;
- notification and email event eligibility;
- concurrent revision checks and idempotency.

Each state-changing use case must accept an authenticated actor context, validated command, target identifier, and expected current revision/state. It returns an explicit success or typed failure such as unauthenticated, unauthorized/not found, validation failed, lifecycle conflict, stale version, rate limited, or provider unavailable.

No browser-supplied role, ownership value, lifecycle state, account status, actor ID, timestamp, or audit field is trusted.

## 7. Authentication architecture

### 7.1 Managed-authentication strategy

Use **managed authentication**, but keep the provider **conditional on Step 6**.

Provider priority:

1. If the platform selected in Step 6 includes a secure, mature managed authentication capability that satisfies every frozen requirement and has acceptable free-tier terms, prefer that integrated capability.
2. Otherwise, use a separate professional managed authentication provider with a genuinely usable free tier. WorkOS AuthKit is a fallback candidate; Clerk and other reviewed providers remain alternatives.

The selected capability must support email/password, signup email verification, password recovery, verified login-email change, secure sessions, administrative provisioning/revocation, and a future MFA path. It must also satisfy the independent session and password policy in section 7.4.

Managed authentication keeps password verification, recovery tokens, and authentication-email security outside custom application code. Application roles, account status, complaint ownership, and permissions remain authoritative within Abaynou Tatawasal and must never rely solely on provider metadata.

Provider coupling is mitigated by a narrow authentication adapter, a stable external-subject link, documented export/exit procedures, and no provider-specific concepts in domain policies or UI contracts. Step 6 defines any persistence relationship. Neither Clerk nor WorkOS is an architectural requirement.

### 7.2 Citizen authentication flow

- Enable email/password only for MVP Citizen authentication; phone remains optional application contact data.
- Require email verification at signup before the application actor becomes usable.
- Use neutral recovery responses and provider-issued single-use/time-limited recovery authorization.
- For email change, require recent reauthentication, verify the new address, and switch the authoritative login address only after success.
- Password reset revokes all existing sessions. Password change revokes other sessions; the reauthenticated current session may continue.
- Use custom localized screens to preserve the approved design language and expose only approved methods.

### 7.3 Commune authentication flow

- Use the selected managed identity system but a separate Commune sign-in route and application authorization gate.
- Public signup always creates a Citizen-context identity and can never grant Agent or Administrator authority.
- Staff identities are provisioned only through the Administrator use case; role elevation is never accepted from identity-provider client metadata or public requests.
- Disabling a Commune account revokes provider sessions and causes every application request to fail the active-account authorization check.
- MFA is not mandatory in MVP. Provider selection and adapter boundaries must preserve a later TOTP/passkey/MFA path without implementing it now.

### 7.4 Approved session and password policy

**TA-AMEND-001 — APPROVED CONTROLLED AMENDMENT:** The project owner explicitly approved aligning this section with [Step 6A, DA-03](06-database-architecture.md#73-approved-password-policy-and-accepted-free-tier-limitation). Automated leaked/compromised-password database checking is desirable but not mandatory for the Free MVP. This amendment replaces only the earlier unconditional requirement to block commonly compromised values. Step 5 remains **APPROVED / FROZEN**; all unrelated architecture and security requirements remain unchanged.

- Use securely managed session cookies marked Secure, HttpOnly, and appropriate SameSite; never store bearer/session tokens in `localStorage`.
- Approved Citizen session targets: approximately 7 days inactivity and 30 days absolute.
- Approved Commune session targets: approximately 1 hour inactivity and 8 hours absolute, with recent reauthentication for staff/role changes, Citizen disabling, response correction, and login-email change.
- Logout, password reset, account disabling, and role revocation must invalidate authorization promptly.
- A strong configurable password policy remains mandatory: require at least 15 Unicode characters, allow at least 64, allow spaces/password managers/paste, avoid composition rules and forced periodic rotation, and rate-limit attempts.
- Secure password recovery/reset, authentication rate limiting and abuse protection, safe error behavior, account/session security, and future MFA capability remain mandatory. MFA itself remains optional for the initial MVP.
- Automated leaked/compromised-password database checking is desirable but not mandatory for the Free MVP. Under approved Step 6A DA-03, the absence of Supabase Free's paid native protection is an **ACCEPTED FREE-TIER LIMITATION** and a **POSSIBLE FUTURE SECURITY UPGRADE TRIGGER**. Do not introduce another external or paid provider solely for leaked-password detection.
- If future Commune security policy, threat assessment, legal requirements, or production risk requires compromised-password blocking, reassess the feature and/or service plan through explicit project-owner change approval.

Session policy is independent of provider pricing. Provider capabilities and configuration must be verified before implementation; a free-tier default weaker than the approved policy must be tightened, supplemented safely at the application boundary, or rejected. If no genuinely free managed option can satisfy the policy, the project owner must approve the security/cost trade-off explicitly rather than weakening Commune session security silently.

## 8. Authorization architecture

Authorization belongs in the trusted application/server boundary, not middleware alone and never in UI visibility alone.

### 8.1 Enforcement sequence

Every protected query and mutation must:

1. verify the server-side session;
2. resolve the application actor, role, and current account status;
3. load only the resource data needed for the decision;
4. evaluate `actor + action + resource scope/ownership + current lifecycle state`;
5. perform the query/mutation through an authorized use case;
6. return only an approved projection.

Route middleware may reject obviously unauthenticated traffic early, but it is not the final authorization control.

### 8.2 Mandatory policies

- Citizen complaint queries are always constrained to the authenticated Citizen owner. A changed complaint ID returns a safe unavailable/not-found result and never confirms another Citizen's record.
- Citizen list counts, searches, notifications, and deep links use the same ownership boundary as detail views.
- All active authorized Commune Agents may access all complaints/full details; no assignment condition exists.
- Agent complaint operations remain lifecycle-valid and audited.
- Staff, category, location, settings, public-content, Citizen-disable, and administrative-audit actions require Administrator authority.
- Disabled or missing application accounts fail closed even if the identity-provider session still exists.
- No response, terminal state, or audit record can be silently overwritten or bypassed through an alternate endpoint.

Step 6 should evaluate database-level defense in depth, but no database policy mechanism is selected here.

## 9. Concurrency, idempotency, and failure consistency

### 9.1 Optimistic concurrency

Use application-level **optimistic concurrency with an opaque revision token**.

- Every mutable complaint view receives the confirmed revision/state used to render it.
- Every mutation submits the expected revision and any required expected lifecycle state.
- The server rechecks authorization, current state, prerequisites, and revision in the same persistence transaction as the change.
- A mismatch rejects the stale command with a typed conflict. It never auto-merges lifecycle, response, closure, `NOT_ACCEPTED`, or correction actions.
- The interface explains that another Agent changed the complaint, reloads the latest state, and requires deliberate resubmission if the action remains valid.

Step 6 must provide atomic conditional mutation and transaction support. The revision's storage type is intentionally undecided.

### 9.2 Idempotency

Use server-recognized idempotency keys for complaint submission, response issuance, closure, `NOT_ACCEPTED`, response correction, and provider/webhook processing. A retry of the same confirmed command must not duplicate a complaint, audit event, notification, or email intent.

State change, business audit event, persistent notification, and required email intent should be committed atomically where applicable. External email is sent after commit with retry; failure does not roll back an already confirmed complaint action and remains diagnostically visible.

## 10. Audit architecture

Business audit history and technical application logs are separate systems with different purposes.

### 10.1 Business audit history

- Application use cases produce mandatory audit events; routes and provider adapters cannot opt out.
- A successful material command cannot commit without its required audit event.
- History is append-only from ordinary application roles. Corrections append versions/events rather than update history in place.
- Events carry the actor or trusted system source, role context where appropriate, action, timestamp, resource reference, outcome, relevant previous/new state or value, and mandatory reason.
- Citizen-visible history is an authorized projection and never exposes security-only details.
- Audit access and exceptional support access are themselves audited.

Step 6 determines durable structures, integrity controls, retention, and transaction implementation.

### 10.2 Technical logs

Structured logs should use request/correlation IDs, route/use-case name, safe outcome code, duration, and privacy-minimized actor/resource references. Never log passwords, tokens, recovery/verification secrets, full complaint bodies, Commune responses, or unnecessary Citizen contact data.

## 11. Notifications and email

### 11.1 In-platform notifications

Notifications are persistent and authoritative. Their creation belongs to the same application use cases that confirm the relevant business event.

- Render initial notification list/count on the server.
- Refresh immediately after relevant actions and on navigation/window focus. While an authenticated page remains active, use modest polling only where useful: approximately every two minutes for Commune operational screens and five minutes for Citizen screens, with backoff on failure and while hidden. Exact intervals remain configurable from observed low-volume use.
- Mark-one and mark-all mutations require recipient ownership/scope and idempotent behavior.
- Deep links reauthorize the destination at open time.
- No WebSocket, pub/sub, or custom real-time service is required for MVP.

### 11.2 Transactional email

Use the **fewest email mechanisms that safely satisfy the requirements**. Prefer the selected managed authentication capability's built-in secure delivery for signup verification, password recovery, and email-change verification.

For application transactional email, first evaluate whether the selected application/authentication/platform capability can reliably send the three approved messages with acceptable deliverability, diagnostics, limits, privacy, and production terms. Use that integrated capability when adequate. Otherwise add one dedicated transactional provider; Resend is the preferred fallback candidate because of its simple adapter model and usable free tier, but it is not mandatory.

Application transactional email remains limited to:

1. complaint received;
2. Commune response issued or corrected where appropriate;
3. complaint closed.

Application email requirements:

- generate localized templates from stable event data after the business transaction commits;
- use an outbox/retry/idempotency pattern supported by Step 6;
- send from a Commune-owned verified domain/subdomain with SPF and DKIM and a planned DMARC policy;
- include minimal personal/complaint data, a safe complaint reference, and an authenticated deep link rather than the complaint body or response;
- record provider delivery identifiers/status diagnostically without treating provider logs as authoritative notification history;
- handle temporary failure with bounded retries and alert persistent failure.

Authentication secrets remain within the selected authentication system. Application email stays behind an application adapter whether delivery is integrated or external, so adding or replacing a provider does not alter domain logic. Provider selection is conditional on Step 6 and final capability/terms validation.

## 12. Localization, directionality, and accessibility

### 12.1 Localization

Use `next-intl` with locale-prefixed routes and namespaced message catalogues.

- Arabic is the default when no supported persisted choice exists; authenticated Citizen preference takes precedence after sign-in.
- Resolution order: explicit URL locale, authenticated saved preference, valid locale cookie, then Arabic.
- Switching language keeps the equivalent safe route and unsaved in-memory form state.
- Set document `lang` and `dir` at the locale layout. Use CSS logical properties and isolate mixed-direction references, emails, phone numbers, and URLs.
- UI labels, validation, system states, statuses, notifications, metadata, and email templates use reviewed message keys.
- Stable domain codes remain language-neutral. Missing official labels fail as a content-readiness issue; internal keys never appear to users.
- User complaint text and Commune responses are displayed in the authored language without machine translation.

### 12.2 Accessibility baseline

Target WCAG 2.2 AA practices:

- semantic landmarks/headings and native controls first;
- programmatic labels, descriptions, error association, summaries, and focus movement;
- complete keyboard navigation and visible focus;
- contrast-compliant tokens and non-color status cues;
- zoom/reflow and touch-target testing on responsive layouts;
- accessible loading/status announcements without excessive live-region noise;
- correct DOM order under RTL and no visual-only source-order reversal;
- screen-reader and keyboard manual testing in Arabic RTL and at least one LTR locale.

ARIA supplements native semantics only where necessary. Automated axe checks support but do not replace manual review.

## 13. Public content and settings architecture

Do not add a CMS. Use the same Administrator application and use-case pattern for Commune contact details, address, opening hours, Chikaya link, localized public/legal content, categories, and locations.

- Keep Public Content / Legal & Information secondary under Settings.
- Use structured forms and constrained text/Markdown where formatting is needed; raw HTML is not accepted.
- Render only sanitized/escaped approved content.
- Validate URLs, phone/email values, locale completeness, and required content before confirmed publication.
- Audit material edits/publication and preserve historical complaint category/location labels as required.
- Public cache revalidation happens only after a successful confirmed change.

Exact storage, versioning, publication representation, and historical snapshots belong to Step 6.

## 14. Application security and abuse protection

### 14.1 Defense in depth

- HTTPS only in staging/production; HSTS after domain readiness.
- Secure, HttpOnly session cookies; no reusable credentials in browser storage.
- Strict server validation, contextual output encoding, and plain-text rendering for complaint/response content.
- CSRF protection through SameSite cookies, origin checks, and explicit anti-CSRF protection for any endpoint not covered safely by framework/provider behavior.
- Content Security Policy, frame-ancestor restrictions, `nosniff`, Referrer Policy, and a minimal Permissions Policy.
- Parameterized persistence operations and no string-built queries; exact query layer is Step 6.
- Secrets only in environment-scoped secret stores, never source, logs, previews, or client bundles.
- Safe localized errors; internal stack traces and provider details remain server-side.
- Dependency pinning, lockfile review, automated updates, vulnerability scanning, and prompt security patching.
- Signed, timestamp-checked, replay-resistant, and idempotent webhooks.
- File upload routes and storage do not exist in MVP.

### 14.2 Rate limiting

Layer provider controls with application limits:

- The selected managed-authentication protections cover sign-in, registration, verification resend, recovery, and email-change verification; verify configuration before launch and supplement them where required.
- Apply shared server-side account/IP limits to complaint creation and high-impact administrative mutations.
- Apply coarse edge/IP protection to abusive public and authentication traffic without blocking normal shared-network users.
- Return safe `429` feedback and `Retry-After` where appropriate; never reveal account existence.
- Use progressive delay/temporary throttling rather than permanent lockout caused solely by anonymous attempts.
- Keep limit values configurable and tune them in staging from observed legitimate use.

A distributed limiter must work across deployment instances. Its provider/implementation is an application infrastructure selection to confirm with hosting; it is not the primary database choice.

## 15. Testing strategy

| Level | Recommended tools | Primary coverage |
| --- | --- | --- |
| Unit/domain | Vitest | Lifecycle matrix, edit lock, response-before-close, terminal states, reason requirements, notification/email eligibility, validation. |
| Component | Vitest + React Testing Library | Forms, focus/errors, RTL/LTR behavior, status components, responsive interaction, permission-aware UX. |
| Server/service | Vitest with provider/persistence ports | Authentication mapping, authorization decisions, audit generation, idempotency, provider failures. |
| Integration | Dedicated isolated test environment | Atomic command/audit/notification intent, ownership-scoped queries, stale revision rejection, webhook handling. |
| End-to-end | Playwright | Registration/verification seam, login/recovery, complaint journey, Agent processing, response/closure, Administrator functions, session expiry. |
| Accessibility | axe in Playwright plus manual testing | Common automated violations, keyboard/focus, zoom/reflow, screen reader, Arabic RTL and LTR. |
| Security regression | Server/integration/E2E suites | ID changes, direct routes, Citizen A/B isolation, Agent/Admin escalation, disabled sessions, CSRF/open redirect, unsafe errors. |

Mandatory high-risk tests include:

- Citizen A can never list, count, infer, open, edit, withdraw, or receive a notification for Citizen B's complaint;
- every allowed and forbidden lifecycle transition;
- Citizen edit/withdraw lock at `UNDER_REVIEW`;
- all shared-workload Agent actions without assignment;
- `NOT_ACCEPTED` reason/explanation requirements;
- response correction version preservation and unchanged lifecycle;
- audit generation and failure atomicity;
- two-Agent stale-update rejection and idempotent retries;
- disabled Citizen/Commune sessions;
- Arabic/French/English routes, validation, and directionality.

Tests must use synthetic data. Production data must never be copied casually into development or CI.

## 16. Environments, hosting, deployment, and CI/CD

### 16.1 Environments

Maintain three isolated environments:

| Environment | Purpose | Required isolation |
| --- | --- | --- |
| Local | Development and automated tests | Local/test credentials, safe email capture, synthetic data. |
| Staging | UAT, integration, accessibility, security, and deployment rehearsal | Separate identity configuration/tenant where supported, email configuration, application URL, secrets, and Step 6 persistence environment. |
| Production | Approved public service | Production-only accounts, secrets, domains, monitoring, email domain, and persistence. |

Preview deployments use non-production integrations and synthetic data. They must never inherit production secrets or data. Secrets are environment-scoped and rotated after exposure or staff access changes.

### 16.2 Hosting recommendation

Use a **free-first managed hosting selection** for the standard Next.js/Node-compatible application. Do not require Vercel Pro or any paid host before actual terms, security, quota, reliability, team-ownership, or recovery needs justify it.

Recommended path:

1. Use local development, GitHub/GitHub Actions within usable allowances, and an eligible free preview host for development, demonstration, and staging.
2. Before initial production, compare current official terms and limits for compatible managed hosts. Netlify Free is a candidate because its published material permits free commercial projects and its OpenNext adapter supports major Next.js features; Cloudflare Workers Free is another candidate if the selected Next.js features pass compatibility testing. Neither is frozen here.
3. Use a free tier for low-volume production only when organizational use is permitted, quotas are comfortable, the service will not sleep or pause unacceptably, account ownership is safe, operational reliability is acceptable, and the Step 6 persistence connection/locality is compatible.
4. If no free tier passes those gates, approve the least-cost suitable paid plan. Vercel Pro remains a strong low-operations paid fallback, not an MVP prerequisite.

Vercel Hobby is suitable for personal/non-commercial development and demonstrations where its terms permit, but its current terms restrict Hobby to personal or non-commercial use. It must not host the official Commune production service unless the provider's terms change and are reverified. Render's own documentation states that free web services should not be used for production and describes idle spin-down, so Render Free is not a production recommendation.

Netlify Free and other hard-capped plans may pause when allowances are exhausted; Cloudflare's current Next.js path and compatibility status must be verified against the exact application build. Current quotas and terms can change and must be rechecked immediately before launch.

Keep business logic framework-neutral, avoid unnecessary host-specific APIs, and retain a standard Node deployment path where practical. Use separate staging and production projects/configuration. Select the execution region only after the Commune accepts processing jurisdiction and Step 6 confirms compatible persistence locality. No database choice is implied.

### 16.3 CI/CD

Use a GitHub repository and GitHub Actions.

Pull requests should require:

- formatting check;
- ESLint;
- strict TypeScript check;
- unit/domain/component/server tests;
- authorization/security regression tests;
- production build verification;
- dependency review and vulnerability scanning where available.

Run Playwright smoke tests in CI and full E2E/accessibility tests against staging before production. Protect the main branch, require passing checks and review, prevent force-push/deletion, and require explicit production deployment approval. The selected host may create previews automatically, but production promotion remains controlled. Step 6 later adds migration validation and deployment ordering.

## 17. Monitoring, logging, and recovery responsibilities

### 17.1 Observability

Start with the fewest useful capabilities:

- structured privacy-safe application logging;
- selected hosting-provider deployment/runtime logs;
- one basic free uptime/health monitor where a suitable free service is available;
- selected authentication/email provider diagnostics;
- alerts routed to named operational owners with severity and response expectations defined before launch.

Sentry is optional. Add its free tier only if it materially improves application/server error diagnosis and release correlation beyond hosting logs; do not make a paid Sentry plan an initial dependency. Keep observability behind a narrow adapter so Sentry or another provider can be added, replaced, or removed without changing domain logic.

Do not send complaint bodies, responses, passwords, tokens, or unnecessary Citizen identity/contact data to monitoring providers. Sampling, retention, user context, and source-map access must be reviewed before production.

Business audit history is not an error-monitoring product and must remain authoritative independently.

### 17.2 Recovery

- Keep deployment artifacts/version history sufficient to roll back application releases.
- Use controlled configuration changes with environment-specific history.
- The Step 6 persistence provider must support reliable backups, point-in-time or suitable recovery, and tested restore procedures.
- Test restoration and disaster runbooks before production acceptance and periodically thereafter.
- Email/monitoring failure must not corrupt confirmed complaint state.

No database backup technology is selected here.

## 18. High-level repository structure

Recommended conceptual structure; do not create it until implementation is authorized:

```text
src/
  app/
    [locale]/
      (public)/
      (citizen)/
      (commune)/
      (auth)/
    api-or-webhook-boundaries/
  components/
    ui/
    public/
    citizen/
    commune/
  features/
    accounts/
    authorization/
    complaints/
    lifecycle/
    responses/
    audit/
    notifications/
    categories-locations/
    public-content-settings/
    staff/
  infrastructure/
    auth/
    persistence/
    email/
    observability/
    rate-limit/
  shared/
    i18n/
    validation/
    security/
    result/
messages/
  ar/
  fr/
  en/
tests/
  integration/
  e2e/
```

Within a feature, separate domain policy, application use cases, server adapters, UI, and tests only where the separation adds clarity. Avoid generic enterprise layers, dependency-injection frameworks, or one-file-per-abstraction ceremony.

## 19. Dependency strategy

- Use the current supported Node.js release accepted by Next.js and the selected compatible host/providers.
- Use `pnpm` with a committed lockfile and exact reproducible CI install.
- Prefer mature, actively maintained libraries with clear security ownership.
- Keep the dependency list small; do not install duplicate date, validation, form, query, icon, or component libraries.
- Review transitive dependencies, licenses, update cadence, and server/client bundle impact.
- Pin major versions intentionally and schedule controlled updates rather than automatic production changes.
- Keep provider SDKs behind adapters and avoid importing server-only packages into Client Components.

Major recommended dependencies only:

- Next.js, React, TypeScript;
- Tailwind CSS;
- `next-intl`;
- Zod and React Hook Form;
- the selected managed-authentication SDK only after the conditional provider decision;
- a lightweight email template approach; add a transactional provider SDK such as Resend only if the integrated delivery path is insufficient;
- SWR only for notification polling;
- Vitest, React Testing Library, Playwright, and axe integration;
- an observability SDK such as Sentry only if its free tier is deliberately adopted.

No persistence library, ORM, SQL toolkit, or database SDK is recommended in Step 5.

## 20. Future extensibility without premature features

The modular boundaries support later additions without implementing them now:

| Future capability | Architectural extension point—not MVP implementation |
| --- | --- |
| Attachments | Complaint application service can later call a separately authorized file/storage adapter and malware/content checks. No upload path exists now. |
| SMS | Add a notification delivery adapter without changing authoritative in-platform notification events. |
| Advanced notifications | Add workers/scheduling or realtime delivery behind notification ports. |
| Analytics/reporting/exports | Build authorized read models from domain events/data without changing lifecycle commands. |
| SLA/deadlines | Add approved domain policies/events rather than hidden UI timers. |
| Departments/assignment | Add an approved routing module and authorization policy without changing complaint identity/history. |
| Satisfaction feedback | Add a separate post-closure feature rather than reopening complaints. |
| Advanced search | Replace/extend the search adapter without changing operational use cases. |
| APIs/integrations | Expose authenticated Route Handlers around existing application use cases. |
| MFA | Enable supported identity-provider factors and add UI/policy without replacing identity linkage. |

Extensibility is an internal boundary, not permission to add these features to MVP.

## 21. Cost and maintenance strategy

The target is approximately **€0/month / $0/month** for development and initial low-volume deployment where realistically possible. This target never overrides security, privacy, reliability, recovery, provider terms, or maintainability.

| Stage | Cost target and approach |
| --- | --- |
| Development | Open-source local tooling, free source control/CI allowances, local email capture, synthetic data, and free provider development tenants. Target: zero recurring cost. |
| Pilot/demo | Free preview/staging allowances with non-production identities, secrets, email behavior, and synthetic data. Target: zero recurring cost where terms permit. |
| Initial low-volume production | Use approved free tiers only after verifying organizational-use terms, security, quotas, reliability, pausing behavior, recovery limitations, support expectations, and account ownership. Target: zero recurring service cost where all gates pass. |
| Future operation | Upgrade only for actual quota exhaustion, unacceptable pausing/reliability, required backups/recovery, security/session controls, collaboration/account ownership, support/SLA, provider terms, or meaningful growth. |

Minimizing services means first evaluating whether the Step 6 platform can securely provide persistence, managed authentication, authentication email, and the three application emails. Add a separate provider only for a demonstrated capability gap.

The largest maintenance savings come from one deployable application, integrated managed capabilities where adequate, no real-time layer, no CMS, and limited dependencies. The Commune/project owner must own production accounts, billing, domain/DNS, recovery contacts, and offboarding—not an individual developer.

Database provider pricing and database operating cost are intentionally absent and belong to Step 6.

### 21.1 Free-tier risk register

Every managed service selected later must be entered in this register and reverified against official documentation immediately before production launch. Exact quotas below are stated only where current official documentation was reviewed; they are not permanent guarantees.

| Candidate/capability | Free-tier suitability | Restrictions/quotas and pause risk | Backup/recovery concern | Upgrade trigger | Migration/exit path |
| --- | --- | --- | --- | --- | --- |
| GitHub/GitHub Actions | Suitable for development/CI while repository and Actions allowances meet the project need. | Private-repository minutes and some security/governance features vary by plan; verify current limits. | Keep repository clones and protected release history; no production data belongs in CI. | CI quota, required private-repository governance, or security feature gap. | Git history and standard workflow files are portable to another Git/CI host. |
| Step 6 integrated authentication | Preferred if mature, secure, policy-compliant, and genuinely usable at no cost. | **Provider and limits deferred to Step 6.** Verify user quotas, session configuration, email limits, inactivity, export, and organizational terms. | Identity export, recovery access, and service outage procedures must be acceptable. | Security/session requirement, quota, reliability, support, or terms cannot be met free. | Authentication adapter plus stable external-subject mapping; document export/migration before launch. |
| WorkOS AuthKit fallback | Candidate separate managed auth; current official pricing states free user management up to its published threshold. | Verify production billing-information requirement, email/password features, session policy, custom UI/domain, logs, and current quota before selection. | Confirm user export, tenant recovery, and incident support. | Required feature/support/limit exceeds free service. | Keep application roles outside provider metadata and use the authentication adapter. |
| Clerk fallback | Alternative managed auth with a usable free tier. | Current free plan has provider-defined session and dashboard-seat limits; verify that the independent Commune session policy and ownership model can be met. | Confirm export, recovery contacts, and outage behavior. | Custom session/security controls, seats, usage, support, or terms require payment. | Authentication adapter and documented identity export; no domain rules in Clerk metadata. |
| Integrated application email | Preferred if the selected platform reliably sends the three approved complaint emails. | Verify daily/monthly quotas, custom sending domain, diagnostics, retry, suppression/bounce handling, and production terms. | Email logs are not authoritative notification history; durable intent remains application-owned. | Deliverability, domain authentication, quota, diagnostics, or reliability is inadequate. | Email adapter permits switching to a dedicated provider. |
| Resend fallback | Suitable low-volume fallback when integrated email is insufficient. | Current official free tier publishes 3,000 emails/month and 100/day; reverify before launch. | Provider delivery logs do not replace application intent/history. | Actual volume, daily cap, support, retention, deliverability, or reliability need. | Commune-owned domain/DNS and email adapter reduce switching cost. |
| Netlify Free hosting candidate | Candidate for demos and potentially low-volume production if terms, team ownership, and reliability are accepted. | Current plan publishes 300 monthly credits with a hard cap; projects pause at exhaustion. Current free plan lacks additional team seats. | Deployment rollback/history and account recovery must be reviewed; persistence remains external/Step 6. | Credits, pause risk, collaboration, observability, support, or reliability becomes unacceptable. | Standard Next.js source plus OpenNext portability; avoid proprietary APIs. |
| Cloudflare Workers Free candidate | Candidate if exact Next.js build passes supported compatibility and organizational terms are accepted. | Current official limit publishes 100,000 requests/day and constrained CPU; current recommended Next.js path must be compatibility-checked and may evolve. | Application rollback/configuration and provider outage procedures must be documented. | Compatibility, quotas, CPU, support, locality, or reliability gap. | Preserve standard application/domain boundaries and avoid binding core logic to Workers services. |
| Vercel Hobby | Suitable only for personal/non-commercial development/demo use allowed by current terms. | Current terms restrict Hobby to personal or non-commercial use; therefore it is not approved for official Commune production under current terms. | Hobby service may be changed/discontinued and has limited operational guarantees. | Official organizational production requires a permitted plan or another host. | Standard Next.js Node deployment and minimal proprietary APIs. |
| Render Free | Development/demo candidate only. | Current official docs say not to use free web services for production and describe idle spin-down. | Free-service availability is unsuitable for the official service. | Any production use. | Standard Node deployment can move to another host. |
| Hosting/application logs | Use as the initial diagnostics baseline if retention and access are adequate. | Retention, search, export, alerts, and quotas vary by selected host; verify before launch. | Logs are not business audit history and may be short-lived. | Incident diagnosis or retention is inadequate. | Structured logging can be routed to another sink. |
| Sentry free tier | Optional only if it provides useful error diagnosis beyond host logs. | Verify current event, retention, user, PII, and uptime limits. No paid Sentry plan is mandatory. | Sentry is not the authoritative audit/history store. | Team access, event volume, retention, alerting, or support need. | Observability adapter and standard error context permit replacement/removal. |
| Basic uptime monitor | Use a genuinely free monitor if it meets check frequency and alert needs. | Verify current check count, interval, retention, alert channel, and account terms. | It detects availability but does not restore service. | More checks, recipients, retention, or SLA monitoring is needed. | Health endpoint is provider-neutral. |

## 22. Meaningful alternatives considered

| Alternative | Why considered | Why not recommended for this MVP |
| --- | --- | --- |
| Separate SPA plus backend API | Strong physical separation and future multi-client API. | Duplicates deployment, authentication, contracts, CORS/CSRF, monitoring, and versioning for one browser product; no approved public API requires it. |
| Microservices/serverless service fleet | Independent scaling and ownership. | Unnecessary distributed transactions, queues, observability, security boundaries, and cost for a small cohesive domain. |
| SvelteKit, Nuxt, or another full-stack framework | Capable modern alternatives. | Next.js has the strongest fit with the proposed managed services, team availability, public rendering, and a single React component system; no requirement uniquely favors another framework. |
| Large visual UI framework | Fast generic administration screens. | Likely to fight the approved custom visual language, RTL details, and component density. Internal components plus selective headless primitives are more faithful. |
| Separate custom backend framework | Clear API boundary and framework independence. | Adds a second runtime/deployment without present need. Internal application/use-case boundaries provide most benefits at lower complexity. |
| Application-owned/self-hosted authentication | Maximum control, open-source options, and lower SaaS dependency. | It transfers password, session, recovery, email, abuse, update, and security operations to this project. Keep it as a Step 6 comparison only if no integrated or separate managed free-tier option satisfies requirements. |
| Fixed Clerk, WorkOS, or Auth0 dependency in Step 5 | Predictable provider integration before data design. | Prematurely adds a provider and may duplicate an adequate Step 6 platform capability. Managed authentication remains required, but provider selection is conditional. |
| Mandatory Clerk plus Resend split | Clear separation of auth and application email. | Adds two external providers before proving both are needed. Prefer integrated secure delivery and add Resend only for a demonstrated gap. |
| Mandatory Vercel Pro | Lowest-friction Next.js production hosting. | Conflicts with free-first selection before checking permitted free options. Keep Vercel Pro as a paid fallback when free tiers fail terms, security, reliability, collaboration, or quota gates. |
| Netlify Free or Cloudflare Workers Free as an unconditional production choice | Potential zero-cost managed hosting. | Both require launch-time verification of terms, quotas, pause behavior, team ownership, compatibility, reliability, and Step 6 connectivity. They are candidates, not frozen providers. |
| WebSockets/realtime notifications | Instant badge/status updates. | No frozen workflow needs instant delivery; polling is simpler, cheaper, and more reliable for expected volume. |
| Headless CMS | Rich editorial workflow. | The approved content surface is small and Administrator-managed; a CMS adds another account, permission, integration, security, and deployment boundary. |

## 23. Architecture decision table

| Area | Architectural choice | Current preferred implementation | Conditional/fallback provider | Free-tier strategy | Upgrade trigger |
| --- | --- | --- | --- | --- | --- |
| Frontend | Full-stack React framework | Next.js App Router + strict TypeScript | Another approved full-stack framework only if compatibility blocks the recommendation | Open-source/local | Material framework limitation or unsupported security requirement |
| Rendering/routing | Static/revalidated public; dynamic private; locale-prefixed routes | Server Components by default; small Client Components | Standard Node-compatible rendering | Open-source/local | Not provider-priced |
| Styling/components | Custom reusable accessible design system | Tailwind CSS, CSS variables, limited scoped CSS, selective headless primitives | Native CSS/headless alternative | Open-source/local | Not provider-priced |
| Forms/validation | Client UX plus authoritative server validation | React Hook Form + Zod + domain policies | Equivalent maintained libraries | Open-source/local | Not provider-priced |
| Localization | Stable message keys and locale routes | `next-intl`; ar/fr/en; RTL/LTR | Equivalent mature Next.js i18n library | Open-source/local | Not provider-priced |
| Application architecture | One modular monolith | Feature/application/domain boundaries in one deployable app | Separate service only after a proven scaling/integration need | One deployment minimizes cost | Proven operational need, not feature speculation |
| Server/backend | Trusted application boundary | Compatible managed Node runtime, Server Actions, focused Route Handlers | Another standard Node host | Prefer eligible free runtime | Terms, reliability, quota, security, or support gap |
| Authentication | Managed authentication | **Use Step 6 platform auth if it satisfies all frozen requirements** | WorkOS AuthKit, Clerk, or another approved managed free-tier provider | Prefer integrated free capability; otherwise usable managed free tier | Session/security feature, quota, reliability, support, or terms require payment |
| Authorization | Central application policy plus scoped reads/writes | Server-side actor/action/resource/state checks | Step 6 may add database defense in depth | Open-source application logic | Not weakened for free-tier limitations |
| Domain logic | Framework/provider-independent use cases | Central lifecycle/account/notification/audit policies | None | Open-source application logic | Not provider-priced |
| Concurrency | Optimistic revision checks and conditional atomic mutation | Provider-neutral expected-revision contract | Persistence mechanism deferred | No separate service | Persistence capability cannot satisfy atomicity |
| Audit | Append-only business history generated with actions | Application use cases emit mandatory audit events | Persistence implementation deferred | No separate audit SaaS | Retention/integrity requirements exceed selected persistence capability |
| Notifications | Persistent records plus modest refresh/polling | Immediate post-action/focus refresh; about 2 minutes Commune and 5 minutes Citizen | Realtime adapter only in a future approved version | No realtime service | Proven timeliness requirement |
| Authentication email | Managed secure identity email flow | Selected authentication capability's built-in delivery | Dedicated provider only if inadequate | Prefer included free delivery | Deliverability, quota, domain, diagnostics, or reliability gap |
| Application email | Adapter for three approved complaint emails | Integrated platform delivery when adequate | Resend preferred fallback; another approved transactional provider | Use acceptable included/free limits | Quota, daily cap, deliverability, retention, support, or reliability gap |
| Hosting | Free-first compatible managed deployment | Select after Step 6 compatibility review; Netlify Free and Cloudflare Workers Free are candidates | Vercel Pro or another least-cost approved host | $0 production only if terms/security/quotas/reliability/ownership pass | Any failed free-tier gate or actual growth |
| Testing | Layered automated and manual assurance | Vitest, Testing Library, Playwright, axe, manual accessibility/security review | Equivalent open-source tools | Open-source/local/CI free allowances | CI volume or required managed browser capacity |
| CI/CD | Protected automated quality gate and controlled promotion | GitHub/GitHub Actions within allowances | Another Git/CI host | Use genuinely usable free limits | Minutes, private governance, security scans, or collaboration need |
| Monitoring | Privacy-safe logs and basic uptime first | Application + host logs and one free uptime check | Optional Sentry free tier; paid/other tool later | No paid monitoring required initially | Diagnosis, retention, team access, alerts, volume, or support gap |
| Security | Defense in depth independent of price | Managed identity, server enforcement, secure sessions, headers, limits, safe logs | Replace any provider that cannot meet policy | Never weaken controls to stay free | Paid capability only when no secure free path exists |
| Repository | Feature-oriented structure inside one app | Git with provider-neutral source layout | Another Git host | Open-source tooling/free allowance | Governance or collaboration requirement |
| Database technology/provider | **Deferred to Step 6 — Database Architecture & Data Model** | **Deferred to Step 6 — Database Architecture & Data Model** | **Deferred to Step 6 — Database Architecture & Data Model** | Evaluated in Step 6 | Evaluated in Step 6 |
| Database schema/model | **Deferred to Step 6 — Database Architecture & Data Model** | **Deferred to Step 6 — Database Architecture & Data Model** | **Deferred to Step 6 — Database Architecture & Data Model** | Evaluated in Step 6 | Evaluated in Step 6 |
| ORM/query strategy | **Deferred to Step 6 — Database Architecture & Data Model** | **Deferred to Step 6 — Database Architecture & Data Model** | **Deferred to Step 6 — Database Architecture & Data Model** | Evaluated in Step 6 | Evaluated in Step 6 |

## 24. Requirements handed to Step 6

Step 6 must select a persistence architecture that supports, without redesigning the application:

- relational consistency and transactional state changes;
- atomic authorization-relevant reads and conditional writes;
- optimistic revision/version checking;
- idempotent commands/provider events;
- append-only audit/history and complete response versions;
- persistent notifications and read/unread state;
- durable email intent/outbox and retry status;
- stable language-neutral identifiers plus approved localized labels/content;
- historical preservation for categories, locations, account actors, complaints, and responses;
- secure least-privilege access and possible database-level defense in depth;
- environment isolation, migrations, backups, restore testing, retention, and portability.

Step 6 must also evaluate whether its selected platform provides managed authentication and email capabilities that satisfy sections 7, 11, 14, 16, and 21.1. Authentication and email provider selection is therefore **conditional on Step 6**. An integrated capability is preferred only when it meets the frozen security/session behavior, production-use terms, free-tier viability, deliverability, export/exit, and reliability requirements; integration alone is not sufficient.

Step 6 alone decides database technology/provider, schema, entities, relationships, constraints, indexes, concurrency representation, RLS/policies, migrations, ORM/query layer, retention, backups, and vendor lock-in.

## 25. Recorded project-owner decisions for Step 5

The project owner has approved the following architecture principles. They are recorded here while the overall Step 5 document remains a draft awaiting final review.

| ID | Status | Decision to freeze | Recommended option | Alternatives | Why now | Security/cost/maintenance effect | Step 6 effect |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TA-01 | **APPROVED — ARCHITECTURE PRINCIPLE** | Frontend/application stack | Next.js App Router, React, strict TypeScript, Tailwind, internal reusable components, `next-intl`, React Hook Form, and Zod; no large UI framework without later explicit justification | Another full-stack framework or component strategy | Step 6 needs the application runtime and adapter expectations. | Open-source/free development stack; server-first privacy; routine dependency maintenance. | Establishes application/persistence interfaces without selecting persistence. |
| TA-02 | **APPROVED — ARCHITECTURE PRINCIPLE** | Deployable architecture | One full-stack modular monolith | Separate SPA/API, backend, or microservices | Defines the application boundary Step 6 must serve. | Fewest attack/deployment boundaries and lowest application-side cost/operations. | Requires transactional persistence behind provider-neutral ports. |
| TA-06 | **APPROVED — SECURITY POLICY** | Session targets | Citizen about 7-day inactivity/30-day absolute; Commune about 1-hour inactivity/8-hour absolute; recent reauthentication for sensitive actions | Longer convenience or shorter security windows | Authentication candidates in Step 6 must be evaluated against an independent policy. | No direct service cost; a provider requiring payment to satisfy policy becomes an explicit owner trade-off. | May require provider/session linkage but does not choose its representation. |
| TA-07 | **APPROVED — ARCHITECTURE PRINCIPLE** | Notification freshness | Immediate post-action and focus/navigation refresh; about 2-minute Commune and 5-minute Citizen polling; no realtime | Manual refresh only; 60-second polling; WebSockets | Determines baseline request behavior before persistence capacity is assessed. | Low cost/complexity; every refresh remains authorized. | Requires efficient recipient-scoped notification queries/read state. |
| TA-08 | **APPROVED — GOVERNANCE/COST PRINCIPLE** | Provider ownership and initial observability | Commune/project owns accounts, domain/DNS, billing and recovery; begin with host/application logs plus basic free uptime; optional Sentry free tier only if useful | Developer-owned accounts; mandatory paid monitoring; another approved free stack | Ownership and free-first governance apply to every Step 6 candidate. | Prevents handover risk; minimizes processors/cost; requires PII-safe logs and access review. | Processing region/account ownership may constrain locality but selects no database. |

### 25.1 Provider decisions intentionally deferred

These former provider approvals are no longer required before Step 6. Their architecture principles are recorded, while exact providers remain conditional.

| ID | Status | Approved architecture principle | Provider decision |
| --- | --- | --- | --- |
| TA-03 | **ARCHITECTURE PRINCIPLE APPROVED — PROVIDER DEFERRED UNTIL STEP 6** | Use managed authentication; application roles/permissions remain authoritative; satisfy all frozen identity, session, revocation, and future-MFA requirements. | Prefer adequate integrated Step 6 platform auth; otherwise select WorkOS AuthKit, Clerk, or another approved managed free-tier provider. Neither is mandatory. |
| TA-04 | **ARCHITECTURE PRINCIPLE APPROVED — PROVIDER DEFERRED UNTIL STEP 6** | Prefer built-in secure auth email and the fewest providers; application email remains behind an adapter and is limited to three approved events. | Use adequate integrated delivery; otherwise add Resend or another approved transactional provider. Resend is fallback, not mandatory. |
| TA-05 | **ARCHITECTURE PRINCIPLE APPROVED — FINAL PROVIDER CONDITIONAL ON STEP 6** | Use compatible free-first managed hosting; free production is allowed only after terms, security, quotas, reliability, ownership, recovery, and locality gates pass. | Evaluate Netlify Free and Cloudflare Workers Free; retain Vercel Pro/another least-cost permitted host as fallback. Vercel Pro is not mandatory. |

No database/provider/schema/ORM decision appears in this list. No genuine Step-5 project-owner architecture decision remains open; only the intentional conditional provider selections above remain for coordination with Step 6.

## 26. Validation checklist

- The four governing documents remain unchanged and **APPROVED / FROZEN**.
- The shared Commune workload is preserved: all authorized Agents access all complaints and may continue another Agent's work.
- No assignment-based authorization, claiming, or permanent complaint owner was introduced.
- Citizen complaint ownership isolation is enforced at trusted server query and mutation boundaries.
- Lifecycle validation, terminal-state protection, response-before-closure, and `NOT_ACCEPTED` requirements remain frozen.
- Server-side authorization is mandatory; middleware and hidden controls are insufficient.
- Optimistic stale-update protection, conditional mutation, and safe conflicts are defined.
- Per-action business audit generation and separation from technical logs are defined.
- Arabic, French, and English plus RTL/LTR behavior are architectural requirements.
- Attachments, internal notes, statistics, two-way messaging, Awaiting Citizen, SMS, and advanced features remain out of MVP.
- MFA remains optional/future and is not implemented.
- TA-01 and TA-02 are approved.
- TA-03 and TA-04 architecture principles are approved; their final providers remain deferred to Step 6.
- TA-05's hosting principle is approved; the final provider remains conditional on Step 6 compatibility and the minimum-provider strategy.
- TA-06 is approved with approximately 1-hour Commune inactivity and 8-hour absolute session targets.
- TA-07 and TA-08 are approved.
- The free-first, minimum-external-services, and portability principles are approved.
- Development, testing, demonstration, staging, and the initial low-volume launch can use open-source software or genuinely usable free tiers; no paid-only service is mandatory.
- A free tier may host initial production only after its organizational-use terms, quotas, pause/sleep behavior, security, reliability, recovery, ownership, and locality are accepted; otherwise the least-cost suitable paid option requires explicit approval.
- The architecture uses the fewest external providers reasonably possible without weakening security, privacy, reliability, maintainability, recoverability, or email deliverability.
- Authentication and email provider selection remains conditional on Step 6. WorkOS, Clerk, and Resend are candidates or fallbacks, not mandatory dependencies.
- Vercel Pro and paid Sentry are not mandatory. Vercel Hobby is not proposed for official Commune production under its current personal/non-commercial terms.
- Free-tier constraints do not weaken the frozen authorization, session, privacy, auditability, backup/recovery, or operational requirements.
- No database technology/provider, Supabase/Neon choice, schema, entity, relationship, table, index, policy, migration, ORM, or SQL-first decision was made.
- No application code, framework initialization, package file, dependency installation, environment, or service configuration was created.

## 27. Approval boundary

This document is **APPROVED / FROZEN** and is the authoritative application-architecture baseline for the Abaynou Tatawasal MVP. Future changes require explicit project-owner approval and must remain consistent with the four governing frozen documents. Approval of this architecture does not authorize implementation or automatically begin Step 6.

Step 6 — Database Architecture & Data Model must not begin automatically.
