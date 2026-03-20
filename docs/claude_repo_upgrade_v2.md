# Claude Code Upgrade Brief: Raise This Repo from 8.2 to 9.2+

You are working inside the updated `quirk-chevygmc-inventory` repo.

This repo already improved from a 6.9 to an 8.2. Do **not** spend time re-fixing items that are already in good shape. The next jump is not about visual polish first. It is about tightening truthfulness, architecture, deployment hardening, and real operational credibility.

Your job is to make targeted, high-value improvements that close the remaining gap to a 9.2+ internal production-grade front-end repo.

Do not behave like a generic code generator. Behave like a senior engineer doing a focused hardening pass.

---

# Primary Objective

Improve the repo in these five areas only:

1. **Product truthfulness and filter UX clarity**
2. **App-level orchestration and feature boundary cleanup**
3. **Static data delivery risk reduction**
4. **Build and bundle polish**
5. **Verified end-to-end confidence and documentation alignment**

Do not create speculative features. Do not add fluff. Do not rewrite the app for the sake of rewriting it.

---

# Non-Negotiable Rules

1. **Preserve current behavior unless the behavior is misleading, fragile, or insecure.**
2. **Prefer simplification over expansion.**
3. **Do not add a backend unless you are explicitly implementing an optional safe loading abstraction with a clearly documented fallback.**
4. **Do not break the current passing typecheck, lint, or test suite.**
5. **Every change must make the repo more honest, more maintainable, or more deployable.**
6. **When done, provide a concise engineering report listing what changed, why it mattered, and any unresolved tradeoffs.**

---

# Current Known Remaining Issues

These are the remaining weaknesses that still hold the repo below 9+.

## 1. Search field truthfulness problem
Current file:
- `src/components/FiltersBar.tsx`

Current issue:
- The input is bound to `filters.stockNumber`
- The placeholder is `"Search..."`
- The aria label says `"Search inventory by stock number, model, or keyword"`
- That is misleading because the actual implementation is not a broad keyword search

This is a product trust problem. Fix it.

## 2. `App.tsx` is still too orchestration-heavy
Current file:
- `src/App.tsx`

Current issue:
- `App.tsx` coordinates filtering, derived data, drilldown flow, loading states, stale state, selection state, chart handlers, reset behavior, and conditional rendering
- It is readable, but too central
- The repo needs stronger feature boundaries to feel deliberately engineered rather than gradually grown

## 3. Static inventory files are still in `/public`
Current files:
- `public/inventory.xlsx`
- `public/gmc-inventory.xlsx`

Current issue:
- Inventory spreadsheets are still public assets
- That means the deployment model still exposes the raw source files to anyone who can access the deployed app
- Even for internal tooling, this should be reduced, documented more bluntly, or abstracted so the repo is honest about its security posture

## 4. Build output still needs polish
Potential files:
- `vite.config.*`
- `package.json`
- any custom bundle config

Current issue:
- Build output shows an empty `vendor-react` chunk or similarly unnecessary chunking artifact
- That is not catastrophic, but it is a sign the bundling strategy is not fully intentional
- Source map policy also needs to be explicit, not accidental

## 5. E2E confidence and docs still need tighter alignment
Current files:
- `e2e/inventory.spec.ts`
- `README.md`
- `OPERATIONS.md`
- possibly `CLAUDE.md`

Current issue:
- Unit/integration confidence is good
- E2E confidence needs to be more clearly validated and documented
- Docs should state the actual deployment model and its limitations without overselling maturity

---

# Required Work Plan

Follow this exact order.

---

## Phase 1: Fix product truthfulness in filtering and search wording

### Target files
- `src/components/FiltersBar.tsx`
- `src/hooks/useFilteredInventory.ts`
- `src/types.ts` if needed
- any tests that assert current search/filter behavior

### Goal
Make the filter UI accurately describe what it actually does.

### Required actions
1. Inspect how `filters.stockNumber` is used in `useFilteredInventory.ts`.
2. Confirm whether the current behavior is:
   - exact stock number match
   - partial stock number match
   - case-insensitive contains
   - anything broader
3. Update the UI wording so it matches reality exactly.

### Preferred outcome
If the current field is stock-number-only, then make it explicit everywhere:
- Replace `placeholder="Search..."` with something like `"Filter by stock number"` or equivalent precise wording
- Replace the aria label with something like `"Filter inventory by stock number"`
- Rename labels or helper text if needed so the UI does not imply model or keyword search

### Do not do this unless necessary
- Do not build a full global keyword search unless it can be implemented cleanly, tested well, and justified with minimal complexity
- The safer default is to make the UI truthful, not broader

### Acceptance criteria
- The visible label, placeholder, and aria label all match actual behavior
- Related tests are updated or added
- No stale code remains referring to broader search capability if it no longer exists

---

## Phase 2: Reduce `App.tsx` responsibility without overengineering

### Target files
- `src/App.tsx`
- likely new feature-level hooks or view components under:
  - `src/hooks/`
  - `src/components/`
  - possibly `src/features/` if you introduce a new folder intentionally

### Goal
Reduce orchestration density in `App.tsx` while keeping the code understandable.

### Current pain points in `App.tsx`
- filtering setup
- metrics derivation
- drilldown wiring
- model click behavior
- refresh behavior
- visibility rules for KPI/charts/panels/table
- main page composition

### Required actions
Refactor `App.tsx` into smaller cohesive units.

### Recommended options
Choose the simplest good option.

#### Option A: Create a page-level hook
Create something like:
- `src/hooks/useInventoryDashboard.ts`

This hook can own:
- valid row derivation
- models list derivation
- filtered rows
- metrics
- drilldown state derivation
- high-level event handlers like refresh and model click

Then `App.tsx` becomes mostly composition.

#### Option B: Create feature sections
Create view components such as:
- `InventoryDashboardContent.tsx`
- `InventoryDashboardPanels.tsx`
- `InventoryDashboardDrilldown.tsx`

Only do this if it improves readability without creating prop soup.

### Important constraint
Do not scatter state randomly. This repo already uses Zustand. Respect the existing state model. Refactor derived orchestration, not core ownership semantics.

### Acceptance criteria
- `App.tsx` becomes materially smaller and easier to scan
- Derived dashboard logic lives in a clearly named abstraction
- No regression in current behavior
- Typecheck, lint, and tests still pass

---

## Phase 3: Reduce raw static data exposure risk and document it honestly

### Target files
- `src/services/inventoryService.ts`
- `src/hooks/useInventoryLoader.ts`
- `README.md`
- `OPERATIONS.md`
- optional new docs file such as `SECURITY_NOTES.md` or `DEPLOYMENT_LIMITATIONS.md`

### Goal
Improve the repo's operational honesty and reduce security risk where possible without forcing a backend rewrite.

### Required actions
Choose one of the following patterns and implement it cleanly.

#### Preferred pattern
Create an environment-aware loading abstraction that separates:
- demo/static file loading
- future protected API loading

For example:
- keep current static file loading as the explicit demo/default path
- add a service boundary or adapter layer so inventory can later be loaded from a protected endpoint without refactoring the UI again
- make the mode obvious through naming, code structure, and docs

Possible structure:
- `inventoryService.ts` becomes a dispatcher
- `staticInventorySource.ts` handles `/public/*.xlsx`
- `apiInventorySource.ts` is a stub or optional implementation with clear TODO and guard rails

### Required documentation changes
The docs must explicitly say something like:
- current repo uses client-side loading from public static spreadsheet assets for demo/internal pilot simplicity
- this is not the recommended architecture for protected production inventory data
- a protected API or authenticated data layer is the next-step production path

### Important constraint
Do not fake security.
Do not claim the app is secure if raw spreadsheets are still publicly served.
The goal is cleaner architecture and honest documentation, not pretend hardening.

### Acceptance criteria
- The loading path is more intentionally abstracted
- The docs clearly separate demo architecture from protected production architecture
- There is no misleading production-security language left behind

---

## Phase 4: Clean up bundle strategy and production build policy

### Target files
- `vite.config.*`
- `package.json`
- any build-related config files

### Goal
Make the build output intentional and remove obvious bundling waste or accidental policies.

### Required actions
1. Review current manual chunking strategy if one exists.
2. Identify why an empty or near-empty `vendor-react` chunk is being emitted.
3. Fix the chunking strategy so it reflects actual module grouping or remove manual chunking if it is no longer useful.
4. Review production source map behavior.

### Required decision
Explicitly choose one of these and document it in config comments or docs:
- source maps enabled for controlled internal debugging
- source maps disabled for production artifact minimization

Do not leave this ambiguous.

### Acceptance criteria
- No empty or nonsense chunk remains if it can be reasonably removed
- Bundle config is simpler or more intentional than before
- Source map policy is explicit
- Build still passes cleanly

---

## Phase 5: Strengthen E2E confidence and align docs with reality

### Target files
- `e2e/inventory.spec.ts`
- `README.md`
- `OPERATIONS.md`
- possibly any CI or scripts related to testing

### Goal
Ensure the repo proves the important user paths and describes itself honestly.

### Required E2E coverage
Verify that the main E2E test covers the most important operational flows.
At minimum, test these paths:

1. App loads and core inventory UI renders
2. Dealership switch works and visibly changes data context
3. Year/make/model filtering works
4. Stock number filter works according to its actual behavior
5. Drilldown opens from at least one KPI or chart path
6. Drilldown back action works
7. Vehicle row click opens the drawer
8. Drawer close works

If one huge spec is becoming brittle, split it into smaller focused specs.

### Required documentation alignment
Update docs so they clearly communicate:
- what the app is today
- what level of deployment confidence it has today
- what is still demo/pilot architecture
- what would need to change for protected production deployment

### Important documentation rule
Do not call this fully production-grade unless the architecture truly supports that claim.
Safer wording:
- internal pilot ready
- polished front-end demo with production-minded structure
- strong candidate for protected backend integration

### Acceptance criteria
- E2E coverage hits the most important flows
- Docs no longer oversell deployment/security maturity
- Test commands and run instructions match the actual repo

---

# Optional Nice-to-Have Improvements

Only do these if all five phases above are complete and stable.

## A. Add a small filter summary bar
Example:
- `Showing 42 vehicles for Chevrolet, 2025, Silverado`

Only if this improves operator clarity without clutter.

## B. Add defensive tests around dealership reset behavior
This is worth doing if current tests do not explicitly verify that dealership switching resets stale drilldown/filter state correctly.

## C. Add bundle analysis script
Only if lightweight. Do not add unnecessary tooling bloat.

---

# Files Most Likely to Change

Expected primary files:
- `src/App.tsx`
- `src/components/FiltersBar.tsx`
- `src/hooks/useFilteredInventory.ts`
- `src/hooks/useInventoryLoader.ts`
- `src/services/inventoryService.ts`
- `e2e/inventory.spec.ts`
- `README.md`
- `OPERATIONS.md`
- `vite.config.*`
- test files affected by the refactor

Possible new files:
- `src/hooks/useInventoryDashboard.ts`
- `src/services/staticInventorySource.ts`
- `src/services/apiInventorySource.ts`
- `SECURITY_NOTES.md` or `DEPLOYMENT_LIMITATIONS.md`

---

# Verification Checklist

Before finishing, you must verify all of the following:

1. Typecheck passes
2. Lint passes
3. Unit/integration tests pass
4. E2E tests pass
5. Production build passes
6. No visible UI wording contradicts actual functionality
7. Docs match the true architecture and deployment posture

---

# Final Deliverable Format

When you finish, provide a concise engineering report with these sections:

## 1. Completed changes
List each file changed and what changed.

## 2. Why each change mattered
Tie each change back to trust, maintainability, deployment readiness, or correctness.

## 3. Verification results
Report results for:
- typecheck
- lint
- unit/integration tests
- E2E
- build

## 4. Remaining limitations
Be honest. If static files are still public in demo mode, say so clearly.

## 5. Recommended next step after this pass
Give the single highest-value next architectural move.

---

# Final Priority Reminder

Do not chase novelty.

The highest-value work now is:
- making the product more truthful
- slimming orchestration
- separating demo data loading from protected production loading
- tightening build policy
- proving core flows through E2E and docs

That is what moves this repo from a strong 8.2 to a credible 9.2+.
