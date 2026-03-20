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

const validRows = [
  createMockRow({ "Stock Number": "A", MSRP: 35000, Age: 5, Model: "EQUINOX" }),
  createMockRow({ "Stock Number": "B", MSRP: 55000, Age: 45, Model: "SILVERADO 1500" }),
  createMockRow({ "Stock Number": "C", MSRP: 75000, Age: 10, Status: "IN TRANSIT", Model: "TAHOE" }),
  createMockRow({ "Stock Number": "D", MSRP: 90000, Age: 100, Model: "CORVETTE" }),
];

const filteredRows = validRows;
const inTransitRows = validRows.filter((r) => r.Status === "IN TRANSIT");
const inStockRows = validRows.filter((r) => r.Status !== "IN TRANSIT");

describe("useDrilldown", () => {
  describe("drillData", () => {
    it("returns null when drillType is null", () => {
      const { result } = renderHook(() =>
        useDrilldown(null, validRows, filteredRows, inTransitRows, inStockRows)
      );
      expect(result.current.drillData).toBeNull();
    });

    it("PRICE_UNDER_40K returns only vehicles with MSRP < 40000", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.PRICE_UNDER_40K as DrillType,
          validRows,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      expect(result.current.drillData).not.toBeNull();
      const allRows = Object.values(result.current.drillData!).flat();
      expect(allRows).toHaveLength(1);
      expect(allRows[0]?.["Stock Number"]).toBe("A");
      expect(allRows.every((r) => r.MSRP > 0 && r.MSRP < 40000)).toBe(true);
    });

    it("model drill returns only matching model", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          "model:EQUINOX" as DrillType,
          validRows,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      expect(result.current.drillData).not.toBeNull();
      const allRows = Object.values(result.current.drillData!).flat();
      expect(allRows).toHaveLength(1);
      expect(allRows.every((r) => r.Model === "EQUINOX")).toBe(true);
    });

    it("IN_TRANSIT drill returns only transit vehicles", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.IN_TRANSIT as DrillType,
          validRows,
          filteredRows,
          inTransitRows,
          inStockRows
        )
      );
      const allRows = Object.values(result.current.drillData!).flat();
      expect(allRows).toHaveLength(1);
      expect(allRows[0]?.["Stock Number"]).toBe("C");
    });
  });

  describe("isDrillActive", () => {
    it("is false when drillType is null", () => {
      const { result } = renderHook(() =>
        useDrilldown(null, validRows, filteredRows, inTransitRows, inStockRows)
      );
      expect(result.current.isDrillActive).toBe(false);
    });

    it("is true for aging drill types", () => {
      const { result } = renderHook(() =>
        useDrilldown(
          DRILL_TYPES.AGE_0_30 as DrillType,
          validRows,
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
          validRows,
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
          validRows,
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
          validRows,
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
          validRows,
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
          validRows,
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
          validRows,
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
        useDrilldown(null, validRows, filteredRows, inTransitRows, inStockRows)
      );
      expect(result.current.getDrillTitle(DRILL_TYPES.AGE_0_30)).toBe(
        "Fresh Inventory (0-30 Days)"
      );
    });
  });
});
