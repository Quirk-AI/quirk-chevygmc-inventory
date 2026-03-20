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
  PRICE_UNDER_40K: "price_under_40k",
  PRICE_40K_60K: "price_40k_60k",
  PRICE_60K_80K: "price_60k_80k",
  PRICE_OVER_80K: "price_over_80k",
} as const;

export const DRILL_TITLES: Record<string, string> = {
  [DRILL_TYPES.AGE_0_30]: "Fresh Inventory (0-30 Days)",
  [DRILL_TYPES.AGE_31_60]: "Normal Aging (31-60 Days)",
  [DRILL_TYPES.AGE_61_90]: "Watch List (61-90 Days)",
  [DRILL_TYPES.AGE_90_PLUS]: "At Risk (90+ Days)",
  [DRILL_TYPES.NEW]: "New Arrivals (7 Days)",
  [DRILL_TYPES.IN_TRANSIT]: "In Transit Inventory",
  [DRILL_TYPES.IN_STOCK]: "In Stock Inventory",
  [DRILL_TYPES.PRICE_UNDER_40K]: "Under $40,000",
  [DRILL_TYPES.PRICE_40K_60K]: "$40,000 – $60,000",
  [DRILL_TYPES.PRICE_60K_80K]: "$60,000 – $80,000",
  [DRILL_TYPES.PRICE_OVER_80K]: "$80,000+",
};

export const MODEL_DRILL_PREFIX = "model:";

export const isModelDrill = (type: string | null): boolean =>
  type?.startsWith(MODEL_DRILL_PREFIX) ?? false;

export const getModelFromDrill = (type: string): string =>
  type.replace(MODEL_DRILL_PREFIX, "");
