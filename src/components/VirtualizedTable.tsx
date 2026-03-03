// src/components/VirtualizedTable.tsx
import React, { FC, useRef, useMemo, memo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { InventoryRow } from "../types";
import { generateVehicleUrl } from "../utils/vehicleUrl";
import { isInTransit, formatAgeShort, sortByAgeDescending } from "../utils/inventoryUtils";
import { shouldSplitByModelNumber, formatBodyDescription } from "../utils/modelFormatting";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
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

type FlattenedRow = 
  | { type: "header"; group: GroupedRows; id: string }
  | { type: "row"; row: InventoryRow; id: string };

const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 52;

export const VirtualizedTable: FC<Props> = memo(({ rows, onRowClick }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Group and flatten rows for virtualization
  const flattenedRows = useMemo<FlattenedRow[]>(() => {
    if (!rows.length) return [];

    const groupMap: Record<string, InventoryRow[]> = {};

    // Group rows
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

    // Convert to sorted groups
    const groups: GroupedRows[] = [];
    Object.entries(groupMap).forEach(([key, groupRows]) => {
      const parts = key.split("|");
      const year = parts[0] ?? "0";
      const model = parts[1] ?? "";
      const modelNumber = parts[2] ?? "";
      
      let displayName = model;
      if (shouldSplitByModelNumber(model) && modelNumber) {
        displayName = `${model} ${modelNumber}`;
      }
      
      groups.push({
        year: parseInt(year),
        model,
        modelNumber,
        displayName,
        rows: sortByAgeDescending(groupRows),
      });
    });

    // Sort groups
    groups.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (a.model !== b.model) return a.model.localeCompare(b.model);
      return a.modelNumber.localeCompare(b.modelNumber);
    });

    // Flatten for virtualization
    const flattened: FlattenedRow[] = [];
    groups.forEach((group) => {
      flattened.push({ 
        type: "header", 
        group, 
        id: `header-${group.year}-${group.model}-${group.modelNumber}` 
      });
      group.rows.forEach((row) => {
        flattened.push({ 
          type: "row", 
          row, 
          id: `row-${row["Stock Number"]}` 
        });
      });
    });

    return flattened;
  }, [rows]);

  // Virtual row height estimator
  const getItemSize = useCallback((index: number) => {
    const item = flattenedRows[index];
    return item?.type === "header" ? HEADER_HEIGHT : ROW_HEIGHT;
  }, [flattenedRows]);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: flattenedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getItemSize,
    overscan: 10,
  });

  // Handle stock click
  const handleStockClick = useCallback((e: React.MouseEvent, row: InventoryRow) => {
    e.stopPropagation();
    const url = generateVehicleUrl(row);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  if (!rows.length) return null;

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <Card>
      <CardContent className="p-0" role="table" aria-label="Vehicle inventory">
        {/* Fixed header */}
        <div className="sticky top-0 z-10 bg-muted border-b" role="rowgroup">
          <table className="w-full" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr role="row">
                <th role="columnheader" className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: "12%" }}>Stock #</th>
                <th role="columnheader" className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: "8%" }}>Year</th>
                <th role="columnheader" className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: "18%" }}>Model</th>
                <th role="columnheader" className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: "14%" }}>Exterior</th>
                <th role="columnheader" className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: "18%" }}>Trim</th>
                <th role="columnheader" className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: "10%" }}>Body</th>
                <th role="columnheader" className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: "8%" }}>Age</th>
                <th role="columnheader" className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: "12%" }}>MSRP</th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Virtualized body */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: "600px" }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const item = flattenedRows[virtualRow.index];
              if (!item) return null;

              if (item.type === "header") {
                return (
                  <div
                    key={item.id}
                    className="absolute top-0 left-0 w-full"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="flex items-center justify-between p-3 bg-primary/10 border-t-2 border-primary/30">
                      <span className="font-bold text-sm">
                        {item.group.year} {item.group.displayName}
                      </span>
                      <Badge variant="secondary">{item.group.rows.length}</Badge>
                    </div>
                  </div>
                );
              }

              const r = item.row;
              return (
                <div
                  key={item.id}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <table className="w-full" style={{ tableLayout: "fixed" }}>
                    <tbody>
                      <tr
                        className="border-b hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => onRowClick(r)}
                      >
                        <td className="p-3" style={{ width: "12%" }}>
                          <span
                            className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                            onClick={(e) => handleStockClick(e, r)}
                          >
                            {r["Stock Number"]}
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        </td>
                        <td className="p-3 text-sm" style={{ width: "8%" }}>{r.Year}</td>
                        <td className="p-3 text-sm" style={{ width: "18%" }}>{r.Model}</td>
                        <td className="p-3 text-sm" style={{ width: "14%" }}>{r["Exterior Color"]}</td>
                        <td className="p-3 text-sm" style={{ width: "18%" }}>{r.Trim}</td>
                        <td className="p-3 text-sm" style={{ width: "10%" }}>{formatBodyDescription(r.Body) || "-"}</td>
                        <td className="p-3 text-sm" style={{ width: "8%" }}>
                          <span className={isInTransit(r) ? "text-amber-500 font-semibold" : ""}>
                            {formatAgeShort(r)}
                          </span>
                        </td>
                        <td className="p-3 text-sm font-medium" style={{ width: "12%" }}>
                          ${Number(r.MSRP).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row count indicator */}
        <div className="p-3 text-right text-xs text-muted-foreground border-t">
          Showing {rows.length} vehicles
        </div>
      </CardContent>
    </Card>
  );
});

VirtualizedTable.displayName = "VirtualizedTable";

export default VirtualizedTable;
