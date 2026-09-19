# Public design QA

Final result: passed.

## Sources and comparison method

Authoritative specification and tokens: `design/public/PUBLIC_DESIGN_SPEC.md` and `design/public/design-tokens.json`. Asset rules: the complete handoff's `assets/ASSET_MANIFEST.md`. Visual source: `01-home.jpg` and the supplied approved prototype rendered in a temporary local harness. Supplied originals are unchanged.

The reference and implementation were captured at the same CSS viewport and device scale 1, including homepage comparisons at 1440×1000, 820×1180 and 390×844. Full-page images are taller than the viewport. Evidence was combined side by side before inspection: `.local/visual-review/home-comparison-*.png`. Route sheets place available reference captures beside all nine implementation language/viewport combinations. The prototype contains Arabic-only body copy and obsolete behavior; translated copy and frozen-product corrections are judged against the specification, not obsolete wording.

## Findings and corrections

- P1: client-side locale navigation changed content while preserving root RTL. Corrected with full-document locale links; final interaction regression passed.
- P2: French/English brand width displaced the menu at 320px. Brand wrapping and flexible width corrected; all 36 minimum-width reflow checks pass.
- P2: small step numerals were below AA contrast. Changed to the approved `#65706B` muted token; accessibility smoke checks pass.
- P2: authentication pages lacked document titles. Added localized metadata; authentication accessibility checks pass.
- P2: menu persisted through locale changes. Menu identity now includes locale; full navigation also resets menu state.
- P2: process tracking information was a paragraph rather than the reference's individual status rows. Restored five separate rows with the frozen lifecycle; final desktop/tablet/mobile captures reviewed.
- Test correction: an unused font weight is lazy-loaded by the browser. Verification now explicitly loads and checks all four supplied weights. Platform-font diagnostics separately confirm actual Arabic heading/body glyphs use custom IBM Plex Sans Arabic.

- P2: French header overflow immediately above the tablet breakpoint. Tightened gaps at 821–900px; the final build passes all 15 additional checks (three languages at 821, 900, 1024, 1100 and 1240px), with 78px header height. The final French 821px capture was visually inspected.

## Five fidelity surfaces

- Typography: IBM Plex Sans Arabic, exact title/body sizing and responsive reductions; real font diagnostic confirms no Arial fallback for Arabic heading/body.
- Layout: reference section order, compact header, 1240px global/1160px information containers, 800px prose width, joined grids, restrained spacing, stacked tablet/mobile layouts.
- Color: approved green, ivory, sage, ink and border palette; warning tones only for warning content. No gradients or heavy shadows.
- Images: byte-identical supplied assets, alpha verified, correct aspect ratios and role placement; no image tiles, blend mode or recreated illustration.
- Content: all twelve requested route types, complete localized shells, twelve scope-correct FAQs, canonical locations, and explicit provisional legal/contact data.

Intentional differences, authentication limitations, changed files and remaining Commune-owned content are enumerated in `PUBLIC-DESIGN-IMPLEMENTATION.md`.

## Final validation

- Existing unit/component/persistence suite: 28 passed.
- Lint and standalone typecheck: passed.
- Final production build after the last CSS correction: passed.
- Full browser suite: 67 passed (4.8 minutes), including all 108 route/language/viewport captures and 36 checks at 320px. The subsequent CSS change applies only to 821–900px; that range was separately rechecked on the final build.
- Accessibility: 21 axe smoke scenarios passed, plus keyboard focus, skip link, accordion, password visibility and language-direction checks.
- Actual Arabic platform fonts: IBM Plex Sans Arabic Bold for H1 and Regular for body, custom font files; all four weights available and loaded in verification.
- Assets retain alpha and match supplied files byte-for-byte; no mix-blend-mode on rendered images.
- 32 frozen document/design hashes: unchanged.
- No remaining P0/P1/P2 visual findings. Content/authentication deviations are explicit in the implementation report.

Post-fix evidence includes `test-results/design/ar-how-it-works-1440.png`, the complete `test-results/design/` matrix, `.local/visual-review/home-comparison-*.png`, and `.local/visual-review/fr-header-821-final.png`. The local database stack was restarted after the interrupted session; published content loads again at the final preview.
