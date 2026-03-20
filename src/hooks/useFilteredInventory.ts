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
  const sortedRows = useMemo(() => {
    return [...validRows].sort((a, b) => {
      if (a.Model !== b.Model) return a.Model.localeCompare(b.Model);
      return b.Age - a.Age;
    });
  }, [validRows]);

  const filteredRows = useMemo(() => {
    return sortedRows.filter((row) => {
      // Filter by Make
      if (filters.make && row.Make !== filters.make) return false;

      // Filter by Model (handles display names with body styles)
      if (filters.model && !rowMatchesModelFilter(row, filters.model)) return false;

      if (filters.year !== "ALL" && String(row.Year) !== filters.year) return false;
      if (filters.priceMin) {
        const minPrice = Number(filters.priceMin);
        if (!isNaN(minPrice) && row.MSRP < minPrice) return false;
      }
      if (filters.priceMax) {
        const maxPrice = Number(filters.priceMax);
        if (!isNaN(maxPrice) && row.MSRP > maxPrice) return false;
      }
      if (filters.stockNumber) {
        const stockNum = filters.stockNumber.toLowerCase().trim();
        const rowStockNum = row["Stock Number"].toLowerCase().trim();
        if (!rowStockNum.includes(stockNum)) return false;
      }
      return true;
    });
  }, [sortedRows, filters]);

  const filteredNewArrivals = useMemo(() => {
    return filteredRows.filter((r) => r.Age > 0 && r.Age <= 7 && !isInTransit(r));
  }, [filteredRows]);

  const filteredInTransit = useMemo(() => {
    return filteredRows.filter((r) => isInTransit(r));
  }, [filteredRows]);

  return { sortedRows, filteredRows, filteredNewArrivals, filteredInTransit };
}
