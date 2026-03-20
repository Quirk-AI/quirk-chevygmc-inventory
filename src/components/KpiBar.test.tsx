// src/components/KpiBar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KpiBar } from "./KpiBar";

describe("KpiBar", () => {
  const defaultProps = {
    totalVehicles: 150,
    totalNew: 25,
    inTransit: 12,
    avgAge: 42,
    onTotalClick: vi.fn(),
    onNewClick: vi.fn(),
    onTransitClick: vi.fn(),
    onInStockClick: vi.fn(),
  };

  it("renders all four KPI cards", () => {
    render(<KpiBar {...defaultProps} />);

    expect(screen.getByText("Total Vehicles")).toBeInTheDocument();
    expect(screen.getByText("New Arrivals")).toBeInTheDocument();
    expect(screen.getByText("In Transit")).toBeInTheDocument();
    expect(screen.getByText("In Stock")).toBeInTheDocument();
  });

  it("displays correct values", () => {
    render(<KpiBar {...defaultProps} />);

    expect(screen.getByText("150")).toBeInTheDocument(); // Total Vehicles
    expect(screen.getByText("25")).toBeInTheDocument();  // New Arrivals
    expect(screen.getByText("12")).toBeInTheDocument();  // In Transit
    expect(screen.getByText("138")).toBeInTheDocument(); // In Stock (150 - 12)
  });

  it("calculates In Stock correctly (Total - In Transit)", () => {
    render(<KpiBar {...defaultProps} totalVehicles={200} inTransit={50} />);

    expect(screen.getByText("200")).toBeInTheDocument(); // Total
    expect(screen.getByText("50")).toBeInTheDocument();  // In Transit
    expect(screen.getByText("150")).toBeInTheDocument(); // In Stock = 200 - 50
  });

  it("calls onTotalClick when Total Vehicles card is clicked", () => {
    const onTotalClick = vi.fn();
    render(<KpiBar {...defaultProps} onTotalClick={onTotalClick} />);

    const totalCard = screen.getByText("Total Vehicles").closest("[class*='cursor-pointer']");
    fireEvent.click(totalCard!);

    expect(onTotalClick).toHaveBeenCalledTimes(1);
  });

  it("calls onNewClick when New Arrivals card is clicked", () => {
    const onNewClick = vi.fn();
    render(<KpiBar {...defaultProps} onNewClick={onNewClick} />);

    const newCard = screen.getByText("New Arrivals").closest("[class*='cursor-pointer']");
    fireEvent.click(newCard!);

    expect(onNewClick).toHaveBeenCalledTimes(1);
  });

  it("calls onTransitClick when In Transit card is clicked", () => {
    const onTransitClick = vi.fn();
    render(<KpiBar {...defaultProps} onTransitClick={onTransitClick} />);

    const transitCard = screen.getByText("In Transit").closest("[class*='cursor-pointer']");
    fireEvent.click(transitCard!);

    expect(onTransitClick).toHaveBeenCalledTimes(1);
  });

  it("calls onInStockClick when In Stock card is clicked", () => {
    const onInStockClick = vi.fn();
    render(<KpiBar {...defaultProps} onInStockClick={onInStockClick} />);

    const stockCard = screen.getByText("In Stock").closest("[class*='cursor-pointer']");
    fireEvent.click(stockCard!);

    expect(onInStockClick).toHaveBeenCalledTimes(1);
  });

  it("renders with zero values", () => {
    render(
      <KpiBar
        {...defaultProps}
        totalVehicles={0}
        totalNew={0}
        inTransit={0}
      />
    );

    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(4); // Total, New, In Transit, In Stock all 0
  });

  it("handles large numbers", () => {
    render(
      <KpiBar
        {...defaultProps}
        totalVehicles={9999}
        totalNew={500}
        inTransit={100}
      />
    );

    expect(screen.getByText("9999")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("9899")).toBeInTheDocument(); // In Stock
  });

  it("renders icons for each KPI card", () => {
    render(<KpiBar {...defaultProps} />);

    // Lucide icons render as SVG elements
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBe(4);
  });

  it("highlights Total Vehicles card", () => {
    render(<KpiBar {...defaultProps} />);

    const totalCard = screen.getByText("Total Vehicles").closest("[class*='rounded-xl']");
    expect(totalCard).toHaveClass("border-primary");
    expect(totalCard).toHaveClass("bg-blue-50");
  });
});
