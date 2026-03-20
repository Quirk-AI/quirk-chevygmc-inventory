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
  const drillData = useMemo(() => {
    if (!drillType) return null;

    const buildGroups = (inputRows: InventoryRow[]) => {
      const groups: Record<string, InventoryRow[]> = {};
      inputRows.forEach((r) => {
        const modelNumber = r["Model Number"] ? String(r["Model Number"]) : "";
        const key = r.Make && r.Model
          ? `${r.Make}|${r.Model}${modelNumber ? `|${modelNumber}` : ""}`
          : `${r.Make || "Unknown"}|${r.Model || "Unknown"}`;
        if (!groups[key]) groups[key] = [];
        groups[key]?.push(r);
      });
      Object.keys(groups).forEach((key) => {
        const group = groups[key];
        if (group) groups[key] = sortByAgeDescending(group);
      });
      return groups;
    };

    if (drillType === DRILL_TYPES.TOTAL) return buildGroups(filteredRows);
    if (drillType === DRILL_TYPES.IN_TRANSIT) return buildGroups(inTransitRows);
    if (drillType === DRILL_TYPES.IN_STOCK) return buildGroups(inStockRows);

    let result: InventoryRow[] = [];
    if (drillType === DRILL_TYPES.NEW) result = validRows.filter((r) => r.Age > 0 && r.Age <= 7 && !isInTransit(r));
    if (drillType === DRILL_TYPES.AGE_0_30) result = validRows.filter((r) => r.Age <= 30 && !isInTransit(r));
    if (drillType === DRILL_TYPES.AGE_31_60) result = validRows.filter((r) => r.Age > 30 && r.Age <= 60 && !isInTransit(r));
    if (drillType === DRILL_TYPES.AGE_61_90) result = validRows.filter((r) => r.Age > 60 && r.Age <= 90 && !isInTransit(r));
    if (drillType === DRILL_TYPES.AGE_90_PLUS) result = validRows.filter((r) => r.Age > 90 && !isInTransit(r));

    // Price drill types
    if (drillType === DRILL_TYPES.PRICE_UNDER_40K) result = validRows.filter((r) => r.MSRP > 0 && r.MSRP < 40000);
    if (drillType === DRILL_TYPES.PRICE_40K_60K) result = validRows.filter((r) => r.MSRP >= 40000 && r.MSRP < 60000);
    if (drillType === DRILL_TYPES.PRICE_60K_80K) result = validRows.filter((r) => r.MSRP >= 60000 && r.MSRP < 80000);
    if (drillType === DRILL_TYPES.PRICE_OVER_80K) result = validRows.filter((r) => r.MSRP >= 80000);

    // Handle model drill type
    if (drillType.startsWith(MODEL_DRILL_PREFIX)) {
      const modelName = getModelFromDrill(drillType);
      result = validRows.filter((r) => r.Model === modelName);
    }

    return buildGroups(result);
  }, [drillType, validRows, filteredRows, inTransitRows, inStockRows]);

  // Get title for drilldown
  const getDrillTitle = (type: string): string => {
    if (type.startsWith(MODEL_DRILL_PREFIX)) {
      const modelName = getModelFromDrill(type);
      const count = validRows.filter((r) => r.Model === modelName).length;
      return `${modelName} Inventory (${count} vehicles)`;
    }
    return DRILL_TITLES[type] ?? "Inventory";
  };

  // Explicit checks for drill types
  const isAgingDrill = drillType === DRILL_TYPES.AGE_0_30 || drillType === DRILL_TYPES.AGE_31_60 || drillType === DRILL_TYPES.AGE_61_90 || drillType === DRILL_TYPES.AGE_90_PLUS;
  const isPriceDrill = drillType === DRILL_TYPES.PRICE_UNDER_40K || drillType === DRILL_TYPES.PRICE_40K_60K || drillType === DRILL_TYPES.PRICE_60K_80K || drillType === DRILL_TYPES.PRICE_OVER_80K;
  const isNewArrivalsDrill = drillType === DRILL_TYPES.NEW;
  const isInTransitDrill = drillType === DRILL_TYPES.IN_TRANSIT;
  const isInStockDrill = drillType === DRILL_TYPES.IN_STOCK;
  const isModelDrill = isModelDrillType(drillType);
  const isDrillActive = isAgingDrill || isPriceDrill || isNewArrivalsDrill || isInTransitDrill || isInStockDrill || isModelDrill;

  return {
    drillData,
    getDrillTitle,
    isAgingDrill,
    isPriceDrill,
    isNewArrivalsDrill,
    isInTransitDrill,
    isInStockDrill,
    isModelDrill,
    isDrillActive,
  };
}
