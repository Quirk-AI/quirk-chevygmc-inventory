// src/inventoryHelpers.ts
import { InventoryRow, DealerSource } from "./types";

export const QUIRK_GREEN = "#16a34a";
export const POWDER_BLUE = "#5A6A82";

export const DEALER_LABELS: Record<DealerSource, string> = {
  chevrolet: "Chevrolet",
  "buick-gmc": "Buick GMC",
};

export const CHART_COLORS = [
  QUIRK_GREEN,
  "#22c55e",
  "#4ade80",
  "#a3e635",
  "#f97316",
  "#facc15",
  "#eab308",
  "#22d3ee",
];

export const getModelColor = (name: string, index: number): string => {
  if (name.toUpperCase() === "SILVERADO 1500") {
    return POWDER_BLUE;
  }
  return CHART_COLORS[index % CHART_COLORS.length] ?? QUIRK_GREEN;
};

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function exportToCsv(filename: string, rows: InventoryRow[]): void {
  if (!rows.length) return;

  const headers = [
    "Stock Number",
    "Year",
    "Make",
    "Model",
    "Exterior Color",
    "Trim",
    "Model Number",
    "Cylinders",
    "VIN",
    "Age",
    "MSRP",
  ];

  const escape = (value: unknown) => {
    const str = value == null ? "" : String(value);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const lines: string[] = [];
  lines.push(headers.map(escape).join(","));

  rows.forEach((r) => {
    lines.push(
      [
        r["Stock Number"],
        r.Year,
        r.Make,
        r.Model,
        r["Exterior Color"],
        r.Trim,
        r["Model Number"],
        r.Cylinders,
        r.VIN,
        r.Age,
        r.MSRP,
      ]
        .map(escape)
        .join(",")
    );
  });

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
