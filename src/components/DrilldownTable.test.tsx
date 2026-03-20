import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DrilldownTable } from "./DrilldownTable";
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

describe("DrilldownTable", () => {
  it("renders group headers with model name and count", () => {
    const groups = {
      "2024|SILVERADO 1500|CK10543": [
        createMockRow({ "Stock Number": "A001" }),
        createMockRow({ "Stock Number": "A002" }),
      ],
    };
    render(
      <DrilldownTable groups={groups} onBack={vi.fn()} onRowClick={vi.fn()} />
    );
    // Group header contains model name + count in format "SILVERADO 1500 CK10543 ...  -  2"
    const groupHeader = screen.getByText(/SILVERADO 1500 CK10543.*-\s+2/);
    expect(groupHeader).toBeInTheDocument();
  });

  it("renders vehicle rows with stock number, year, model", () => {
    const groups = {
      "2024|SILVERADO 1500|": [createMockRow()],
    };
    render(
      <DrilldownTable groups={groups} onBack={vi.fn()} onRowClick={vi.fn()} />
    );
    expect(screen.getByText("TEST001")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("SILVERADO 1500")).toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", () => {
    const onRowClick = vi.fn();
    const row = createMockRow();
    const groups = {
      "2024|SILVERADO 1500|": [row],
    };
    render(
      <DrilldownTable groups={groups} onBack={vi.fn()} onRowClick={onRowClick} />
    );
    const tableRow = screen.getByText("WHITE").closest("tr");
    fireEvent.click(tableRow!);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(row);
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    const groups = {
      "2024|SILVERADO 1500|": [createMockRow()],
    };
    render(
      <DrilldownTable groups={groups} onBack={onBack} onRowClick={vi.fn()} />
    );
    fireEvent.click(screen.getByText("Back to Dashboard"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders title when provided", () => {
    const groups = {
      "2024|SILVERADO 1500|": [createMockRow()],
    };
    render(
      <DrilldownTable
        groups={groups}
        onBack={vi.fn()}
        onRowClick={vi.fn()}
        title="Vehicles Under $40K"
      />
    );
    expect(screen.getByText("Vehicles Under $40K")).toBeInTheDocument();
  });

  it("renders total vehicle count with title", () => {
    const groups = {
      "2024|SILVERADO 1500|": [
        createMockRow({ "Stock Number": "A001" }),
        createMockRow({ "Stock Number": "A002" }),
      ],
      "2024|TAHOE|": [
        createMockRow({ "Stock Number": "A003", Model: "TAHOE" }),
      ],
    };
    render(
      <DrilldownTable
        groups={groups}
        onBack={vi.fn()}
        onRowClick={vi.fn()}
        title="All Vehicles"
      />
    );
    expect(screen.getByText("3 vehicles")).toBeInTheDocument();
  });
});
