// src/components/VirtualizedTable.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VirtualizedTable } from "./VirtualizedTable";
import { InventoryRow } from "../types";

// Mock @tanstack/react-virtual to avoid scroll container issues in tests
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 48,
        size: 48,
        key: i,
      })),
    getTotalSize: () => count * 48,
  }),
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
  VIN: "1gcuyded1rz123456",
  Body: '4WD Crew Cab 147" w/1',
  ...overrides,
});

describe("VirtualizedTable", () => {
  it("renders vehicle rows correctly", () => {
    const rows = [createMockRow()];
    render(<VirtualizedTable rows={rows} onRowClick={vi.fn()} />);

    expect(screen.getByText("TEST001")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("SILVERADO 1500")).toBeInTheDocument();
    expect(screen.getByText("WHITE")).toBeInTheDocument();
    expect(screen.getByText("LT")).toBeInTheDocument();
  });

  it("displays correct vehicle count", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001" }),
      createMockRow({ "Stock Number": "A002" }),
      createMockRow({ "Stock Number": "A003" }),
    ];
    render(<VirtualizedTable rows={rows} onRowClick={vi.fn()} />);

    expect(screen.getByText("Showing 3 vehicles")).toBeInTheDocument();
  });

  it("calls onRowClick when row is clicked", () => {
    const onRowClick = vi.fn();
    const row = createMockRow();
    render(<VirtualizedTable rows={[row]} onRowClick={onRowClick} />);

    const tableRow = screen.getByText("WHITE").closest("tr");
    fireEvent.click(tableRow!);

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(row);
  });

  it("groups vehicles by year and model", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001", Year: 2025, Model: "TAHOE", "Model Number": "" }),
      createMockRow({ "Stock Number": "A002", Year: 2025, Model: "TAHOE", "Model Number": "" }),
      createMockRow({ "Stock Number": "A003", Year: 2024, Model: "EQUINOX", "Model Number": "" }),
    ];
    render(<VirtualizedTable rows={rows} onRowClick={vi.fn()} />);

    expect(screen.getByText("2025 TAHOE")).toBeInTheDocument();
    expect(screen.getByText("2024 EQUINOX")).toBeInTheDocument();
  });

  it("returns null when rows array is empty", () => {
    const { container } = render(
      <VirtualizedTable rows={[]} onRowClick={vi.fn()} />
    );

    expect(container.innerHTML).toBe("");
  });

  it("sorts groups by year descending", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001", Year: 2023, Model: "EQUINOX", "Model Number": "" }),
      createMockRow({ "Stock Number": "A002", Year: 2025, Model: "TAHOE", "Model Number": "" }),
      createMockRow({ "Stock Number": "A003", Year: 2024, Model: "BLAZER", "Model Number": "" }),
    ];
    render(<VirtualizedTable rows={rows} onRowClick={vi.fn()} />);

    const headers = screen.getAllByText(/^\d{4}\s/);
    expect(headers[0]?.textContent).toContain("2025");
    expect(headers[1]?.textContent).toContain("2024");
    expect(headers[2]?.textContent).toContain("2023");
  });

  it("stock number link opens in new tab", () => {
    const rows = [createMockRow()];
    render(<VirtualizedTable rows={rows} onRowClick={vi.fn()} />);

    const stockLink = screen.getByText("TEST001");
    fireEvent.click(stockLink);

    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining("quirkchevynh.com"),
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("renders column headers", () => {
    const rows = [createMockRow()];
    render(<VirtualizedTable rows={rows} onRowClick={vi.fn()} />);

    expect(screen.getByText("Stock #")).toBeInTheDocument();
    expect(screen.getByText("Year")).toBeInTheDocument();
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("Exterior")).toBeInTheDocument();
    expect(screen.getByText("Trim")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("MSRP")).toBeInTheDocument();
  });

  it("displays MSRP formatted with commas", () => {
    const rows = [createMockRow({ MSRP: 75000 })];
    render(<VirtualizedTable rows={rows} onRowClick={vi.fn()} />);

    expect(screen.getByText("$75,000")).toBeInTheDocument();
  });

  it("displays group badge with row count", () => {
    const rows = [
      createMockRow({ "Stock Number": "A001", Year: 2024, Model: "TAHOE", "Model Number": "" }),
      createMockRow({ "Stock Number": "A002", Year: 2024, Model: "TAHOE", "Model Number": "" }),
    ];
    render(<VirtualizedTable rows={rows} onRowClick={vi.fn()} />);

    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
