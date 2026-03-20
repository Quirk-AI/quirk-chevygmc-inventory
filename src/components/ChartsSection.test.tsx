import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChartsSection } from "./ChartsSection";
import { PriceBuckets, ModelPieDatum } from "../types";

// Mock recharts to avoid canvas rendering issues
vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => <div />,
}));

const defaultPriceBuckets: PriceBuckets = {
  under40k: 10,
  from40kTo60k: 20,
  from60kTo80k: 15,
  over80k: 5,
};

const defaultModelPieData: ModelPieDatum[] = [
  { name: "SILVERADO 1500", value: 50 },
  { name: "TAHOE", value: 30 },
  { name: "EQUINOX", value: 25 },
];

const defaultPriceHandlers = {
  onUnder40k: vi.fn(),
  on40kTo60k: vi.fn(),
  on60kTo80k: vi.fn(),
  onOver80k: vi.fn(),
};

describe("ChartsSection", () => {
  it("renders the Inventory Mix heading", () => {
    render(
      <ChartsSection
        modelPieData={defaultModelPieData}
        priceBuckets={defaultPriceBuckets}
        priceHandlers={defaultPriceHandlers}
      />
    );
    expect(screen.getByText("Inventory Mix - Top Models")).toBeInTheDocument();
  });

  it("renders the MSRP Price Breakdown heading", () => {
    render(
      <ChartsSection
        modelPieData={defaultModelPieData}
        priceBuckets={defaultPriceBuckets}
        priceHandlers={defaultPriceHandlers}
      />
    );
    expect(screen.getByText("MSRP Price Breakdown")).toBeInTheDocument();
  });

  it("renders all 4 price bucket buttons", () => {
    render(
      <ChartsSection
        modelPieData={defaultModelPieData}
        priceBuckets={defaultPriceBuckets}
        priceHandlers={defaultPriceHandlers}
      />
    );
    expect(screen.getByLabelText(/Under \$40K/)).toBeInTheDocument();
    expect(screen.getByLabelText(/\$40K – \$60K/)).toBeInTheDocument();
    expect(screen.getByLabelText(/\$60K – \$80K/)).toBeInTheDocument();
    expect(screen.getByLabelText(/\$80K\+/)).toBeInTheDocument();
  });

  it("calls the correct priceHandler when a bucket is clicked", () => {
    const handlers = {
      onUnder40k: vi.fn(),
      on40kTo60k: vi.fn(),
      on60kTo80k: vi.fn(),
      onOver80k: vi.fn(),
    };
    render(
      <ChartsSection
        modelPieData={defaultModelPieData}
        priceBuckets={defaultPriceBuckets}
        priceHandlers={handlers}
      />
    );

    fireEvent.click(screen.getByLabelText(/Under \$40K/));
    expect(handlers.onUnder40k).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText(/\$40K – \$60K/));
    expect(handlers.on40kTo60k).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText(/\$60K – \$80K/));
    expect(handlers.on60kTo80k).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText(/\$80K\+/));
    expect(handlers.onOver80k).toHaveBeenCalledTimes(1);
  });

  it("renders pie chart legend items matching modelPieData", () => {
    render(
      <ChartsSection
        modelPieData={defaultModelPieData}
        priceBuckets={defaultPriceBuckets}
        priceHandlers={defaultPriceHandlers}
      />
    );
    expect(screen.getByText("SILVERADO 1500")).toBeInTheDocument();
    expect(screen.getByText("TAHOE")).toBeInTheDocument();
    expect(screen.getByText("EQUINOX")).toBeInTheDocument();
  });

  it("displays price bucket counts", () => {
    render(
      <ChartsSection
        modelPieData={defaultModelPieData}
        priceBuckets={defaultPriceBuckets}
        priceHandlers={defaultPriceHandlers}
      />
    );
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
