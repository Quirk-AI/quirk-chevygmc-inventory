import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDrilldown } from "./useDrilldown";
import { InventoryRow, DrillType } from "../types";
import { DRILL_TYPES } from "../constants/drillTypes";

const createMockRow = (overrides: Partial<InventoryRow> = {}): InventoryRow => ({
  "Stock Number": "TEST001",
  Year: 2026,
  Make: "CHEVROLET",
  Model: "SILVERADO 1500",
  "Exterior Color": "Black",
  Trim: "LT 4WD",
  "Model Number": "CK10543",
  Cylinders: 8,
  Age: 30,
  MSRP: 55000,
  Status: "ON DEALER LOT",
  VIN: "1GCUYDED1RZ123456",
  ...overrides,
});

const allRows = [
  createMockRow({ "Stock Number": "A", MSRP: 35000, Age: 5, Model: "EQUINOX", Year: 2025 }),
  createMockRow({ "Stock Number": "B", MSRP: 55000, Age: 45, Model: "SILVERADO 1500", Year: 2026 }),
  createMockRow({ "Stock Number": "C", MSRP: 75000, Age: 10, Status: "IN TRANSIT", Model: "TAHOE", Year: 2026 }),
  createMockRow({ "Stock Number": "D", MSRP: 90000, Age: 100, Model: "CORVETTE", Year: 2025 }),
];

// Simulate a filtered subset (e.g., year=2026 only)
const filteredRows2026 = allRows.filter((r) => r.Year === 2026);

const filteredRows = allRows;
const inTransitRows = allRows.filter((r) => r.Status === "IN TRANSIT");
const inStockRows = allRows.filter((r) => r.Status !== "IN TRANSIT");

describe("useDrilldown", () => {
  describe("drillData", () => {
    it("returns null when drillType is null", () => {
      const { result } = renderHook(() =>
        useDrilldown(null, filteredRows, inTransitRows, inStockRows)
      );
      expect(result.current.drillData).toBeNull();
    });

    it("PRICE_UNDER_40K returns only vehicles with MSRP < 40000", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.PRICE_UNDER_40K as DrillType,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      expect(result.current.drillData).not.toBeNull();
      const allDrillRows = Object.values(result.current.drillData!).flat();
      expect(allDrillRows).toHaveLength(1);
      expect(allDrillRows[0]?.["Stock Number"]).toBe("A");
      expect(allDrillRows.every((r) => r.MSRP > 0 && r.MSRP < 40000)).toBe(true);
    });

    it("model drill returns only matching model", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          "model:EQUINOX" as DrillType,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      expect(result.current.drillData).not.toBeNull();
      const allDrillRows = Object.values(result.current.drillData!).flat();
      expect(allDrillRows).toHaveLength(1);
      expect(allDrillRows.every((r) => r.Model === "EQUINOX")).toBe(true);
    });

    it("IN_TRANSIT drill returns only transit vehicles", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.IN_TRANSIT as DrillType,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      const allDrillRows = Object.values(result.current.drillData!).flat();
      expect(allDrillRows).toHaveLength(1);
      expect(allDrillRows[0]?.["Stock Number"]).toBe("C");
    });
  });

  describe("drills respect active filters", () => {
    it("aging drilldown respects year filter", () => {
      // Only 2026 rows: B (age 45, on lot) and C (age 10, in transit)
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.AGE_31_60 as DrillType,
          filteredRows2026,
          inTransitRows,
          inStockRows
        )
      );
      const allDrillRows = Object.values(result.current.drillData!).flat();
      // Only B qualifies (age 45, not transit, year 2026)
      expect(allDrillRows).toHaveLength(1);
      expect(allDrillRows[0]?.["Stock Number"]).toBe("B");
    });

    it("price drilldown respects filtered dataset", () => {
      // Only 2026 rows: B (MSRP 55000) and C (MSRP 75000)
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.PRICE_UNDER_40K as DrillType,
          filteredRows2026,
          inTransitRows,
          inStockRows
        )
      );
      const allDrillRows = Object.values(result.current.drillData!).flat();
      // A (MSRP 35000) is year 2025, filtered out
      expect(allDrillRows).toHaveLength(0);
    });

    it("model drilldown respects filtered dataset", () => {
      // Only 2026 rows — no EQUINOX (it's 2025)
      const { result } = renderHook(() =>
        useDrilldown(
          "model:EQUINOX" as DrillType,
          filteredRows2026,
          inTransitRows,
          inStockRows
        )
      );
      const allDrillRows = Object.values(result.current.drillData!).flat();
      expect(allDrillRows).toHaveLength(0);
    });

    it("TOTAL drill reflects filtered rows", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.TOTAL as DrillType,
          filteredRows2026,
          inTransitRows,
          inStockRows
        )
      );
      const allDrillRows = Object.values(result.current.drillData!).flat();
      expect(allDrillRows).toHaveLength(2); // B and C only
    });

    it("new arrivals drilldown respects filtered dataset", () => {
      // A (age 5, 2025) would match new arrivals, but is filtered out for 2026
      // C (age 10, 2026) is in transit so excluded from new arrivals
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.NEW as DrillType,
          filteredRows2026,
          inTransitRows,
          inStockRows
        )
      );
      const allDrillRows = Object.values(result.current.drillData!).flat();
      expect(allDrillRows).toHaveLength(0);
    });
  });

  describe("isDrillActive", () => {
    it("is false when drillType is null", () => {
      const { result } = renderHook(() =>
        useDrilldown(null, filteredRows, inTransitRows, inStockRows)
      );
      expect(result.current.isDrillActive).toBe(false);
    });

    it("is true for aging drill types", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.AGE_0_30 as DrillType,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      expect(result.current.isDrillActive).toBe(true);
      expect(result.current.isAgingDrill).toBe(true);
    });

    it("is true for price drill types", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.PRICE_UNDER_40K as DrillType,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      expect(result.current.isDrillActive).toBe(true);
      expect(result.current.isPriceDrill).toBe(true);
    });

    it("is true for new arrivals drill", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.NEW as DrillType,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      expect(result.current.isDrillActive).toBe(true);
      expect(result.current.isNewArrivalsDrill).toBe(true);
    });

    it("is true for in-transit drill", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.IN_TRANSIT as DrillType,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      expect(result.current.isDrillActive).toBe(true);
      expect(result.current.isInTransitDrill).toBe(true);
    });

    it("is true for in-stock drill", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.IN_STOCK as DrillType,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      expect(result.current.isDrillActive).toBe(true);
      expect(result.current.isInStockDrill).toBe(true);
    });

    it("is true for model drill", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          "model:SILVERADO 1500" as DrillType,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      expect(result.current.isDrillActive).toBe(true);
      expect(result.current.isModelDrill).toBe(true);
    });
  });

  describe("getDrillTitle", () => {
    it("returns model inventory title for model drills", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          "model:EQUINOX" as DrillType,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      expect(result.current.getDrillTitle("model:EQUINOX")).toBe(
        "EQUINOX Inventory (1 vehicles)"
      );
    });

    it("returns standard title for known drill types", () => {
      const { result } = renderHook(() =>
        useDrilldown(null, filteredRows, inTransitRows, inStockRows)
      );
      expect(result.current.getDrillTitle(DRILL_TYPES.AGE_0_30)).toBe(
        "Fresh Inventory (0-30 Days)"
      );
    });
  });
});
