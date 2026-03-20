# CLAUDE.md - Quirk Inventory Dashboard

## Project overview

**Quirk Inventory Intelligence Dashboard** — Internal React/TypeScript inventory analytics tool for Quirk Auto Dealers (Chevrolet and Buick GMC, NH). Parses PBS DMS Excel exports into filterable dashboards for merchandising and operational decisions.

**Live:** https://chevynhinventory.netlify.app
**Version:** 3.2.0

---

## Tech stack

React 18.3 · TypeScript 5.7 · Vite 6.0 · Tailwind CSS + shadcn/ui · Zustand 5.0 · Recharts · XLSX · Vitest + RTL + Playwright · Netlify

---

## Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # TypeScript check + production build
npm run test         # Vitest unit/integration tests
npm run test:e2e     # Playwright E2E tests
npm run typecheck    # TypeScript only
npm run lint         # ESLint
npm run format       # Prettier
```

---

## Architecture

```
src/
├── App.tsx                       # Main orchestration (~217 lines)
├── types.ts                      # Core types: InventoryRow, DrillType, PriceBuckets, etc.
├── store/inventoryStore.ts       # Zustand — single flat store
├── constants/drillTypes.ts       # Drill type constants, titles, model prefix helpers
├── services/inventoryService.ts  # Excel fetch + parse (InventoryService interface)
├── hooks/
│   ├── useInventoryLoader.ts     # Stale-while-revalidate fetch + localStorage cache
│   ├── useInventoryMetrics.ts    # KPI metrics, price/aging buckets, model pie data
│   ├── useFilteredInventory.ts   # Filter cascade + derived subsets
│   ├── useDrilldown.ts           # Drilldown data resolution + type flags
│   └── useMediaQuery.ts          # Responsive breakpoint hook
├── components/
│   ├── ui/                       # shadcn/ui primitives (card, badge, button, select, sheet)
│   ├── HeaderBar.tsx             # Top brand header with dealership image
│   ├── FiltersBar.tsx            # Dealership picker, year/make/model/stock filters
│   ├── KpiBar.tsx                # 4x metric cards (Total, New, In Transit, In Stock)
│   ├── ChartsSection.tsx         # Pie chart (model mix) + MSRP price breakdown buckets
│   ├── NewArrivalsPanel.tsx      # Vehicles ≤7 days old
│   ├── OldestUnitsPanel.tsx      # Top 10 oldest on-lot vehicles
│   ├── InventoryTable.tsx        # Main grouped table (<500 rows)
│   ├── VirtualizedTable.tsx      # @tanstack/react-virtual table (500+ rows)
│   ├── DrilldownTable.tsx        # Drill-down grouped view from KPI/chart clicks
│   ├── VehicleDetailDrawer.tsx   # Side drawer with vehicle details + VIN Solutions link
│   ├── ErrorBoundary.tsx         # Class-based error boundary + SectionErrorBoundary
│   ├── StaleIndicator.tsx        # "Updated X ago" banner with refresh button
│   └── LoadingIndicator.tsx      # Spinner
├── utils/
│   ├── vehicleUrl.ts             # 🔴 CRITICAL — URL generation for dealership websites
│   ├── modelFormatting.ts        # 🔴 CRITICAL — Model number ↔ body style mapping
│   └── inventoryUtils.ts         # isInTransit, formatAge, sortByAgeDescending
├── inventoryHelpers.ts           # DEALER_LABELS only
├── styles/                       # CSS modules (theme, layout, responsive, etc.)
└── test/setup.ts                 # Vitest setup
```

---

## Critical rules — read before ANY changes

1. **vehicleUrl.ts** — Generates exact URLs for quirkchevynh.com and quirkbuickgmc.com. GMC/Buick uses spelled-out drive types ("four-wheel-drive"), Chevy uses abbreviations ("4wd"). Corvette, van, truck, and generic URL builders each have distinct formats. Changing any regex or string logic here can break every stock number link. Always run `npm run test` — the 26-test suite is the safety net.

2. **modelFormatting.ts** — Maps GM model numbers (CK10543, TK10743) to body descriptions ("4WD CREW CAB 147" WB"). The `MODEL_NUMBER_DISPLAY_MAP` must match actual PBS data. `parseModelDisplayName()` must round-trip correctly for filters to work.

3. **Table column sync** — `InventoryTable.tsx`, `VirtualizedTable.tsx`, and `DrilldownTable.tsx` all render the same column structure. If you add/remove a column from one, you must update all three (desktop AND mobile views). Current structure: Stock # | Year | Model | Exterior | Trim | Body | [In Transit indicator] | MSRP.

4. **Stock number popup** — Stock links open in a centered popup window (1000×700), not a new tab. The `handleStockClick` function uses `window.screenX/screenY + outerWidth/outerHeight` for centering. All three table components share this pattern.

5. **In Transit logic** — `isInTransit()` checks both `Status` and `Category` fields for "TRANSIT". The column only displays "IN TRANSIT" (amber) when the check passes; otherwise the cell is blank. No numeric age is shown.

6. **Store reset cascade** — `setSelectedMake()` resets filters, drillType, and selectedVehicle. `resetAll()` does the same minus the make change. Don't add state without considering reset behavior.

7. **Build must pass `tsc --noEmit`** — The build script runs TypeScript checking. Any type error blocks deployment.

8. **Drilldowns respect active filters** — All drilldowns (aging, price, model, new arrivals) use `filteredRows`, not `validRows`. This ensures drill results are consistent with what the user sees after applying filters. `inTransitRows` and `inStockRows` are derived from `filteredRows` via `useInventoryMetrics`.

9. **Data source consistency** — KPI cards, charts, panels, and tables all derive from `filteredRows`. `useInventoryMetrics` receives `filteredRows` so price buckets, model pie chart, and transit/stock counts reflect active filters. OldestUnitsPanel also uses `filteredRows`.

---

## Data security note

Inventory Excel files in `/public/` are publicly downloadable by anyone with the deployed URL. This is documented and accepted for internal use. See `docs/ADR-001-inventory-data-source.md` for the tradeoff analysis and future migration path.

---

## Testing overview

16 test files, 197 tests. Coverage includes utils (vehicleUrl, modelFormatting, inventoryUtils), hooks (useDrilldown, useFilteredInventory, useInventoryMetrics, useMediaQuery), components (KpiBar, ChartsSection, InventoryTable, VirtualizedTable, DrilldownTable, OldestUnitsPanel, NewArrivalsPanel, ErrorBoundary), and integration tests.
