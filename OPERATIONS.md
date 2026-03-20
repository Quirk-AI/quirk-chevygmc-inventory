# Operations Guide

How to update inventory data, what to expect, and what to check when things look wrong.

---

## Updating Inventory Data

### File Locations

| Dealership | File Path |
|------------|-----------|
| Chevrolet | `/public/inventory.xlsx` |
| Buick GMC | `/public/gmc-inventory.xlsx` |

### Update Process

1. Export inventory from PBS DMS (automated daily report)
2. Replace the appropriate file in `/public/`
3. Push to `main` — Netlify deploys automatically
4. Users refresh their browser to see new data

### Required Excel Columns

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `Stock Number` | String | Yes | Unique vehicle identifier |
| `Year` | Number | Yes | Model year |
| `Make` | String | Yes | CHEVROLET, BUICK, or GMC |
| `Model` | String | Yes | SILVERADO 1500, TAHOE, etc. |
| `Exterior Color` | String | Yes | Full color name |
| `Trim` | String | Yes | LT, RST, HIGH COUNTRY, etc. |
| `Model Number` | String | Yes | OEM code (CK10543, TK10743) |
| `Cylinders` | Number | No | Engine cylinder count |
| `Age` | Number | Yes | Days on lot |
| `MSRP` | Number | Yes | Vehicle price (numeric, no $ or commas) |
| `Category` | String | Yes | ON DEALER LOT, IN TRANSIT, etc. |
| `VIN` | String | Yes | 17-character VIN |
| `Body` | String | No | Body description (e.g., `4WD Crew Cab 147" w/1`) |

Column names are **case-sensitive** and must match exactly.

### Category Values

| Value | Meaning |
|-------|---------|
| `ON DEALER LOT` | In stock, included in aging calculations |
| `IN TRANSIT` | In transit, excluded from aging |
| `IN TRANSIT SOLD` | Treated same as IN TRANSIT |

---

## Data Refresh Behavior

- The dashboard fetches inventory data once on page load
- Client-side cache: 5-minute stale threshold, 30-minute expiry
- The "Updated X minutes ago" indicator shows when the page was loaded, not when the Excel file was last modified
- A manual refresh button appears when data is stale
- Switching dealerships triggers a new fetch for that dealership's file

There is no automatic polling or live update.

---

## Stale Data Indicator

When data is older than 5 minutes, a yellow banner appears at the top with a refresh button. This triggers a fresh fetch of the Excel file. If the file hasn't changed, the user sees the same data.

---

## Known Failure Modes

### "No vehicles found"
1. Check that the Excel file exists in `/public/`
2. Verify the file has data rows (not just headers)
3. Check browser console for parse errors
4. Confirm the file is valid `.xlsx` format

### Incorrect vehicle counts
1. Check `Category` column values — trailing spaces are handled, but other variations are not
2. Clear all filters (Year, Make, Model) before comparing
3. In-transit vehicles are excluded from aging counts but included in total count

### Model dropdown shows raw codes (CK10543)
The model number is not in `MODEL_NUMBER_DISPLAY_MAP` in `src/utils/modelFormatting.ts`. Add the mapping there.

### Stock number links open wrong page or 404
The dealership website URL format may have changed. Check and update `src/utils/vehicleUrl.ts`. Run `npm run test` — the 26-test URL suite will catch regressions.

### Data appears stale after file update
The browser may be serving a cached version. Hard refresh (Ctrl+Shift+R) or clear the browser cache. The Netlify CDN may also cache static assets briefly.

---

## Deployment

### Netlify (production)
- Automatic deploy on push to `main`
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 20
- No environment variables required

### Local development
```bash
npm install
npm run dev      # Dev server on localhost:3000
npm run build    # Production build with TypeScript check
npm run test     # Unit/integration tests
```

---

## Security and Deployment Posture

This dashboard is an **internal pilot tool**. It is not production-hardened.

- Inventory Excel files are served as static assets from `/public/` — anyone with the deployed URL can download them directly
- There is no user authentication or access control
- The data source can be swapped to an authenticated API by implementing a new `InventoryService` in `src/services/` and updating the dispatcher in `inventoryService.ts`

This is acceptable for internal use but not appropriate if the data or audience becomes more sensitive. See `docs/ADR-001-inventory-data-source.md` for details and migration path.
