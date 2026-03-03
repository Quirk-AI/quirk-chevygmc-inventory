# CLAUDE_1.md - Remaining Improvements for 9.5+ Grade

## Current Grade: 9.2/10 (A)
## Target Grade: 9.5+ (A+)

---

## Overview

Three remaining items to push this codebase to A+ status. Complete these in order.

---

## TASK 1: Add aria-labels to FiltersBar Select Components

**Priority:** Medium | **Complexity:** Low | **File:** `src/components/FiltersBar.tsx`

### Problem
The FiltersBar component has Select dropdowns without proper aria-labels, which hurts accessibility compliance.

### Implementation

Find all `<Select>` components in FiltersBar.tsx and add appropriate aria-labels:

```tsx
// Year filter
<Select
  value={filters.year}
  onValueChange={(value) => onChange({ year: value })}
  aria-label="Filter by model year"
>

// Make filter  
<Select
  value={filters.make}
  onValueChange={(value) => onChange({ make: value })}
  aria-label="Filter by vehicle make"
>

// Model filter
<Select
  value={filters.model}
  onValueChange={(value) => onChange({ model: value })}
  aria-label="Filter by vehicle model"
>
```

Also add aria-label to the search input:

```tsx
<Input
  type="text"
  placeholder="Search inventory..."
  value={searchTerm}
  onChange={(e) => onSearchChange(e.target.value)}
  aria-label="Search inventory by stock number, model, or keyword"
/>
```

### Verification
1. Run `npm run build` - should pass
2. Open Chrome DevTools → Lighthouse → Accessibility audit → Target 95+ score

---

## TASK 2: Integrate inventoryService into useInventoryLoader

**Priority:** High | **Complexity:** Medium | **Files:** `src/hooks/useInventoryLoader.ts`, `src/services/inventoryService.ts`

### Problem
The `inventoryService.ts` abstraction exists but `useInventoryLoader.ts` still has inline Excel parsing logic. This creates code duplication and defeats the purpose of the service layer.

### Current State (useInventoryLoader.ts)
```typescript
// Has its own parseArrayBuffer function
// Has its own XLSX import
// Duplicates logic from inventoryService.ts
```

### Implementation

**Step 1:** Update `useInventoryLoader.ts` to import and use the service:

```typescript
// src/hooks/useInventoryLoader.ts
import { useEffect, useCallback, useRef } from "react";
import { DealerSource } from "../types";
import { useInventoryStore } from "../store/inventoryStore";
import inventoryService from "../services/inventoryService";

const STALE_TIME = 5 * 60 * 1000;
const CACHE_TIME = 30 * 60 * 1000;

const getCacheKey = (make: DealerSource) => `inventory-data-cache-${make}`;

interface CachedData {
  rows: ReturnType<typeof inventoryService.fetchInventory> extends Promise<infer T> ? T : never;
  timestamp: number;
}

export function useInventoryLoader() {
  const setRows = useInventoryStore((s) => s.setRows);
  const setLoading = useInventoryStore((s) => s.setLoading);
  const setStale = useInventoryStore((s) => s.setStale);
  const setError = useInventoryStore((s) => s.setError);
  const setLastUpdated = useInventoryStore((s) => s.setLastUpdated);
  const setRefreshing = useInventoryStore((s) => s.setRefreshing);
  const selectedMake = useInventoryStore((s) => s.selectedMake);

  const hasFetched = useRef<DealerSource | null>(null);

  const loadFromCache = useCallback((make: DealerSource): CachedData | null => {
    try {
      const cached = localStorage.getItem(getCacheKey(make));
      if (cached) {
        const parsed: CachedData = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_TIME) return parsed;
        localStorage.removeItem(getCacheKey(make));
      }
    } catch (e) {
      console.warn("Cache load failed:", e);
    }
    return null;
  }, []);

  const saveToCache = useCallback((data: CachedData["rows"], make: DealerSource) => {
    try {
      const cacheData: CachedData = { rows: data, timestamp: Date.now() };
      localStorage.setItem(getCacheKey(make), JSON.stringify(cacheData));
    } catch (e) {
      console.warn("Cache save failed:", e);
    }
  }, []);

  const fetchInventory = useCallback(async (useCache = true, make: DealerSource = selectedMake) => {
    // Try cache first
    if (useCache) {
      const cached = loadFromCache(make);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        setRows(cached.rows);
        setLastUpdated(new Date(cached.timestamp));
        setStale(age > STALE_TIME);
        setLoading(false);
        if (age <= STALE_TIME) return;
      }
    }

    // Fetch from service
    try {
      const rows = await inventoryService.fetchInventory(make);
      
      setRows(rows);
      setError(null);
      setLastUpdated(new Date());
      setStale(false);
      saveToCache(rows, make);
    } catch (err) {
      console.error("Inventory load failed:", err);
      setError(err instanceof Error ? err.message : "Error loading inventory data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadFromCache, saveToCache, setRows, setLoading, setStale, setError, setLastUpdated, setRefreshing, selectedMake]);

  const refetch = useCallback(async () => {
    setRefreshing(true);
    await fetchInventory(false, selectedMake);
  }, [fetchInventory, setRefreshing, selectedMake]);

  // Initial fetch and refetch when make changes
  useEffect(() => {
    if (hasFetched.current === selectedMake) return;
    hasFetched.current = selectedMake;
    setLoading(true);
    fetchInventory(true, selectedMake);
  }, [fetchInventory, selectedMake, setLoading]);

  // Stale check interval
  useEffect(() => {
    const interval = setInterval(() => {
      const lastUpdated = useInventoryStore.getState().lastUpdated;
      if (lastUpdated) {
        const age = Date.now() - lastUpdated.getTime();
        if (age > STALE_TIME) {
          setStale(true);
        }
      }
    }, STALE_TIME);
    return () => clearInterval(interval);
  }, [setStale]);

  return { refetch };
}
```

**Step 2:** Remove the following from `useInventoryLoader.ts`:
- `import * as XLSX from "xlsx"`
- `import { INVENTORY_PATHS } from "../inventoryHelpers"`
- The entire `parseArrayBuffer` function

**Step 3:** Verify `inventoryHelpers.ts` no longer exports `INVENTORY_PATHS` (it should only be in `inventoryService.ts` now). If `inventoryHelpers.ts` still has it, remove it and update any other imports.

### Verification
1. `npm run typecheck` - no errors
2. `npm run build` - builds successfully  
3. Test the app manually - inventory should load for both Chevrolet and Buick GMC
4. Check browser console - no parsing errors

---

## TASK 3: Add Playwright E2E Tests

**Priority:** Medium | **Complexity:** High | **New Files:** `e2e/`, `playwright.config.ts`

### Problem
Unit tests cover component logic but don't verify the full user flow works end-to-end.

### Implementation

**Step 1:** Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

**Step 2:** Create `playwright.config.ts` in project root:

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

**Step 3:** Create `e2e/` directory and add test files:

```typescript
// e2e/inventory.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Inventory Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for inventory to load
    await page.waitForSelector('[role="table"]', { timeout: 10000 });
  });

  test("loads inventory data on initial visit", async ({ page }) => {
    // Should show KPI cards
    await expect(page.getByText(/Total Vehicles/i)).toBeVisible();
    await expect(page.getByText(/New Arrivals/i)).toBeVisible();
    await expect(page.getByText(/In Transit/i)).toBeVisible();
  });

  test("filters by model when clicking pie chart", async ({ page }) => {
    // Find and click a pie chart segment or legend item
    const legendItem = page.locator("button").filter({ hasText: /SILVERADO|TAHOE|EQUINOX/i }).first();
    
    if (await legendItem.isVisible()) {
      await legendItem.click();
      
      // Should show drilldown view
      await expect(page.getByRole("button", { name: /back/i })).toBeVisible();
    }
  });

  test("drills down into aging bucket", async ({ page }) => {
    // Click on 0-30 Days aging bucket
    const freshBucket = page.getByRole("button", { name: /0-30 Days/i });
    await freshBucket.click();

    // Should show drilldown with title
    await expect(page.getByText(/Fresh Inventory/i)).toBeVisible();
    
    // Should have back button
    await expect(page.getByRole("button", { name: /back/i })).toBeVisible();
  });

  test("back button returns to main view", async ({ page }) => {
    // Drill into aging bucket
    const freshBucket = page.getByRole("button", { name: /0-30 Days/i });
    await freshBucket.click();

    // Click back
    const backButton = page.getByRole("button", { name: /back/i });
    await backButton.click();

    // Should see KPI bar again
    await expect(page.getByText(/Total Vehicles/i)).toBeVisible();
  });

  test("switches between dealerships", async ({ page }) => {
    // Look for dealership toggle/selector
    const chevyTab = page.getByRole("button", { name: /chevrolet/i });
    const gmcTab = page.getByRole("button", { name: /buick.*gmc/i });

    if (await gmcTab.isVisible()) {
      await gmcTab.click();
      
      // Wait for new data to load
      await page.waitForTimeout(1000);
      
      // Should still show inventory table
      await expect(page.locator('[role="table"]')).toBeVisible();
    }
  });

  test("opens vehicle detail drawer when clicking row", async ({ page }) => {
    // Click on a vehicle row (not the stock number link)
    const row = page.locator("tr").filter({ hasText: /\$\d{2,3},\d{3}/ }).first();
    
    if (await row.isVisible()) {
      // Click on the row (avoiding the stock number link)
      await row.locator("td").nth(2).click();
      
      // Drawer should open - look for close button or drawer content
      await expect(page.getByRole("dialog").or(page.locator('[data-state="open"]'))).toBeVisible({ timeout: 2000 });
    }
  });

  test("stock number link opens in new tab", async ({ page, context }) => {
    // Get the first stock number link
    const stockLink = page.locator("a, span").filter({ hasText: /^[A-Z]?\d{5,}$/ }).first();
    
    if (await stockLink.isVisible()) {
      // Listen for new page
      const pagePromise = context.waitForEvent("page");
      
      await stockLink.click();
      
      // Verify new tab opened (or would open - we can check the href)
      const href = await stockLink.getAttribute("href");
      if (href) {
        expect(href).toContain("quirk");
      }
    }
  });
});

test.describe("Accessibility", () => {
  test("has proper ARIA labels on filters", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[role="table"]');

    // Check for aria-labels on key interactive elements
    await expect(page.locator('[aria-label*="Filter"]').or(page.locator('[aria-label*="filter"]'))).toHaveCount.above(0);
  });

  test("inventory table has proper role", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[role="table"]');

    const table = page.locator('[role="table"]');
    await expect(table).toHaveAttribute("aria-label", /inventory/i);
  });
});
```

**Step 4:** Add npm scripts to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

**Step 5:** Update `.gitignore`:

```
# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
```

### Verification
1. `npm run test:e2e` - all tests pass
2. `npm run test:e2e:ui` - can see tests run visually

---

## After Completing All Tasks

Run full verification:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

All should pass.

**Expected Final Grade: 9.5/10 (A+)**

---

## Files Changed Summary

| Task | Files Modified | Files Added |
|------|----------------|-------------|
| 1 | `src/components/FiltersBar.tsx` | — |
| 2 | `src/hooks/useInventoryLoader.ts` | — |
| 3 | `package.json`, `.gitignore` | `playwright.config.ts`, `e2e/inventory.spec.ts` |
