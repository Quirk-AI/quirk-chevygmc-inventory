# Quirk Auto Dealers – Inventory Dashboard

An internal inventory analytics dashboard for Quirk Auto Dealers (Chevrolet and Buick GMC, New Hampshire). Parses daily PBS DMS Excel exports into filterable dashboards for merchandising and operational decisions.

**Live:** https://chevynhinventory.netlify.app/

![Version](https://img.shields.io/badge/version-3.2.0-green.svg)
![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178c6.svg)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Michael%20Palmer-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/mpalmer1234/)

---

## What it does

- Displays current inventory for two dealerships (Chevrolet, Buick GMC)
- Filters by dealership, year, make, model, and stock number
- Shows KPI cards: total vehicles, new arrivals (≤7 days), in transit, in stock
- MSRP price breakdown with drilldowns (Under $40K, $40K–$60K, $60K–$80K, $80K+)
- Aging analysis with drilldowns (0–30, 31–60, 61–90, 90+ days)
- Model mix pie chart with per-model drilldown
- Oldest units panel (top 10 by age)
- New arrivals panel (vehicles ≤7 days on lot)
- Grouped inventory table with stock number links to dealership websites
- Light and dark themes

### What it does not do

- No user authentication or access control
- No real-time data sync — relies on daily Excel file uploads
- No backend — inventory files are served as static assets from `/public/`
- No CSV export (feature was removed)
- No persistent URL routing or deep links

---

## Data source

Inventory data comes from PBS DMS Excel exports placed in `/public/`:

| Dealership | File |
|------------|------|
| Chevrolet | `/public/inventory.xlsx` |
| Buick GMC | `/public/gmc-inventory.xlsx` |

These files are **publicly downloadable** by anyone with the deployed URL. See `docs/ADR-001-inventory-data-source.md` for the full tradeoff analysis.

---

## Setup

```bash
npm install
npm run dev          # Dev server on localhost:3000
npm run build        # TypeScript check + production build
npm run test         # Vitest unit/integration tests (197 tests)
npm run test:e2e     # Playwright E2E tests
npm run typecheck    # TypeScript only
npm run lint         # ESLint (zero warnings policy)
```

### Deployment

Deployed to Netlify. Automatic deploy on push to `main`. Build command: `npm run build`, publish directory: `dist`.

---

## Tech stack

React 18.3 · TypeScript 5.7 · Vite 6.0 · Tailwind CSS + shadcn/ui · Zustand 5.0 · Recharts · XLSX · Vitest + RTL + Playwright · Netlify

---

## Architecture

```
src/
├── App.tsx                       # Main orchestration (217 lines)
├── types.ts                      # Core types
├── store/inventoryStore.ts       # Zustand state
├── constants/drillTypes.ts       # Drill type constants
├── services/
│   ├── inventoryService.ts       # Service interface + active source dispatcher
│   └── staticInventorySource.ts  # Static Excel loader (demo/pilot mode)
├── hooks/
│   ├── useInventoryLoader.ts     # Stale-while-revalidate fetch + cache
│   ├── useInventoryMetrics.ts    # KPI metrics, price buckets, model pie data
│   ├── useFilteredInventory.ts   # Filter cascade + derived subsets
│   ├── useDrilldown.ts           # Drilldown data + type flags
│   └── useMediaQuery.ts          # Responsive breakpoint hook
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── HeaderBar.tsx             # Brand header
│   ├── FiltersBar.tsx            # Dealership picker + filters
│   ├── KpiBar.tsx                # 4x metric cards
│   ├── ChartsSection.tsx         # Pie chart + price buckets
│   ├── NewArrivalsPanel.tsx      # Vehicles ≤7 days old
│   ├── OldestUnitsPanel.tsx      # Top 10 oldest on-lot vehicles
│   ├── InventoryTable.tsx        # Grouped table (<500 rows)
│   ├── VirtualizedTable.tsx      # Virtual table (500+ rows)
│   ├── DrilldownTable.tsx        # Drill-down grouped view
│   ├── VehicleDetailDrawer.tsx   # Side drawer with vehicle details
│   ├── ErrorBoundary.tsx         # Error boundaries
│   ├── StaleIndicator.tsx        # "Updated X ago" banner
│   └── LoadingIndicator.tsx      # Spinner
├── utils/
│   ├── vehicleUrl.ts             # URL generation for dealership websites
│   ├── modelFormatting.ts        # Model number ↔ body style mapping
│   └── inventoryUtils.ts         # isInTransit, formatAge, sortByAgeDescending
└── styles/                       # CSS modules
```

---

## Deployment maturity

This is an **internal pilot tool** with production-minded front-end structure. It is not a fully production-grade system.

- **What works well:** UI, filtering, drilldowns, aging analysis, model normalization, responsive layout, test coverage
- **What is demo/pilot architecture:** Static Excel files served from `/public/`, no authentication, no backend
- **What would need to change for protected production:** Authenticated API data source (the `InventoryService` interface in `inventoryService.ts` is designed for this swap), access control, server-side data delivery

---

## Known limitations

- Inventory files in `/public/` are publicly accessible (no auth)
- Data freshness depends on manual Excel upload frequency (typically daily)
- No backend or API — all processing is client-side
- Stock number links open dealership website pages in popup windows — URL format changes on the dealership sites can break these links
- `vehicleUrl.ts` and `modelFormatting.ts` contain dealership-specific business logic that must be updated if GM model codes or dealership URL patterns change

---

## Testing

16 test files, 197 tests. Coverage focused on:
- Vehicle URL generation (26 tests)
- Model formatting and body style mapping (29 tests)
- Inventory utilities (19 tests)
- Drilldown behavior including filter-respecting tests (18 tests)
- Filtered inventory cascade (9 tests)
- Inventory metrics (9 tests)
- Component rendering (KpiBar, ChartsSection, tables, panels, error boundaries)
- Integration tests (14 tests)

---

## Author

Michael Palmer · Quirk Auto Dealers
