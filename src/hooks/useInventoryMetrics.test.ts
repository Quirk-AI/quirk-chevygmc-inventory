import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInventoryMetrics } from "./useInventoryMetrics";
import { InventoryRow } from "../types";

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

describe("useInventoryMetrics", () => {
  describe("agingBuckets", () => {
    it("correctly buckets vehicles by age", () => {
      const rows = [
        createMockRow({ Age: 10 }),   // 0-30
        createMockRow({ Age: 25 }),   // 0-30
        createMockRow({ Age: 45 }),   // 31-60
        createMockRow({ Age: 75 }),   // 61-90
        createMockRow({ Age: 100 }),  // 90+
      ];
      const { result } = renderHook(() => useInventoryMetrics(rows));
      expect(result.current.agingBuckets).toEqual({
        bucket0_30: 2,
        bucket31_60: 1,
        bucket61_90: 1,
        bucket90_plus: 1,
      });
    });

    it("excludes in-transit vehicles from aging buckets", () => {
      const rows = [
        createMockRow({ Age: 10 }),
        createMockRow({ Age: 15, Status: "IN TRANSIT" }),
      ];
      const { result } = renderHook(() => useInventoryMetrics(rows));
      expect(result.current.agingBuckets.bucket0_30).toBe(1);
    });

    it("returns all zeros for empty input", () => {
      const { result } = renderHook(() => useInventoryMetrics([]));
      expect(result.current.agingBuckets).toEqual({
        bucket0_30: 0,
        bucket31_60: 0,
        bucket61_90: 0,
        bucket90_plus: 0,
      });
    });
  });

  describe("priceBuckets", () => {
    it("correctly buckets vehicles by MSRP", () => {
      const rows = [
        createMockRow({ MSRP: 35000 }),  // under 40k
        createMockRow({ MSRP: 45000 }),  // 40k-60k
        createMockRow({ MSRP: 70000 }),  // 60k-80k
        createMockRow({ MSRP: 90000 }),  // over 80k
      ];
      const { result } = renderHook(() => useInventoryMetrics(rows));
      expect(result.current.priceBuckets).toEqual({
        under40k: 1,
        from40kTo60k: 1,
        from60kTo80k: 1,
        over80k: 1,
      });
    });

    it("excludes vehicles with zero or negative MSRP", () => {
      const rows = [
        createMockRow({ MSRP: 0 }),
        createMockRow({ MSRP: -100 }),
        createMockRow({ MSRP: 50000 }),
      ];
      const { result } = renderHook(() => useInventoryMetrics(rows));
      expect(result.current.priceBuckets.from40kTo60k).toBe(1);
      expect(result.current.priceBuckets.under40k).toBe(0);
    });
  });

  describe("inTransitRows", () => {
    it("contains only transit vehicles", () => {
      const rows = [
        createMockRow({ "Stock Number": "A", Status: "IN TRANSIT" }),
        createMockRow({ "Stock Number": "B", Status: "ON DEALER LOT" }),
        createMockRow({ "Stock Number": "C", Status: "IN TRANSIT" }),
      ];
      const { result } = renderHook(() => useInventoryMetrics(rows));
      expect(result.current.inTransitRows).toHaveLength(2);
      expect(result.current.inTransitRows.every((r) => r.Status === "IN TRANSIT")).toBe(true);
    });
  });

  describe("inStockRows", () => {
    it("contains only non-transit vehicles", () => {
      const rows = [
        createMockRow({ "Stock Number": "A", Status: "IN TRANSIT" }),
        createMockRow({ "Stock Number": "B", Status: "ON DEALER LOT" }),
      ];
      const { result } = renderHook(() => useInventoryMetrics(rows));
      expect(result.current.inStockRows).toHaveLength(1);
      expect(result.current.inStockRows[0]?.["Stock Number"]).toBe("B");
    });
  });

  describe("modelPieData", () => {
    it("is sorted by count descending", () => {
      const rows = [
        createMockRow({ Model: "TAHOE" }),
        createMockRow({ Model: "SILVERADO 1500" }),
        createMockRow({ Model: "SILVERADO 1500" }),
        createMockRow({ Model: "SILVERADO 1500" }),
        createMockRow({ Model: "EQUINOX" }),
        createMockRow({ Model: "EQUINOX" }),
      ];
      const { result } = renderHook(() => useInventoryMetrics(rows));
      expect(result.current.modelPieData[0]?.name).toBe("SILVERADO 1500");
      expect(result.current.modelPieData[0]?.value).toBe(3);
      expect(result.current.modelPieData[1]?.name).toBe("EQUINOX");
      expect(result.current.modelPieData[1]?.value).toBe(2);
    });

    it("is capped at 8 entries", () => {
      const models = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
      const rows = models.map((m) => createMockRow({ Model: m }));
      const { result } = renderHook(() => useInventoryMetrics(rows));
      expect(result.current.modelPieData).toHaveLength(8);
    });
  });


});
