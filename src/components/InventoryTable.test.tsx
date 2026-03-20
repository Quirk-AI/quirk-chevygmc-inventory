import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InventoryTable } from "./InventoryTable";
import { InventoryRow } from "../types";

// Mock useMediaQuery to return desktop view
vi.mock("../hooks/useMediaQuery", () => ({
  useIsMobile: () => false,
}));

// Mock window.open
const mockOpen = vi.fn();
beforeEach(() => {
  vi.restoreAllMocks();
  mockOpen.mockReset();
  vi.stubGlobal("open", mockOpen);
});

const createMockRow = (overrides: Partial<InventoryRow> = {}): InventoryRow => ({
  "Stock Number": "TEST001",
  Year: 2024,
  Make: "CHEVROLET",
  Model: "SILVERADO 1500",
  "Exterior Color": "WHITE",
  Trim: "LT",
  "Model Number": "CK10543",
  Cylinders: 8,
  Age: 10,
  MSRP: 50000,
  Status: "ON DEALER LOT",
  VIN: "1GCUYDED1RZ123456",
  Body: '4WD Crew Cab 147" w/1',
  ...overrides,
});

describe("InventoryTable", () => {
  it("renders grouped vehicle data", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001" }),
      createMockRow({ "Stock Number": "A002" }),
    ];
    render(<InventoryTable rows={rows} onRowClick={vi.fn()} />);

    expect(screen.getByText("A001")).toBeInTheDocument();
    expect(screen.getByText("A002")).toBeInTheDocument();
  });

  it("renders stock numbers as clickable elements", () => {
    const rows = [createMockRow()];
    render(<InventoryTable rows={rows} onRowClick={vi.fn()} />);

    const stockLink = screen.getByText("TEST001");
    fireEvent.click(stockLink);
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining("quirkchevynh.com"),
      "vehiclePopup",
      expect.stringContaining("width=1000,height=700")
    );
  });

  it("calls onRowClick when a data row is clicked", () => {
    const onRowClick = vi.fn();
    const row = createMockRow();
    render(<InventoryTable rows={[row]} onRowClick={onRowClick} />);

    const tableRow = screen.getByText("WHITE").closest("tr");
    fireEvent.click(tableRow!);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(row);
  });

  it("returns null when rows array is empty", () => {
    const { container } = render(
      <InventoryTable rows={[]} onRowClick={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows vehicle count footer", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001" }),
      createMockRow({ "Stock Number": "A002" }),
      createMockRow({ "Stock Number": "A003" }),
    ];
    render(<InventoryTable rows={rows} onRowClick={vi.fn()} />);
    expect(screen.getByText("Showing 3 vehicles")).toBeInTheDocument();
  });

  it("groups vehicles by year and model", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001", Year: 2025, Model: "TAHOE", "Model Number": "" }),
      createMockRow({ "Stock Number": "A002", Year: 2024, Model: "EQUINOX", "Model Number": "" }),
    ];
    render(<InventoryTable rows={rows} onRowClick={vi.fn()} />);

    expect(screen.getByText(/2025 TAHOE/)).toBeInTheDocument();
    expect(screen.getByText(/2024 EQUINOX/)).toBeInTheDocument();
  });
});
