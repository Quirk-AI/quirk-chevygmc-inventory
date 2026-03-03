// src/constants/drillTypes.ts

export const DRILL_TYPES = {
  TOTAL: "total",
  NEW: "new",
  IN_TRANSIT: "in_transit",
  IN_STOCK: "in_stock",
  AGE_0_30: "0_30",
  AGE_31_60: "31_60",
  AGE_61_90: "61_90",
  AGE_90_PLUS: "90_plus",
} as const;

export const DRILL_TITLES: Record<string, string> = {
  [DRILL_TYPES.AGE_0_30]: "Fresh Inventory (0-30 Days)",
  [DRILL_TYPES.AGE_31_60]: "Normal Aging (31-60 Days)",
  [DRILL_TYPES.AGE_61_90]: "Watch List (61-90 Days)",
  [DRILL_TYPES.AGE_90_PLUS]: "At Risk (90+ Days)",
  [DRILL_TYPES.NEW]: "New Arrivals (7 Days)",
  [DRILL_TYPES.IN_TRANSIT]: "In Transit Inventory",
  [DRILL_TYPES.IN_STOCK]: "In Stock Inventory",
};

export const MODEL_DRILL_PREFIX = "model:";

export const isModelDrill = (type: string | null): boolean =>
  type?.startsWith(MODEL_DRILL_PREFIX) ?? false;

export const getModelFromDrill = (type: string): string =>
  type.replace(MODEL_DRILL_PREFIX, "");
