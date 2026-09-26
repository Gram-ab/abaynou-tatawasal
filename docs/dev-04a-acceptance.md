# DEV-04A — Canonical Data & Real Complaint Submission

Status: **APPROVED / FROZEN**

Owner approval includes the final Citizen-header refinement completed after the combined DEV-04A regression run.

## Accepted implementation

- Seven canonical complaint categories are initialized with stable codes, explicit UUIDs, active state, and approved Arabic, French, and English development labels: cleanliness and waste, public lighting, roads and sidewalks, drainage and water, Commune facilities, local nuisance, and other local issue.
- Six authoritative locations are initialized exactly as Arabic names: دوار أباينو، دوار ايكيسل، دوار توتلين، دوار أبوقال، دوار إد العربا، دوار تبولوت. French and English interfaces deliberately display the authoritative Arabic values with Arabic language and direction markup; no translations or transliterations were invented.
- The authenticated Citizen flow uses three steps: issue description, location, and review/confirmation. It contains only category, subject, description, location, optional clarification, and the required accuracy/local-scope confirmation.
- Validation counts Unicode code points. Subject, description, and clarification enforce the approved 150/2000/300 limits; effective description content requires 20 code points. Accepted text remains exactly as authored. Whitespace-only clarification becomes `NULL`; content is never silently truncated, normalized, collapsed, or transliterated.
- Complaint references use `AB-XXXX-XXXX-XXXX`, twelve cryptographically random uppercase characters from the approved unambiguous alphabet. Generation occurs on the trusted database side; uniqueness is authoritative and collisions retry safely.
- A successful submission atomically creates the complaint, `COMPLAINT_SUBMITTED` audit event, initial complaint event, and successful `command_receipts` record. Actor plus idempotency key and an HMAC-SHA-256 canonical request fingerprint provide safe replay, changed-payload conflict detection, and response-loss recovery.
- The receipt fingerprint uses a dedicated stable `COMMAND_FINGERPRINT_SECRET`. Local setup generates it only in ignored `.env.local`, verifies that the path is ignored, never prints the value, and does not expose it to the browser. Production provisioning remains a future infrastructure gate.
- Submission rechecks verified provider identity, confirmed email, provider-session binding, the application session, Citizen role, active profile, security epoch, expiry/revocation, and completed legal evidence inside the trusted database command. Active catalogue rows are locked. A ten-per-minute per-Citizen burst control limits new submissions while allowing successful receipt replay.
- Owner-only persisted readback resolves the complaint again after commit and displays reference, localized Received status, category and location snapshots, clarification, original subject and description, and an Africa/Casablanca timestamp. References, command keys, and internal UUID guessing do not grant access. Internal complaint UUIDs remain private.
- Unsent wizard content exists only in client memory. Locale switching preserves it during the active wizard. Complaint content is not stored in local storage, session storage, cookies, or URLs. Refresh may discard unsent content, and intentional navigation warns the Citizen.
- New Complaint is active in the Citizen landing page and authenticated shell. There is no complaint list, history, tracking, editing, withdrawal, Commune intake, notification, or email functionality in DEV-04A.
- The final approved Citizen header follows the dashboard design: brand, single-line Citizen home/New Complaint/Help navigation, compact language control, and a clickable avatar/name dropdown containing My Account and Sign Out. It collapses to the existing mobile menu pattern when space is insufficient. There is no notification bell or My Complaints navigation in this slice.
- Arabic, French, and English are supported. Arabic is RTL; French and English are LTR. User-authored text uses safe bidirectional rendering, Arabic place names remain correctly marked inside LTR interfaces, and references remain LTR-isolated.
- Desktop, tablet, mobile, and 320px layouts reflow without horizontal overflow. The wizard has progress semantics, keyboard focus movement, accessible errors and required states, minimum touch targets, visible focus, mobile menu and dropdown dismissal, Escape focus return, and non-color read cues where applicable.
- Three additive migrations introduce exactly categories, category translations, locations, location translations, complaints, complaint events, and command receipts. Catalogue initialization is deterministic, idempotent, conflict detecting, and audited. FORCE RLS, narrow trusted functions, least-privilege grants, immutable evidence, owner isolation, atomic rollback, catalogue/session race handling, reference collision handling, and Agent/Admin/public denial are enforced.

## Final verification record

- Isolated clean reconstruction: **PASS** — all eleven migrations, canonical initialization, idempotent rerun, and automatic disposal of the generated verification database.
- Database: **252 passed** — foundation 30, public 76, Citizen 40, Commune 52, DEV-04A complaints 54.
- Unit/component/integration: **116 passed** across 12 files.
- Full combined E2E: **104 passed, 0 failed** — DEV-01 public 70, DEV-02 Citizen Auth 9, DEV-03 Commune Auth 20, DEV-04A complaint 5.
- Typecheck: **PASS**.
- Lint: **PASS**, with no errors or warnings.
- Production build: **PASS**.

The final Citizen-header refinement was verified after the combined run with focused checks only, as approved:

- Citizen-header component tests: **7 passed**.
- Targeted Citizen complaint-page E2E: **3 passed** across Arabic, French, and English, covering desktop, tablet, mobile, 320px reflow, single-line desktop navigation, account dropdown behavior, mobile menu behavior, RTL/LTR, keyboard focus, outside-click dismissal, and Escape dismissal.
- Post-refinement typecheck: **PASS**.
- Post-refinement lint: **PASS**.
- Post-refinement production build: **PASS**.

The complete historical suite was not rerun after the presentation-only header refinement because its targeted component/E2E checks passed and it did not change database, authentication, session, authorization, complaint submission, or security behavior.

## Frozen-source and scope confirmation

- DEV-01 and DEV-02 migrations are unchanged.
- The DEV-03 migration is unchanged.
- Frozen planning documents and DEV-01/02/03 acceptance records are unchanged.
- Design handoff and reference files are unchanged.
- No hosted Supabase project was created, linked, or modified.
- No destructive reset of the owner's local review database occurred; existing review accounts were preserved.
- No production SMTP, hosting, or production secret was configured.
- DEV-04B notification/email functionality did not start.
- DEV-05 complaint-list/tracking functionality did not start.

## Remaining release gates

Official production catalogue wording, approved French/English place names, production fingerprint-secret provisioning, production infrastructure/hosting, and Commune-owned legal/content confirmation remain future release gates.
