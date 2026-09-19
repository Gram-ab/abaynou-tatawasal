# Codex Implementation Brief — Abaynou Tatawasal Public Side

Use this file as the prompt and acceptance contract for implementation.

## Copy/paste prompt

Implement or restyle the **public side only** of Abaynou Tatawasal so it faithfully matches the approved design handoff supplied with this prompt.

Read these inputs before editing code:

1. `PUBLIC_DESIGN_SPEC.md` — authoritative visual, responsive, content-scope, and page anatomy specification.
2. `design-tokens.json` — exact colors, typography, sizing, radii, and breakpoints.
3. `assets/ASSET_MANIFEST.md` — approved image roles and placement rules.
4. `reference-source/` — the approved prototype’s React/CSS, for visual reference only.

Implementation rules:

- Preserve the existing production architecture, routing, data model, authentication, and unrelated user changes.
- Arabic is the default and must render RTL. French must switch the complete shell to LTR.
- Self-host IBM Plex Sans Arabic weights 400, 500, 600, and 700. Verify the computed font; do not accept Arial fallback.
- Use the supplied transparent assets without regenerating, tracing, recoloring, or placing them on white tiles.
- Use a consistent outlined icon set such as Phosphor Icons. Do not use emoji or mixed icon families.
- Build/rework these routes: homepage, how it works, what can be reported, FAQ, contact, user guide, privacy, terms, accessibility, login, registration, and password recovery.
- Match the exact section order, width, spacing, hierarchy, control sizing, colors, and responsive behavior in `PUBLIC_DESIGN_SPEC.md`.
- Keep the header compact: 78px desktop, 68px mobile. Keep the primary button 46px high.
- Keep Chikaya.ma as a small bottom orientation banner directly above the footer.
- Do not introduce gradients, oversized controls, heavy shadows, stock photos, excessive rounded cards, or generic landing-page decoration.
- Do not copy obsolete demo behavior from the reference source. The frozen MVP has no uploads and no two-way citizen/commune message or clarification-request flow.
- Use the six canonical Abaynou locations exactly as written in the specification.
- Mark placeholder contact/legal data clearly in code/configuration for commune confirmation; do not silently treat it as final.

Verification required before completion:

1. Run the existing lint, typecheck, unit, and production-build commands.
2. Inspect every public route at desktop `1440×1000`, tablet `820×1180`, and mobile `390×844`.
3. Compare the implementation against the supplied specification/reference source, not against personal preference.
4. Confirm no horizontal overflow at 320px width.
5. Confirm IBM Plex Sans Arabic is the computed font on Arabic headings and body text.
6. Confirm keyboard focus, mobile navigation, accordion behavior, RTL/LTR switching, and all public links work.
7. Confirm transparent images have no white box and the architecture illustration does not use `mix-blend-mode`.
8. Report any intentional deviation with a concrete reason; do not silently reinterpret the design.

Deliver a concise implementation summary, list changed files, report validation results, and identify only the remaining commune-owned placeholder content.

## Suggested implementation order

1. Install/load the font and tokens.
2. Implement the shared public header, mobile menu, Chikaya banner, and footer.
3. Build the homepage in the mandatory section order.
4. Build the shared information-page shell.
5. Implement process, scope, FAQ, contact, guide, privacy, terms, and accessibility pages.
6. Align public authentication pages.
7. Verify desktop/tablet/mobile and Arabic/French directions.

## Acceptance checklist

- [ ] Arabic default RTL; French full LTR.
- [ ] IBM Plex Sans Arabic 400/500/600/700 is actually loaded.
- [ ] Header 78px desktop / 68px mobile.
- [ ] 1240px global and 1160px information-page containers.
- [ ] Homepage contains all seven required regions in order.
- [ ] Architecture, logos, and zellige use supplied transparent assets.
- [ ] No asset white boxes or `mix-blend-mode` dependency.
- [ ] Chikaya banner is narrow and directly above footer.
- [ ] How/process page does not promise citizen replies or clarification threads.
- [ ] Scope page clearly excludes emergencies and non-local/national cases.
- [ ] FAQ content follows frozen MVP behavior.
- [ ] Terms and accessibility routes exist.
- [ ] Login uses email; phone is optional contact data.
- [ ] No uploads, public complaint feed, or invented locations.
- [ ] 44px minimum interactive targets and visible focus styles.
- [ ] No horizontal overflow at 320px.
- [ ] Build and tests pass.

