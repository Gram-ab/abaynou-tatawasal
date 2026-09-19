# Abaynou Tatawasal — Complaint Lifecycle

## Document control

| Field | Value |
| --- | --- |
| Project | Abaynou Tatawasal — أباينو تتواصل |
| Organization | Commune of Abaynou, Morocco |
| Step | Step 3 — Complaint Lifecycle |
| Status | **APPROVED / FROZEN** |
| Governing scope | [`docs/01-mvp-scope.md`](01-mvp-scope.md), **APPROVED / FROZEN** |
| Governing functional specification | [`docs/02-functional-specification.md`](02-functional-specification.md), **APPROVED / FROZEN** |
| Implementation status | Not started |
| Architecture status | Not selected |

### LC-AMEND-001 — NOT_ACCEPTED Email Privacy Alignment

**APPROVED CONTROLLED AMENDMENT — explicit project-owner approval.** This amendment supersedes earlier Step-3 wording requiring the full NOT_ACCEPTED explanation in email. It aligns email delivery with the later approved [Step 5 Technical Architecture](05-technical-architecture.md#112-transactional-email), [Step 6A Database Architecture](06-database-architecture.md#8-email--smtp), and [Step 6B approved model direction](06b-database-data-model.md#111-remaining-frozen-source-email-contradiction--must-resolve-before-model-freeze). Step 3 remains **APPROVED / FROZEN**; Step 6B remains DRAFT and is not modified or frozen by this amendment.

The full controlled NOT_ACCEPTED reason and mandatory human-readable explanation remain Citizen-visible in authenticated complaint detail/history and preserved in durable complaint/response history. The existing RESPONSE/outcome email contains only a minimal outcome/response-available notification, complaint reference and secure authenticated complaint link—not the full explanation, response body, complaint description or sensitive complaint content. Corrections follow the same minimal-email rule while preserving every response version and displaying the current corrected version on the authenticated platform.

Complaint and Commune-response text may contain personal or unexpectedly sensitive information. Email therefore carries only what is necessary to notify the Citizen and direct them to the authenticated platform. The in-platform complaint detail and durable application/database response history remain authoritative; email is neither the authoritative response nor its durable record. Email delivery success or failure does not change complaint status, and email failure does not roll back a committed NOT_ACCEPTED outcome.

This is an email/privacy consistency amendment, not a change to the state machine, controlled reasons, terminal states, response requirements, correction authority/history, reopening or no-chat rules. All other Step-3 lifecycle decisions remain frozen and unchanged. No new email category, privacy subsystem, legal workflow or database design is introduced.

## 1. Purpose, authority, and boundaries

**Approval note:** This document is now the authoritative complaint lifecycle/state-transition baseline for the Abaynou Tatawasal MVP. Future lifecycle changes require explicit project-owner approval and must remain consistent with [`docs/01-mvp-scope.md`](01-mvp-scope.md) and [`docs/02-functional-specification.md`](02-functional-specification.md).

This document records the project-owner-approved authoritative MVP complaint state machine. It governs complaint status behavior across the Citizen and Commune interfaces, later authorization rules, backend behavior, data constraints, notifications, history, and tests.

The frozen Scope defines what the MVP includes. The frozen Functional Specification defines how the included features behave. This document defines complaint states, business transitions, transition prerequisites, Citizen-facing status concepts, and lifecycle event expectations. It does not change either frozen document.

This document does **not**:

- define roles or the final permission matrix;
- choose technologies or implementation mechanisms;
- design database tables, fields, migrations, or constraints;
- define assignment authority or the employee-versus-department model;
- add internal notes, attachments, analytics, SLAs, escalations, or other deferred features;
- introduce two-way messaging, clarification requests, Citizen replies, conversation threads, or an Awaiting Citizen state;
- authorize Step 4 or implementation work.

### 1.1 Supporting design context inspected

The following complaint-related screenshots were inspected as supporting visual evidence. Their status badges, timelines, cards, and history patterns inform future presentation, but any chat, reply, Awaiting Citizen, workload-analytics, or internal-note content is superseded by the frozen documents.

| Design | Relevant visible context |
| --- | --- |
| [`design/Citizens/01-dashboard (1).jpg`](<../design/Citizens/01-dashboard (1).jpg>) | Recent complaints and received, under-review, in-processing, and closed badges; the clarification alert is superseded. |
| [`design/Citizens/02-my-complaints.jpg`](../design/Citizens/02-my-complaints.jpg) | Citizen complaint list and status filtering; the Awaiting Citizen badge is superseded. |
| [`design/Citizens/03-complaint-details (1).jpg`](<../design/Citizens/03-complaint-details (1).jpg>) | Complaint status and chronological progress presentation; reply/thread controls are superseded. |
| [`design/Commune/01-dashboard.jpg`](../design/Commune/01-dashboard.jpg) | Workflow counters and attention list; Awaiting Citizen and workload analytics are superseded. |
| [`design/Commune/02-complaints.jpg`](../design/Commune/02-complaints.jpg) | Commune complaint list, status, assignment, and filters; the Awaiting Citizen badge is superseded. |
| [`design/Commune/03-complaint-details.jpg`](../design/Commune/03-complaint-details.jpg) | Assignment, status/response controls, and history; internal notes are out of MVP. |

## 2. Lifecycle principles

The lifecycle follows these rules:

1. A successfully submitted complaint enters one and only one current lifecycle state.
2. The normal path is simple and directional: Submission → Review → Processing → Commune Response → Closed.
3. Assignment, reassignment, Citizen edits while permitted, and response correction are auditable events, not extra lifecycle states.
4. A submitted complaint is never hard-deleted. Withdrawal and non-acceptance preserve its reference, content, and history.
5. Citizen edit and withdrawal cease when Commune handling formally begins.
6. Normal closure requires an issued Commune response.
7. Terminal exceptional outcomes require a clear Citizen-facing explanation where the Commune makes the decision.
8. Terminal complaints do not reopen in MVP.
9. Internal lifecycle codes are language-neutral. Arabic, French, and English labels are presentation concepts, not technical identifiers.
10. Every transition must be validated against the allowed transition rules and recorded in history.

## 3. Proposed authoritative lifecycle

### 3.1 Normal path

```text
SUBMITTED
    ↓
UNDER_REVIEW
    ↓
IN_PROCESSING
    ↓
RESPONSE_SENT
    ↓
CLOSED
```

### 3.2 Exceptional paths

```text
SUBMITTED ───────────────→ WITHDRAWN

UNDER_REVIEW ────────────→ NOT_ACCEPTED

IN_PROCESSING ───────────→ NOT_ACCEPTED
```

`NOT_ACCEPTED` uses a mandatory controlled reason classification rather than separate overlapping lifecycle states. The approved initial reason concepts are:

- `OUT_OF_SCOPE` — the matter may be legitimate but is outside the geographic or administrative responsibility of Abaynou Tatawasal/the Commune;
- `INSUFFICIENT_INFORMATION` — the submitted information is inadequate to process the complaint and no in-platform clarification workflow exists.

Any additional non-acceptance reason requires explicit later approval. A generic `REJECTED` lifecycle state is not included.

Whether confirmed duplicates should become an additional defined reason is a project-owner lifecycle decision in section 15.

### 3.3 Why `RESPONSE_SENT` is a state

The approved LC-01 decision retains `RESPONSE_SENT` as a distinct lifecycle state rather than treating response issuance as an invisible action immediately before `CLOSED`.

This keeps the model aligned with two separately approved Citizen events: the Commune response and complaint closure. It gives the Commune an explicit, auditable checkpoint showing that the authoritative response is available to the Citizen before closure. It also prevents a complaint from appearing closed when response issuance failed. No extra discussion or Citizen reply becomes possible in this state; its only normal next lifecycle state is `CLOSED`.

## 4. State definitions

### 4.1 State summary

| Code concept | Business meaning | Entered by | Allowed next states | Citizen edit | Citizen withdrawal | Commune processing actions | Response expectation | Terminal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SUBMITTED` | Submission succeeded, a reference exists, and Commune review has not begun. | Successful Citizen submission confirmed by the system. | `UNDER_REVIEW`, `WITHDRAWN` | Yes | Yes | Intake/viewing only; beginning review changes state. | Not yet expected. | No |
| `UNDER_REVIEW` | The Commune has begun formal review of scope, completeness, and suitability for processing. | Confirmed Commune review action. | `IN_PROCESSING`, `NOT_ACCEPTED` | No | No | Review, assignment, classification checks, and allowed state actions. | Not yet required. | No |
| `IN_PROCESSING` | The complaint has been accepted for handling and operational work is underway or being coordinated. | Confirmed Commune processing action after review. | `RESPONSE_SENT`, `NOT_ACCEPTED` | No | No | Assignment/reassignment, handling, status action, and response preparation. | Required before normal completion. | No |
| `RESPONSE_SENT` | The Commune has issued its authoritative Citizen-visible response. | Successful response issuance by an authorized Commune actor. | `CLOSED` | No | No | Closure and any controlled response correction; no Citizen exchange. | Must already exist and be visible. | No |
| `CLOSED` | Normal handling is complete after a Commune response was issued. | Confirmed Commune closure action from `RESPONSE_SENT`. | None in MVP. | No | No | Read/history only, except controlled correction described in section 9. | Mandatory and retained. | Yes |
| `WITHDRAWN` | The Citizen withdrew the complaint before Commune review began. | Confirmed Citizen withdrawal from `SUBMITTED`. | None. | No | Already completed | Read/history only. | No Commune response required. | Yes |
| `NOT_ACCEPTED` | The Commune cannot process the complaint under the MVP service, for one mandatory defined reason. | Confirmed Commune decision from `UNDER_REVIEW` or `IN_PROCESSING`. | None. | No | No | Read/history only, except controlled correction of the explanation. | Mandatory Citizen-facing decision explanation. | Yes |

“Entered by” identifies the business source of a transition, not a final role or permission rule. Step 4 will define which Commune accounts may perform each action.

### 4.2 `SUBMITTED`

- Entry occurs only after successful creation is confirmed and a unique complaint reference exists.
- The Citizen receives the approved in-platform confirmation and complaint-receipt email.
- The complaint appears as received/new in Citizen and Commune views.
- The Citizen may edit the approved complaint fields without changing the complaint reference. Each confirmed edit is auditable but does not change the state.
- The Citizen may withdraw after explicit confirmation. Withdrawal transitions to `WITHDRAWN`; it never deletes the record.
- Commune review has not yet begun. Merely opening or viewing the record must not silently change its state.

### 4.3 `UNDER_REVIEW`

- Entry is an explicit Commune action that records the start of formal handling.
- Entering this state is the approved Citizen edit/withdrawal lock boundary.
- The Commune evaluates scope, completeness, category/location suitability, and whether the complaint can proceed.
- Assignment may occur without creating a separate lifecycle state.
- A complaint that can be handled proceeds to `IN_PROCESSING`.
- A complaint that cannot be handled proceeds to `NOT_ACCEPTED` with a mandatory defined reason and explanation.

### 4.4 `IN_PROCESSING`

- The complaint has passed review and the Commune is handling or coordinating the real-world issue.
- Real-world work occurs outside the software; the lifecycle records only the complaint's administrative progress.
- The Citizen cannot edit, withdraw, delete, reply, or reopen the complaint.
- Response preparation does not create a new state. Only successful issuance enters `RESPONSE_SENT`.
- If a disqualifying fact is discovered during processing, the complaint may transition to `NOT_ACCEPTED` with a mandatory reason and explanation.

### 4.5 `RESPONSE_SENT`

- Entry requires successful issuance of a non-empty Commune response that satisfies the frozen text rules.
- The response becomes visible in Citizen complaint details and triggers the approved response notification and transactional response email.
- A failed response operation must leave the complaint in `IN_PROCESSING` and must not expose the response as issued.
- This is not a conversation state. The Citizen cannot reply and the Commune cannot request clarification.
- The only normal lifecycle transition is to `CLOSED`.

### 4.6 `CLOSED`

- Entry is allowed only from `RESPONSE_SENT`.
- Closure records that normal complaint handling is complete and triggers the approved closure notification and transactional closure email.
- The response, closure time, and Citizen-visible history remain available.
- The complaint is terminal and cannot be reopened in MVP.

### 4.7 `WITHDRAWN`

- Entry is allowed only from `SUBMITTED`, following explicit Citizen confirmation.
- The original complaint reference and submitted information remain preserved for traceability.
- The withdrawal event identifies the Citizen as the actor and records its timestamp.
- No Commune response is required and no transactional email is added. The in-platform operation confirmation/history is authoritative.
- The complaint cannot return to active processing. A later issue requires a new complaint.

### 4.8 `NOT_ACCEPTED`

- Entry is allowed from `UNDER_REVIEW` or `IN_PROCESSING` when the Commune cannot process the complaint.
- The transition requires a defined reason classification and a clear Citizen-facing explanation.
- For `OUT_OF_SCOPE`, the explanation should guide the Citizen toward Chikaya.ma or another appropriate official channel where applicable, without implying legal equivalence.
- For `INSUFFICIENT_INFORMATION`, the explanation states what was inadequate and that the Citizen may submit a new corrected complaint. No clarification request or reply action is offered.
- The full controlled reason and explanation are the Commune's decision response, visible in authenticated complaint detail/history and preserved in durable complaint/response history. Committing NOT_ACCEPTED triggers the existing in-platform notification and RESPONSE/outcome email containing only a minimal availability notice, complaint reference and authenticated link—not the full explanation or response body. It does not create a new email event type.
- Because the state is already terminal, it does not subsequently transition to `CLOSED` and does not send a second closure email.
- The complaint cannot return to processing. A corrected or newly eligible matter requires a new complaint.

## 5. Citizen edit and withdrawal boundary

### 5.1 Approved rule

Citizen editing and withdrawal are allowed only while the complaint is `SUBMITTED`. They lock immediately when the Commune explicitly transitions the complaint to `UNDER_REVIEW`.

This is the cleanest operational rule because it provides one visible, auditable boundary and prevents complaint content from changing while staff are reviewing it. The distinction is:

- before `UNDER_REVIEW`: received but not yet formally handled;
- from `UNDER_REVIEW` onward: Commune handling has begun, so the complaint is locked.

An employee merely viewing the complaint does not trigger the lock. The lock occurs only after the explicit and successfully recorded transition to `UNDER_REVIEW`.

### 5.2 Edit behavior while permitted

- Edit retains the complaint reference and current `SUBMITTED` state.
- The complete approved complaint fields are revalidated.
- History records that the Citizen changed the complaint, with timestamp and actor. The exact field-level audit representation is a Step 6 matter.
- A failed edit does not partially change the confirmed complaint.

### 5.3 Withdrawal behavior while permitted

- Withdrawal requires explicit confirmation because it is terminal.
- Successful withdrawal transitions `SUBMITTED` → `WITHDRAWN`.
- Withdrawal preserves the complaint and its history; no hard deletion occurs.
- A failed withdrawal leaves the complaint `SUBMITTED`.

## 6. Exceptional-outcome model

### 6.1 Approved states

The MVP needs two exceptional terminal lifecycle states:

1. `WITHDRAWN`, because it is initiated by the Citizen before handling and has no Commune decision response.
2. `NOT_ACCEPTED`, because it is a Commune decision that requires a defined reason and Citizen-facing explanation.

### 6.2 Why `OUT_OF_SCOPE`, `REJECTED`, and `INSUFFICIENT_INFORMATION` are not separate states

These concepts all mean the complaint cannot proceed to normal processing. Making each a lifecycle state would duplicate identical transition and terminal behavior. The simpler professional model is one `NOT_ACCEPTED` state with a mandatory reason classification.

`REJECTED` is not recommended as a standalone state because it is broad, potentially unclear to Citizens, and overlaps both out-of-scope and insufficient-information outcomes. Any additional rejection reason must be explicitly defined and approved rather than represented by an unexplained generic rejection.

The reason classification remains operationally meaningful for filtering, Citizen explanation, audit, and future reporting if separately approved, without expanding the state machine.

## 7. Insufficient information

The approved behavior is terminal non-acceptance:

1. The Commune selects the `INSUFFICIENT_INFORMATION` reason while moving the complaint from `UNDER_REVIEW` or, if discovered later, `IN_PROCESSING` to `NOT_ACCEPTED`.
2. A clear explanation is mandatory and identifies the missing or inadequate information without requesting an in-platform reply.
3. The Citizen sees the full controlled reason and explanation in authenticated complaint detail/history and receives an in-platform notification. The approved RESPONSE/outcome email only announces that an outcome/response is available, gives the complaint reference and links to the authenticated detail; it does not contain the explanation body.
4. The complaint remains terminal and auditable.
5. The Citizen may submit a new corrected complaint, which receives a new reference and follows the lifecycle from `SUBMITTED`.

The original complaint is not edited, reopened, or linked through a conversation workflow.

## 8. Citizen-facing status mapping

Internal lifecycle states map to simple Citizen-facing status concepts. The Citizen interface must not expose assignment details, internal operational wording, or future internal substeps as separate statuses. The following Arabic, French, and English concepts are approved under LC-10; final linguistic review may refine wording without changing the approved meaning.

| Internal state | Arabic concept | French concept | English concept | Citizen-facing meaning |
| --- | --- | --- | --- | --- |
| `SUBMITTED` | تم الاستلام | Reçue | Received | The complaint was successfully received and has not entered Commune review. |
| `UNDER_REVIEW` | قيد الدراسة | En cours d’examen | Under review | The Commune is reviewing whether and how the complaint can be handled. |
| `IN_PROCESSING` | قيد المعالجة | En cours de traitement | In progress | The complaint was accepted and handling is underway. |
| `RESPONSE_SENT` | تم الرد | Réponse envoyée | Response sent | The Commune's response is available in complaint details. |
| `CLOSED` | تم الإغلاق | Clôturée | Closed | Normal handling is complete after the Commune response. |
| `WITHDRAWN` | تم السحب | Retirée | Withdrawn | The Citizen withdrew the complaint before review began. |
| `NOT_ACCEPTED` | تعذر قبول الشكاية | Non acceptée | Not accepted | The complaint cannot be processed; the specific reason and explanation are shown. |

For `NOT_ACCEPTED`, the status label must always be accompanied in complaint details by the reason-specific explanation. `OUT_OF_SCOPE` and `INSUFFICIENT_INFORMATION` are reason concepts, not additional headline lifecycle statuses.

## 9. Commune response, closure, and correction

### 9.1 Normal closure

- A normal complaint cannot close without an issued Commune response.
- Successful response issuance transitions `IN_PROCESSING` → `RESPONSE_SENT`.
- Successful closure transitions `RESPONSE_SENT` → `CLOSED`.
- Processing completion alone does not imply that either response issuance or closure succeeded.
- The response and closure are separate actions and history events, consistent with their separate Citizen notification/email events.

### 9.2 Exceptional terminal outcomes

- `NOT_ACCEPTED` requires a mandatory reason and explanatory Commune decision response.
- The explanation remains in the authenticated platform and durable response history; its availability reuses the approved response notification/email category with only a minimal notice, reference and authenticated link in email.
- It does not also trigger the closure email because non-acceptance is already terminal and there is no separate closure transition.
- `WITHDRAWN` requires no Commune response because it is a Citizen-initiated outcome before review.

### 9.3 Response correction

The approved LC-06 rule permits a controlled administrative correction to an issued response, including after closure, without reopening or changing the complaint's lifecycle state.

- Correction requires an explicit reason.
- The original response and every corrected version remain preserved in audit history; correction must never silently overwrite an earlier version.
- Each correction records its required reason, actor, and timestamp.
- The corrected response becomes the current authoritative Citizen-visible response.
- The Citizen is notified using the existing response-notification/email category where appropriate; this is not a new notification or email category. The current corrected response/explanation remains visible in the authenticated platform; any email is a minimal availability notice with reference and authenticated detail link, never the corrected full body.
- Who may correct a response is a Step 4 permission decision, and how versions are stored is a Step 6 data-model decision.
- Corrections address mistakes in the Commune response. They must not be used to restart handling, add a conversation, or process a new issue.

## 10. Reopening

Reopening `CLOSED`, `WITHDRAWN`, or `NOT_ACCEPTED` complaints is out of MVP under approved LC-07.

This keeps terminal meaning reliable, prevents unapproved backward transitions, and avoids introducing rules for re-assignment, repeated notifications, revised closure, or Citizen exchanges. A new or materially changed issue should be submitted as a new complaint. A response correction follows section 9.3 and does not reopen the case.

## 11. Notifications by lifecycle event

In-platform notifications remain the primary and authoritative notification record. Exactly three application email categories remain: complaint received, Commune response/outcome available (RESPONSE), and complaint closed. NOT_ACCEPTED uses RESPONSE, not a fourth category or an additional closure email. Emails contain only minimal notification information, complaint reference and an authenticated link; full complaint descriptions, response/explanation bodies and sensitive complaint content remain on the secure platform. Email delivery success/failure does not change committed complaint state or roll back NOT_ACCEPTED; durable application/database response history and authenticated complaint detail remain authoritative, not email.

| Event | In-platform Citizen notification | Citizen email | Notes |
| --- | --- | --- | --- |
| Enter `SUBMITTED` | Yes | Complaint-receipt email | Includes/reference-links to the new complaint. |
| Enter `UNDER_REVIEW` | Yes | No | Meaningful status update. |
| Enter `IN_PROCESSING` | Yes | No | Meaningful status update. |
| Enter `RESPONSE_SENT` | Yes | Commune-response email | Links to the issued response where authorized. |
| Enter `CLOSED` | Yes | Complaint-closure email | Confirms normal closure. |
| Enter `WITHDRAWN` | Operation confirmation/history; no additional email event | No | Citizen initiated the action. |
| Enter `NOT_ACCEPTED` | Yes | Commune-response/outcome email (RESPONSE) | Minimal outcome-available notice, complaint reference and authenticated detail link only; full mandatory reason/explanation remains in the secure platform/history. No separate closure email. |
| Correct issued response | Yes | Commune-response email | Reuses the existing response event type; minimal notice/reference/authenticated link, not the corrected full body. |

Assignment and Citizen edit history do not require Citizen email. Whether any such event merits an in-platform notification beyond the events above must remain limited to meaningful Citizen-visible activity and cannot expose internal-only information. Recipients and Commune-side notifications are Step 4 decisions.

No fourth NOT_ACCEPTED email category, withdrawal email, minor-status email, staff email notification, SMS, chat message, clarification-request email, marketing email, advanced automation, or complex notification preference is introduced.

## 12. History and audit expectations

Every successful lifecycle transition must create a durable conceptual history event containing:

- previous lifecycle state;
- new lifecycle state;
- transition timestamp;
- actor or system source;
- mandatory reason classification where applicable;
- mandatory Citizen-facing explanation where applicable.

The following material non-transition actions must also be auditable:

- Citizen edit while `SUBMITTED`;
- Citizen withdrawal confirmation;
- assignment or reassignment;
- response issuance;
- response correction, including the previous response and correction reason;
- closure.

Failed or unconfirmed operations must not create a successful transition event or falsely display the requested state. Exact audit storage, retention, field-level detail, and database constraints belong to Step 6.

Citizen-visible history is a filtered presentation of meaningful events, not the complete internal audit record. It must show status changes, response availability/correction, non-acceptance reason, withdrawal, and closure where applicable without exposing unauthorized staff or internal security information. The final visibility permission rules belong to Step 4.

## 13. Allowed transition matrix

`✓` means the direct lifecycle transition is allowed. `—` means it must be rejected.

| From \ To | `SUBMITTED` | `UNDER_REVIEW` | `IN_PROCESSING` | `RESPONSE_SENT` | `CLOSED` | `WITHDRAWN` | `NOT_ACCEPTED` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SUBMITTED` | — | ✓ | — | — | — | ✓ | — |
| `UNDER_REVIEW` | — | — | ✓ | — | — | — | ✓ |
| `IN_PROCESSING` | — | — | — | ✓ | — | — | ✓ |
| `RESPONSE_SENT` | — | — | — | — | ✓ | — | — |
| `CLOSED` | — | — | — | — | — | — | — |
| `WITHDRAWN` | — | — | — | — | — | — | — |
| `NOT_ACCEPTED` | — | — | — | — | — | — | — |

Creation into `SUBMITTED` is the initial lifecycle entry, not a transition from another persisted complaint state. Citizen edits, assignment/reassignment, and response corrections are actions/events that retain the current lifecycle state and therefore are not represented as self-transitions.

## 14. Invalid transitions and rejected actions

At minimum, the following must be rejected:

- `SUBMITTED` → `IN_PROCESSING`, because formal review cannot be skipped;
- `SUBMITTED` → `CLOSED` or `NOT_ACCEPTED`, because the Commune must first begin review;
- `UNDER_REVIEW` → `RESPONSE_SENT` or `CLOSED`, because processing and the mandatory normal response sequence cannot be skipped;
- `IN_PROCESSING` → `CLOSED`, because normal closure requires successful response issuance;
- `RESPONSE_SENT` → `IN_PROCESSING`, because reopening/backward processing is not in MVP;
- any transition out of `CLOSED`, `WITHDRAWN`, or `NOT_ACCEPTED`;
- withdrawal from `UNDER_REVIEW` or any later state under the approved lock boundary;
- Citizen editing from `UNDER_REVIEW` or any later state;
- entering `RESPONSE_SENT` without a valid successfully issued response;
- entering `CLOSED` without an existing issued response;
- entering `NOT_ACCEPTED` without a defined reason and Citizen-facing explanation;
- using response correction to change the lifecycle state or reopen handling;
- treating assignment, viewing, or a failed operation as a lifecycle transition.

An invalid request must leave the complaint in its last confirmed state, must not create a successful transition event, and must return safe, understandable feedback. Authorization and security handling are defined in Step 4; implementation and concurrency handling are defined later.

## 15. Project-owner-approved lifecycle decisions

LC-01 through LC-10 have been reviewed and approved by the project owner. This document is approved and frozen.

| ID | Status | Approved decision |
| --- | --- | --- |
| LC-01 | **APPROVED** | Keep `RESPONSE_SENT` as a distinct state. Response issuance and closure are separate auditable actions in the normal five-state path. |
| LC-02 | **APPROVED** | Citizen editing and withdrawal are allowed only in `SUBMITTED`; both lock on the explicit transition to `UNDER_REVIEW`. No submitted complaint is hard-deleted. |
| LC-03 | **APPROVED** | Use terminal `NOT_ACCEPTED` with a mandatory controlled reason, initially `OUT_OF_SCOPE` or `INSUFFICIENT_INFORMATION`; do not create separate reason states or a generic `REJECTED` state. Keep `WITHDRAWN` separate and terminal. |
| LC-04 | **APPROVED** | Insufficient information transitions to `NOT_ACCEPTED` with a required explanation and Citizen notification. A corrected matter uses a new complaint; no clarification/reply workflow is introduced. |
| LC-05 | **APPROVED** | Normal closure requires a Commune response and follows `IN_PROCESSING` → `RESPONSE_SENT` → `CLOSED`; direct `IN_PROCESSING` → `CLOSED` is prohibited. |
| LC-06 | **APPROVED WITH CLARIFICATION** | Permit controlled response correction without reopening or changing state. Preserve the original and every corrected version; require the correction reason, actor, and timestamp; notify through the existing response category where appropriate. Authority is Step 4 and version storage is Step 6. |
| LC-07 | **APPROVED** | Reopening `CLOSED`, `WITHDRAWN`, or `NOT_ACCEPTED` is out of MVP. Terminal states have no normal outgoing transitions; materially new or unresolved issues use a new complaint. |
| LC-08 | **APPROVED** | `NOT_ACCEPTED` requires an explanation and reuses the Commune-response notification/email category; it does not also send a closure email. |
| LC-09 | **APPROVED** | Duplicate indication is not a lifecycle state. It may later be metadata, an operational flag, or an explicitly approved `NOT_ACCEPTED` reason; no database representation is defined here. |
| LC-10 | **APPROVED** | Use stable language-neutral internal state codes and simplified Arabic, French, and English Citizen labels. Do not expose technical codes or select a localization mechanism here. |

No further Step 3 project-owner lifecycle decision remains after LC-01 through LC-10. Future changes must follow the approval boundary stated in section 1 and must not silently change these approved decisions.

## 16. Validation checklist

- The normal lifecycle follows Submission → Review → Processing → Commune Response → Closed.
- The lifecycle is consistent with the frozen Scope and Functional Specification.
- `Awaiting Citizen` is absent from the state machine and explicitly excluded.
- Citizen replies, clarification requests, and conversation workflows are absent.
- Citizen editing and withdrawal are allowed only in `SUBMITTED` and lock on entry to `UNDER_REVIEW` under approved LC-02.
- Withdrawal preserves the complaint; no submitted complaint is hard-deleted.
- Exceptional behavior uses non-overlapping `WITHDRAWN` and `NOT_ACCEPTED` terminal states.
- Insufficient information is terminal and requires a clear explanation; a corrected matter uses a new complaint.
- Normal closure requires a successfully issued response.
- Response and closure notification/email behavior remains within the three frozen transactional email categories.
- No reopening, internal notes, attachments, SLA states, escalations, advanced workflow, or analytics were introduced.
- No final role/permission matrix is defined.
- No database model, schema, table, migration, technology, service, or architecture choice is defined.

## 17. Approval boundary

This document is **APPROVED / FROZEN**. LC-01 through LC-10 and the lifecycle defined here are authoritative within the frozen MVP scope and functional behavior.

Step 4 — Roles, Permissions, and Security must not begin automatically.
