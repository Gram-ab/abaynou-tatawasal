# Commune query, pagination and dropdown refinement

Date: 2026-10-15. Status: implemented locally; uncommitted and unpushed.

## Query change

An additive migration replaces only the guarded Commune numbered-page projection and adds an index matching its existing submitted_at/reference sort. Earlier frozen migrations remain unchanged.

- Unfiltered requests count narrow complaint rows separately from the ordered page lookup. Only the selected page joins Citizen names and full complaint snapshots.
- Search evaluates matching Citizen IDs once, then counts/pages narrow matching complaint IDs before hydrating the displayed rows.
- Supplied search/status/location/page values remain bound parameters. Only fixed SQL fragments are assembled.
- Exact totals and page rows use one SQL statement/snapshot. Existing ILIKE substring/wildcard semantics, bounds, sort, return columns, authorization and RLS remain.
- No approximate counts, cached authorization, lifecycle changes, retention changes or new direct table grants.

## Local measurements

Paired alternating old/new calls against the same existing disposable 10,010-complaint dataset, 30 samples per operation. Every returned field, ordering and total matched across ten cases. Four additional authorization/validation checks passed: Citizen denied, invalid digest denied, raw app_web table read denied, invalid status rejected.

Times are local milliseconds and include transaction/loopback overhead. Local VM contention affects tail latency; these figures do not certify hosted Free-plan capacity.

| Operation | Before median | After median | Before P95 | After P95 |
| --- | ---: | ---: | ---: | ---: |
| Commune page 1 | 83.07 | 34.91 | 172.17 | 62.25 |
| Commune deep page | 95.75 | 60.36 | 147.84 | 133.94 |
| Selective substring | 69.18 | 54.99 | 243.01 | 237.89 |
| Arabic substring | 399.2 | 322.58 | 813.15 | 719.83 |
| Citizen name | 229.75 | 156.8 | 417.46 | 312.94 |
| Status + location | 39.7 | 44.49 | 134.23 | 69.72 |
| Wildcard search | 114.21 | 85.8 | 215.46 | 217.11 |
| No matches | 111.07 | 67.18 | 702.17 | 540.96 |
| Out of range | 123.76 | 55.78 | 453.54 | 201.46 |
| Blank query | 23.9 | 33.34 | 71.53 | 83.23 |

First-page median improved from 83.07 to 34.91 ms; P95 from 172.17 to 62.25 ms (about 64% lower). Some small filtered cases are mixed, as recorded above. No blanket speedup is claimed.

Remaining scaling limit: exact totals must still inspect matching records; broad ILIKE searches and deep numbered-page offsets remain proportional to matching volume. No speculative text-search index, counter model, or search-semantics change was introduced.

## Interface

- Replaced the page dropdown/Go form with bounded numbered links, first/last destinations, ellipses, active-page styling and a result range.
- Previous/Next have mirrored outlined icons and genuinely non-interactive disabled boundaries.
- Page links retain search/status/location, use client navigation and preserve browser history; automatic link prefetch is disabled to avoid speculative page queries.
- Compact footer matches the existing green/cream tokens. Narrow screens stack controls; large page sets never generate thousands of links/options.
- Shared CSS styles all single-select form controls: platform typography, 46px targets, outlined caret, border/radius, focus, disabled and invalid states, and RTL positioning.
- Supporting browsers also receive a styled native popup, selected checkmark, keyboard highlight and a bounded scrollable option list. Other browsers retain the accessible system popup with the styled field. No new JavaScript select widget/dependency or changed form markup.

## Verification

- Query equivalence/security/validation: 14 passed, 0 failed.
- Focused component/unit: 9 passed, 0 failed.
- Affected E2E: five unique scenarios passed across focused runs: numbered navigation/filters/history, three existing DEV-05 intake/tracking scenarios, and the final AR/FR/EN responsive/keyboard scenario. The last UI-only rerun passed 1/1 with no failures or skips.
- One test-data setup attempt hit the real Citizen submission limit. The fixture now uses six disposable Citizens, never disabling rate checks.
- One keyboard-test mismatch came from Locator.press refocusing the select before each key. The test now keeps native option focus with page.keyboard; no custom keyboard handler was added to production.
- Responsive checks: 1440, 820, 390 and 320px widths in Arabic RTL and French/English LTR; no horizontal overflow. Native keyboard selection, Escape dismissal, visible focus and scoped WCAG A/AA axe checks passed.
- Desktop/mobile viewport screenshots inspected, including the Arabic open picker. Captures contain only synthetic test data and remain ignored under .local.
- Typecheck: PASS. Lint: PASS, including final adjusted test. Production build: PASS.
- Isolated migration reconstruction: PASS. Sole pending paging migration applied to the normal local database with migration up --local; no owner reset/seed.
- Owner Auth/profile/complaint/settings/publication/catalogue fingerprints match the pre-test snapshot.
- Frozen migration/planning/acceptance/design files unchanged. Hosted Supabase untouched. Nothing staged, committed or pushed.

## Files for this refinement

- supabase/migrations/20261015000200_commune_complaint_paging.sql
- src/app/[locale]/commune/(protected)/complaints/page.tsx
- src/features/complaints/components/tracking.tsx
- src/features/complaints/pagination.ts
- src/features/complaints/tracking-copy.ts
- src/styles/complaints.css
- src/styles/form-controls.css
- src/app/layout.tsx
- tests/components/complaint-tracking.test.tsx
- tests/unit/complaint-pagination.test.ts
- tests/e2e/commune-table-ui.spec.ts
- This report and its aggregate measurement JSON

Other existing working-tree changes predate this refinement and were preserved.

References: [PostgreSQL CTE behavior](https://www.postgresql.org/docs/current/queries-with.html), [native customizable selects and fallback](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select). Installed Next.js Link/CSS guidance was read before editing.
