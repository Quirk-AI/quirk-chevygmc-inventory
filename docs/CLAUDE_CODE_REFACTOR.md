# CLAUDE_CODE_REFACTOR.md — Phase 1: Safe Cleanup + App.tsx Decomposition

## Context

Read CLAUDE.md first. It is the source of truth for critical rules, dead code inventory, and architectural constraints.

This prompt addresses the weaknesses identified in the 8.6/10 code review. Every task is scoped to be non-breaking. After each task, run `npm run typecheck && npm run test && npm run build` before proceeding to the next. If any check fails, fix it before moving on.

---

## Execution rules

1. **Do not modify** `vehicleUrl.ts`, `modelFormatting.ts`, or `inventoryStore.ts` unless a task explicitly names them
2. **Do not change** the column structure of InventoryTable, VirtualizedTable, or DrilldownTable
3. **Do not change** the stock number popup behavior (window.open with centered positioning)
4. **Do not change** the isInTransit logic or how "IN TRANSIT" displays
5. **Preserve all existing test assertions** — you may add tests, never remove or weaken existing ones
6. After each task, verify with `npm run typecheck && npm run test && npm run build`
7. Commit each task separately with a descriptive message

---

## TASK 1: Delete dead code (Low risk)

Delete these files entirely:
- `src/components/InventoryHealthPanel.tsx` — never imported
- `src/utils/formatCurrency.ts` — nothing imports it

Then clean up `src/inventoryHelpers.ts`:
- Keep ONLY the `DEALER_LABELS` export (used by FiltersBar)
- Delete: `QUIRK_GREEN`, `POWDER_BLUE`, `CHART_COLORS`, `getModelColor`, `formatCurrency`, `exportToCsv`
- Delete the `InventoryRow` import if it becomes unused after removing `exportToCsv`
- The file should be ~10 lines when done

**Verify:** `npm run typecheck && npm run test && npm run build` — all pass, zero errors.

---

## TASK 2: Remove dead props (Low risk)

**FiltersBar.tsx:**
- Remove `agingBuckets: AgingBuckets` from the Props interface
- Remove the `AgingBuckets` import from types if no longer used in this file
- Do NOT change the component's behavior or rendered output

**App.tsx:**
- Remove `agingBuckets={agingBuckets}` from the `<FiltersBar>` JSX

**KpiBar.tsx:**
- Remove `avgAge: number` from the Props interface
- Remove any destructuring of `avgAge` in the component body

**App.tsx:**
- Remove `avgAge={avgAge}` from the `<KpiBar>` JSX
- Keep the `avgAge` useMemo computation for now (it will be useful later or can be removed in a future pass)

**Verify:** `npm run typecheck && npm run test && npm run build`

---

## TASK 3: Consolidate duplicate memos in App.tsx (Low risk)

`newArrivalRows` and `filteredNewArrivals` compute nearly the same thing:
- `filteredNewArrivals` = `filteredRows.filter(r => r.Age > 0 && r.Age <= 7 && !isInTransit(r))`
- `newArrivalRows` = `validRows.filter(r => r.Age > 0 && r.Age <= 7 && !isInTransit(r))`

The only difference is the source: `filteredRows` (respects filters) vs `validRows` (all valid data).

`newArrivalRows` is ONLY used in `drillData` for `DRILL_TYPES.NEW`. Replace that one reference:
- In the `drillData` useMemo, change `if (drillType === DRILL_TYPES.NEW) result = [...newArrivalRows];` to `if (drillType === DRILL_TYPES.NEW) result = validRows.filter((r) => r.Age > 0 && r.Age <= 7 && !isInTransit(r));`
- Delete the entire `newArrivalRows` useMemo block
- Remove `newArrivalRows` from the `drillData` useMemo dependency array

**Verify:** `npm run typecheck && npm run test && npm run build`

---

## TASK 4: Extract derived data hooks from App.tsx (Medium risk — this is the main refactor)

Create two new hooks that extract computation out of App.tsx. The goal is to reduce App.tsx from ~410 lines to ~200 lines while preserving identical behavior.

### 4A: Create `src/hooks/useInventoryMetrics.ts`

This hook takes `validRows` (the filtered-for-validity rows) and returns all the computed metrics that don't depend on user filters.

```typescript
// src/hooks/useInventoryMetrics.ts
import { useMemo } from "react";
import { InventoryRow, AgingBuckets, PriceBuckets, ModelPieDatum } from "../types";
import { isInTransit } from "../utils/inventoryUtils";

interface InventoryMetrics {
  agingBuckets: AgingBuckets;
  priceBuckets: PriceBuckets;
  avgAge: number;
  modelPieData: ModelPieDatum[];
  inTransitRows: InventoryRow[];
  inStockRows: InventoryRow[];
}

export function useInventoryMetrics(validRows: InventoryRow[]): InventoryMetrics {
  // Move these useMemo blocks from App.tsx:
  // - agingBuckets
  // - priceBuckets
  // - avgAge
  // - modelPieData
  // - inTransitRows
  // - inStockRows
  //
  // Copy them EXACTLY as they are. Do not change the logic.
  // Each useMemo should depend on [validRows].
}
```

### 4B: Create `src/hooks/useDrilldown.ts`

This hook encapsulates all drill-down logic.

```typescript
// src/hooks/useDrilldown.ts
import { useMemo } from "react";
import { InventoryRow, DrillType } from "../types";
import { isInTransit, sortByAgeDescending } from "../utils/inventoryUtils";
import {
  DRILL_TYPES,
  DRILL_TITLES,
  MODEL_DRILL_PREFIX,
  getModelFromDrill,
  isModelDrill as isModelDrillType,
} from "../constants/drillTypes";

interface DrilldownResult {
  drillData: Record<string, InventoryRow[]> | null;
  getDrillTitle: (type: string) => string;
  isAgingDrill: boolean;
  isPriceDrill: boolean;
  isNewArrivalsDrill: boolean;
  isInTransitDrill: boolean;
  isInStockDrill: boolean;
  isModelDrill: boolean;
  isDrillActive: boolean;
}

export function useDrilldown(
  drillType: DrillType,
  validRows: InventoryRow[],
  filteredRows: InventoryRow[],
  inTransitRows: InventoryRow[],
  inStockRows: InventoryRow[]
): DrilldownResult {
  // Move these from App.tsx:
  // - The entire drillData useMemo (including buildGroups helper)
  // - getDrillTitle function
  // - All the isDrill boolean computations (isAgingDrill, isPriceDrill, etc.)
  // - isDrillActive
  //
  // Copy EXACTLY as-is. Do not change logic.
}
```

### 4C: Update App.tsx

Replace the extracted code with hook calls:

```typescript
const {
  agingBuckets, priceBuckets, avgAge, modelPieData,
  inTransitRows, inStockRows
} = useInventoryMetrics(validRows);

const {
  drillData, getDrillTitle, isDrillActive,
  // individual booleans available if needed
} = useDrilldown(drillType, validRows, filteredRows, inTransitRows, inStockRows);
```

**What stays in App.tsx:**
- Store selectors and setters
- `validRows` computation
- `modelsList` computation
- `sortedRows` and `filteredRows` (these depend on `filters` from the store)
- `filteredNewArrivals` and `filteredInTransit` (derived from filteredRows)
- `handleSmartSearch`, `handleRefresh`, `handleModelClick` callbacks
- All JSX rendering

**The extraction rules:**
1. Copy each useMemo block character-for-character into the new hook
2. The hook returns the same values App.tsx was computing
3. App.tsx replaces 12+ useMemo blocks with 2 hook calls
4. The rendered output must be IDENTICAL — same props, same values, same behavior

**Verify after this task:**
- `npm run typecheck` — no errors
- `npm run test` — all existing tests pass (the integration tests exercise the same logic paths)
- `npm run build` — production build succeeds
- Manual smoke test: load the dashboard, verify KPI numbers match, click a price bucket, click a pie chart segment, click back, verify stock number popup still works

---

## TASK 5: Add tests for the new hooks (Low risk)

Create `src/hooks/useInventoryMetrics.test.ts`:
- Test that agingBuckets correctly buckets by age and excludes in-transit
- Test that priceBuckets correctly buckets by MSRP tiers
- Test that inTransitRows contains only transit vehicles
- Test that modelPieData is sorted by count descending and capped at 8

Create `src/hooks/useDrilldown.test.ts`:
- Test that drillData returns null when drillType is null
- Test that PRICE_UNDER_40K returns only vehicles with MSRP < 40000
- Test that model drill returns only matching model
- Test that isDrillActive is true for each drill type and false for null

Use the same `createMockRow` factory pattern from the existing test files.

**Verify:** `npm run test` — all tests pass including the new ones.

---

## Final verification

After all 5 tasks:

```bash
npm run typecheck    # Zero errors
npm run lint         # Zero warnings
npm run test         # All tests pass
npm run build        # Production build succeeds
```

App.tsx should be ~200 lines (down from ~410). Two new hook files should contain the extracted logic. All dead code should be gone. No behavior changes.
