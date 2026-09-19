# Public design implementation

The public side has been restyled against `design/public/PUBLIC_DESIGN_SPEC.md`, its exact tokens, the asset manifest, and the approved React/CSS reference. Existing Next.js routing, server-only persistence projections, seven-entity database model and security boundaries are retained. The supplied handoff and frozen documents were not edited.

## What changed

- Compact 78px desktop / 68px tablet-mobile header, full language switching, mobile menu, 46px buttons, outlined Phosphor icons, narrow Chikaya band immediately above the footer.
- Self-hosted IBM Plex Sans Arabic 400/500/600/700. Actual Chromium platform-font diagnostics identify IBM Plex Sans Arabic Bold for the Arabic H1 and Regular for its body paragraph, both custom fonts rather than Arial.
- Supplied header mark, transparent architecture illustration and faint hero-edge zellige. Served assets are byte-identical to the handoff and retain alpha. No regeneration, white image tile, recoloring or blend mode.
- Homepage: hero → principles → process preview → scope preview → status journey → help → Chikaya/footer.
- Five-step process page, six scope examples with eligibility/emergency guidance, twelve FAQ questions, four contact blocks, and narrow prose pages for guide/privacy/terms/accessibility.
- Login, registration and recovery screens use the approved authentication layout. Login/recovery use email; registration includes optional phone and explains one-time email verification.
- Local development publications updated through the existing audited publisher. No schema or remote resource changes.

## Deliberate differences and reasons

- Authentication remains a public interface preview. The existing project has no implemented account/session service; this restyle does not invent one. Form submission reports unavailability, sends no request, stores no data and never simulates success. Actual signup verification and recovery emails remain backend work.
- English is retained alongside Arabic and French to preserve the existing application. Locale links make a full document navigation so `html` language and direction change reliably; ordinary page navigation stays client-side.
- Obsolete prototype uploads, clarification conversations, waiting-for-citizen status, and demo login are excluded. FAQ/process copy follows the frozen MVP: private text-only complaints; no durable drafts/reopening; edits/withdrawal only in SUBMITTED.
- The exact six canonical location names are shown in Arabic even within French/English pages, without inventing translations or extra locations.
- Terms is included in the footer so the required route remains discoverable. The public Chikaya/footer remains available below authentication screens as part of the existing shared shell.
- Step numerals use the approved muted-ink token instead of the prototype’s paler gray to meet text contrast. Language links have 44px minimum targets.
- Contact/legal/accessibility content remains visibly provisional in development publications; the reference’s unverified institutional contact values and legal claims were not treated as approved facts. Prose therefore differs in length from the prototype.
- No formal large emblem is placed where the manifest calls for the compact header mark. The formal emblem is copied unchanged and available for its approved future role.

## Validation

Validation: 28 unit/component/persistence tests passed; lint and typecheck passed; the final production build passed; all 67 browser tests passed. Visual QA passed. After the final CSS-only change, 15 additional breakpoint checks passed across all three languages at 821–1240px. Final comparison evidence is recorded in `design-qa.md`. Automated coverage includes 12 routes × 3 languages × 3 requested viewports (108 full-page captures), every route/language at 320px (36 reflow checks), font availability for four weights, exact header/container/button sizing, keyboard navigation, FAQ disclosures, locale switching, authentication preview behavior, links and accessibility smoke checks.

Evidence: `test-results/design/`, `.local/visual-review/`, and `.local/public-design-tests.log`. Screenshots/reference harness are ignored development artifacts, not production routes. The in-app browser failed to initialize; the existing Chromium/Playwright browser tooling provided the render/interaction evidence.

## Files changed or added

- `package.json`, `pnpm-lock.yaml`: IBM font and Phosphor dependencies.
- `eslint.config.mjs`: exclude supplied design sources and ignored local generated comparison files from application lint.
- `src/app/layout.tsx`: self-hosted font and public stylesheet imports.
- `src/app/[locale]/login/page.tsx`
- `src/app/[locale]/register/page.tsx`
- `src/app/[locale]/forgot-password/page.tsx`
- `src/shared/ui/header.tsx`, `src/shared/ui/footer.tsx`
- `src/shared/i18n/messages.ts`
- `src/styles/globals.css`, `src/styles/public-shell.css`
- `src/features/public-content/components/public-page.tsx`
- `src/features/public-content/components/auth-page.tsx`
- `src/features/public-content/design-labels.ts`
- `fixtures/public-content.ts`, `fixtures/public-design-content.ts`
- `public/assets/commune-mark-abaynou.png`
- `public/assets/commune-emblem-abaynou.png`
- `public/assets/abaynou-architecture-transparent.webp`
- `public/assets/zellige-edge-transparent.webp`
- `tests/components/public-ui.test.tsx`
- `tests/e2e/public.spec.ts`, `tests/e2e/public-design.spec.ts`
- `README.md`, this report and `design-qa.md`.

## Remaining commune-owned content

1. Official phone, email, address and reception hours: current settings are explicitly fictional/pending confirmation.
2. Final approved service-category catalogue: the six cards are illustrative local examples.
3. Privacy policy and terms: legal basis, retention periods, responsible contact, rights procedure, effective date and amendment procedure.
4. Final accessibility statement and confirmed channel for reporting barriers.

All provisional publications and their translations require Commune approval before public launch. No public deployment was performed.
