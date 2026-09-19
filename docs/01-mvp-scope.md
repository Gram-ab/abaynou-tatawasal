# Abaynou Tatawasal — MVP Scope

## Document status

| Field | Value |
| --- | --- |
| Project | Abaynou Tatawasal — أباينو تتواصل |
| Organization | Commune of Abaynou, Morocco |
| Step | Step 1 — Project / MVP Scope |
| Status | **APPROVED / FROZEN** |
| Implementation status | Not started |
| Architecture status | Not selected |

### Approved amendment record

| Amendment | Approval | Effect |
| --- | --- | --- |
| AMEND-001 | Explicitly approved by the project owner after Step 2 review | Basic operational statistics and employee workload analytics were removed from MVP. Existing workflow counters may remain for navigation and operational awareness but do not constitute a Statistics feature. |
| AMEND-002 | Explicitly approved by the project owner after Step 2 review | Two-way Citizen–Commune messaging, clarification requests, Citizen replies, conversation threads, and an Awaiting Citizen workflow were removed from MVP. Citizen-visible Commune response remains in MVP. |
| AMEND-003 | Explicitly approved by the project owner during Step 4 review | Mandatory complaint assignment/reassignment and permanent responsible-Agent ownership were removed from MVP. Authorized Commune Agents work collaboratively on the shared complaint workload; any authorized Agent may continue another Agent's work, and accountability is provided by per-action audit/history attribution. |

This document, including the amendments above, defines the authoritative frozen MVP boundary. All unrelated approved scope remains unchanged. It does not define the authoritative complaint lifecycle, the permission matrix, the data model, or the technical architecture. Those subjects require separate, later approval steps.

## 1. Project purpose and service boundary

Abaynou Tatawasal is a local digital communication and complaint-management service for the Commune of Abaynou. It will allow citizens to privately report local problems within the Commune's geographic and administrative scope, follow their complaints, and receive Commune responses.

Authorized Commune personnel will use a secure administration area to receive, review, process, respond to, and close complaints collaboratively.

The platform has three product areas:

1. Public website.
2. Authenticated Citizen space.
3. Authenticated Commune administration space.

Abaynou Tatawasal does **not** replace Chikaya.ma or any national administrative, judicial, legal, emergency, or otherwise out-of-scope channel. Public content must explain this distinction and direct users to the appropriate official channel when an issue is outside the local service boundary. The two services must not be presented as legally equivalent.

## 2. MVP principle

The MVP limits feature scope, not quality. Later implementation must be production-oriented, secure, private, maintainable, accessible, testable, performant, extensible, and reasonably economical to operate. The core should support future additions without requiring replacement of foundational architecture.

This principle does not authorize future-version features in the MVP and does not select a technology stack during this step.

## 3. Users and actors

| Actor | MVP purpose |
| --- | --- |
| Anonymous visitor | Understand the service and its limits; access public guidance; sign in or create a Citizen account. |
| Citizen | Submit and privately follow their own complaints; maintain basic account information; view the Commune response. |
| Commune employee/agent | Process complaints within permissions that will be defined later. |
| Commune administrator | Operate administrative capabilities, including basic staff and canonical-data management, within permissions that will be defined later. |
| Technical administrator | Concept only; included only if a later security/operations analysis proves it necessary. |

The final role and permission matrix is outside this step. Authorization must eventually be enforced at trusted backend and data boundaries, not only through interface visibility.

## 4. Public website scope

The public MVP includes:

- Home.
- How it works.
- What can be reported / service scope.
- Frequently asked questions.
- Contact.
- User Guide.
- Privacy Policy.
- Accessibility.
- Terms of Use / Conditions of Use.
- Sign in.
- Create account.

Public content must explain:

- what Abaynou Tatawasal is and who may use it;
- how complaints are submitted, processed, followed, and answered;
- that complaints and related communication are private;
- the local geographic and responsibility boundary;
- examples of suitable local issues;
- what the platform does not handle, including emergencies;
- the distinction from Chikaya.ma and guidance toward other official channels;
- official Commune contact information.

The existing public designs establish an Arabic-first, restrained public-sector visual language using green, beige, white, neutral surfaces, outlined cards and controls, and consistent headers/footers. Missing MVP screens and states must later extend this system rather than introduce a second visual language.

## 5. Citizen space scope

### 5.1 Account and authentication

The Citizen MVP includes:

- create account;
- sign in and sign out;
- password recovery and reset;
- access to a private Citizen space;
- basic profile/account management;
- preferred language.

Citizen login and account recovery require email. Phone number is optional contact information and is not an MVP authentication/login method. Email verification occurs once when the Citizen first creates the account; a verified Citizen is not asked to verify again for each complaint.

### 5.2 Dashboard

The dashboard includes:

- account/greeting context;
- overview and recent complaints;
- current citizen-facing statuses;
- recent updates and Commune response visibility;
- a shortcut to submit a complaint.

### 5.3 New complaint flow

The MVP complaint flow includes:

1. Select a complaint category.
2. Enter a short subject/title.
3. Enter a text description.
4. Select a structured location within Abaynou.
5. Optionally enter a nearby street, landmark, or location clarification.
6. Review the entered information.
7. Confirm that the information is correct and the issue is inside Abaynou.
8. Submit and receive a unique complaint reference.

MVP complaints are **text only**. Photo uploads, file uploads, and document attachments are out of MVP.

### 5.4 Complaint management

Citizens can:

- view “My Complaints”;
- search their own complaints and apply basic filters;
- open complaint details;
- view the reference, subject, category, location, submission date, current status, processing/history information, Commune response, and closure information.

A Citizen must never be able to access another Citizen's complaint. This privacy boundary is mandatory and must later be verified through backend/data-layer authorization and tests.

### 5.5 Commune response and pre-processing Citizen actions

The platform is not a complaint chat system. Two-way complaint messaging, requests for clarification, Citizen replies, conversation threads, and an Awaiting Citizen workflow are out of MVP.

The Commune issues a Citizen-visible response after handling the complaint. The response is available in Citizen complaint details and triggers the approved transactional response email.

No durable complaint drafts are included. Data is preserved while the Citizen moves between steps in the active submission flow. After submission, the Citizen may edit or cancel/withdraw the complaint only before Commune processing begins. Once processing begins, the Citizen cannot edit, cancel/withdraw, or delete it. Submitted complaints are never hard-deleted; withdrawal preserves the record for traceability. Step 3 defines the exact lifecycle boundary and exceptional outcome.

## 6. Commune administration scope

Commune accounts are administrative accounts and are not created through public Citizen registration.

### 6.1 Dashboard

The administration dashboard includes:

- new complaints;
- complaints under review;
- complaints in progress;
- closed complaints;
- complaints requiring attention;
- navigation to all complaints.

These are workflow-oriented summary counters, not a Statistics feature.

### 6.2 Complaint management and processing

The Commune MVP includes:

- a complete complaint list;
- simple search and basic filters;
- complaint details;
- Citizen identity/contact information where authorized;
- category, structured location, description, date, reference, status, and history;
- collaborative review and processing by authorized Commune Agents without mandatory assignment or permanent complaint ownership;
- status updates;
- Commune response to the Citizen;
- resolution and closure.

Authorized Commune Agents operate as a team on the shared complaint workload. Any authorized Agent may continue work started by another Agent, subject to the frozen lifecycle and the approved role/security model. Every meaningful Commune action must be attributable in audit/history to the acting account, action, timestamp, affected complaint/resource, relevant previous/new state or value, and required reason where applicable.

The approved high-level processing concept is Submission → Review → Processing → Commune Response → Closed. Any required real-world action occurs outside the software before the Commune records/issues its response. Exact statuses, transitions, and exceptional outcomes remain for Step 3.

The authoritative lifecycle and the relationship between internal and Citizen-facing statuses are not defined in this step.

### 6.3 Employee management

The MVP includes viewing, adding, and editing Commune staff, with basic role and account-status handling. Final role definitions, permission boundaries, account states, invitation/activation behavior, and deactivation rules remain for later specification.

### 6.4 Categories and locations

The MVP includes viewing, adding, editing, and activating/deactivating complaint categories and locations where appropriate. These are canonical system data shared across submission, complaint details, administration, and any future reporting if separately approved—not unrelated hardcoded lists in individual screens.

The approved initial MVP catalogue is:

1. Cleanliness and waste.
2. Public lighting.
3. Roads and sidewalks.
4. Drainage and water.
5. Commune facilities.
6. Local nuisance / disturbance.
7. Other local issue.

One canonical catalogue must be used throughout the product. Categories remain administratively configurable and require final Commune validation before production. Deactivation must preserve historical complaint category information.

### 6.5 Platform settings

The settings scope includes basic management of:

- Commune name;
- contact phone and email;
- opening hours;
- Chikaya.ma link;
- supported languages;
- basic relevant public/platform text and settings.

Settings authority, validation, publication behavior, and storage are deferred.

## 7. Languages and directionality

The MVP supports from launch:

- Arabic (`ar`) with right-to-left layout;
- French (`fr`) with left-to-right layout;
- English (`en`) with left-to-right layout.

Localization applies across the public website, authentication, Citizen space, Commune administration, validation, statuses, notifications, system states, accessibility content, and privacy content. Current screenshots mainly show Arabic and expose French as a language option; English is a required design addition.

## 8. Geographic scope

The service is limited to local issues within the Commune of Abaynou. Known initial locations are:

- دوار أباينو
- دوار ايكيسل
- دوار توتلين
- دوار أبوقال
- دوار إد العربا
- دوار تبولوت

These Arabic names are the approved initial canonical values and will be structured system data. Approved French and English display values remain for later Commune validation and must not be invented. Renaming or deactivation must preserve historical complaint location information.

## 9. Workflow counters and deferred statistics

Basic operational statistics are **out of MVP** under AMEND-001. The MVP does not include:

- a statistics page;
- complaints-by-category, complaints-by-location, or complaints-over-time charts;
- open-versus-resolved analytics;
- employee workload analytics;
- an operational analytics dashboard.

Normal workflow counters already represented by the dashboard may remain where needed for navigation and operational awareness, such as new, under-review, in-processing, and closed complaint counts. These counters are not a Statistics feature. Advanced analytics and reporting remain deferred.

## 10. Basic notifications

Basic complaint-related notifications are in MVP scope for events such as:

- complaint received;
- important status change;
- Commune response available;
- complaint closed.

In-platform notifications are the primary and authoritative notification record and may include more detailed status/activity information. Transactional Citizen email is limited to complaint received, Commune response issued, and complaint closed. Email is not sent for every minor status change. The screenshots show notification bells and unread counts but no complete notification center. SMS, marketing email, complex preferences, and advanced notification automation are out of MVP.

## 11. System and non-functional scope

The production MVP must eventually include:

- responsive desktop, laptop, tablet, and mobile behavior;
- correct RTL/LTR behavior;
- accessible semantics, labels, keyboard navigation, visible focus, suitable contrast, text scaling, understandable validation, and screen-reader-friendly structure where applicable;
- secure authentication, secure sessions, strong authorization, and account deactivation/blocking where appropriate;
- server-side/data-side complaint isolation and least-privilege access;
- input validation and protection against common web vulnerabilities;
- HTTPS and secure secrets management;
- rate limiting where appropriate;
- complaint processing history and appropriate auditability;
- minimal collection of personal data, safe errors, and no sensitive information in logs;
- loading, empty, validation-failure, permission-denied, authentication-required, expired-session, not-found/404, system-error, failed-operation, and successful-operation states;
- testing appropriate to the eventual architecture;
- production deployment readiness, backups, monitoring, and recovery appropriate to the eventual architecture;
- maintainability, performance, extensibility, and reasonable operating cost.

These are requirements, not implementations or technical selections.

## 12. Explicitly out of MVP

The following are deferred to future versions unless the project owner explicitly promotes them through a later approved scope change:

- photo uploads;
- file or document attachments;
- SMS notifications;
- advanced notification automation;
- advanced analytics / BI;
- advanced reporting;
- data exports;
- SLA or deadline tracking;
- satisfaction surveys or feedback;
- advanced departmental workflows;
- internal staff notes;
- advanced search;
- external APIs;
- third-party integrations;
- basic operational statistics, charts, and employee workload analytics;
- two-way complaint messaging, clarification requests, Citizen replies, and conversation threads;
- an Awaiting Citizen workflow/state as an MVP requirement.
- mandatory assignment, reassignment, self-assignment, or permanent responsible-Agent ownership of complaints.

Simple search and filtering required to operate Citizen and Commune complaint lists remain in MVP.

## 13. Design evidence reviewed

All 24 supplied screenshots were inspected. The following summarizes the scope evidence; it is not a functional specification.

### Public website

| Design file | Scope evidence |
| --- | --- |
| [`design/public/01-home.jpg`](../design/public/01-home.jpg) | Public value proposition, privacy/local/text-only principles, summary workflow, categories, statuses, Chikaya guidance. |
| [`design/public/02-how-it-works.jpg`](../design/public/02-how-it-works.jpg) | Account, text complaint, structured location, review/submission, follow-up, citizen-facing statuses. |
| [`design/public/03-reportable-issues.jpg`](../design/public/03-reportable-issues.jpg) | Six example categories, local-scope checks, non-emergency guidance. |
| [`design/public/04-faq.jpg`](../design/public/04-faq.jpg) | Privacy, account, attachments, geographic scope, Chikaya distinction, follow-up, clarification, edit, duplicate, and emergency questions. |
| [`design/public/05-contact.jpg`](../design/public/05-contact.jpg) | Commune phone, email, address, and opening hours. |
| [`design/public/06-user-guide.jpg`](../design/public/06-user-guide.jpg) | Minimal user-guide content covering privacy, scope, location, and description guidance. |
| [`design/public/07-privacy-policy.jpg`](../design/public/07-privacy-policy.jpg) | Initial privacy and service-scope content structure. |

### Citizen space

| Design file | Scope evidence |
| --- | --- |
| [`design/Citizens/01-dashboard (1).jpg`](<../design/Citizens/01-dashboard (1).jpg>) | Greeting, action-required alert, recent complaints, references, locations, statuses, notification badge. |
| [`design/Citizens/02-my-complaints.jpg`](../design/Citizens/02-my-complaints.jpg) | Complaint list, text search, status filter, details navigation, duplicate indicator. |
| [`design/Citizens/03-complaint-details (1).jpg`](<../design/Citizens/03-complaint-details (1).jpg>) | Complaint facts, timeline, private text thread, Citizen reply control. |
| [`design/Citizens/04-new-complaint-description.jpg`](../design/Citizens/04-new-complaint-description.jpg) | Category, short subject, text description, three-step progress indicator, explicit no-upload message. |
| [`design/Citizens/05-new-complaint-location.jpg`](../design/Citizens/05-new-complaint-location.jpg) | Required douar and optional street/landmark clarification. |
| [`design/Citizens/06-complaint-review.jpg`](../design/Citizens/06-complaint-review.jpg) | Review, Abaynou/correctness confirmation, final submission action. |
| [`design/Citizens/07-account.jpg`](../design/Citizens/07-account.jpg) | Full name, phone, email, preferred language, password/language navigation, sign out. |
| [`design/Citizens/08-accessibility.jpg`](../design/Citizens/08-accessibility.jpg) | Despite its filename, the visible page is the Privacy Policy, not an Accessibility page. |
| [`design/Citizens/09-login.jpg`](../design/Citizens/09-login.jpg) | Combined phone-or-email login identifier and password; no recovery link is visible. |
| [`design/Citizens/10-create-account.jpg`](../design/Citizens/10-create-account.jpg) | Full name, combined phone-or-email field, password, and terms/privacy acceptance. |

### Commune administration

| Design file | Scope evidence |
| --- | --- |
| [`design/Commune/01-dashboard.jpg`](../design/Commune/01-dashboard.jpg) | Status counts, attention list, employee workload, global search, notification badge. |
| [`design/Commune/02-complaints.jpg`](../design/Commune/02-complaints.jpg) | Complaint list, Citizen identity, location, status, assignee, search, filters. |
| [`design/Commune/03-complaint-details.jpg`](../design/Commune/03-complaint-details.jpg) | Citizen/contact data, assignment, status/response action, history, and an out-of-scope internal-note panel. |
| [`design/Commune/04-employees.jpg`](../design/Commune/04-employees.jpg) | Staff list, role, complaint count, add/edit actions, and unsuitable complaint-status wording used as employee state. |
| [`design/Commune/05-categories-locations.jpg`](../design/Commune/05-categories-locations.jpg) | Shared category/location management, add/edit controls, active/inactive descriptions, and unsuitable complaint-status badges. |
| [`design/Commune/06-settings.jpg`](../design/Commune/06-settings.jpg) | Commune/contact/opening-hours/Chikaya fields, notification text, language and privacy/scope settings. |
| [`design/Commune/screenshot Abaynou.PNG`](<../design/Commune/screenshot Abaynou.PNG>) | Alternate/partial capture of the Commune complaint-detail screen; no additional MVP capability is established. |

## 14. Design-versus-scope gaps and conflicts

| ID | Area | Finding | MVP treatment / later resolution |
| --- | --- | --- | --- |
| GAP-01 | All | English is absent from the visible language controls and Commune settings mention Arabic/French only. | English remains in MVP; add designs/content in the design step. |
| GAP-02 | Citizen | Password recovery and reset screens are absent; the login screen has no visible recovery action. | Required in MVP; design and specify later. |
| GAP-03 | All | Notification bells/counts exist, but no notification center, list/detail, empty state, or read/unread behavior is shown. | Basic notifications remain in MVP with approved behavior; complete the missing designs later. |
| GAP-04 | Citizen | No distinct post-submission success/receipt screen is shown after the review action. | Required confirmation and unique reference remain in MVP; design later. |
| GAP-05 | Public | A dedicated Accessibility page is not shown. `Citizens/08-accessibility.jpg` is actually a second Privacy Policy capture. | Accessibility page remains in MVP; correct design coverage later without renaming/modifying supplied assets now. |
| GAP-06 | Commune | The dashboard design includes workload information and implies broader statistics. | Partially superseded by AMEND-001: remove employee workload analytics; retain only approved workflow counters without creating a Statistics feature. |
| GAP-07 | All | Screenshots are predominantly desktop-width; tablet/mobile states are not represented. | Responsive behavior remains mandatory; design/test later. |
| GAP-08 | All | Loading, empty, validation-failure, permission, session-expiry, 404, operation-failure, and general system-error states are not represented. | Required system states; design and specify later. |
| GAP-09 | Public/Commune | Category catalogues conflict: public scope shows six examples while Commune management shows five. | Superseded by the approved seven-category canonical MVP catalogue; affected designs/content must later be aligned without changing the visual system. |
| GAP-10 | Complaints | Citizen-facing status labels are visible, but no authoritative lifecycle, allowed transitions, or internal/public mapping is defined. | Define in the Complaint Lifecycle step. |
| GAP-11 | Commune | Employee and category/location rows reuse the complaint status “قيد المعالجة” even when accompanying text describes an active/inactive concept. | Terminology/content defect; correct during design/specification without treating it as approved domain language. |
| GAP-12 | Commune | Complaint detail includes “ملاحظة داخلية” (Internal Note). | Scope conflict: **deferred/out of MVP**; do not implement unless explicitly promoted. |
| GAP-13 | Communication | Citizen detail, dashboard, public content, and Commune designs contain Citizen replies, clarification, Awaiting Citizen, or conversation concepts. | Superseded by AMEND-002: remove/adapt these controls and wording; retain Citizen-visible Commune response while preserving the existing visual system. |
| GAP-14 | Commune | No distinct Commune sign-in, recovery, session, or access-denied screen is supplied. | Secure Commune authentication is required; designs and rules are pending. |
| GAP-15 | Citizen | Account navigation references password and language, but only the personal-information view is shown. | Password/account and preferred-language capabilities remain in MVP; missing views/states require design. |
| GAP-16 | Public | The User Guide screen is only a short text block and does not represent a complete end-to-end guide. | User Guide remains in MVP; content/design completeness requires review. |
| GAP-17 | Authentication/Public | Create Account requires acceptance of “Terms of Use and Privacy Policy,” but no Terms of Use / Conditions of Use page design is supplied. | Terms of Use / Conditions of Use is in MVP scope. Its missing design must follow the same visual structure and style as Privacy, Accessibility, and the other public informational pages. |
| GAP-18 | Commune | The settings screenshot displays the Chikaya value as `/https://chikaya.ma`, which is malformed. | Content/data validation issue to correct after the official link and settings rules are approved. |
| GAP-19 | Locations | The six expected Arabic douar names appear across the designs, but approved French/English display values are not provided. | Use the approved Arabic canonical values; validate French/English display labels with the Commune later without inventing them. |
| GAP-20 | Privacy/legal | Privacy screens provide only brief structural copy, not validated production privacy/retention/legal content. | Formal content and retention/deletion rules require later owner/legal review. |
| GAP-21 | Commune | Complaint lists/details show assigned/responsible employee fields and assignment controls. | Superseded by AMEND-003: adapt these elements toward current status and per-action Agent history without changing the established visual system. |

## 15. Intentionally deferred decisions

The following must not be inferred from this scope document:

- authoritative complaint lifecycle and allowed transitions;
- internal versus Citizen-facing status mapping;
- exact lifecycle boundary after which a submitted complaint becomes locked against Citizen editing/withdrawal;
- exceptional treatment/statuses for out-of-scope, rejected, insufficient-information, and pre-processing withdrawn complaints;
- final Commune roles, permission matrix, and account-state terminology;
- whether a technical administrator role is necessary;
- privacy retention, correction, deletion, and legal-content rules;
- final Commune settings authority and publication behavior;
- production domain, service ownership, and final Commune validation/sign-off owner;
- frontend, backend, database, authentication provider, hosting, deployment, monitoring, repository structure, or any other technical architecture choice.

## 16. Approval boundary and next step

This document is approved and frozen. It is now the authoritative MVP feature-scope baseline for Abaynou Tatawasal. Future changes to MVP scope require explicit project-owner approval; unresolved items above remain unresolved until their designated later step.

Step 2 — Functional Specification is in draft review. Step 3 must not begin automatically.
