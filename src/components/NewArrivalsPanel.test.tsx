import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewArrivalsPanel } from "./NewArrivalsPanel";
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
  Age: 3,
  MSRP: 50000,
  Status: "ON DEALER LOT",
  VIN: "1GCUYDED1RZ123456",
  Body: '4WD Crew Cab 147" w/1',
  ...overrides,
});

describe("NewArrivalsPanel", () => {
  it("renders New Arrivals heading with count badge", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001", Age: 3 }),
      createMockRow({ "Stock Number": "A002", Age: 5 }),
    ];
    render(<NewArrivalsPanel rows={rows} />);

    expect(screen.getByText(/New Arrivals/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders vehicle rows sorted by age descending", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001", Age: 2 }),
      createMockRow({ "Stock Number": "A002", Age: 7 }),
      createMockRow({ "Stock Number": "A003", Age: 4 }),
    ];
    render(<NewArrivalsPanel rows={rows} />);

    const stockNumbers = screen.getAllByText(/^#A00/);
    expect(stockNumbers[0]?.textContent).toContain("A002");
    expect(stockNumbers[1]?.textContent).toContain("A003");
    expect(stockNumbers[2]?.textContent).toContain("A001");
  });

  it("returns null when rows array is empty", () => {
    const { container } = render(<NewArrivalsPanel rows={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("displays age in days for each vehicle", () => {
    const rows = [createMockRow({ Age: 1 })];
    render(<NewArrivalsPanel rows={rows} />);
    // Both desktop and mobile views render the badge
    const badges = screen.getAllByText("1 day");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("displays MSRP formatted with commas", () => {
    const rows = [createMockRow({ MSRP: 75000 })];
    render(<NewArrivalsPanel rows={rows} />);
    // Both desktop and mobile views render MSRP
    const msrpElements = screen.getAllByText("$75,000");
    expect(msrpElements.length).toBeGreaterThanOrEqual(1);
  });
});
