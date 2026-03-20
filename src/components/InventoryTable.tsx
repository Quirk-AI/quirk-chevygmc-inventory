// src/components/InventoryTable.tsx
import React, { FC, useMemo, memo } from "react";
import { InventoryRow } from "../types";
import { generateVehicleUrl } from "../utils/vehicleUrl";
import { isInTransit, formatAgeShort, sortByAgeDescending } from "../utils/inventoryUtils";
import { shouldSplitByModelNumber, formatBodyDescription } from "../utils/modelFormatting";
import { useIsMobile } from "../hooks/useMediaQuery";
import { VirtualizedTable } from "./VirtualizedTable";
import { Card, CardContent } from "./ui/card";
import { ExternalLink } from "lucide-react";

type Props = {
  rows: InventoryRow[];
  onRowClick: (row: InventoryRow) => void;
};

type GroupedRows = {
  year: number;
  model: string;
  modelNumber: string;
  displayName: string;
  rows: InventoryRow[];
};

const VIRTUALIZATION_THRESHOLD = 500;

export const InventoryTable: FC<Props> = memo(({ rows, onRowClick }) => {
  const isMobile = useIsMobile();

  const groupedRows = useMemo(() => {
    if (!rows.length) return [];
    
    const groups: GroupedRows[] = [];
    const groupMap: Record<string, InventoryRow[]> = {};

    rows.forEach((row) => {
      let key: string;
      if (shouldSplitByModelNumber(row.Model) && row["Model Number"]) {
        key = `${row.Year}|${row.Model}|${row["Model Number"]}`;
      } else {
        key = `${row.Year}|${row.Model}|`;
      }
      if (!groupMap[key]) {
        groupMap[key] = [];
      }
      groupMap[key]?.push(row);
    });

    Object.entries(groupMap).forEach(([key, groupRows]) => {
      const parts = key.split("|");
      const year = parts[0] ?? "0";
      const model = parts[1] ?? "";
      const modelNumber = parts[2] ?? "";
      
      const sortedGroupRows = sortByAgeDescending(groupRows);
      const firstRow = sortedGroupRows[0];
      
      let displayName = model;
      if (shouldSplitByModelNumber(model) && modelNumber) {
        const bodyDesc = firstRow?.Body ? formatBodyDescription(firstRow.Body) : "";
        displayName = `${model} ${modelNumber}${bodyDesc ? ` ${bodyDesc}` : ""}`;
      }
      
      groups.push({
        year: parseInt(year),
        model,
        modelNumber: modelNumber || "",
        displayName,
        rows: sortedGroupRows,
      });
    });

    groups.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (a.model !== b.model) return a.model.localeCompare(b.model);
      return a.modelNumber.localeCompare(b.modelNumber);
    });

    return groups;
  }, [rows]);

  if (!rows.length) return null;

  // Use virtualized table for large datasets on desktop
  if (!isMobile && rows.length > VIRTUALIZATION_THRESHOLD) {
    return <VirtualizedTable rows={rows} onRowClick={onRowClick} />;
  }

  const handleStockClick = (e: React.MouseEvent, row: InventoryRow) => {
    e.stopPropagation();
    const url = generateVehicleUrl(row);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // ---------- MOBILE CARD VIEW (<768px) ----------
  if (isMobile) {
    return (
      <Card>
        <CardContent className="p-4">
          {groupedRows.map((group) => (
            <div key={`${group.year}-${group.model}-${group.modelNumber}`} className="mb-6 last:mb-0">
              {/* Group Header */}
              <div className="py-3 px-4 bg-primary/10 rounded-lg mb-3">
                <span className="font-bold text-foreground">
                  {group.year} {group.displayName}  -  {group.rows.length}
                </span>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-2">
                {group.rows.map((r) => (
                  <div
                    key={r["Stock Number"]}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => onRowClick(r)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-semibold text-primary flex items-center gap-1"
                        onClick={(e) => handleStockClick(e, r)}
                      >
                        #{r["Stock Number"]}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                      <span className="text-sm font-medium">
                        {r.Year} {r.Model}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trim</span>
                        <span>{r.Trim}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exterior</span>
                        <span>{r["Exterior Color"]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Body</span>
                        <span>{formatBodyDescription(r.Body) || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MSRP</span>
                        <span className="font-semibold">${Number(r.MSRP).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // ---------- DESKTOP TABLE VIEW (small datasets) ----------
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stock #</th>
                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Year</th>
                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model</th>
                <th className="p-3"></th>
                <th className="p-3"></th>
                <th className="p-3"></th>
                <th className="p-3"></th>
              </tr>
            </thead>

            <tbody>
              {groupedRows.map((group) => (
                <React.Fragment key={`${group.year}-${group.model}-${group.modelNumber}`}>
                  {/* Group Header Row */}
                  <tr className="bg-primary/10 border-t-2 border-primary/30">
                    <td colSpan={3} className="p-3 font-bold text-sm">
                      {group.year} {group.displayName}  -  {group.rows.length}
                    </td>
                    <td className="p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exterior Color</td>
                    <td className="p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trim</td>
                    <td className="p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Body</td>
                    <td className="p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">MSRP</td>
                  </tr>

                  {/* Data Rows */}
                  {group.rows.map((r) => (
                    <tr
                      key={r["Stock Number"]}
                      className="border-b hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => onRowClick(r)}
                    >
                      <td className="p-3">
                        <span
                          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                          onClick={(e) => handleStockClick(e, r)}
                        >
                          {r["Stock Number"]}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </td>
                      <td className="p-3 text-sm">{r.Year}</td>
                      <td className="p-3 text-sm">{r.Model}</td>
                      <td className="p-3 text-sm">{r["Exterior Color"]}</td>
                      <td className="p-3 text-sm">{r.Trim}</td>
                      <td className="p-3 text-sm">{formatBodyDescription(r.Body) || "-"}</td>
                      <td className="p-3 text-sm font-medium">${Number(r.MSRP).toLocaleString()}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 text-right text-xs text-muted-foreground border-t">
          Showing {rows.length} vehicles
        </div>
      </CardContent>
    </Card>
  );
});

InventoryTable.displayName = "InventoryTable";
