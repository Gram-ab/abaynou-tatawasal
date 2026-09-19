# Abaynou Tatawasal — Roles, Permissions, and Security Model

## Document control

| Field | Value |
| --- | --- |
| Project | Abaynou Tatawasal — أباينو تتواصل |
| Organization | Commune of Abaynou, Morocco |
| Step | Step 4 — Roles / Permissions / Security Model |
| Status | **APPROVED / FROZEN** |
| Governing scope | [`docs/01-mvp-scope.md`](01-mvp-scope.md), **APPROVED / FROZEN** |
| Governing functional specification | [`docs/02-functional-specification.md`](02-functional-specification.md), **APPROVED / FROZEN** |
| Governing lifecycle | [`docs/03-complaint-lifecycle.md`](03-complaint-lifecycle.md), **APPROVED / FROZEN** |
| Implementation status | Not started |
| Architecture status | Not selected |

## 1. Purpose, authority, and boundaries

This document is now the authoritative MVP roles, permissions, privacy, authorization, auditability, and security-policy baseline for Abaynou Tatawasal.

Future changes require explicit project-owner approval and must remain consistent with [`docs/01-mvp-scope.md`](01-mvp-scope.md), [`docs/02-functional-specification.md`](02-functional-specification.md), and [`docs/03-complaint-lifecycle.md`](03-complaint-lifecycle.md).

The model follows least privilege, privacy by default, deny by default, separation of routine and exceptional authority, and auditable administration. It does not alter the frozen product scope, functional behavior, or complaint lifecycle.

This document does **not**:

- select authentication, authorization, hosting, logging, or security technologies;
- define database tables, schemas, policies, migrations, or storage structures;
- provide application code or implementation instructions tied to a framework;
- add public Commune registration, complaint exports, internal notes, attachments, two-way messaging, reopening, or other deferred features;
- define advanced departmental workflows;
- authorize Step 5 or implementation work.

RP-01 through RP-12 have been reviewed and approved by the project owner.

### 1.1 Security-reference posture

Later implementation should be evaluated against current recognized guidance appropriate to the selected architecture, including the [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), and [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html). These references guide security quality; they do not override the frozen project documents or select a technology.

## 2. Core authorization principles

1. **Deny by default:** absence of an explicit grant means access is denied.
2. **Least privilege:** each actor receives only the data and actions required for their purpose.
3. **Ownership isolation:** a Citizen can access only their own private account, complaints, responses, and notifications.
4. **Server-side enforcement:** interface visibility is not authorization. Every protected read and write must be checked at a trusted server/backend/data boundary.
5. **State-aware enforcement:** authorization includes the current complaint state and the frozen transition matrix, not only the actor's role.
6. **Data minimization:** personal data is disclosed only where operationally necessary.
7. **Separation of authority:** routine complaint work, exceptional corrections, staff administration, and technical maintenance do not automatically share authority.
8. **Revocation:** disabled accounts lose access promptly while historical attribution is preserved.
9. **Auditability:** important access-affecting, administrative, and complaint-processing actions are attributable and reviewable.
10. **No implied superuser:** administrator status does not imply unrestricted database, infrastructure, or secret access.
11. **Fail closed:** unavailable or uncertain authorization state must not grant access.
12. **No security by obscurity:** predictable references, hidden buttons, changed labels, or undocumented endpoints must never be treated as access controls.

## 3. Supporting design context inspected

The following designs were reviewed only as UI context. They do not override the frozen documents or establish permissions by themselves.

| Design | Security/permission context |
| --- | --- |
| [`design/Citizens/07-account.jpg`](../design/Citizens/07-account.jpg) | Citizen profile, password/language navigation, and sign-out; disabled and permission states are absent. |
| [`design/Commune/02-complaints.jpg`](../design/Commune/02-complaints.jpg) | A shared complaint list exposes Citizen identity, assignment, and statuses without role-specific visibility variants. |
| [`design/Commune/03-complaint-details.jpg`](../design/Commune/03-complaint-details.jpg) | Citizen identity/contact, assignment, lifecycle/response controls, and history appear together; an out-of-MVP internal-note control is present. |
| [`design/Commune/04-employees.jpg`](../design/Commune/04-employees.jpg) | Staff list, roles, and edit actions are shown without a complete account-state or authority model. |
| [`design/Commune/05-categories-locations.jpg`](../design/Commune/05-categories-locations.jpg) | Canonical-data editing is shown without role-specific controls; complaint-state wording is incorrectly reused. |
| [`design/Commune/06-settings.jpg`](../design/Commune/06-settings.jpg) | Operational, language, privacy, and notification settings appear in one administration area without authority separation. |

## 4. Roles evaluated

### 4.1 Anonymous Visitor

**Purpose:** Understand the public service, access public information, create a Citizen account, verify it, or sign in.

**Allowed areas and data:**

- public pages and approved public content;
- Citizen registration, email verification, sign-in, and recovery entry points;
- public category/service-scope information and official contact details.

**Prohibited:**

- any private complaint, Citizen profile, notification, Commune area, staff record, audit information, unpublished content, or administrative action;
- complaint submission before successful Citizen authentication;
- using a complaint reference to discover whether a private complaint exists.

**Administrative/lifecycle authority:** None.

### 4.2 Citizen

**Purpose:** Manage their own account, submit local complaints, privately follow them, and receive Commune responses.

**Allowed areas and data:**

- own profile, preferred language, password actions, sessions, and notifications;
- create a complaint and view/search/filter only their own complaints;
- edit or withdraw only their own complaint while it is `SUBMITTED`;
- view their own Citizen-facing history, `NOT_ACCEPTED` explanation, Commune response and corrections, and closure information.

**Prohibited:**

- another Citizen's profile, complaint, response, notification, or existence metadata;
- Commune administration, staff records, settings, canonical-data management, security logs, or internal audit data;
- direct lifecycle changes other than the frozen `SUBMITTED` → `WITHDRAWN` owner action;
- edit or withdrawal from `UNDER_REVIEW` onward;
- modifying a Commune response, reopening a terminal complaint, or hard-deleting a submitted complaint;
- searching or enumerating other Citizens.

**Administrative authority:** None.

**Lifecycle authority:** Creation enters `SUBMITTED`; confirmed withdrawal may enter `WITHDRAWN` only while ownership and current state are both verified.

### 4.3 Commune Agent / Employee

**Purpose:** Collaboratively process the Commune team's shared complaint workload.

**Approved access scope:**

- view all complaints and full complaint details in the authenticated Commune complaint area;
- view the Citizen name, verified email, optional phone, complaint content, and complaint location necessary for complaint handling;
- search/filter the shared complaint workload;
- view per-action complaint history;
- perform approved normal lifecycle actions on any complaint when the frozen lifecycle permits: begin review, enter processing, issue the Commune response, and close after `RESPONSE_SENT`;
- enter `NOT_ACCEPTED` with its mandatory controlled reason and Citizen-facing explanation;
- perform controlled response correction with complete version/history preservation;
- continue processing work started by another authorized Agent without claiming or assignment;
- receive operational notifications relevant to the shared complaint workload.

**Prohibited:**

- no staff, role, account-state, category, location, settings, public/legal-content, or security administration;
- no editing of original Citizen-submitted complaint facts;
- no hard deletion, reopening, invalid lifecycle transition, internal note, export, or infrastructure access.

Agents do not assign, self-assign, reassign, claim, or permanently own complaints because those actions are not part of the MVP workflow. Accountability comes from the audit attribution of every meaningful action.

### 4.4 Commune Administrator

**Purpose:** Supervise complaint operations and administer the Commune-facing product within approved business authority.

**Approved access scope:**

- view all Commune complaints, their per-action operational history, and Citizen information where necessary;
- perform all valid complaint lifecycle actions;
- issue responses, close complaints, mark `NOT_ACCEPTED` with a controlled reason/explanation, and perform controlled response corrections;
- view and manage Commune staff accounts within the restrictions in section 10;
- manage categories, locations, operational settings, and approved public content;
- access the administrative audit views necessary for oversight and investigation.

**Prohibited or restricted:**

- no automatic database, hosting, deployment, secret, source-code, or infrastructure authority;
- no invalid lifecycle transitions, reopening, hard deletion, silent response overwrite, or alteration/deletion of audit history;
- no collection or access to personal data without operational, support, security, or legal necessity;
- no publication of unapproved legal/privacy wording merely because the account is an administrator.

### 4.5 Technical Administrator evaluation

A routine Technical Administrator role inside the MVP application is not included.

Technical maintenance may require production operational access, but that access should use separate technical identities and controls selected in Step 5. It must not automatically grant routine access to private complaint content or Commune business functions.

If exceptional support access to production data is genuinely required, it should be:

- explicitly approved for a defined support purpose;
- limited in scope and time;
- read-only where possible;
- masked or anonymized where possible;
- auditable, attributable, and reviewed;
- revoked when the support purpose ends.

No application-level complaint superuser capability is implied. Exact exceptional technical-access controls belong to Step 5.

## 5. Authorization scopes used in this model

| Scope | Meaning |
| --- | --- |
| Public | Approved information intentionally available without authentication. |
| Own | The authenticated Citizen is the verified owner of the resource. |
| Shared Commune workload | All complaints and full complaint details available to authenticated, authorized complaint-handling Agents; no individual assignment boundary applies. |
| All Commune complaints | All complaints within the Commune application, subject to data-minimization and purpose restrictions. |
| Administrative | Staff, canonical data, settings, public content, or audit oversight explicitly granted to a Commune Administrator. |
| Exceptional support | Approved, time-bounded technical support access; never routine product access. |

Ownership, role, account status, complaint state, requested action, and resource scope must all be evaluated together. A role label alone is insufficient.

## 6. Approved complaint permission matrix

“Agent” means an active, authenticated account authorized for complaint handling. Complaint access is team-wide and is not conditioned on assignment, prior action, or permanent responsibility. “Admin” means Commune Administrator business access, not technical infrastructure access.

| Action | Anonymous | Citizen | Commune Agent | Commune Administrator | Technical maintenance |
| --- | --- | --- | --- | --- | --- |
| Create complaint | No | Yes | No | No | No |
| View complaint | No | Own only | All complaints/full details | All Commune complaints | No routine access |
| Search/filter complaints | No | Own only | Shared Commune workload | All Commune complaints | No |
| Edit Citizen-submitted complaint facts | No | Own + `SUBMITTED` only | No | No | No |
| Withdraw complaint | No | Own + `SUBMITTED` only | No | No | No |
| Hard-delete submitted complaint | No | No | No | No | No |
| View Citizen name | No | Own profile | All complaints when needed for handling | Operationally necessary complaints | No routine access |
| View Citizen email/optional phone | No | Own profile | All complaints when needed for handling | Operational/support necessity | No routine access |
| View Citizen account/security metadata | No | Limited own account information | No | Only where needed for account/security administration | Exceptional support only if approved |
| View complaint history | No | Own Citizen-visible history | All complaint per-action history | Full authorized administrative history | No routine access |
| Mark `UNDER_REVIEW` | No | No | Any valid complaint | Yes | No |
| Move to `IN_PROCESSING` | No | No | Any valid complaint | Yes | No |
| Issue response / enter `RESPONSE_SENT` | No | No | Any valid complaint | Yes | No |
| Close from `RESPONSE_SENT` | No | No | Any valid complaint | Yes | No |
| Mark `NOT_ACCEPTED` | No | No | Any lifecycle-valid complaint, with reason/explanation | Yes, with reason/explanation | No |
| Correct issued response | No | No | Yes, controlled and audited | Yes, controlled and audited | No |
| Reopen terminal complaint | No | No | No | No | No |
| Assign/reassign/claim complaint | No | No | Not an MVP action | Not an MVP action | No |
| View security/administrative audit | No | No | No | Authorized administrative scope | Separate technical audit only if approved |

No matrix grant overrides the frozen lifecycle. A transition must be both role-authorized and valid from the complaint's current state.

## 7. Lifecycle-aware authorization

The authoritative lifecycle remains:

```text
SUBMITTED → UNDER_REVIEW → IN_PROCESSING → RESPONSE_SENT → CLOSED
SUBMITTED → WITHDRAWN
UNDER_REVIEW → NOT_ACCEPTED
IN_PROCESSING → NOT_ACCEPTED
```

Authorization must enforce all of the following:

- Citizen edit and withdrawal require verified ownership and current state `SUBMITTED`.
- Entry to `UNDER_REVIEW` immediately removes Citizen edit and withdrawal authority.
- Only a valid Commune action may enter `UNDER_REVIEW`, `IN_PROCESSING`, `RESPONSE_SENT`, `CLOSED`, or `NOT_ACCEPTED`.
- `IN_PROCESSING` → `CLOSED` is always denied; normal closure requires `RESPONSE_SENT`.
- `NOT_ACCEPTED` requires a controlled reason and Citizen-facing explanation.
- `CLOSED`, `WITHDRAWN`, and `NOT_ACCEPTED` have no outgoing lifecycle transitions.
- Response correction changes neither the current lifecycle state nor terminal status.
- Viewing or a failed action cannot alter lifecycle state.
- No role, including Commune Administrator, may bypass the frozen transition matrix.

Authorization checks and state changes must behave as one trusted decision: a state change must not succeed if ownership where applicable, account status, role/scope, transition, or mandatory input validation fails. No assignment check applies to authorized Commune Agents.

## 8. Citizen account permissions

- A verified active Citizen may view and edit approved own profile fields, manage preferred language, change password, sign out, and use safe account recovery.
- Changing the login email, if approved, must verify control of the new email before it becomes the login identifier and must not silently bypass existing-account or session protections.
- Citizen profile access must be isolated exactly like complaint ownership; changing an identifier in a request must not expose another profile.
- Citizen notification lists, unread counts, links, and mark-read actions are restricted to the authenticated Citizen's own notification records.
- Account recovery and registration responses must resist account enumeration.
- Account deletion is not an approved MVP action. Any future deactivation must preserve complaints, responses, consent evidence, and audit history according to approved retention rules.

## 9. Commune complaint operations

### 9.1 Approved routine Agent authority

For every complaint in the shared Commune workload, an authorized Commune Agent may:

- view the complaint and operational history;
- see the Citizen name, verified email, optional phone, complaint content, and location needed to investigate or coordinate real-world handling;
- begin review, enter processing, compose and issue the response, and close after `RESPONSE_SENT`;
- enter `NOT_ACCEPTED` with the mandatory controlled reason and Citizen-facing explanation;
- perform controlled response correction under the frozen rules;
- search/filter all complaints and receive relevant operational notifications;
- continue work performed by another Agent without claiming the complaint.

Agents cannot change the original Citizen submission, assign/claim work, reopen cases, hard-delete complaints, or administer the platform. Every meaningful Agent action is individually attributable in audit/history.

### 9.2 Administrator authority

A Commune Administrator should be able to:

- view and supervise all complaints;
- perform routine lifecycle actions when operationally necessary;
- enter `NOT_ACCEPTED` with an approved reason and explanation;
- perform controlled response corrections;
- close a complaint only after `RESPONSE_SENT`;
- review complaint-related audit history.

Administrator involvement is not required for normal complaint processing. Administrative authority does not allow lifecycle bypass, hard deletion, hidden response replacement, or use of internal notes.

## 10. Commune staff account management

### 10.1 Approved authority

Commune Administrator is the only routine application role that should:

- view the staff list;
- create administratively provisioned Agent accounts;
- edit approved staff profile/basic data;
- assign the Agent role;
- activate or disable Agent accounts;
- initiate a secure staff recovery process without viewing or setting an existing password.

Granting or revoking Commune Administrator status requires authorization from the designated Commune/project authority. This governance requirement does not create another application role. An Administrator must not be able to conceal their own actions, create an unrestricted technical superuser, or leave the Commune without any recoverable authorized administrator.

### 10.2 No public Commune registration

- Public registration creates Citizen accounts only.
- Commune accounts are created through an authorized administrative process.
- No staff password may be displayed, recovered in plaintext, emailed as a reusable credential, or visible to another administrator.

## 11. Category and location management

| Action | Anonymous/Citizen | Commune Agent | Commune Administrator |
| --- | --- | --- | --- |
| Read active localized values where used by the product | Yes, in context | Yes | Yes |
| View inactive/admin metadata | No | No; preserved historical labels remain visible within complaints | Yes |
| Create | No | No | Yes |
| Edit localized labels/configuration | No | No | Yes |
| Activate/deactivate | No | No | Yes |
| Permanently delete historical value | No | No | No |

Management actions require validation, explicit success/failure feedback, and audit history. Editing or deactivation must not silently alter the historical category/location information of existing complaints. These permissions do not decide storage design.

## 12. Operational settings and public content

### 12.1 Operational settings

Only a Commune Administrator should manage Commune contact details, address, opening hours, approved Chikaya.ma link, supported configuration, and other operational settings. Supported MVP languages cannot be disabled without an approved scope change.

### 12.2 Public and legal/informational content

Public Content / Legal & Information remains a secondary Settings area. Routine Agents should not access it.

The approved MVP model is:

- Commune Administrator may edit and publish approved public information;
- privacy- or legal-sensitive wording must receive appropriate organizational/legal review before production;
- the application must not imply that Administrator access itself constitutes legal approval;
- publication and material edits are auditable.

MVP does not include a dedicated legal approval workflow, separate content-approver role, or top-level legal-content dashboard area.

## 13. Notification authorization

- Anonymous visitors cannot access private notifications.
- Citizens can list, count, open, and mark read only their own notifications.
- Commune Agents receive and access operational complaint notifications for the shared Commune workload.
- Commune Administrators may receive broader complaint-operation and administration notifications within their duties.
- Technical maintenance has no routine application notification access.
- A notification must never reveal a complaint reference, subject, Citizen identity, status, response, or link unless the recipient is currently authorized for the referenced resource.
- Revoked resource access also revokes access through old notification links. The notification may show a safe unavailable result without confirming protected details.
- Notification delivery must not become an alternative route around complaint authorization.

## 14. Data visibility and privacy

### 14.1 Data-minimization matrix

| Data | Citizen | Commune Agent | Commune Administrator | Technical maintenance |
| --- | --- | --- | --- | --- |
| Citizen name | Own | All complaints when needed for handling | Operational/account necessity | Masked by default |
| Citizen email | Own | All complaints when needed for handling | Operational/account necessity | Masked by default |
| Optional phone | Own | All complaints when needed for handling | Operational necessity | Masked by default |
| Complaint content/location | Own complaint | All complaints | All complaints for oversight | No routine access |
| Citizen-facing response | Own complaint | All complaints | All complaints for oversight | No routine access |
| Account verification/status metadata | Limited own information | No | Account/security necessity | Exceptional support only |
| Internal operational history | No | All complaint per-action history within duties | Authorized oversight | No routine access |
| Security/audit information | No | No | Authorized administrative view | Separate technical view if approved |

### 14.2 Privacy requirements

- Personal data must be collected, displayed, searched, copied, logged, and retained only for an approved purpose.
- Shared complaint lists should avoid exposing email and phone and should minimize Citizen identity where not required for routing.
- Interfaces should avoid exposing technical account IDs, authorization attributes, session identifiers, or infrastructure details.
- Application, security, diagnostic, and support logs must not contain passwords, recovery secrets, session secrets, full complaint bodies, or unnecessary personal/contact data.
- Debugging and support should use masked, synthetic, or minimized data wherever possible.
- Exports remain out of MVP. No permission in this document authorizes export or bulk personal-data extraction.
- Error messages, URLs, page metadata, notifications, and search suggestions must not leak private complaint or account data.

## 15. Account status and access revocation

### 15.1 Commune accounts

The recommended MVP authorization states are:

- `ACTIVE` — the account may authenticate and exercise its granted role/scope.
- `DISABLED` — authentication and administration access are denied; existing sessions must cease to authorize further actions.

Disabling an account must preserve its historical actions, transitions, responses, corrections, and audit attribution. Because complaints are not assigned, disabling does not transfer complaint ownership. Any invitation or pending-activation condition required by the future authentication design is not defined as an authorization role here.

### 15.2 Citizen accounts

The minimum conceptual conditions are:

- `UNVERIFIED` — registration exists but the account is not usable until the required initial email verification succeeds;
- `ACTIVE` — the verified Citizen may use approved account and complaint functions;
- `DISABLED` — access is denied and existing sessions cease to authorize actions, while complaints and history remain preserved.

Citizen disabling is not a general moderation feature. A Commune Administrator may disable access only for a documented account-security, compromised-account, confirmed-abuse, or legal/administrative reason. Disabling records reason, actor, and timestamp and preserves the account, complaints, lifecycle history, responses, and audit records. Self-service account deletion remains out of MVP.

## 16. Authentication security requirements

- Citizen email must be verified once before the account becomes usable.
- Passwords must never be stored or logged in plaintext or reversibly recoverable form; later implementation must use an appropriate one-way password-storage mechanism.
- Password input, reset credentials, verification credentials, session credentials, and recovery secrets must be protected in transit and at rest as applicable.
- Password rules should support long passphrases, reject commonly compromised values, avoid unjustified composition rules, and provide understandable multilingual guidance. Exact parameters belong to Step 5 review against current standards.
- Authentication, verification, and recovery endpoints require rate limiting and reasonable automated-abuse protection.
- Sign-in and recovery responses must avoid revealing whether an account exists where disclosure is unnecessary.
- Recovery authorization must be single-use or otherwise replay-resistant, time-limited, and invalid after successful use.
- Password reset must revoke existing sessions. Password change must revoke other sessions or offer equivalent protection; the current session may continue only after appropriate reauthentication.
- Logout and account disabling must invalidate authorization promptly rather than relying on removal of interface elements.
- Sessions must be unpredictable, protected from theft/reuse, expire appropriately, and be revalidated for sensitive actions. Exact mechanism and durations belong to Step 5.
- Authentication and session failures must be logged safely without passwords, secrets, or unnecessary personal data.
- Administrative authentication requires strong password, recovery, session, rate-limiting, enumeration-resistance, revocation, and logging controls. Multi-factor authentication is not mandatory for Citizens, Commune Agents, or Commune Administrators in the first MVP release. The future architecture must not prevent MFA from being added later, but no MFA technology is selected here.

## 17. Authorization security requirements

Frontend visibility is **not authorization**.

Every protected page, query, object read, search, notification, and state-changing operation must be authorized at a trusted server/backend/data boundary using the authenticated actor, active account status, resource scope, Citizen ownership where applicable, requested action, and current complaint state. Commune Agent complaint authority is not assignment-based.

The system must protect against:

- direct access to guessed or copied URLs;
- modified complaint, Citizen, staff, notification, category, location, or settings identifiers;
- manipulated request bodies, hidden fields, role values, ownership values, or lifecycle state values;
- horizontal privilege escalation between Citizens and unauthorized access outside the authenticated Commune complaint-handling role;
- vertical privilege escalation from Citizen to Commune, Agent to Administrator, or application administrator to technical infrastructure;
- stale sessions retaining access after account disabling or permission change;
- bulk-list/search endpoints returning unauthorized records;
- notification links bypassing resource checks.

Changing a complaint identifier in a URL or request must never allow Citizen A to read, infer, modify, withdraw, or otherwise act on Citizen B's complaint. The same rule applies even if the frontend never displays the altered identifier.

Authorization failures must not partially apply an action. For private resources, the eventual not-found versus permission-denied behavior must avoid confirming existence to an unauthorized user.

## 18. Input and application security

- Treat all browser, API, imported configuration, email-link, URL, search, profile, complaint, response, settings, and administrative input as untrusted.
- Validate input against the frozen business rules and reject unexpected fields or invalid state changes.
- Encode or sanitize output appropriately for its context to prevent script/content injection while preserving legitimate Arabic, French, and English text.
- Protect against injection in every eventual query, command, template, and integration boundary.
- Protect state-changing operations from cross-site request forgery or equivalent unauthorized cross-context execution where applicable.
- Apply secure transport and appropriate browser/security headers in the future architecture.
- Prevent open redirects through sign-in, recovery, verification, and notification destinations.
- Enforce size and rate limits appropriate to authentication, search, complaint submission, response, settings, and administrative endpoints.
- Return safe localized errors without stack traces, secrets, queries, internal paths, infrastructure details, or unnecessary personal data.
- Do not trust client clocks, client-provided roles, ownership claims, complaint-access claims, or lifecycle state.
- Record and monitor meaningful authentication abuse, authorization failures, and sensitive administrative failures without logging sensitive payloads.

## 19. Auditability

### 19.1 Events requiring audit

- successful and denied sensitive authentication/authorization events where useful for security review;
- Citizen complaint edit and withdrawal;
- complaint review start;
- every lifecycle transition;
- response issuance and closure;
- `NOT_ACCEPTED` reason and explanation;
- every response correction and preserved version;
- staff account creation, role change, activation, disabling, and recovery initiation;
- category/location creation, edit, activation, and deactivation;
- Citizen account disabling;
- operational settings changes;
- public/legal-content edit and publication;
- exceptional technical/support access to production data.

### 19.2 Minimum conceptual event information

Where appropriate, an audit event should identify:

- actor or trusted system source;
- actor role at the time of action where appropriate;
- action;
- timestamp;
- affected resource type and stable reference;
- outcome, including denied/failed where relevant;
- relevant before/after values or change summary;
- required business reason;
- originating security/session context in a privacy-minimized form.

Audit records must be protected from ordinary user alteration, silent overwrite, and unauthorized disclosure. Audit access itself must be authorized and auditable. Passwords, session secrets, recovery tokens, and unnecessary complaint/personal content must not enter audit logs. Exact event structures, retention, integrity mechanism, and storage belong to Steps 5 and 6.

### 19.3 Collaborative-work integrity

Per-action audit history is the accountability mechanism for the shared complaint workload. It must make clear when different Agents perform successive actions on the same complaint; no permanent responsible-Agent field is required.

Because multiple Agents may view and act on one complaint, a later action based on stale information must not silently overwrite a newer confirmed action. If Agent A changes a complaint after Agent B loaded it, Agent B's later stale action must be detected and safely rejected or reconciled rather than replacing Agent A's action. The user must receive safe feedback and the confirmed newer state must remain intact. Exact concurrency mechanism and representation belong to Steps 5 and 6.

## 20. Response-correction security

The frozen lifecycle permits correction without reopening or changing state. Any authenticated, authorized Commune Agent or Commune Administrator may perform a controlled response correction.

- Correction requires explicit confirmation and a non-empty reason.
- The original response and every prior corrected version remain preserved.
- Actor and timestamp are recorded for every correction.
- The corrected response becomes authoritative only after successful confirmation.
- The Citizen is notified through the existing response-notification category where appropriate.
- Correction cannot change complaint facts, lifecycle, terminal status, or audit history.
- A new operational issue is not a correction and requires a new complaint under the frozen lifecycle.

Authorization, confirmation, complete version preservation, and per-action attribution limit abuse and accidental rewriting of an official response. Storage/versioning remains Step 6.

## 21. Security invariants

- **SEC-INV-01:** Citizen A can never read or infer Citizen B's complaint.
- **SEC-INV-02:** A Citizen cannot directly set or otherwise manipulate complaint lifecycle state.
- **SEC-INV-03:** A Citizen cannot edit or withdraw a complaint from `UNDER_REVIEW` onward.
- **SEC-INV-04:** A disabled Commune account cannot authenticate or continue accessing administration through an existing session.
- **SEC-INV-05:** No user can gain permissions by changing frontend controls, URLs, identifiers, requests, hidden fields, or client-held role/state data.
- **SEC-INV-06:** A terminal complaint cannot be reopened by any MVP action or unauthorized request.
- **SEC-INV-07:** Original Commune responses, corrected versions, lifecycle history, and audit attribution cannot be silently overwritten.
- **SEC-INV-08:** Private complaint content is never publicly accessible or indexable.
- **SEC-INV-09:** A notification cannot expose a complaint or account the recipient is not authorized to access.
- **SEC-INV-10:** Normal closure cannot occur unless the complaint is in `RESPONSE_SENT` with an issued response.
- **SEC-INV-11:** `NOT_ACCEPTED` cannot occur without an approved controlled reason and Citizen-facing explanation.
- **SEC-INV-12:** No role can hard-delete a submitted complaint through MVP behavior.
- **SEC-INV-13:** Commune Administrator business authority does not automatically grant infrastructure, database, secret, or source-code access.
- **SEC-INV-14:** Passwords, session secrets, verification/recovery secrets, and reusable credentials never appear in logs or interfaces.
- **SEC-INV-15:** Disabling an account preserves historical actor attribution and cannot erase prior actions.
- **SEC-INV-16:** Failed or unauthorized operations cannot partially apply or appear as successful.
- **SEC-INV-17:** Authorization applies consistently to detail views, lists, searches, counts, notifications, and direct object access.
- **SEC-INV-18:** Every meaningful Commune complaint action is attributable to the acting account; accountability must not depend on permanent assignment.
- **SEC-INV-19:** Any authorized Commune Agent may continue valid work started by another Agent without claiming the complaint.
- **SEC-INV-20:** A stale action from one Agent cannot silently overwrite a newer confirmed action from another Agent.

## 22. Design implications

Future design completion must preserve the existing visual system while adding:

- role-specific Commune navigation and action availability;
- shared-workload complaint views for authorized Agents without assignment/claim controls;
- safe permission-denied, authentication-required, expired-session, and unavailable-resource states;
- disabled-account and access-revoked states;
- clear lifecycle-action prerequisites and confirmation for terminal/sensitive actions;
- administrator-only staff, canonical-data, settings, public-content, Citizen-disabling, and administrative-audit controls;
- Agent-accessible lifecycle, `NOT_ACCEPTED`, response, response-correction, and closure controls when lifecycle-valid;
- clear indicators when an action is unavailable because of lifecycle state rather than permission;
- privacy-conscious Citizen identity/contact presentation;
- recent-authentication or stronger-authentication prompts for sensitive actions if required by the approved security policy.

Hiding or disabling an unauthorized control is required for understandable UX, but it does not replace trusted authorization. Protected routes and operations must remain denied even when invoked directly.

### 22.1 Design/security gaps and contradictions

| ID | Finding | Required treatment |
| --- | --- | --- |
| DSG-01 | Commune complaint list exposes Citizen names, while contact-field minimization and authenticated-staff boundaries are not visually explained. | All authorized Agents may access full complaints, but dense tables should avoid unnecessary contact fields and remain private to authenticated Commune staff. |
| DSG-02 | Complaint detail combines identity/contact, assignment, status, response, and internal-note controls. | Remove assignment/responsible-Agent and internal-note controls; retain authorized Agent actions and per-action history. |
| DSG-03 | Staff, canonical-data, and settings navigation appears uniformly available. | Add role-specific navigation and deny protected routes directly. |
| DSG-04 | No Commune sign-in, stronger-authentication, disabled-account, expired-session, or permission-denied screens are supplied. | Extend the established form/system-state language after policy approval. |
| DSG-05 | Employee rows use complaint-state wording and do not show a valid `ACTIVE`/`DISABLED` model. | Replace with approved account-state terminology. |
| DSG-06 | Settings combine operational and legal/privacy content without review/context cues. | Keep content secondary under Administrator management and communicate that legal/privacy wording requires organizational/legal review. |
| DSG-07 | No response-correction history/control is represented. | Add an Agent-accessible, controlled, auditable correction flow using existing response/history patterns. |
| DSG-08 | Complaint lists/details contain assigned employee, responsible employee, and assignment/reassignment concepts. | Remove/adapt these concepts; emphasize current status, latest action, and Agent/action history while preserving the established visual system. Exact replacement UI remains later design work. |

## 23. Project-owner-approved decisions

RP-01 through RP-12 have been reviewed and approved by the project owner.

| ID | Status | Approved decision |
| --- | --- | --- |
| RP-01 | **APPROVED** | All authorized Commune Agents may view all complaints and full complaint details. Assigned-only visibility and minimized shared queues are not authorization boundaries. |
| RP-02 | **APPROVED** | All authorized complaint-handling Agents may view the Citizen name, verified email, optional phone, complaint content, and complaint location needed for processing. Public/other-Citizen access remains prohibited, and tables may omit unnecessary contact fields for privacy-conscious UX. |
| RP-03 | **APPROVED — CHANGED** | Mandatory assignment, self-assignment, reassignment, claiming, responsible-Agent ownership, and permanent employee ownership are removed from MVP. Complaints belong operationally to the Commune team; per-action audit history provides accountability. |
| RP-04 | **APPROVED** | Any authorized Commune Agent may perform lifecycle-valid normal actions on any complaint and continue another Agent's work, including review, processing, response issuance, and closure. Every action is individually audited. |
| RP-05 | **APPROVED — MODIFIED** | Any authorized Commune Agent may enter `NOT_ACCEPTED` when lifecycle-valid, with the mandatory controlled reason, Citizen-facing explanation, actor, timestamp, and audit event. Administrator involvement is not required. |
| RP-06 | **APPROVED — MODIFIED** | Any authorized Commune Agent may correct an issued response. Original and corrected versions, mandatory reason, correcting Agent, and timestamp are preserved; correction never reopens or changes lifecycle state. |
| RP-07 | **APPROVED** | No routine application-level Technical Administrator role exists in MVP. Exceptional technical access, if needed, remains separate, restricted, operationally justified, and audited. |
| RP-08 | **APPROVED** | Commune Administrators manage Agent accounts and normal Agent access. Ordinary Agents cannot manage staff or roles. Granting/revoking Administrator status requires designated Commune/project authority without creating another application role. |
| RP-09 | **APPROVED** | Commune Administrators manage public/informational content in secondary Settings. Legal/privacy wording receives organizational/legal review before production; no dedicated approval workflow, content-approver role, or top-level legal area is added. |
| RP-10 | **APPROVED** | Commune Administrators may disable Citizen access for legitimate security, compromised-account, confirmed-abuse, or legal/administrative reasons. Reason, actor, and timestamp are recorded; no account, complaint, lifecycle, response, or audit data is deleted. |
| RP-11 | **APPROVED** | Citizens may change their login email after reauthentication and verification of the new email. The new email becomes authoritative only after verification; exact session/token handling is Step 5. |
| RP-12 | **APPROVED FOR CURRENT MVP** | MFA is not mandatory for Citizens, Agents, or Administrators in the first MVP. Strong authentication fundamentals remain required, and the architecture must allow future MFA without selecting an MFA technology in Step 4. |

No genuine Step 4 project-owner policy decision remains open after RP-01 through RP-12. Future changes must not silently alter the approved decisions.

## 24. Validation checklist

- The frozen Scope and Functional Specification retain **APPROVED / FROZEN** status with traceable owner-approved collaborative-processing amendments. The frozen Complaint Lifecycle was not changed.
- Citizen complaint ownership isolation is explicit and non-negotiable.
- Frontend-only authorization is explicitly prohibited.
- The matrix combines role, Citizen ownership where applicable, account state, action, and lifecycle state; Commune complaint access is not assignment-based.
- Least privilege and data minimization apply to Citizen identity/contact data.
- The frozen lifecycle and terminal-state rules are unchanged.
- `SUBMITTED` is the only state in which the Citizen may edit or withdraw.
- No role can hard-delete a submitted complaint or reopen a terminal complaint.
- Response correction is available to authorized Agents, version-preserving, reasoned, attributable, and state-neutral.
- Commune Administrator does not imply technical/database superuser access.
- Notifications cannot bypass complaint authorization.
- Disabled accounts lose access while historical attribution remains.
- MFA is not required in the current MVP, and future MFA remains architecturally possible.
- Shared-workload integrity requires stale actions to be detected/prevented from silently overwriting newer Agent actions.
- No public Commune registration, internal notes, exports, attachments, two-way messaging, or other new feature was introduced.
- No technology stack, database/schema/migration, or application code was selected or created.

## 25. Approval boundary

This document is **APPROVED / FROZEN** and is the authoritative MVP roles, permissions, privacy, authorization, auditability, and security-policy baseline for Abaynou Tatawasal. Future changes require explicit project-owner approval and must remain consistent with the governing frozen documents identified in Document control.

Step 5 — Technical Architecture must not begin automatically.
