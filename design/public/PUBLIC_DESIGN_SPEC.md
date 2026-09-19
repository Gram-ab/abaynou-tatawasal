# Abaynou Tatawasal — Public-Side Design Specification

Status: approved public visual direction.  
Primary language: Arabic (`dir="rtl"`).  
Secondary language: French (`dir="ltr"`).  
Design target: a calm, official, accessible Moroccan communal service—not a marketing landing page and not a generic SaaS dashboard.

## 1. Visual character

The public side should feel local, trustworthy, quiet, and practical. It uses the Commune of Abaynou identity, a restrained architectural line illustration, and very faint zellige at the edge of the hero. The interface is mostly white and ivory, with deep municipal green for identity and actions.

Key rules:

- Use generous white space, clear hierarchy, and simple explanations.
- Keep the header compact and the main action obvious without making it oversized.
- Prefer borders and tonal background changes over card shadows.
- Use icons to support meaning, never as decoration or emoji.
- Do not use gradients, glassmorphism, stock photos, large colored hero blocks, floating blobs, heavy shadows, or excessive rounded cards.
- Public complaints are private, text-only, and limited to locations inside Abaynou.
- Chikaya.ma appears only as a narrow orientation banner immediately above the footer.

## 2. Design tokens

### Colors

| Token | Value | Use |
| --- | --- | --- |
| `green-700` | `#0F5A42` | Brand, primary buttons, headings, active navigation, icons |
| `green-800` | `#174F3F` | Dark supporting green |
| `sage-100` | `#EAF3EE` | Icon circles, soft emphasis |
| `ivory-50` | `#FAF8F2` | Alternating information sections |
| `sand-100` | `#F4EFE4` | Warm neutral support |
| `surface-soft` | `#F5F8F6` | Status journey / soft green sections |
| `ink-900` | `#202622` | Primary body text |
| `ink-600` | `#65706B` | Secondary text |
| `line-200` | `#DFE3DF` | Standard borders and dividers |
| `blue-600` | `#245F9E` | Received/information status only |
| `amber-700` | `#A86600` | Review/warning status only |
| `orange-700` | `#B84D22` | Attention status only |
| `white` | `#FFFFFF` | Main page and card surface |

Additional approved surfaces:

- Chikaya banner: background `#FAF7EF`, border `#E7DFCF`.
- Scope note: background `#FFFCF6`, border `#E4DBC9`.
- Emergency note: background `#FFF9EF`, border `#ECD2AA`.
- Help band: background `#F5FAF7`, border `#CFDCD5`.

Never use semantic blue, amber, or orange as decoration; they are reserved for statuses and warnings.

### Typography

- Family: **IBM Plex Sans Arabic**.
- Self-host weights `400`, `500`, `600`, and `700`; do not rely on an OS fallback.
- Recommended package: `@fontsource/ibm-plex-sans-arabic`.
- Fallback: `Arial, sans-serif` only after the font files.
- Body: `16px`, line-height `1.65`.
- Hero H1: `47px / 1.4`, weight `700`; `40px` below 1100px, `35px` below 820px, `30px` below 600px.
- Information-page H1: `40px / 1.4`, weight `700`; `34px` below 820px, `30px` below 600px.
- Section H2: `33px / 1.45`, weight `700`; `28px` on mobile.
- Card H3: `18–20px`, weight `600–700`.
- Hero lead: `18px / 1.85`; `16px` on mobile.
- Eyebrow: `14px`, weight `600`, brand green, with a `34px × 1px` leading line.
- Supporting copy: `14–16px`, line-height `1.75–1.9`, muted ink.
- Small labels: `12–13px`; do not shrink core information below `12px`.

### Layout, sizing, and rhythm

- Global desktop content width: `1240px` maximum.
- Information-page content width: `1160px` maximum; introduction copy max `830px`.
- Desktop side gutter: `24px`; mobile side gutter: `16px`.
- Header: `78px` desktop, `68px` at `≤820px`.
- Standard button: `46px` high, horizontal padding `18px`, radius `8px`.
- Compact interactive controls: minimum `44px` square/tall.
- Card radius: `8–10px`; some grouped grids intentionally have square joined edges.
- Base spacing rhythm: `4, 8, 12, 16, 20, 24, 30, 40, 48, 68, 74px`.
- Standard border: `1px solid #DFE3DF`.
- Shadow is exceptional, not default. Approved elevated shadow: `0 10px 30px rgba(21,55,44,.07)`.

### Icons

- Use Phosphor Icons or the same clean outlined family.
- Typical size: `19–20px` in controls, `23–29px` in content blocks.
- Icon color is usually `#0F5A42` on a `#EAF3EE` circular surface.
- Do not mix icon families or use emoji.

## 3. Shared public shell

### Header

Desktop anatomy, RTL from right to left:

1. Compact brand lockup: transparent commune header mark, platform name, and small descriptor.
2. Centered navigation: الرئيسية، كيف تعمل؟، ما الذي يمكن الإبلاغ عنه؟، الأسئلة الشائعة.
3. Language switch.
4. Text/ghost “تسجيل الدخول”.
5. Green primary “إنشاء حساب”.

Measurements:

- Container: max `1240px`, full header height.
- Brand image: `88 × 52px`, `object-fit: contain`.
- Platform name: `18px`, green; descriptor: `10px`, muted.
- Navigation uses the full header height. Active item is green with a `3px` bottom indicator.
- No large logo tile, no colored header background, and no oversized CTA.

At `≤820px`, hide desktop navigation, language, and authentication buttons. Show a menu icon. The opened menu is a full-width white panel below the header with `45px` rows, separators, language, login, and one green account button.

### Footer and Chikaya orientation

The Chikaya message is a narrow band immediately before the footer:

- Minimum height `46px`, centered, `13px` text (`11px` on narrow mobile).
- One information icon, one short sentence, and a strong `Chikaya.ma` link.
- It must not become a large card or interrupt the hero/body.

Footer:

- Max `1240px`, minimum `76px`.
- Links: contact, user guide, privacy, accessibility.
- Copyright opposite the links.
- On mobile, stack links with `12px` gaps and keep the footer visually light.

## 4. Homepage

Order is mandatory.

### A. Hero

- Two-column grid: `1.05fr 0.95fr`, gap `58px`, vertically centered, min height `510px`.
- Arabic copy occupies the first/primary column; architecture illustration occupies the other column.
- Eyebrow: “الخدمة الرقمية الرسمية لجماعة أباينو”.
- H1: “تواصل بسيط حول المشاكل المحلية”.
- Lead explains local reporting, transparent follow-up, and privacy in one short paragraph.
- Actions: green “ابدأ تقديم شكاية” then outlined “اكتشف طريقة الاستعمال”; `12px` gap.
- Below actions: small shield/privacy reassurance.
- Architecture image fills its column with `object-fit: contain`. Use the transparent asset; do not use `mix-blend-mode`.
- Zellige appears only at the outer hero edge, about `155 × 400px`, opacity `0.24–0.35`, never behind body text.

At `≤820px`, use one column, move the illustration above the copy, hide zellige, and limit image height to `280px`. At `≤600px`, stack actions full width.

### B. Three service principles

- A horizontal three-cell band overlapping the hero by `28px` on desktop.
- White background, one shared border, subtle approved shadow.
- Each cell: icon + title + one-line explanation.
- Items: private complaint, text only, inside Abaynou.
- Minimum cell height `92px`.
- On tablet/mobile, remove overlap and stack into one bordered column.

### C. How it works preview

- Full-width ivory section, `68px` vertical padding.
- Centered eyebrow, H2, and one-line lead.
- Three joined white cells with 1px separators; do not render three floating shadow cards.
- Each cell: 54px pale-sage icon circle, muted step number at the opposite top edge, title, short explanation.
- Steps: write the problem, choose an approved location, follow the commune response/status.
- Centered text link to the full process page below the cells.

### D. What can be reported preview

- Max `1240px`, `74px` vertical padding.
- Centered section heading and introduction.
- Four joined/bordered cards on desktop, two columns below `1100px`, one below `600px`.
- Examples: waste/cleanliness, public lighting, roads/sidewalks, communal facilities.
- A single full-width warm scope note below the grid explains that this is not for emergencies or national administrative complaints, with a link to the full scope page.

### E. What happens after submission

- Soft green full-width section, `70px` vertical padding.
- Centered title and lead.
- Four joined stages: received, under review, in processing, response and closure.
- Each stage has a `39px` sage icon circle and concise description.
- Four columns desktop, two below `1100px`, one on mobile.

### F. Help band

- Max `1240px`, minimum `104px`, margin `42px auto`.
- Left/content group: question icon, short help title and explanation.
- Action group: outlined FAQ button and text contact link.
- On mobile, stack and make the main button full width.

### G. Chikaya banner and footer

Use the shared shell exactly; do not move the Chikaya message into the homepage body.

## 5. “How it works” page

- Shared public header.
- Main container max `1160px`, padding `68px 0 84px`.
- Intro: eyebrow, `40px` title, short lead; max width `830px`.
- Five-step vertical process list separated by 1px lines.
- Each row grid: `48px` number, `54px` icon zone, remaining text; `25px` vertical padding.
- Then a two-column bordered information area: “what to prepare” and “tracking statuses”.
- Then a full-width privacy assurance band.
- Finish with one centered primary CTA.
- On mobile, reduce the row grid to `34px 44px 1fr`; keep all text readable.

Production content correction: the frozen MVP has no citizen reply/request-for-clarification thread. Do not include “بانتظار ردك” or instructions to reply to commune questions. The page should describe one-way official responses and status tracking.

## 6. “What can you report?” page

- Shared intro template.
- Six category examples in a 3-column grid; 2 columns below `1100px`, 1 on mobile.
- Each card: 48px icon circle, 18px title, concise definition; minimum `210px` desktop.
- Two equal eligibility panels: “use this platform when” and “use another channel when”.
- Warm emergency warning band below.
- Ivory decision box: title at one side and three numbered questions at the other (`0.7fr 1.3fr`). Collapse to one column below `820px`.
- Finish with one centered primary CTA.

The scope must remain: local issues inside Abaynou; text-only; no emergency handling; no national/legal procedure replacement.

## 7. FAQ page

- Shared intro template.
- Soft green information band explaining how to use the FAQ.
- A clean accordion with one horizontal divider per question; no card around every item.
- Summary rows use `19px` vertical padding, semibold text, and a plus icon that rotates `45deg` when open.
- Answer width max `900px`, line-height `1.9`.
- End with a help/contact band and outlined contact button.
- Use 10–12 complete, approved questions in production; avoid placeholder answers.

Content must follow frozen scope: no uploads, no durable drafts, no reopening, no two-way citizen message thread, and citizen edits/withdrawal only while status is `SUBMITTED`.

## 8. Contact page

- Shared intro template.
- A `2 × 2` grid of bordered contact blocks: phone, email, reception hours, address.
- Each block: `26px` padding, `9px` radius, 28px green icon, muted label, strong value.
- Collapse to one column at `≤820px`.
- Values remain placeholders until confirmed by the commune; visually label unconfirmed content in development data, not in the final UI.

## 9. User guide and privacy pages

- Shared header and intro.
- Prose column max `800px`; do not stretch legal/help text across the whole `1160px` container.
- Green section headings and body line-height around `1.9`.
- Use short sections, lists, and descriptive links; avoid a wall of text.

## 10. Terms and accessibility pages

These pages are required by the product scope even if an earlier prototype did not implement them fully.

- Reuse the information-page shell and `800px` prose column.
- Terms: service purpose, account responsibility, acceptable use, local scope, limitations, and changes.
- Accessibility: keyboard use, focus visibility, semantic headings, zoom/reflow support, language direction, and a contact path for accessibility issues.
- Do not invent legal commitments; final legal copy requires commune approval.

## 11. Authentication pages connected to the public side

- Ivory full-page background with compact brand/language bar.
- Centered two-column white panel, max `1080px`, min height around `690px`, radius `13px`.
- Form column uses `48px 58px` padding. The other column uses the architecture illustration on a soft green surface with a privacy reassurance card.
- Hide the illustration column below `820px`.
- Fields are `47px` high, radius `7px`, visible label, and a green focus ring.
- Login/recovery uses email. Phone is optional contact information, not the primary login identifier.
- Registration must include one-time email verification behavior in the real product.

## 12. Responsive rules

### `≤1100px`

- Tighten header gaps/navigation padding.
- Hero title becomes `40px`; hero gap becomes `25px`.
- Topic, category, and status grids become two columns.
- Hide the brand descriptor if needed, but keep the platform name.

### `≤820px`

- Header becomes `68px`; desktop navigation/actions disappear; mobile menu is available.
- Hero and two-column information layouts become one column.
- Hero illustration moves above text; zellige disappears.
- Principles stack and no longer overlap the hero.
- Information-page H1 becomes `34px`.

### `≤600px`

- Side gutter becomes `16px`.
- Hero H1 and info H1 become `30px`; section H2 `28px`; hero lead `16px`.
- Action groups, topic/category/status grids, help/contact bands, and footer links stack.
- Buttons used as primary page actions become full width.
- Information-page top padding reduces to `36px`.

## 13. Accessibility and interaction quality

- Use semantic landmarks: `header`, `nav`, `main`, `section`, `footer`.
- One H1 per route; headings do not skip levels.
- All interactive elements need a visible `:focus-visible` state at least `2px` thick.
- Text contrast meets WCAG AA; never place pale green text on white.
- Minimum pointer target is `44 × 44px`.
- Accordion uses native `details/summary` or equivalent accessible state.
- Menu button exposes `aria-expanded` and a clear Arabic label.
- Decorative zellige has empty alt text; architecture illustration has a concise descriptive alt.
- Respect `prefers-reduced-motion`; motion is limited to small hover/focus transitions.
- Arabic uses RTL logical properties (`margin-inline`, `padding-inline`, `inset-inline`). French switches the entire shell to LTR.

## 14. Frozen product facts that override prototype placeholders

- Text-only complaints; no file or photo attachments in MVP.
- Complaint data is private; there is no public complaint feed.
- Locations are exactly: دوار أباينو، دوار ايكيسل، دوار توتلين، دوار أبوقال، دوار إد العربا، دوار تبولوت.
- Email is required for login and recovery; phone is optional contact data.
- One-time email verification happens at signup; complaint submission sends a success email.
- No two-way citizen/commune conversation or clarification-request workflow in MVP.
- Citizen edits or withdrawal are available only in `SUBMITTED`, before processing begins.
- Lifecycle: `SUBMITTED → UNDER_REVIEW → IN_PROCESSING → RESPONSE_SENT → CLOSED`; exceptional terminal states: `WITHDRAWN`, `NOT_ACCEPTED`.
- The service complements, but does not replace, Chikaya.ma.
- Contact values, final categories, legal text, and accessibility statement require commune confirmation.

## 15. Visual rejection criteria

Reject an implementation if it has any of these:

- Oversized header, logo, hero button, or empty hero area.
- Generic blue SaaS palette, gradients, glass panels, or stock photography.
- White rectangles around supposedly transparent assets.
- Different font or a browser fallback because IBM Plex Sans Arabic was not loaded.
- Every section presented as floating rounded cards.
- Large Chikaya warning in the main content.
- Desktop-only layout, left-to-right Arabic spacing, clipped Arabic text, or uncontrolled mobile overflow.
- Invented locations, public complaint listings, file upload, or two-way messaging.

