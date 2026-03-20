import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFilteredInventory } from "./useFilteredInventory";
import { InventoryRow, Filters } from "../types";

const createMockRow = (overrides: Partial<InventoryRow> = {}): InventoryRow => ({
  "Stock Number": "TEST001",
  Year: 2024,
  Make: "CHEVROLET",
  Model: "SILVERADO 1500",
  "Exterior Color": "WHITE",
  Trim: "LT",
  "Model Number": "CK10543",
  Cylinders: 8,
  Age: 30,
  MSRP: 50000,
  Status: "ON DEALER LOT",
  VIN: "1GCUYDED1RZ123456",
  ...overrides,
});

const noFilters: Filters = {
  make: "",
  model: "",
  year: "ALL",
  priceMin: "",
  priceMax: "",
  stockNumber: "",
};

describe("useFilteredInventory", () => {
  it("returns all rows when no filters are active", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001" }),
      createMockRow({ "Stock Number": "A002" }),
    ];
    const { result } = renderHook(() => useFilteredInventory(rows, noFilters));
    expect(result.current.filteredRows).toHaveLength(2);
  });

  it("filters by make correctly", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001", Make: "CHEVROLET" }),
      createMockRow({ "Stock Number": "A002", Make: "GMC" }),
    ];
    const filters = { ...noFilters, make: "CHEVROLET" };
    const { result } = renderHook(() => useFilteredInventory(rows, filters));
    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0]?.Make).toBe("CHEVROLET");
  });

  it("filters by model correctly", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001", Model: "SILVERADO 1500" }),
      createMockRow({ "Stock Number": "A002", Model: "TAHOE" }),
    ];
    const filters = { ...noFilters, model: "TAHOE" };
    const { result } = renderHook(() => useFilteredInventory(rows, filters));
    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0]?.Model).toBe("TAHOE");
  });

  it("filters by year correctly", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001", Year: 2024 }),
      createMockRow({ "Stock Number": "A002", Year: 2025 }),
    ];
    const filters = { ...noFilters, year: "2025" };
    const { result } = renderHook(() => useFilteredInventory(rows, filters));
    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0]?.Year).toBe(2025);
  });

  it("filters by stock number (partial match)", () => {
    const rows = [
      createMockRow({ "Stock Number": "ABC123" }),
      createMockRow({ "Stock Number": "XYZ789" }),
    ];
    const filters = { ...noFilters, stockNumber: "abc" };
    const { result } = renderHook(() => useFilteredInventory(rows, filters));
    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0]?.["Stock Number"]).toBe("ABC123");
  });

  it("filteredNewArrivals contains only vehicles with Age 1-7 and not in transit", () => {
    const rows = [
      createMockRow({ "Stock Number": "NEW1", Age: 3 }),
      createMockRow({ "Stock Number": "NEW2", Age: 7 }),
      createMockRow({ "Stock Number": "OLD", Age: 30 }),
      createMockRow({ "Stock Number": "TRANSIT", Age: 2, Status: "IN TRANSIT" }),
      createMockRow({ "Stock Number": "ZERO", Age: 0 }),
    ];
    const { result } = renderHook(() => useFilteredInventory(rows, noFilters));
    expect(result.current.filteredNewArrivals).toHaveLength(2);
    const stockNums = result.current.filteredNewArrivals.map((r) => r["Stock Number"]);
    expect(stockNums).toContain("NEW1");
    expect(stockNums).toContain("NEW2");
  });

  it("filteredInTransit contains only transit vehicles", () => {
    const rows = [
      createMockRow({ "Stock Number": "LOT1", Status: "ON DEALER LOT" }),
      createMockRow({ "Stock Number": "TRANSIT1", Status: "IN TRANSIT" }),
      createMockRow({ "Stock Number": "TRANSIT2", Category: "IN TRANSIT" }),
    ];
    const { result } = renderHook(() => useFilteredInventory(rows, noFilters));
    expect(result.current.filteredInTransit).toHaveLength(2);
  });

  it("returns empty arrays when no rows match", () => {
    const rows = [createMockRow({ Make: "CHEVROLET" })];
    const filters = { ...noFilters, make: "FORD" };
    const { result } = renderHook(() => useFilteredInventory(rows, filters));
    expect(result.current.filteredRows).toHaveLength(0);
    expect(result.current.filteredNewArrivals).toHaveLength(0);
    expect(result.current.filteredInTransit).toHaveLength(0);
  });

  it("sorts rows by model then age descending", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001", Model: "TAHOE", Age: 10 }),
      createMockRow({ "Stock Number": "A002", Model: "EQUINOX", Age: 20 }),
      createMockRow({ "Stock Number": "A003", Model: "EQUINOX", Age: 50 }),
    ];
    const { result } = renderHook(() => useFilteredInventory(rows, noFilters));
    const sorted = result.current.sortedRows;
    // EQUINOX comes before TAHOE alphabetically
    expect(sorted[0]?.Model).toBe("EQUINOX");
    expect(sorted[0]?.Age).toBe(50); // older first within same model
    expect(sorted[1]?.Model).toBe("EQUINOX");
    expect(sorted[1]?.Age).toBe(20);
    expect(sorted[2]?.Model).toBe("TAHOE");
  });
});
