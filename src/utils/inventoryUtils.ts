// src/utils/inventoryUtils.ts
import { InventoryRow } from "../types";

/**
 * Check if a vehicle is in transit
 */
export function isInTransit(row: InventoryRow): boolean {
  return (row.Status || "").toUpperCase().includes("TRANSIT") ||
    (row.Category || "").toUpperCase().includes("TRANSIT");
}

/**
 * Format age display - shows "IN TRANSIT" or "X days"
 */
export function formatAge(row: InventoryRow): string {
  if (isInTransit(row)) {
    return "IN TRANSIT";
  }
  return `${row.Age} day${row.Age === 1 ? "" : "s"}`;
}

/**
 * Format age for table cells (shorter format)
 */
export function formatAgeShort(row: InventoryRow): string {
  if (isInTransit(row)) {
    return "IN TRANSIT";
  }
  return String(row.Age);
}

/**
 * Sort rows by age descending with IN TRANSIT at the bottom
 * ON DEALER LOT: 7, 6, 5, 4, 3, 2, 1, 0
 * IN TRANSIT: appears after all on-lot inventory
 */
export function sortByAgeDescending(rows: InventoryRow[]): InventoryRow[] {
  return [...rows].sort((a, b) => {
    const aInTransit = isInTransit(a);
    const bInTransit = isInTransit(b);

    // If one is in transit and the other isn't, on-lot comes first
    if (aInTransit && !bInTransit) return 1;
    if (!aInTransit && bInTransit) return -1;

    // Both same status - sort by age descending
    return b.Age - a.Age;
  });
}

/**
 * Sort rows grouped by model, with age descending within each group
 * IN TRANSIT vehicles appear at the bottom of each model group
 */
export function sortByModelThenAge(rows: InventoryRow[]): InventoryRow[] {
  return [...rows].sort((a, b) => {
    // First sort by Model
    if (a.Model !== b.Model) {
      return a.Model.localeCompare(b.Model);
    }

    // Within same model, IN TRANSIT goes to bottom
    const aInTransit = isInTransit(a);
    const bInTransit = isInTransit(b);

    if (aInTransit && !bInTransit) return 1;
    if (!aInTransit && bInTransit) return -1;

    // Both same status - sort by age descending
    return b.Age - a.Age;
  });
}
