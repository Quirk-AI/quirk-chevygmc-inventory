// src/services/inventoryService.ts
import * as XLSX from "xlsx";
import { InventoryRow, DealerSource } from "../types";

export const INVENTORY_PATHS: Record<DealerSource, string> = {
  chevrolet: "/inventory.xlsx",
  "buick-gmc": "/gmc-inventory.xlsx",
};

export interface InventoryService {
  fetchInventory(source: DealerSource): Promise<InventoryRow[]>;
}

export const excelInventoryService: InventoryService = {
  async fetchInventory(source: DealerSource): Promise<InventoryRow[]> {
    const path = INVENTORY_PATHS[source];
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch inventory`);
    }

    const data = await response.arrayBuffer();
    return parseExcelData(data);
  },
};

function parseExcelData(data: ArrayBuffer): InventoryRow[] {
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) throw new Error("No sheets found in workbook");

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) throw new Error("Worksheet not found");

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

  return rawData
    .filter((row) => row["Stock Number"] != null && String(row["Stock Number"]).trim() !== "")
    .map((row) => ({
      "Stock Number": String(row["Stock Number"] ?? ""),
      Year: Number(row["Year"]) || 0,
      Make: String(row["Make"] ?? ""),
      Model: String(row["Model"] ?? ""),
      "Exterior Color": String(row["Exterior Color"] ?? ""),
      Trim: String(row["Trim"] ?? ""),
      "Model Number": String(row["Model Number"] ?? ""),
      Cylinders: Number(row["Cylinders"]) || 0,
      Age: Number(row["Age"]) || 0,
      MSRP: Number(row["MSRP"]) || 0,
      Status: String(row["Category"] ?? ""),
      VIN: String(row["VIN"] ?? ""),
      Body: String(row["Body"] ?? ""),
      "Body Type": String(row["Body Type"] ?? ""),
      Category: String(row["Category"] ?? ""),
    }));
}

export default excelInventoryService;
