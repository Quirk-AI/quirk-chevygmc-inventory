# CLAUDE_CODE_UPDATE.md — Phase 2: Close the Gap to 9.2+

## Context

Read CLAUDE.md first — it is the source of truth for critical rules and project constraints.

This prompt addresses the 4 remaining gaps identified in the 8.9/10 re-grade. These are the items separating senior from principal-level code.

---

## Execution rules

1. **Do not modify** `vehicleUrl.ts`, `modelFormatting.ts`, or `inventoryStore.ts` unless a task explicitly names them
2. **Do not change** the column structure of InventoryTable, VirtualizedTable, or DrilldownTable
3. **Do not change** the stock number popup behavior, isInTransit logic, or how "IN TRANSIT" displays
4. **Preserve all existing test assertions** — you may add tests, never remove or weaken existing ones
5. After each task, run `npm run typecheck && npm run test && npm run build`
6. Commit each task separately with a descriptive message

---

## TASK 1: Delete OptimizedImage.tsx (Low risk)

`src/components/OptimizedImage.tsx` is never imported anywhere in the application. Delete it.

**Verify:** `npm run typecheck && npm run test && npm run build` — all pass. Grep the src/ directory for "OptimizedImage" — zero results expected.

---

## TASK 2: Remove avgAge dead computation (Low risk)

`avgAge` is computed inside `useInventoryMetrics` but nothing consumes it.

**Step 1:** In `src/hooks/useInventoryMetrics.ts`:
- Delete the entire `avgAge` useMemo block
- Remove `avgAge: number` from the `InventoryMetrics` interface
- Remove `avgAge` from the return object

**Step 2:** In `src/hooks/useInventoryMetrics.test.ts`:
- Delete the entire `describe("avgAge", ...)` test block

**Verify:** `npm run typecheck && npm run test && npm run build`

---

## TASK 3: Extract useFilteredInventory hook from App.tsx (Medium risk)

Create `src/hooks/useFilteredInventory.ts` that extracts the remaining filter/sort derivations from App.tsx.

This hook takes `validRows` and `filters` and returns all filter-dependent computed data.

```typescript
// src/hooks/useFilteredInventory.ts
import { useMemo } from "react";
import { InventoryRow, Filters } from "../types";
import { isInTransit } from "../utils/inventoryUtils";
import { rowMatchesModelFilter } from "../utils/modelFormatting";

interface FilteredInventory {
  sortedRows: InventoryRow[];
  filteredRows: InventoryRow[];
  filteredNewArrivals: InventoryRow[];
  filteredInTransit: InventoryRow[];
}

export function useFilteredInventory(
  validRows: InventoryRow[],
  filters: Filters
): FilteredInventory {
  // Move these useMemo blocks from App.tsx EXACTLY as they are:
  // - sortedRows (sort by Model then Age descending)
  // - filteredRows (apply all filter predicates against sortedRows)
  // - filteredNewArrivals (Age > 0 && Age <= 7 && !isInTransit from filteredRows)
  // - filteredInTransit (isInTransit from filteredRows)
  //
  // Do not change the logic. Copy character-for-character.
  // Dependencies: sortedRows depends on [validRows], filteredRows depends on [sortedRows, filters],
  // filteredNewArrivals depends on [filteredRows], filteredInTransit depends on [filteredRows].
}
```

**Update App.tsx** — replace the 4 extracted useMemo blocks with:

```typescript
const {
  sortedRows, filteredRows, filteredNewArrivals, filteredInTransit
} = useFilteredInventory(validRows, filters);
```

Remove the `rowMatchesModelFilter` import from App.tsx if it is no longer used directly. Keep the `isInTransit` import only if App.tsx still references it directly (it should not after this extraction).

**After this task, App.tsx should have:**
- 0 filter logic
- 0 sort logic
- ~4 useMemo/useCallback blocks remaining (validRows, modelsList, handleSmartSearch, handleRefresh, handleModelClick)
- Total ~230 lines or fewer

**Verify:** `npm run typecheck && npm run test && npm run build`. Manual smoke test: load dashboard, apply year filter, apply model filter, type a stock number, verify counts update correctly in KPI bar.

---

## TASK 4: Add component-level tests (Medium risk)

Create test files for the untested components. Each test file should cover: renders without crashing, renders expected content, and handles user interaction where applicable.

Use the existing `createMockRow` pattern from `integration.test.ts` for mock data. Use `@testing-library/react` and `@testing-library/user-event`.

### 4A: `src/components/ChartsSection.test.tsx`
- Renders the "Inventory Mix - Top Models" heading
- Renders the "MSRP Price Breakdown" heading
- Renders all 4 price bucket buttons (Under $40K, $40K – $60K, $60K – $80K, $80K+)
- Calls the correct priceHandler when a bucket is clicked
- Renders pie chart legend items matching modelPieData

### 4B: `src/components/DrilldownTable.test.tsx`
- Renders group headers with model name and count
- Renders vehicle rows with stock number, year, model
- Calls onRowClick when a row is clicked
- Calls onBack when back button is clicked
- Renders title when provided

### 4C: `src/components/InventoryTable.test.tsx`
- Renders grouped vehicle data
- Renders stock numbers as clickable elements
- Calls onRowClick when a data row is clicked
- Returns null when rows array is empty

### 4D: `src/components/NewArrivalsPanel.test.tsx`
- Renders "New Arrivals" heading with count badge
- Renders vehicle rows sorted by age descending
- Returns null when rows array is empty

### 4E: `src/components/OldestUnitsPanel.test.tsx`
- Renders "Oldest Units on Lot" heading
- Shows up to 10 vehicles sorted by age descending
- Returns null when no qualifying vehicles exist

### 4F: `src/hooks/useFilteredInventory.test.ts`
- Returns all rows when no filters are active
- Filters by make correctly
- Filters by model correctly (including display name matching)
- Filters by year correctly
- Filters by stock number (partial match)
- filteredNewArrivals contains only vehicles with Age 1-7 and not in transit
- filteredInTransit contains only transit vehicles
- Returns empty arrays when no rows match

**Important rules for component tests:**
- Mock `recharts` in ChartsSection tests to avoid canvas rendering issues: `vi.mock("recharts", () => ({ PieChart: ... responsive container stub })` — or simply verify text content and button behavior, skipping chart internals
- Mock `window.open` for stock number click tests
- Mock `generateVehicleUrl` to return a predictable URL
- Do not test VirtualizedTable rendering (it requires IntersectionObserver mocking — existing tests already cover it)

**Verify:** `npm run typecheck && npm run test && npm run build` — all new and existing tests pass.

---

## Final verification

After all 4 tasks:

```bash
npm run typecheck    # Zero errors
npm run lint         # Zero warnings
npm run test         # All tests pass
npm run build        # Production build succeeds
```

Expected outcome:
- App.tsx ≤ 230 lines
- Zero dead code remaining
- 15+ test files (up from 10)
- Test-to-production ratio > 65%
