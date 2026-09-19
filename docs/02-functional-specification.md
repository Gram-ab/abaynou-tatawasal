# Abaynou Tatawasal — Functional Specification

## Document control

| Field | Value |
| --- | --- |
| Project | Abaynou Tatawasal — أباينو تتواصل |
| Organization | Commune of Abaynou, Morocco |
| Step | Step 2 — Functional Specification |
| Status | **APPROVED / FROZEN** |
| Governing scope | [`docs/01-mvp-scope.md`](01-mvp-scope.md), **APPROVED / FROZEN** |
| Implementation status | Not started |
| Architecture status | Not selected |

### Approved amendment record

| Amendment | Approval | Effect |
| --- | --- | --- |
| FS-AMEND-001 / Scope AMEND-003 | Explicitly approved by the project owner during Step 4 review | Mandatory assignment/reassignment, self-assignment, and permanent responsible-Agent ownership were removed from MVP. All authorized Commune Agents may view and process the shared complaint workload, continue another Agent's work, and perform role/lifecycle-authorized complaint actions. Accountability is based on per-action audit/history attribution. |

## 1. Purpose, authority, and boundaries

**Approval note:** This document is now the authoritative functional-behavior baseline for the Abaynou Tatawasal MVP. Future changes to frozen functional behavior require explicit project-owner approval and must remain consistent with [`docs/01-mvp-scope.md`](01-mvp-scope.md).

This document defines how the features in the frozen MVP scope are expected to behave. It is intended to guide the later complaint-lifecycle, permissions, architecture, data-model, frontend, backend, and test-design steps.

This document does **not**:

- change the approved MVP feature boundary;
- define the authoritative complaint lifecycle or final status mapping;
- define the final role/permission matrix;
- select technologies, services, hosting, or storage;
- define a database schema;
- provide final legal or policy content;
- authorize photo, file, or document attachments.

The frozen exclusions, including the approved amendments, remain binding: photo/file/document attachments, two-way complaint messaging, clarification requests, Citizen replies, conversation threads, an Awaiting Citizen workflow, basic operational statistics, employee workload analytics, SMS, advanced notification automation, advanced analytics/BI, advanced reporting, exports, SLA/deadline tracking, satisfaction surveys, advanced departmental workflows, internal staff notes, advanced search, external APIs, and third-party integrations are all out of MVP.

Requirements use **must** for required MVP behavior and **should** for a preferred behavior that may be refined before this document is frozen. Items marked **OPEN** require the identified later decision and must not be silently inferred during implementation.

## 2. Shared functional conventions

These conventions apply wherever relevant:

- Every page and state must be available in Arabic, French, and English. Arabic is RTL; French and English are LTR.
- Dates, times, numbers, controls, icons, and directional affordances must display correctly for the active locale. The underlying event instant must remain consistent when language changes.
- User-entered text must be displayed as entered; automatic translation of complaint content or Commune responses is not in scope.
- Required fields must be visibly identified. Validation must be understandable, associated with the affected field, and available to assistive technology.
- Leading and trailing whitespace must not make otherwise empty text valid.
- A submit/save/send action must show an in-progress state, prevent accidental duplicate execution, and then show explicit success or failure feedback.
- A failed operation must preserve valid user input whenever it is safe to do so and provide a retry path.
- Destructive or access-affecting actions must communicate their consequence before completion. Exact authorization remains Step 4.
- Private records must not be exposed in navigation, search results, errors, URLs, notifications, or client-side data when the current user is not authorized to access them.
- Stored complaint facts, Commune responses, Citizen withdrawals, and every meaningful Commune action or material state change must have appropriate timestamps and history/audit implications. Each Commune action must be attributable to its acting account, action type, timestamp, affected complaint/resource, relevant previous/new state or value, and required reason where applicable. Exact records and retention are Step 6 decisions.
- Existing design patterns are the visual source of truth. Missing screens and states must reuse the same typography, spacing, green/beige/neutral palette, cards, borders, controls, tables, badges, icons, navigation, and density.

## 3. Public website

Design references: [`design/public/01-home.jpg`](../design/public/01-home.jpg) through [`design/public/07-privacy-policy.jpg`](../design/public/07-privacy-policy.jpg).

### 3.1 Public navigation and session-aware actions

- The global public header must provide routes to Home, How it works, What can be reported, FAQ, Sign in, Create account, and language switching as represented in the designs.
- Contact, User Guide, Privacy Policy, Accessibility, and Terms of Use / Conditions of Use must remain reachable through suitable public navigation, including the footer.
- The logo must return to Home.
- The active primary page must be identifiable visually and programmatically.
- “Create account” must open Citizen registration. “Sign in” must open Citizen sign-in.
- A complaint-submission CTA used by an unauthenticated visitor must lead into the approved Citizen authentication path before private submission. The intended destination must be recoverable after successful authentication where practical; the exact session mechanism is a Step 5 decision.
- When a Citizen is already authenticated, account-oriented CTAs should lead to the Citizen space rather than invite duplicate registration. Exact header labels for this state require design completion.
- Public pages remain available without authentication.
- Internal navigation stays in the same browsing context. The Chikaya.ma link must be clearly identified as an external official service and open the approved external URL without implying that Chikaya.ma is part of Abaynou Tatawasal.
- If a configured public-content value is unavailable, the page must not expose raw placeholders or malformed data; it must show safe fallback content or omit only the affected optional item. Required official contact and scope content must be treated as a configuration/content readiness issue.

### 3.2 Public page behavior

| Page | Required information and behavior | Primary actions and result | Missing/error behavior |
| --- | --- | --- | --- |
| Home | Explain the service, privacy, text-only complaints, Abaynou boundary, high-level steps, example local issues, private follow-up, Commune response, and Chikaya distinction. | Submit complaint routes to the authentication/submission path; How it works and service-scope links route to their pages. | Content-loading failure uses the shared public error pattern; core safety/scope guidance must not be replaced with inaccurate fallback text. |
| How it works | Explain account creation, text description, structured location, review/submission, unique reference, private follow-up, Commune processing, Citizen-visible Commune response, and closure. Status examples are explanatory only until Step 3. | Create-account/submission CTA follows authentication state; related links open FAQ or Contact. | Must not promise response deadlines or unapproved transition rules. Existing clarification/two-way wording must be removed or adapted. |
| What can be reported | Explain local responsibility and geographic tests, suitable issue examples, exclusions, emergency warning, and alternative-channel guidance. Category examples must ultimately come from or remain consistent with the approved canonical catalogue. | Submission CTA starts the approved path; Chikaya/other-channel links open the intended official destination. | If category content cannot load, retain scope and emergency guidance and show a recoverable error for the catalogue. |
| FAQ | Present questions and answers concerning account access, privacy, attachments, location scope, Chikaya, submission follow-up, duplicates, emergencies, and the approved pre-processing edit/withdrawal rule. It must not describe Citizen replies or clarification requests as MVP behavior. | Expand/collapse controls must work by pointer and keyboard and communicate expanded state. Contact CTA opens Contact. | A failed dynamic-content load must show an error with retry; no answer may invent unresolved lifecycle details. |
| Contact | Display approved Commune phone, email, address, and opening hours. Values that are actionable should invoke the corresponding device/browser action. | Phone and email links use the displayed approved values. | Missing or invalid required contact values must be flagged for administration and must not produce broken links. |
| User Guide | Provide a complete, navigable explanation of registration, one-time email verification, submission, scope, pre-processing edit/withdrawal, follow-up, Commune response, privacy, and where to seek help. | Links route to the relevant public/authenticated page. | Final content is pending; the current short design is incomplete. |
| Privacy Policy | Display approved privacy content with an effective/revision date when provided. | Related account, contact, or rights-request routes are shown only when approved. | Final legal/privacy text and retention rules require review; no provisional text may be presented as legally approved. |
| Accessibility | Explain accessibility support and the approved method for reporting an accessibility problem or requesting assistance. | Contact/help action routes to the approved channel. | Dedicated design and final content are missing. |
| Terms of Use / Conditions of Use | Display the approved terms that correspond to registration acceptance, including an effective/revision date when provided. | Registration can link here without losing entered registration data. | Dedicated design and final legal content are missing. |
| Sign in | Open Citizen sign-in as specified in section 4. | Successful sign-in enters the Citizen space or the safe intended destination. | Authentication errors remain private and actionable. |
| Create account | Open Citizen registration as specified in section 4. | Successful registration follows the approved verification/session behavior. | Validation and account-conflict behavior must not disclose unnecessary account information. |

### 3.3 Public informational content

- Informational pages are read-only to visitors.
- Content must have a clear page title, headings, readable text structure, and consistent public header/footer.
- Final legal wording and official production contact values require appropriate Commune review before publication.
- The Accessibility and Terms pages must follow the same visual structure as Privacy and the other public informational pages.
- The Commune owns public informational content. Management of legal/informational content must live in a secondary administration area such as Settings → Public Content / Legal & Information, not as a top-level operational section competing with complaint handling.

## 4. Citizen authentication and account

Design references: [`design/Citizens/09-login.jpg`](../design/Citizens/09-login.jpg), [`design/Citizens/10-create-account.jpg`](../design/Citizens/10-create-account.jpg), and [`design/Citizens/07-account.jpg`](../design/Citizens/07-account.jpg).

### 4.1 Approved identity and verification policy

- Email is required for Citizen registration, login, and account recovery.
- Phone number is optional contact information only. Phone authentication/login is not part of MVP.
- Email verification is required once when the Citizen first creates the account: Create account → verification email → Citizen verifies account → account becomes usable.
- A verified Citizen is not asked to verify again when submitting each complaint.
- The designs' combined “phone number or email” login wording is superseded and must be changed to email-specific wording while preserving the existing authentication visual structure.

### 4.2 Create account

**Actor and entry:** An anonymous visitor enters from public navigation, a submission CTA, or the sign-in screen.

**Displayed content:** Service identity, privacy assurance, link to Sign in, language switch, links to Privacy Policy and Terms of Use / Conditions of Use.

| Field | Requirement | Validation |
| --- | --- | --- |
| Full name | Required. | Non-empty after trimming; accepted character rules must support Arabic, French, and English names and must not impose an unjustified Latin-only pattern. |
| Email | Required login and recovery identifier. | Must have valid email form. Normalization and uniqueness enforcement remain Step 4–6 decisions. |
| Phone number | Optional contact information; never an MVP login identifier. | If provided, validate as a phone contact value. Exact normalization remains Step 5/6. |
| Password | Required. | Must meet the security policy approved in Step 4; requirements must be visible before submission and errors must not expose the password. |
| Terms/privacy acceptance | Required unchecked confirmation in the current design. | Registration cannot complete until the approved terms/privacy acknowledgement is given. Version/evidence requirements are Step 4 and Step 6 decisions. |

- Submit remains available once fields can be evaluated; invalid submission focuses/summarizes errors and marks each affected field.
- During submission, controls prevent duplicate creation.
- On successful account creation, show confirmation that a verification email was sent and instruct the Citizen to verify the account. After successful verification, the account becomes usable and the Citizen can sign in.
- Verification is not repeated for complaint submission.
- On conflict or failure, messaging must be useful without enabling account enumeration. Valid non-secret input should be retained; passwords should not be repopulated after a failed round trip.

### 4.3 Sign in

- The screen accepts the Citizen's email and password. Phone login must not be offered.
- Password visibility may be toggled without changing the value or accessible label.
- A Forgot password action must be present although absent from the current design.
- Successful sign-in creates an authorized Citizen session and routes to the safe intended destination or Citizen dashboard.
- Failure shows a generic credential error and permits retry; it must not disclose whether a specific account exists, is registered through a different identifier, or is privileged.
- Repeated failure/rate-limiting behavior is specified in Step 4/5.

### 4.4 Sign out

- Sign out is available from the Citizen account/navigation area.
- Successful sign-out ends the active Citizen session and returns to a safe public page or sign-in screen.
- Private content must no longer be accessible through normal navigation after sign-out.
- Failure to contact the service must not leave the interface falsely claiming that sign-out completed; secure session-invalidating behavior is an architecture/security decision.

### 4.5 Forgot password and password reset

- Forgot password is available from sign-in and asks for the Citizen's email.
- Submission returns a neutral confirmation that does not reveal whether an account exists.
- Reset instructions are sent by email; token lifetime, verification safeguards, and rate limits remain Step 4/5 decisions.
- The reset screen accepts and confirms a new password under the approved password policy.
- Invalid, used, or expired reset authorization displays a safe error and a path to request a new reset.
- Successful reset displays confirmation and a route to sign in; whether existing sessions are revoked is a Step 4 decision.

### 4.6 Account/profile view and edit

- A Citizen can view the approved basic profile fields and preferred language.
- Editable fields are clearly distinguished from read-only identity/audit fields.
- Edit mode validates changed values and shows save success/failure without losing valid input.
- A Citizen may change the login email after appropriate reauthentication and verification of the new email. The new email becomes authoritative only after successful verification; exact session, token, and conflict handling remain Step 5 decisions.
- The page must not expose other Citizens' details.
- Account deletion is not approved MVP behavior. A Commune Administrator may disable Citizen access for a legitimate security, compromised-account, confirmed-abuse, or legal/administrative reason. Disabling must preserve the account, complaints, lifecycle history, responses, consent evidence, and audit records. Exact retention remains a later legal/data decision.

### 4.7 Preferred language

- The Citizen can select Arabic, French, or English.
- Saving changes the authenticated experience to the selected locale and persists the preference conceptually across later sessions.
- A failed save keeps the current confirmed preference and identifies that the change was not stored.
- Browser/public-language fallback and persistence implementation are Step 5 decisions.

### 4.8 Password change

- An authenticated Citizen can enter the current password, new password, and confirmation, subject to the Step 4 security policy.
- New and confirmation values must match; errors must never echo password values.
- Success displays confirmation. Session-revocation behavior after change remains Step 4.
- The design for this account subview is missing.

## 5. Citizen dashboard

Design reference: [`design/Citizens/01-dashboard (1).jpg`](<../design/Citizens/01-dashboard (1).jpg>).

- Entry requires an authenticated Citizen.
- The dashboard displays the Citizen's name/account context, a New complaint CTA, a route to all complaints, recent complaints, latest citizen-facing statuses, and visible update/response indicators.
- Recent complaint rows show at minimum reference, subject, location, submission date, displayed status, and a details action, consistent with the design.
- Complaint summaries must be calculated only from the signed-in Citizen's accessible complaints.
- The notification indicator opens the notification center specified in section 18.
- Empty state: explain that no complaints exist and offer the New complaint action.
- Loading state: show stable page structure and a non-misleading progress treatment; do not display zero as if data has loaded.
- Error state: show retry and retain navigation; do not reveal partial data belonging to another account.

## 6. New complaint flow

Design references: [`design/Citizens/04-new-complaint-description.jpg`](../design/Citizens/04-new-complaint-description.jpg), [`design/Citizens/05-new-complaint-location.jpg`](../design/Citizens/05-new-complaint-location.jpg), and [`design/Citizens/06-complaint-review.jpg`](../design/Citizens/06-complaint-review.jpg).

### 6.1 Entry and shared behavior

- Entry requires an authenticated Citizen and is available from Citizen navigation, dashboard, and complaint list.
- The flow visibly communicates three steps and the current/completed step.
- Next validates the current step before advancing. Back returns to the prior step without discarding entered data.
- Data must remain preserved while moving among steps in the active flow and after a recoverable submission failure.
- If the Citizen attempts to leave a non-empty unfinished flow, the interface should warn that unsaved information may be lost. No durable or persistent complaint drafts are included in MVP.
- No photo, file, camera, or document attachment control may appear.

### 6.2 Step 1 — Describe the problem

| Field | Purpose | Requirement | Validation and errors |
| --- | --- | --- | --- |
| Category | Classify the local problem using the approved canonical active categories. | Required. | Must select one currently active category from the approved seven-category catalogue. If categories fail to load, progression is blocked with retry rather than a hardcoded substitute list. |
| Subject/title | Provide a concise identifier for the complaint. | Required. | Non-empty after trimming; maximum 150 characters. The UI should provide an example and counter/feedback without silently modifying the value. |
| Description | Explain one local problem clearly enough for review. | Required. | Minimum 20 and maximum 2,000 characters, with a visible counter. The current design's 500-character maximum is superseded. Too-short/too-long input must show localized inline feedback. Exact Unicode counting semantics are a Step 5/6 detail. |

### 6.3 Step 2 — Location

| Field | Purpose | Requirement | Validation and errors |
| --- | --- | --- | --- |
| Canonical location/douar | Establish that the issue is within the configured Abaynou service area. | Required. | Must select one active location from the approved six Arabic canonical values. Failure to load locations blocks progression with retry. French/English display values must not be invented. |
| Street/landmark/location clarification | Help the Commune find the issue within the selected location. | Optional. | Trimmed text; maximum 300 characters. It must not be used to bypass the canonical Abaynou selection. |

### 6.4 Step 3 — Review and confirmation

- Display category, subject, description, canonical location, and optional clarification in a read-only review.
- Provide Back/Edit navigation that returns to earlier steps with all entered data preserved.
- Require an unchecked confirmation that the information is correct and the issue is inside Abaynou before submission.
- Submit is a single explicit action. While pending, it must prevent repeated submissions.
- If validation has become invalid because canonical data was deactivated during the flow, explain the affected field and return the Citizen to correct it.

### 6.5 Submission outcomes

- Success creates one complaint, assigns a unique stable complaint reference, records the submission time, and shows a dedicated confirmation state.
- Confirmation displays the reference and explains that the complaint can be followed privately.
- Successful submission requires no additional email-verification step for an already verified account and triggers a transactional complaint-receipt email to the verified account email.
- Next actions include View complaint, My Complaints, and Citizen dashboard; a New complaint action may be present if consistent with the design system.
- The confirmation must not claim a processing deadline or final status transition not approved in Step 3.
- A failure must state that submission was not confirmed, retain entered data, allow retry, and avoid displaying a reference unless creation is verified.
- Duplicate-submit protection must avoid creating multiple complaints when a Citizen retries after an uncertain response. The implementation mechanism is Step 5/6.

## 7. My Complaints

Design reference: [`design/Citizens/02-my-complaints.jpg`](../design/Citizens/02-my-complaints.jpg).

- Only the authenticated Citizen's authorized complaints are listed.
- Each row/card displays reference, subject, location, submission date, citizen-facing status, and a details action. Category may be shown where the responsive layout permits without obscuring the required data.
- Search is simple and scoped to the Citizen's own complaint reference and subject, as indicated by the design. Search is case/locale tolerant where practical; exact matching implementation is Step 5.
- Basic filtering must include citizen-facing status. Additional basic filter choices require design/product approval and must not become advanced search.
- Search and filters can be cleared. No-results state distinguishes “no matching complaints” from “no complaints yet.”
- Selecting a row/reference/details action opens the authorized complaint detail.
- Empty state offers New complaint. No-results state offers Clear search/filters. Loading does not present a false empty list. Error state offers retry.
- Pagination or load-more behavior is **OPEN** for Step 5; it must preserve active simple search/filter context.

## 8. Citizen complaint details

Design reference: [`design/Citizens/03-complaint-details (1).jpg`](<../design/Citizens/03-complaint-details (1).jpg>).

- Entry is from My Complaints, dashboard, or an authorized notification.
- The page displays reference, subject, category, description, canonical location and location clarification, submission date/time, current citizen-facing status, material processing/history events, the Commune response when issued, and closure/resolution information when available.
- The processing timeline is chronological and includes meaningful Citizen-visible events with localized labels and timestamps. Internal-only events must not leak through this view.
- The exact lifecycle, event visibility, and mapping from internal to Citizen-facing statuses are defined in Step 3, not here.
- Before Commune processing begins, the Citizen may edit the complaint's category, subject, description, location, and optional location clarification, or cancel/withdraw the complaint. Edit retains the same complaint reference, revalidates all fields, and records the change for traceability.
- Cancellation/withdrawal requires explicit confirmation and preserves the submitted complaint record; it must never hard-delete the complaint.
- Once Commune processing has begun, edit and cancel/withdraw are unavailable and the interface explains that processing has started. Step 3 defines the exact lifecycle boundary and withdrawal status.
- Citizen deletion, reopening, replies, proactive messages, and any complaint conversation are not MVP actions.
- An unknown reference or a complaint not accessible to the Citizen must not expose existence or ownership. The response follows the approved not-found/permission behavior from Steps 4/5.
- Closed/resolved complaints display the Commune's citizen-visible resolution/response and closure timestamp where approved.
- Loading, failure, and unavailable-data states retain safe navigation back to My Complaints.

## 9. Commune response to the Citizen

The platform is not a complaint chat system. Two-way messaging, clarification requests, Citizen replies, repeated exchanges, conversation threads, and an Awaiting Citizen workflow are out of MVP.

- After reviewing and processing the complaint, authorized Commune staff can record and issue one authoritative Citizen-visible response as part of the approved high-level path: Submission → Review → Processing → Commune Response → Closed.
- Any required real-world action is performed outside the software before the Commune records/issues the response.
- Response text is required when the response is issued, must contain non-whitespace text, and has a maximum of 2,000 characters.
- The response is displayed in Citizen complaint details with its issued timestamp and appropriate Commune attribution.
- Issuing the response triggers an in-platform notification and a transactional response email to the verified Citizen email.
- A pending issue action must prevent duplicate issuance. Success confirms that the response is available to the Citizen; failure preserves the entered response text and must not falsely show it as issued.
- Controlled correction of an issued response is approved without reopening or changing lifecycle state. Any authorized Commune Agent may perform it; the original and every corrected version, reason, actor, and timestamp must be preserved. Exact version storage remains Step 6.
- If complaint information is insufficient, the Commune does not request clarification in MVP. Step 3 defines the appropriate exceptional/terminal treatment.

## 10. Commune authentication and administration entry

No dedicated Commune authentication design is supplied.

- Commune registration must not be publicly available.
- Commune sign-in must accept only the identifier(s) approved for administratively provisioned Commune accounts and a password or other approved credential.
- Successful sign-in opens the Commune dashboard or a safe intended administration destination.
- Failed sign-in uses generic, non-enumerating feedback and permits retry.
- Sign out ends the administration session and returns to the Commune sign-in entry, not Citizen registration.
- Password recovery/reset and password change must exist where applicable to the approved account-provisioning policy.
- Commune staff provisioning, verification, invitation/activation, recovery mechanics, and session controls remain for Step 5 implementation under the approved Step 4 authority model.
- Multi-factor authentication is not mandatory for Citizens, Commune Agents, or Commune Administrators in the first MVP release. Strong authentication fundamentals remain required, and the later architecture must not prevent MFA from being added as a future enhancement.
- Authentication-required, expired-session, and permission-denied states must preserve confidentiality and give a safe route to sign in or return.

## 11. Commune dashboard

Design reference: [`design/Commune/01-dashboard.jpg`](../design/Commune/01-dashboard.jpg).

- Entry requires an authenticated and authorized Commune account.
- The complaint workload is shared: every authorized Commune Agent may access all complaints and continue work started by another Agent.
- Display workflow counters for new, under-review, in-processing, and closed complaints using the final Step 3 definitions.
- Display complaints requiring attention with reference, subject, location, relevant status/attention reason, and direct details navigation.
- Selecting a status summary routes to the complaint list with the corresponding approved filter. “View all complaints” opens the unfiltered list.
- These counters support navigation and operational awareness only; they are not a Statistics feature. No employee workload analytics, charts, trends, or analytics panels are included.
- Counts must show an explicit loading state rather than zero before data is known. Empty attention panels explain the absence of data. Partial failures identify the failed panel and allow retry without corrupting other loaded panels.
- Status labels are placeholders until Step 3 and must not independently define lifecycle semantics.

## 12. Commune complaint list

Design reference: [`design/Commune/02-complaints.jpg`](../design/Commune/02-complaints.jpg).

- List each complaint visible to authorized Commune complaint-handling staff with reference, Citizen display identity, subject, location, submission date, current displayed status, and a details action. Mandatory assigned/responsible-employee fields are not part of MVP.
- Simple search supports complaint reference, subject, and Citizen display identity as shown. Search must remain restricted to authenticated, authorized Commune complaint-handling staff.
- Basic filters include displayed status and canonical location/douar. Assignment/assignee filtering is not an MVP requirement.
- Filters can be combined and cleared. Active criteria remain visible.
- Selecting a row/reference/details action opens the authorized Commune complaint detail.
- Empty state distinguishes no complaints from no matching results. No-results offers Clear filters. Loading and error states preserve navigation and active query context.
- Pagination or load-more behavior is **OPEN** for Step 5 and must work with active search/filters.
- Advanced search, export, and reporting are out of MVP.

## 13. Commune complaint details and processing

Design references: [`design/Commune/03-complaint-details.jpg`](../design/Commune/03-complaint-details.jpg) and [`design/Commune/screenshot Abaynou.PNG`](<../design/Commune/screenshot Abaynou.PNG>).

### 13.1 Information display

- Show reference, subject, category, description, canonical location and location clarification, submission timestamp, current status, per-action history, and the authoritative Commune response when issued. Do not require a permanent assigned/responsible-employee field.
- Authorized Commune Agents who handle complaints may view the Citizen name, verified email, optional phone, complaint content, and complaint location needed for processing. Contact fields may still be omitted from dense list tables for privacy-conscious UX, but access among authorized complaint-handling Agents is not assignment-based.
- History displays material events in chronological order with actor attribution appropriate to the viewer and timestamps.

### 13.2 Collaborative processing and accountability

- Complaints belong operationally to the authorized Commune team, not permanently to one Agent.
- No assignment, self-assignment, reassignment, claim, or responsible-Agent action is required before processing.
- Any authorized Commune Agent may continue a valid lifecycle action after another Agent, including review start, processing, response issuance, `NOT_ACCEPTED`, response correction, and closure.
- Every meaningful action records the acting account, action, timestamp, complaint/resource, relevant previous/new state or value, and mandatory reason where applicable.
- Multiple Agents may open the same complaint. A later action based on stale information must be detected and prevented from silently overwriting a newer confirmed action. The technical mechanism belongs to Steps 5 and 6.

### 13.3 Status updates

- Current status is displayed using the authoritative Step 3 lifecycle.
- Only transitions allowed by Step 3 and actions permitted by Step 4 may be offered.
- Any authorized Commune Agent may perform normal valid lifecycle transitions and may enter `NOT_ACCEPTED` with its mandatory controlled reason and Citizen-facing explanation; no prior assignment or original-actor relationship is required.
- A requested update must show pending, success, or failure feedback and must not display the new state as confirmed until saved.
- Status update and Commune response issuance are distinct functional actions unless Step 3 explicitly couples a particular transition. The interface must not assume that every status change issues a response.
- Resolve/close is represented as a lifecycle action only after Step 3 defines its prerequisites, resulting status, Citizen visibility, and reopening rules.

### 13.4 Commune response

- Authorized staff can compose and issue the response defined in section 9.
- Any authorized Commune Agent may perform the controlled response correction defined by the frozen lifecycle. The original and every corrected version, correction reason, correcting Agent, and timestamp remain preserved; correction does not reopen or change lifecycle state.
- The response field validates a non-whitespace maximum of 2,000 characters and provides pending, success, and failure feedback.
- Issued response visibility, notification, email, correction/versioning, and lifecycle dependencies follow sections 9, 18, and the later Step 3–6 decisions.
- No clarification request, Citizen reply, or conversation-thread controls are included.

### 13.5 Exclusion and failures

- The “Internal Note / ملاحظة داخلية” panel visible in the screenshot is **out of MVP** and must not be implemented.
- Loading/error states must protect Citizen data. Failed status, response, correction, and closure actions provide independent feedback so one failed action does not falsely roll back another confirmed action.
- Concurrent-update/conflict behavior must avoid one Agent silently overwriting a newer confirmed action by another Agent; the mechanism is Step 5/6.

## 14. Employee management

Design reference: [`design/Commune/04-employees.jpg`](../design/Commune/04-employees.jpg).

- The employee list displays employee name, approved role label, account status, and available actions. Employee workload analytics/counts are not an MVP requirement.
- Commune Administrators may add Agent accounts and collect the approved identity/contact, role, and initial account-state information. Provisioning/activation mechanics remain Step 5 decisions.
- Commune Administrators may edit Agent profile, role, and account-state information with validation and explicit save feedback. Ordinary Agents cannot manage staff accounts or grant roles. Granting/revoking Administrator status requires authorization from the designated Commune/project authority without creating another application role.
- Account state must use dedicated terminology such as a later-approved active/disabled/pending model; complaint labels such as “قيد المعالجة” must never represent employee state.
- Deactivation prevents future access while preserving employee identity and attribution in historical actions and audit records. Exact session revocation and reactivation mechanics belong to Step 5.
- Public self-registration must not create Commune employees.
- Staff-list and staff-management access is restricted to Commune Administrators.

## 15. Category management

Design reference: [`design/Commune/05-categories-locations.jpg`](../design/Commune/05-categories-locations.jpg).

- The approved initial canonical catalogue is: Cleanliness and waste; Public lighting; Roads and sidewalks; Drainage and water; Commune facilities; Local nuisance / disturbance; Other local issue.
- One canonical catalogue must serve Citizen submission, Commune management, relevant public information, and any future reporting if separately approved.
- Each category must have a stable language-neutral identifier/code and independently approved Arabic, French, and English display labels. The display string itself must not be the permanent technical identifier, and official labels must not be machine-translated automatically.
- List categories with localized labels, dedicated active/inactive state, and edit action.
- Add/edit must support the approved labels/content for Arabic, French, and English. Uniqueness enforcement remains Step 6.
- Active categories are available for new complaint submission and relevant public scope content.
- Inactive categories are unavailable for future selection but remain readable on existing complaints and history.
- Existing complaints must not lose or silently change their historical category information when a category is edited or deactivated.
- Permanent deletion is not specified; implementations must not infer destructive deletion from an edit control.
- The complaint-status phrase “قيد المعالجة” shown on category rows is incorrect terminology and must not be carried forward.
- Final Commune validation of the catalogue and localized labels is required before production.

## 16. Location management

Design reference: [`design/Commune/05-categories-locations.jpg`](../design/Commune/05-categories-locations.jpg).

- The approved initial Arabic canonical values are: دوار أباينو; دوار ايكيسل; دوار توتلين; دوار أبوقال; دوار إد العربا; دوار تبولوت.
- Each location must have a stable language-neutral identifier/code. The Arabic display string must not be the permanent technical identifier.
- List canonical locations/douars with approved labels, dedicated active/inactive state, and edit action.
- Add/edit supports independent approved Arabic, French, and English labels. No French/English translation or transliteration may be invented or machine-generated; those values require later Commune validation. Uniqueness enforcement remains Step 6.
- Active locations are selectable for new complaints. Inactive locations are unavailable for future selection.
- Existing complaints must preserve and display their historical location information after edit or deactivation.
- Permanent deletion is not specified and must not be inferred.
- The complaint-status phrase “قيد المعالجة” shown on location rows is incorrect terminology and must not be carried forward.
- The approved Arabic values above are the initial MVP list. Historical complaint location information must remain preserved after rename or deactivation.

## 17. Platform settings

Design reference: [`design/Commune/06-settings.jpg`](../design/Commune/06-settings.jpg).

| Setting | Functional behavior and validation |
| --- | --- |
| Commune name | Display and edit the approved public/administrative name with required non-empty validation and independently approved locale labels where applicable. |
| Phone | Display publicly where approved; validate as an actionable contact value without rewriting it into a misleading display format. |
| Email | Display publicly where approved; require a valid email format. |
| Address/contact information | Maintain the approved public address and any basic contact details represented in public content, including the address missing from the current Settings design. |
| Opening hours | Maintain accurate public opening-hours content in all supported languages. Exact storage structure remains Step 6. |
| Chikaya.ma link | Accept only a valid approved secure external URL. The screenshot value `/https://chikaya.ma` is malformed design/sample content and is not intended behavior. |
| Supported languages | Represent Arabic, French, and English. These are frozen MVP requirements and cannot be disabled without an approved scope change. |
| Basic public/platform text | Allow approved Commune-owned notification, privacy, terms, accessibility, User Guide, service-scope, and contact content. Privacy/legal-sensitive wording requires appropriate review before production. |

- A settings page loads the last confirmed values, validates changes, and identifies changed/invalid fields.
- Save must provide pending, success, and failure feedback. Failure must not present unsaved values as published.
- Material settings changes require appropriate audit history. Storage, versioning, publication, and permissions are Step 4–6 decisions.
- Public Content / Legal & Information management must be placed in a secondary Settings area. It must not receive equal top-level navigation or dashboard prominence to complaints and complaint processing.
- Commune Administrators manage operational settings and approved public/informational content. Legal/privacy-sensitive wording requires appropriate organizational/legal review before production, but MVP does not add a content-approver role or dedicated legal approval workflow.
- Configurable/domain values use stable language-neutral identifiers with independent approved Arabic, French, and English display values. Arabic display text is not itself a permanent identifier, and official content is not automatically machine-translated.

## 18. Basic notifications

The bell/count shown in Citizen and Commune designs requires a complete notification experience.

- A notification center/list is available to authenticated users and contains only notifications they are permitted to see.
- Each item displays an event type/summary, related complaint reference where applicable, timestamp, and read/unread state.
- Unread items are distinguishable without color alone. The header badge represents the current unread count and updates after confirmed read-state changes.
- Selecting a complaint notification marks it read and opens the authorized complaint detail or relevant status/response context.
- If the destination is no longer accessible, show a safe unavailable/permission result without leaking complaint data.
- Users can distinguish an empty center from a loading or failed center. Failure provides retry.
- In-platform events may include complaint received, meaningful status/activity change, Commune response issued, and complaint closure, subject to Step 3 event definitions.
- Exact Citizen event eligibility follows Step 3. Authorized Commune Agents may receive operational complaint notifications for the shared complaint workload; administrative notifications remain restricted to Commune Administrators.
- In-platform notifications are the primary and authoritative notification record and may contain more detailed status/activity information than email.
- Transactional Citizen email is limited to three events: complaint successfully received, Commune response issued, and complaint closed. Complaint submission does not repeat account verification. No email is sent for every minor status change.
- “Mark all as read” is required. Selecting/opening an individual notification marks it read. Notification retention remains a Step 6 decision.
- SMS, marketing email, complex notification preferences, and advanced notification automation are out of MVP.

## 19. Workflow counters; statistics excluded

- No Statistics feature is included in MVP: no statistics page, category/location/time charts, open-versus-resolved analytics, employee workload analytics, operational analytics dashboard, advanced BI, reports, exports, SLA metrics, forecasts, or third-party analytics integration.
- Existing dashboard workflow counters may remain only where necessary for navigation and operational awareness, such as new, under-review, in-processing, and closed complaints.
- Selecting a counter routes to the corresponding authorized filtered complaint list.
- Counters use Step 3 lifecycle definitions and Step 4 authorization boundaries. Loading must not present zero as final; failure must be distinguishable from an actual zero count.
- The dashboard workload visualization and any proposed fuller-statistics screen are superseded and must be removed or adapted without redesigning the surrounding Commune visual system.

## 20. Multilingual functional behavior

- Arabic (`ar`), French (`fr`), and English (`en`) are available across public, Citizen, Commune, authentication, validation, system states, status labels, notifications, accessibility, privacy, and terms content.
- Language switching keeps the user on the equivalent current page/state where safe and changes navigation, labels, help, validation, and system messages immediately.
- Unsaved form content must not be discarded merely because the interface language changes.
- The selected public language persists conceptually for later public visits; an authenticated Citizen's confirmed preferred language takes precedence according to rules finalized in Step 5.
- Arabic switches the full layout and directional affordances to RTL. French and English use LTR. Mixed-direction values such as references, email addresses, phone numbers, and URLs must remain readable.
- Canonical categories, locations, and statuses display approved localized labels. Missing translations must not expose internal keys; fallback and content-readiness handling remain Step 5/6 decisions.
- User-generated complaint descriptions and Commune responses remain in their authored language and are not automatically translated.
- The language control itself must remain understandable in every locale and keyboard/screen-reader operable.
- No localization library, translation service, or storage strategy is selected here.

## 21. Reusable system states

| State | Required behavior |
| --- | --- |
| Loading | Indicate progress without showing stale/zero/empty data as final; preserve stable layout and accessible status text. |
| Empty data | Explain what is absent in context and provide a useful primary action when one exists. |
| No search results | State that no items match current criteria and offer clear/reset controls without implying no records exist. |
| Validation error | Identify each invalid field, explain correction, preserve other valid input, and support focus/assistive error summary behavior. |
| Operation failure | State that the action was not confirmed, preserve safe input, and offer retry or recovery. Do not expose implementation details. |
| Operation success | Confirm exactly what completed and update displayed state only after confirmation. Provide the logical next action. |
| Permission denied | Explain that access/action is unavailable without revealing protected data; offer safe navigation. Final distinction from not-found is Step 4/5. |
| Authentication required | Route to the correct Citizen or Commune sign-in and preserve only a safe intended destination. |
| Expired session | Explain that sign-in is required again, protect unsaved/sensitive data, and avoid submitting actions under an invalid session. Recovery details are Step 4/5. |
| Not found / 404 | Provide a localized explanation and safe navigation to the relevant home/dashboard; do not reveal whether a private resource exists. |
| Unexpected system error | Show a localized, non-sensitive error, retry where safe, and a support/navigation path. |

All states must reuse the established visual system and meet keyboard, focus, contrast, scaling, semantic, and screen-reader requirements. Responsive behavior must preserve information priority and must not remove required actions or data merely because the viewport is smaller.

## 22. Design gaps and conflicts requiring completion

| ID | Area | Missing/incomplete design | Functional requirement |
| --- | --- | --- | --- |
| DG-01 | All | English variants are missing. | Complete EN designs/content alongside Arabic RTL and French LTR. |
| DG-02 | Citizen | Forgot-password and reset screens are missing. | Follow the existing Citizen authentication structure and section 4 behavior. |
| DG-03 | Citizen | Password and language account subviews are missing. | Extend the account screen patterns for sections 4.7–4.8. |
| DG-04 | Citizen/Commune | Notification center/list and read/unread states are missing. | Add section 18 behavior using existing badges, cards, lists, and header bell. |
| DG-05 | Citizen | Complaint submission success state is missing. | Add the reference-bearing confirmation in section 6.5. |
| DG-06 | All | Loading, empty, no-results, validation, permission, session, 404, failure, and success variants are incomplete. | Add reusable states from section 21 in the existing visual language. |
| DG-07 | All | Tablet/mobile/responsive layouts are incomplete. | Define responsive variants without removing required content/actions. |
| DG-08 | Commune | Authentication/recovery UI is missing. | Add section 10 flows using the established brand/form language. |
| DG-09 | Commune | Dashboard workload and earlier fuller-statistics concepts conflict with the amended MVP. | Remove workload analytics and do not add a Statistics view; retain only section 19 workflow counters in the existing dashboard style. |
| DG-10 | Citizen/Commune | Complaint detail designs contain conversation/reply concepts. | Remove Citizen reply and thread controls; adapt the established card area to display the one-way Commune response from section 9. |
| DG-11 | Public | Dedicated Accessibility design is missing. | Use the Privacy/public informational-page structure. |
| DG-12 | Public | Dedicated Terms design is missing. | Use the Privacy/Accessibility/public informational-page structure. |
| DG-13 | Public | User Guide content is too brief for the required journey. | Expand content while preserving its informational-page language. |
| DG-14 | Citizen/Public | `design/Citizens/08-accessibility.jpg` visibly contains Privacy Policy content. | Do not treat it as an approved Accessibility screen. |
| DG-15 | Commune | Internal Note is shown in complaint detail. | Remove/omit from MVP; internal staff notes are out of scope. |
| DG-16 | Commune | Employee, category, and location states reuse complaint wording such as “قيد المعالجة”. | Replace with separately approved account/activity terminology. |
| DG-17 | Public/Commune | Category examples/catalogue conflict with each other and with the approved catalogue. | Align all affected content to the approved seven-category canonical catalogue while preserving the visual system. |
| DG-18 | Commune | Chikaya setting shows malformed `/https://chikaya.ma`. | Treat as erroneous sample content and validate the approved URL. |
| DG-19 | Public/Commune | The public Contact page displays a Commune address, but the Settings design has no address field. | Add a secondary Settings control for the approved public address/contact value; exact storage structure remains Step 6. |
| DG-20 | Citizen | The dashboard contains an action-required clarification alert and Awaiting Citizen concept. | Remove/adapt the alert; retain normal response/update visibility without an Awaiting Citizen workflow. |
| DG-21 | Public | How it works and FAQ include clarification/two-way wording. | Revise the content to the approved submission → review → processing → Commune response → closed concept. |
| DG-22 | Citizen/Commune | Complaint lists contain Awaiting Citizen/reply status badges. | Remove those badges and apply only the Citizen-facing/internal status mapping approved in Step 3. |
| DG-23 | Commune | Complaint lists/details contain assigned/responsible-employee fields and assignment controls. | Superseded by FS-AMEND-001: adapt toward current status, latest activity, and per-action Agent history while preserving the existing visual system; exact replacement UI remains for design work. |

The items above are documented design impacts, not instructions to redesign the product. Adapted screens must preserve the existing spacing, typography, cards, navigation, colors, controls, density, and overall structure. Attachment upload and internal staff notes remain excluded.

## 23. Approved functional decisions and remaining dependencies

### 23.1 Project-owner-approved Step 2 decisions

| ID | Status | Approved decision |
| --- | --- | --- |
| OF-01 | **APPROVED** | Citizen login and recovery require email. Phone is optional contact information only; phone authentication is not in MVP. |
| OF-02 | **APPROVED** | Email verification occurs once at account creation. A verified Citizen does not reverify per complaint; successful complaint submission shows in-platform confirmation/reference and triggers the receipt email. |
| OF-03 | **APPROVED** | No durable drafts. Active-flow data is preserved between steps. Edit/withdrawal is allowed only before Commune processing; afterward the complaint is locked. Submitted records are never hard-deleted. Step 3 defines the lock boundary and withdrawal status. |
| OF-04 | **APPROVED** | One configurable canonical seven-category catalogue: Cleanliness and waste; Public lighting; Roads and sidewalks; Drainage and water; Commune facilities; Local nuisance / disturbance; Other local issue. Final Commune validation is required before production and history must survive deactivation. |
| OF-05 | **APPROVED** | Initial Arabic canonical locations: دوار أباينو; دوار ايكيسل; دوار توتلين; دوار أبوقال; دوار إد العربا; دوار تبولوت. French/English display labels require later Commune validation and must not be invented. History survives rename/deactivation. |
| OF-06 | **APPROVED** | Subject maximum 150; description 20–2,000; location clarification maximum 300; Commune response maximum 2,000 characters. Validation supports Arabic, French, and English. |
| OF-07 | **APPROVED** | Statistics and employee workload analytics are removed from MVP. Existing workflow counters may remain for navigation/awareness and are not a Statistics feature. |
| OF-08 | **APPROVED** | In-platform notifications are authoritative; selecting one marks it read; Mark all as read is supported. Citizen email is limited to complaint received, Commune response issued, and complaint closed. No SMS, marketing email, complex preferences, or advanced automation. |
| OF-09 | **APPROVED** | The Commune owns public informational content. Privacy/legal-sensitive text receives appropriate review before production. Content management is secondary under Settings, not a top-level peer of complaint operations. |
| OF-10 | **APPROVED** | Configurable/domain values use stable language-neutral identifiers and independent approved Arabic/French/English labels. Arabic display strings are not technical identifiers; official/domain content is not machine-translated. Editing authorization is Step 4. |

No genuine Step 2 project-owner functional decision remains open after OF-01–OF-10. This document remains a draft only for final project-owner review and explicit freeze approval.

### 23.2 Step 3 — Complaint Lifecycle

| ID | Deferred decision |
| --- | --- |
| OL-01 | Authoritative internal statuses, exceptional outcomes, and allowed transitions. |
| OL-02 | Mapping from internal states to Citizen-facing statuses and visible timeline events. |
| OL-03 | Exact meanings of submission/received, review, processing, Commune response, closed, and attention-required for workflow counters. |
| OL-04 | Exact lifecycle boundary at which Citizen edit/withdrawal becomes locked. |
| OL-05 | Exceptional outcomes/transitions for out-of-scope, rejected, insufficient-information, and pre-processing withdrawn complaints. |
| OL-06 | Response/closure prerequisites, whether response issuance and closure are separate transitions, reopening behavior, and closure timestamps. |
| OL-07 | Which lifecycle events produce Citizen-visible history and meaningful-status notifications. |
| OL-08 | Duplicate-complaint treatment shown by the designs. |

### 23.3 Step 4 — Roles, Permissions, and Security

The project owner approved RP-01 through RP-12 during Step 4 review. The Step 4 document remains pending final review/freeze; later technical and data implementation details remain in Steps 5 and 6.

| ID | Approved policy / remaining later-step dependency |
| --- | --- |
| OP-01 | Roles and action/resource permissions follow the approved RP decisions in `docs/04-roles-permissions-security.md`; final document freeze remains pending. |
| OP-02 | All authorized complaint-handling Agents may view all complaints/full details and necessary Citizen identity/contact data. Other Citizens and the public remain strictly excluded. |
| OP-03 | Any authorized Agent may perform lifecycle-valid normal actions, `NOT_ACCEPTED`, response correction, and closure. Administrators manage staff, canonical data, settings, public content, and justified Citizen disabling. Assignment/reassignment is not part of MVP. |
| OP-04 | Citizen edit/withdraw authority remains restricted to own `SUBMITTED` complaints under the frozen lifecycle. |
| OP-05 | Approved access states and revocation behavior govern accounts; exact provisioning, recovery, and session mechanisms belong to Step 5. |
| OP-06 | No routine application-level Technical Administrator exists in MVP; exceptional technical access is a Step 5 operational design concern. |
| OP-07 | Strong authentication fundamentals are required, but MFA is not mandatory in the first MVP. Exact controls and future-MFA extensibility belong to Step 5. |
| OP-08 | Inaccessible private resources must not leak existence; exact safe not-found/permission-denied behavior belongs to Step 5. |
| OP-09 | Citizen disabling is Administrator-only and preserves all records. Exact retention/deletion policy and representation remain later legal/Step 6 concerns. |

### 23.4 Step 5 — Technical Architecture

| ID | Deferred decision |
| --- | --- |
| OA-01 | Frontend, backend, authentication service, hosting, deployment, localization, monitoring, and project structure. |
| OA-02 | Session and safe return-destination implementation. |
| OA-03 | Pagination versus load-more and query implementation for operational lists. |
| OA-04 | Delivery mechanism for required verification/recovery email and the three approved transactional complaint emails. |
| OA-05 | Duplicate-submit/idempotency, concurrent-update handling, retries, and offline/network-failure strategy. |
| OA-06 | Accessibility, browser/device test tooling and production observability approach. |

### 23.5 Step 6 — Database Model

| ID | Deferred decision |
| --- | --- |
| OD-01 | Durable entities, relationships, constraints, indexes, and migrations. |
| OD-02 | Complaint reference format/generation and uniqueness enforcement. |
| OD-03 | Storage of authoritative status/history, withdrawal/edit traceability, Commune response/versioning, per-action actor attribution, previous/new values, reasons, and timestamps. |
| OD-04 | Historical preservation strategy for renamed/deactivated categories and locations. |
| OD-05 | Notification event/read-state storage and retention. |
| OD-06 | Consent/terms version evidence, privacy retention, deletion/anonymization, and backups. |
| OD-07 | Unicode length/count rules and normalization for validated text. |

## 24. Quality and approval gate

The eventual implementation must satisfy the frozen scope and this specification through secure, private, reliable, maintainable, accessible, testable, and cost-conscious behavior. Extensibility must not introduce deferred features early.

This document is **APPROVED / FROZEN**. Step 3 — Complaint Lifecycle must not begin automatically, and no implementation work is authorized by this document.
