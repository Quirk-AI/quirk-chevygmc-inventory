# ADR-001: Inventory Data Source - Excel File Upload vs DMS API Integration

## Status
**Accepted** | Date: 2024-12-01 | Author: Michael Palmer

---

## Context

The Quirk Inventory Intelligence Dashboard requires daily vehicle inventory data from dealership locations (Quirk Chevrolet NH, Quirk Buick GMC). Our dealership management system (DMS) is **PBS Dealer Systems**.

During the architecture phase, we evaluated two approaches for inventory data ingestion:

1. **Direct API integration with PBS Dealer Systems**
2. **Manual Excel file upload from PBS export**

---

## Decision

We chose **Option 2: Manual Excel file upload** as the data ingestion method.

---

## Rationale

### PBS API Limitations

PBS Dealer Systems does not provide a publicly accessible REST API or real-time data feed for third-party integrations. Available integration options through PBS require:

- Enterprise-tier licensing agreements
- Dedicated VPN/private network connectivity
- Per-transaction fees for data access
- 6-12 month implementation timeline with PBS Professional Services
- Minimum annual contract commitments

### Cost-Benefit Analysis

| Factor | API Integration | Excel Upload |
|--------|-----------------|--------------|
| Implementation Time | 6-12 months | 2 weeks |
| Annual Cost | Significant licensing fees | $0 |
| Data Freshness | Near real-time | Daily (acceptable for use case) |
| Maintenance Burden | High (API versioning, auth tokens) | Low (static file format) |
| Dependency Risk | Tied to PBS contract terms | None |

### Business Requirements Alignment

The dashboard's primary use cases (aging analysis, inventory health monitoring, merchandising decisions) do not require real-time data. Daily inventory snapshots exported from PBS each morning provide sufficient freshness for:

- Aging bucket calculations
- New arrival detection (≤7 days)
- At-risk inventory identification (90+ days)
- Model mix analysis

---

## Implementation

1. Operations staff exports inventory to Excel from PBS daily (automated PBS report)
2. Files are placed in `/public/inventory.xlsx` (Chevrolet) and `/public/gmc-inventory.xlsx` (Buick GMC)
3. Frontend fetches and parses Excel files via `xlsx` library
4. Data is cached client-side with 5-minute stale time, 30-minute cache expiry

### Data Flow

```
PBS Dealer Systems
       │
       ▼ (Daily Excel Export - Automated PBS Report)
  inventory.xlsx
       │
       ▼ (Upload to deployment)
  /public/inventory.xlsx
       │
       ▼ (Frontend fetch + xlsx parsing)
  inventoryService.ts
       │
       ▼ (Zustand state management)
  Application UI
```

---

## Security and Deployment Posture

### Current reality

Inventory Excel files are served from `/public/` as static assets. **Anyone with access to the deployed URL can download these files directly** (e.g., `https://chevynhinventory.netlify.app/inventory.xlsx`). There is no authentication, access control, or download restriction.

### Risk assessment

The data contains: stock numbers, model years, makes, models, trim levels, VINs, MSRP pricing, and aging information. This is **operational dealership data** — not customer PII, but also not intended for public consumption.

For the current use case (internal dealership tool with a limited audience), this is an accepted tradeoff. The Netlify deployment is not indexed by search engines and the URL is shared only internally.

### What this means

- This deployment model is appropriate for **internal/demo use only**
- It is **not appropriate** for sensitive operational data without additional protections
- If the audience expands or the data becomes more sensitive, authentication must be added

### Future migration path

The codebase is prepared for a safer ingestion model:

- `src/services/inventoryService.ts` defines an `InventoryService` interface
- Swapping `excelInventoryService` for an `apiInventoryService` requires no UI changes
- Data transformation logic is centralized in the service layer
- A future authenticated API could replace the static file fetch without restructuring the app

---

## Consequences

### Positive
- Zero recurring API costs
- No vendor lock-in beyond standard PBS licensing
- Simple, debuggable data pipeline
- Full control over data transformation logic

### Negative
- Data is up to 24 hours stale (acceptable per business requirements)
- Manual upload step required (mitigated by automated PBS report generation)
- No real-time inventory sync across systems
- Inventory files are publicly downloadable by anyone with the URL

---

## References

- PBS Dealer Systems: https://www.pbssystems.com/
- Internal evaluation conducted Q3 2024
- Decision approved by: Steve O'Brien (Manager), Michael Palmer (Technical Lead)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2024-12-01 | Michael Palmer | Initial decision documented |
| 2026-03-20 | Remediation | Added security posture section, documented public file exposure |
