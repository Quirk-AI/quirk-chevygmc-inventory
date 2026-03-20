import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OldestUnitsPanel } from "./OldestUnitsPanel";
import { InventoryRow } from "../types";

const createMockRow = (overrides: Partial<InventoryRow> = {}): InventoryRow => ({
  "Stock Number": "TEST001",
  Year: 2024,
  Make: "CHEVROLET",
  Model: "SILVERADO 1500",
  "Exterior Color": "WHITE",
  Trim: "LT",
  "Model Number": "CK10543",
  Cylinders: 8,
  Age: 60,
  MSRP: 50000,
  Status: "ON DEALER LOT",
  VIN: "1GCUYDED1RZ123456",
  Body: '4WD Crew Cab 147" w/1',
  ...overrides,
});

describe("OldestUnitsPanel", () => {
  it("renders Oldest Units on Lot heading", () => {
    const rows = [createMockRow({ Age: 90 })];
    render(<OldestUnitsPanel rows={rows} onRowClick={vi.fn()} />);
    expect(screen.getByText("Oldest Units on Lot")).toBeInTheDocument();
  });

  it("shows up to 10 vehicles sorted by age descending", () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      createMockRow({
        "Stock Number": `STK${String(i).padStart(3, "0")}`,
        Age: 30 + i * 5,
      })
    );
    render(<OldestUnitsPanel rows={rows} onRowClick={vi.fn()} />);

    // Both desktop and mobile views render, so each stock number appears twice
    // 10 vehicles × 2 views = 20 elements
    const stockElements = screen.getAllByText(/^STK/);
    expect(stockElements).toHaveLength(20);
    // Oldest should be first (in desktop view)
    expect(stockElements[0]?.textContent).toContain("STK014");
  });

  it("returns null when no qualifying vehicles exist", () => {
    const { container } = render(
      <OldestUnitsPanel rows={[]} onRowClick={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("excludes in-transit vehicles", () => {
    const rows = [
      createMockRow({ "Stock Number": "ON_LOT", Age: 100 }),
      createMockRow({ "Stock Number": "TRANSIT", Age: 200, Status: "IN TRANSIT" }),
    ];
    render(<OldestUnitsPanel rows={rows} onRowClick={vi.fn()} />);

    // Both desktop and mobile views render ON_LOT
    const onLotElements = screen.getAllByText("ON_LOT");
    expect(onLotElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("TRANSIT")).not.toBeInTheDocument();
  });

  it("displays age badge with days", () => {
    const rows = [createMockRow({ Age: 95 })];
    render(<OldestUnitsPanel rows={rows} onRowClick={vi.fn()} />);
    // Both desktop and mobile views render the badge, so use getAllByText
    const badges = screen.getAllByText("95 days");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });
});
