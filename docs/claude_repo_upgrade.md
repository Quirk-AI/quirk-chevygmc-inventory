# Claude Code Repo Upgrade Instructions

## Objective
Take this repository from a **good internal prototype** to a **trustworthy, production-ready internal dealership tool**. Your job is not to add random polish. Your job is to **fix correctness, remove misleading behavior, improve build/test reliability, tighten architecture, and reduce operational risk**.

This repo already has a solid base. Do not rewrite it from scratch. Upgrade it carefully and deliberately.

Success means:
- the app builds cleanly
- tests are reliable and reflect the real UI
- dashboard behavior is correct under filtering and drilldowns
- dead or misleading UI is removed or fully implemented
- docs match reality
- the repo is easier to maintain and safer to deploy

Do not take shortcuts that hide problems. Fix root causes.

---

## Non-Negotiable Rules
1. **Do not break working UX to chase abstraction.**
2. **Do not leave half-wired features in place.** If a feature is not real, remove it.
3. **Do not add fake enterprise language to docs.** Match actual repo maturity.
4. **Do not introduce broad rewrites unless necessary.** Prefer focused improvements.
5. **Every behavior change must be covered by tests.**
6. **Every config mismatch must be resolved, not documented away.**
7. **Preserve business-specific dealership logic unless it is clearly wrong.**

---

## Current Problems That Must Be Addressed

### 1. Drilldown correctness is inconsistent
The most important functional problem is in:
- `src/hooks/useDrilldown.ts`

Several drilldowns are built from `validRows` instead of the already-filtered dataset. This means a user can apply filters and then click aging or price drilldowns and get results that ignore the active filters.

That is a trust-breaking defect.

### 2. Search UI is misleading / partially dead
Relevant files:
- `src/components/FiltersBar.tsx`
- `src/App.tsx`
- `src/store/inventoryStore.ts`
- `src/hooks/useFilteredInventory.ts`

There is visible search UI and search-related props, but the actual filtering behavior is inconsistent. Some search props are passed but not used. The visible Search button does not represent a fully real feature. The app currently behaves more like a stock-number filter than a real keyword or smart search flow.

That makes the UI look more complete than it is.

### 3. App orchestration is too heavy
Relevant file:
- `src/App.tsx`

`App.tsx` owns too much coordination logic. It is still readable, but it is becoming a control tower for everything.

### 4. Build and test tooling are not fully trustworthy
Relevant files:
- `package.json`
- `tsconfig.json`
- `vite.config.js`
- `vitest.config.js`
- `playwright.config.ts`
- `src/test/setup.ts`
- `e2e/inventory.spec.ts`

There are config inconsistencies, especially around dev server port assumptions and test runtime expectations. A production-claimed repo must be buildable and testable in a predictable way.

### 5. Docs oversell maturity
Relevant files:
- `README.md`
- `OPERATIONS.md`
- `CHANGELOG_v3.0.0.md`
- `docs/ADR-001-inventory-data-source.md`
- `docs/CLAUDE_CODE_UPDATE.md`

The repo communicates a more production-ready state than the implementation currently proves.

### 6. Deployment model exposes operational data too casually
Relevant files:
- `public/inventory.xlsx`
- `public/gmc-inventory.xlsx`
- `src/services/inventoryService.ts`
- `docs/ADR-001-inventory-data-source.md`

Inventory spreadsheets are publicly fetchable because they live in `/public`. That may be acceptable for a demo or tightly controlled internal environment, but it is a poor default for a real operational deployment.

---

## Execution Order
Follow this order exactly.

1. Establish a clean baseline
2. Fix functional correctness defects
3. Remove dead or misleading UI paths
4. Refactor architecture where needed
5. Repair and tighten testing
6. Harden deployment assumptions
7. Rewrite docs to match reality
8. Produce a final verification report

Do not skip ahead.

---

# Phase 1: Establish a Clean Baseline

## Goal
Understand what actually works now before changing behavior.

## Tasks
### 1. Audit actual scripts and config behavior
Review:
- `package.json`
- `tsconfig.json`
- `vite.config.js`
- `vitest.config.js`
- `playwright.config.ts`
- `netlify.toml`

Determine:
- whether `npm run build` passes cleanly
- whether typecheck passes cleanly
- whether Vitest runs cleanly
- whether Playwright can run without manual config hacks
- whether local ports are consistent across dev and e2e config

### 2. Write down current failure points
Create a short internal work log file in the repo, such as:
- `docs/REPO_REMEDIATION_LOG.md`

Use it to document:
- failing commands
- config mismatches
- stale assumptions
- dead props / dead UI
- any flaky tests

Do not bloat the file. Keep it factual.

## Acceptance criteria
- You can clearly state which scripts pass and which fail
- You have identified config mismatches before changing code

---

# Phase 2: Fix Functional Correctness First

## Goal
Make dashboard outputs trustworthy.

## Highest-priority file
- `src/hooks/useDrilldown.ts`

## Problem to solve
Drilldowns must respect active filters unless there is a deliberate, explicitly documented reason not to.

Current issue pattern:
- some drill types use `validRows`
- some drill types use `filteredRows`
- this creates inconsistent drill results

## Required change
Refactor `useDrilldown` so the source dataset for each drill type is explicit and correct.

### Desired behavior
- `TOTAL` should reflect the currently filtered inventory, not full raw inventory
- aging drilldowns should reflect active filters
- price drilldowns should reflect active filters
- model drilldowns should reflect active filters unless deliberately defined otherwise
- in-transit and in-stock drilldowns should also respect the current filter context where appropriate

## Implementation guidance
- Introduce a clear internal dataset selection strategy rather than a chain of ad hoc `if` checks
- Avoid repeated `result = validRows.filter(...)` patterns
- Prefer a map or structured resolver approach if it improves clarity
- Keep the hook readable
- Keep grouping logic separate from row-selection logic

## Add tests
Update or add tests in:
- `src/hooks/useDrilldown.test.ts`

You must cover at least:
1. aging drilldown respects year filter
2. price drilldown respects make filter
3. model drilldown respects current filtered dataset
4. in-stock / in-transit drilldown behavior is intentional and documented
5. total drill reflects filtered rows

## Acceptance criteria
- A user can filter first, then drill down, and the results remain consistent
- Tests prove this behavior

---

# Phase 3: Remove Dead or Misleading Search/UI Behavior

## Goal
Make the filter/search bar honest and coherent.

## Relevant files
- `src/components/FiltersBar.tsx`
- `src/App.tsx`
- `src/store/inventoryStore.ts`
- `src/hooks/useFilteredInventory.ts`
- `src/types.ts`

## Problems to solve
The current search experience appears partially wired. There are props that appear unused or only weakly connected:
- `onSmartSearch`
- `drillType`
- `drillData`
- `onSetDrillType`
- `onRowClick`
- `searchTerm`
- `onSearchChange`

This strongly suggests either:
- a feature was started and not finished, or
- the UI evolved and the component contract was never cleaned up

## Required decision
Choose one of these two paths and implement it fully.

### Path A: Keep search, but make it real
If you keep a search box and Search button, they must do something coherent and useful.

A valid implementation would:
- support a real keyword search across meaningful fields, such as stock number, model, make, trim, VIN, or model number
- clearly define search scope in placeholder text or label
- use a single source of truth for the entered value
- apply search consistently with existing filters
- remove fake “smart search” language unless the behavior is actually smart enough to justify that label

### Path B: Remove fake search and simplify
If the current UI is just a stock-number filter or a conventional filter row, then remove the dead search button, remove unused search props, remove fake smart-search wiring, and simplify the component contract.

This may be the better option if real search is not ready.

## Preferred outcome
Prefer **clarity over feature theater**. If the feature is not truly implemented, simplify.

## Specific cleanup tasks
- remove unused props from `FiltersBar` if they are not needed
- remove dead handlers from `App.tsx`
- simplify store state if `searchTerm` is no longer meaningful
- ensure labels, placeholders, and aria text match actual behavior
- reduce prop surface area to what the component really uses

## Add tests
Update or add tests for the chosen behavior in relevant test files. Cover:
- entering search or filter input produces expected results
- reset behavior clears the right state
- no dead button remains that does nothing

## Acceptance criteria
- every visible input and button has a real purpose
- component props match actual usage
- search/filter semantics are understandable to a user without reading the code

---

# Phase 4: Reduce App.tsx Complexity

## Goal
Stop `App.tsx` from becoming an orchestration dump.

## Relevant file
- `src/App.tsx`

## Required improvements
Refactor only where it reduces cognitive load.

### Candidates
- extract dashboard visibility logic into a small selector hook or utility
- extract event handlers if that improves readability
- group derived state more clearly
- reduce repeated conditional rendering patterns

## Do not do this poorly
Do not explode the app into tiny files with no net clarity gain.

## Strong target
A new contributor should be able to open `App.tsx` and understand:
- where data comes from
- how filters are applied
- how drilldown state is derived
- which sections render under which conditions

## Acceptance criteria
- `App.tsx` is shorter or meaningfully clearer
- conditional rendering is easier to scan
- no loss of functionality

---

# Phase 5: Tighten Table and Panel Data Consistency

## Goal
Make sure all visible sections reflect the same filter worldview unless intentionally designed otherwise.

## Relevant files
- `src/components/KpiBar.tsx`
- `src/components/ChartsSection.tsx`
- `src/components/NewArrivalsPanel.tsx`
- `src/components/OldestUnitsPanel.tsx`
- `src/components/InventoryTable.tsx`
- `src/components/DrilldownTable.tsx`
- `src/hooks/useInventoryMetrics.ts`
- `src/hooks/useFilteredInventory.ts`

## What to inspect
Check whether each panel uses:
- full valid inventory
- filtered inventory
- some custom subset

Then decide if that behavior is correct.

### Known likely inconsistency
`OldestUnitsPanel` is currently fed `validRows` from `App.tsx`, not the filtered set. That may be intentional, but if a user applies a filter, they may reasonably expect “oldest units” to reflect the filtered context.

You must decide deliberately and document the decision.

## Required action
For each major panel, document whether it should be:
- globally scoped, or
- filter-context scoped

Then align implementation to that decision.

## Acceptance criteria
- KPI counts, tables, charts, and panels do not contradict one another
- any intentionally global section is labeled or documented clearly

---

# Phase 6: Repair and Harden Testing

## Goal
Make test results meaningful.

## Relevant files
- `src/**/*.test.ts*`
- `e2e/inventory.spec.ts`
- `vitest.config.js`
- `playwright.config.ts`
- `vite.config.js`
- `package.json`

## Tasks
### 1. Standardize dev/test server expectations
Right now there is a likely mismatch between:
- Vite dev port in `vite.config.js`: `3000`
- Playwright base URL in `playwright.config.ts`: `5173`

Unify this. Pick one. Apply it everywhere.

### 2. Ensure typecheck and test config are consistent
`tsconfig.json` and test configs must match the actual file layout and runtime assumptions.

Check for:
- config filenames referenced incorrectly
- missing or stale includes
- test globals assumptions
- invalid setup file references

### 3. Remove or rewrite stale tests
Any test that validates old UI behavior, old text, old routing assumptions, or dead features must be updated or removed.

### 4. Add missing high-value tests
Minimum required:
- drilldowns respecting filters
- filter reset behavior
- search or filter input behavior based on your chosen design
- dealership switch behavior
- a basic e2e happy path for load → filter → drilldown → back

## Testing philosophy
Favor a smaller number of trustworthy tests over a larger number of fragile tests.

## Acceptance criteria
- `npm run typecheck` passes
- `npm run test` passes
- `npm run test:e2e` passes with consistent local config
- tests reflect the current UI, not a previous version

---

# Phase 7: Reduce Deployment and Security Risk

## Goal
Improve operational safety without overengineering.

## Relevant files
- `public/inventory.xlsx`
- `public/gmc-inventory.xlsx`
- `src/services/inventoryService.ts`
- `README.md`
- `OPERATIONS.md`
- `docs/ADR-001-inventory-data-source.md`

## Problem
The inventory data files are publicly accessible because they are served from `/public`.

## Required action
You do not necessarily need to add a backend in this pass, but you must make the risk explicit and improve the deployment model or documentation.

## Preferred options
### Option 1: Keep current model, but reframe honestly
If this remains a static internal tool, then document clearly:
- this deployment model is for internal/demo use
- inventory files in `/public` are publicly retrievable by anyone with access to the deployed app
- this is not appropriate for sensitive operational data without additional protections

### Option 2: Prepare the repo for safer ingestion
If feasible without major architecture rewrite, create a cleaner abstraction in `inventoryService.ts` so future secure ingestion can be swapped in more easily.

For example:
- isolate file-source config
- centralize dataset loading strategy
- make it easier to later replace public-file fetch with authenticated API access

## Acceptance criteria
- the repo no longer implies that public static inventory ingestion is production-safe by default
- future migration to safer ingestion is easier

---

# Phase 8: Clean Up Docs So They Match the Code

## Goal
Bring documentation back into alignment with actual system maturity.

## Relevant files
- `README.md`
- `OPERATIONS.md`
- `CHANGELOG_v3.0.0.md`
- `docs/ADR-001-inventory-data-source.md`
- `docs/CLAUDE_CODE_UPDATE.md`

## Required changes
### README
Rewrite claims that overstate maturity.

README should accurately describe:
- what the app does today
- what is production-ready vs pilot-ready
- how data is sourced
- known limitations
- how to run, test, and verify locally

### OPERATIONS.md
Make this useful and honest.
Include:
- data refresh behavior
- stale state behavior
- known failure modes
- deployment caveats
- what to check first if dealership data looks wrong

### ADR
If public-file data sourcing remains, the ADR must explain the tradeoff clearly.

### Changelog
Do not claim fixes that are not actually present.

## Acceptance criteria
- a reader can understand the repo without being misled about maturity or security
- docs support operators and developers instead of marketing the repo

---

# Phase 9: Remove Redundant or Stale Code

## Goal
Reduce drag and confusion.

## Required review areas
Inspect for stale or duplicate logic in:
- `src/App.tsx`
- `src/components/FiltersBar.tsx`
- `src/components/InventoryTable.tsx`
- `src/components/VirtualizedTable.tsx`
- `src/hooks/useDrilldown.ts`
- `src/hooks/useFilteredInventory.ts`
- `src/hooks/useInventoryMetrics.ts`
- `src/utils/*`
- docs files that repeat outdated plans

## What to remove first
1. dead props and dead handlers
2. legacy drilldown branches that are no longer needed
3. duplicated row-grouping or formatting logic if centralization improves correctness
4. tests for behavior that no longer exists
5. stale docs that contradict current implementation

## Important constraint
Do not remove parallel table implementations if both are actively used for desktop/mobile or performance reasons. Confirm usage before deleting anything.

## Acceptance criteria
- less dead surface area
- fewer confusing branches
- easier maintenance

---

# Deliverables Claude Code Must Produce
At the end of the work, produce all of the following.

## 1. Code changes
Implement the fixes above directly in the repo.

## 2. Verification summary
Create:
- `docs/FINAL_REMEDIATION_SUMMARY.md`

Include:
- what was fixed
- what was removed
- what behavior changed
- remaining limitations
- command results for build, typecheck, unit tests, and e2e tests

## 3. Reality-based production assessment
At the end of `docs/FINAL_REMEDIATION_SUMMARY.md`, include a section titled:
- `Current Production Readiness Assessment`

This section must say one of the following, honestly:
- demo-ready only
- internal pilot-ready
- internal production-ready with known caveats
- not deployment-ready

Do not exaggerate.

---

# Specific File-Level Guidance

## `src/hooks/useDrilldown.ts`
- make source dataset selection explicit
- reduce repeated filter chains
- ensure title counts reflect intended dataset scope
- add tests proving correct behavior under filters

## `src/components/FiltersBar.tsx`
- remove unused props or fully wire them
- eliminate UI elements that do nothing
- align labels/placeholders/aria text to actual behavior
- simplify the component contract

## `src/App.tsx`
- reduce orchestration clutter
- remove dead handlers if feature is cut
- centralize visibility logic if it improves readability
- ensure panels get intentionally scoped datasets

## `playwright.config.ts`
- make base URL match actual dev server port
- confirm `webServer.url` matches the same value
- keep config deterministic

## `vite.config.js`
- confirm port decision is intentional
- make local dev expectations consistent with docs and e2e

## `README.md`
- remove inflated language
- add real setup and verification steps
- document current limitations honestly

## `OPERATIONS.md`
- explain refresh behavior, stale indicators, and data caveats
- include troubleshooting steps tied to the actual app

---

# Final Quality Bar
Do not stop after green tests if the repo is still misleading.
Do not stop after UI polish if correctness is still weak.
Do not stop after doc edits if the config is still inconsistent.

The final result should feel like this:
- leaner
- more honest
- more consistent
- more trustworthy
- easier to hand to another engineer

That is the target.
