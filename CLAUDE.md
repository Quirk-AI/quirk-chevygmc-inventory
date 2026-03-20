# CLAUDE.md - Quirk Inventory Dashboard

## Project overview

**Quirk Inventory Intelligence Dashboard** — Production React/TypeScript inventory analytics platform for Quirk Auto Dealers (17+ locations, MA/NH). Parses PBS DMS Excel exports into actionable dashboards for merchandising and operational decisions.

**Live:** https://chevynhinventory.netlify.app  
**Version:** 3.2.0  
**Last reviewed:** 2026-03-20  
**Grade:** 8.6/10 (Senior)  
**Target:** 9.2+ (Principal)

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
├── App.tsx                    # ⚠️ GOD COMPONENT — 410 lines, needs refactoring
├── types.ts                   # Core types: InventoryRow, DrillType, PriceBuckets, etc.
├── store/inventoryStore.ts    # Zustand — single flat store, 15 fields
├── constants/drillTypes.ts    # Drill type constants, titles, model prefix helpers
├── services/inventoryService.ts  # Excel fetch + parse (InventoryService interface)
├── hooks/
│   ├── useInventoryLoader.ts  # Stale-while-revalidate fetch + localStorage cache
│   └── useMediaQuery.ts       # Responsive breakpoint hook
├── components/
│   ├── ui/                    # shadcn/ui primitives (card, badge, button, select, sheet)
│   ├── HeaderBar.tsx          # Top brand header with dealership image
│   ├── FiltersBar.tsx         # Dealership picker, year/make/model/stock filters
│   ├── KpiBar.tsx             # 4x metric cards (Total, New, In Transit, In Stock)
│   ├── ChartsSection.tsx      # Pie chart (model mix) + MSRP price breakdown buckets
│   ├── NewArrivalsPanel.tsx   # Vehicles ≤7 days old
│   ├── OldestUnitsPanel.tsx   # Top 10 oldest on-lot vehicles
│   ├── InventoryTable.tsx     # Main grouped table (<500 rows)
│   ├── VirtualizedTable.tsx   # @tanstack/react-virtual table (500+ rows)
│   ├── DrilldownTable.tsx     # Drill-down grouped view from KPI/chart clicks
│   ├── VehicleDetailDrawer.tsx # Side drawer with vehicle details + VIN Solutions link
│   ├── ErrorBoundary.tsx      # Class-based error boundary + SectionErrorBoundary
│   ├── StaleIndicator.tsx     # "Updated X ago" banner with refresh button
│   ├── LoadingIndicator.tsx   # Spinner
│   ├── OptimizedImage.tsx     # IntersectionObserver lazy image
│   └── InventoryHealthPanel.tsx  # ⚠️ DEAD CODE — never imported
├── utils/
│   ├── vehicleUrl.ts          # 🔴 CRITICAL — URL generation for dealership websites
│   ├── modelFormatting.ts     # 🔴 CRITICAL — Model number ↔ body style mapping
│   ├── inventoryUtils.ts      # isInTransit, formatAge, sortByAgeDescending
│   └── formatCurrency.ts      # ⚠️ DEAD CODE — nothing imports this
├── inventoryHelpers.ts        # ⚠️ MOSTLY DEAD — only DEALER_LABELS is used
├── styles/                    # CSS modules (theme, layout, responsive, etc.)
└── test/setup.ts              # Vitest setup
```

---

## Critical rules — read before ANY changes

1. **vehicleUrl.ts** — Generates exact URLs for quirkchevynh.com and quirkbuickgmc.com. GMC/Buick uses spelled-out drive types ("four-wheel-drive"), Chevy uses abbreviations ("4wd"). Corvette, van, truck, and generic URL builders each have distinct formats. Changing any regex or string logic here can break every stock number link. Always run `npm run test` — the 350-line test suite is the safety net.

2. **modelFormatting.ts** — Maps GM model numbers (CK10543, TK10743) to body descriptions ("4WD CREW CAB 147" WB"). The `MODEL_NUMBER_DISPLAY_MAP` must match actual PBS data. `parseModelDisplayName()` must round-trip correctly for filters to work.

3. **Table column sync** — `InventoryTable.tsx`, `VirtualizedTable.tsx`, and `DrilldownTable.tsx` all render the same column structure. If you add/remove a column from one, you must update all three (desktop AND mobile views). Current structure: Stock # | Year | Model | Exterior | Trim | Body | [In Transit indicator] | MSRP.

4. **Stock number popup** — Stock links open in a centered popup window (1000×700), not a new tab. The `handleStockClick` function uses `window.screenX/screenY + outerWidth/outerHeight` for centering. All three table components share this pattern.

5. **In Transit logic** — `isInTransit()` checks both `Status` and `Category` fields for "TRANSIT". The column only displays "IN TRANSIT" (amber) when the check passes; otherwise the cell is blank. No numeric age is shown.

6. **Store reset cascade** — `setSelectedMake()` resets filters, searchTerm, drillType, and selectedVehicle. `resetAll()` does the same minus the make change. Don't add state without considering reset behavior.

7. **Build must pass `tsc --noEmit`** — The build script runs TypeScript checking. Any type error blocks deployment.

---

## Known dead code — flagged for cleanup

| Item | Location | Status |
|------|----------|--------|
| `InventoryHealthPanel.tsx` | `src/components/` | Never imported in App.tsx |
| `formatCurrency.ts` | `src/utils/` | Nothing imports it |
| `inventoryHelpers.ts` exports | `src/` | Only `DEALER_LABELS` is used (by FiltersBar). `CHART_COLORS`, `getModelColor`, `exportToCsv`, `formatCurrency`, `QUIRK_GREEN`, `POWDER_BLUE` are all dead |
| `agingBuckets` prop | `FiltersBar.tsx` line 28 | Declared in Props but never consumed |
| `avgAge` prop | `KpiBar.tsx` line 11 | Accepted in Props interface but never rendered |
| `newArrivalRows` vs `filteredNewArrivals` | `App.tsx` lines 145/164 | Near-duplicate: one filters `validRows`, the other `filteredRows`. Both filter by `Age > 0 && Age <= 7 && !isInTransit` |

---

## Known architectural weakness

**App.tsx is a god component (410 lines).** It computes 12+ memoized derivations (agingBuckets, priceBuckets, avgAge, sortedRows, filteredRows, filteredNewArrivals, filteredInTransit, modelPieData, newArrivalRows, inTransitRows, inStockRows, drillData) and contains all drill logic, filter logic, and orchestration. This should be decomposed into custom hooks.

---

## Testing overview

9 unit/integration test files (1,953 LOC) + 1 Playwright E2E spec. Coverage concentrated on utils and critical business logic. Gaps: no tests for App.tsx, ChartsSection, DrilldownTable, InventoryTable, FiltersBar, NewArrivalsPanel, OldestUnitsPanel.
