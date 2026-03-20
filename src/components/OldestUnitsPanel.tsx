// src/components/OldestUnitsPanel.tsx
import React, { FC, useMemo } from "react";
import { InventoryRow } from "../types";
import { isInTransit } from "../utils/inventoryUtils";
import { formatBodyDescription } from "../utils/modelFormatting";
import { generateVehicleUrl } from "../utils/vehicleUrl";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Clock, ExternalLink } from "lucide-react";

interface Props {
  rows: InventoryRow[];
}

export const OldestUnitsPanel: FC<Props> = ({ rows }) => {
  const oldestUnits = useMemo(() => {
    return [...rows]
      .filter((r) => !isInTransit(r) && r.Age > 0)
      .sort((a, b) => b.Age - a.Age)
      .slice(0, 10);
  }, [rows]);

  if (oldestUnits.length === 0) return null;

  const getAgeBadgeVariant = (age: number): "normal" | "watch" | "risk" => {
    if (age <= 60) return "normal";
    if (age <= 90) return "watch";
    return "risk";
  };

  const handleStockClick = (e: React.MouseEvent, row: InventoryRow) => {
    e.stopPropagation();
    const url = generateVehicleUrl(row);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-orange-500" />
          Oldest Units on Lot
          <Badge variant="watch" className="ml-2">{oldestUnits.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stock #</th>
                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</th>
                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exterior Color</th>
                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trim</th>
                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Body</th>
                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age</th>
                <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">MSRP</th>
              </tr>
            </thead>
            <tbody>
              {oldestUnits.map((row) => (
                <tr
                  key={row["Stock Number"]}
                  className="border-b hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={(e) => handleStockClick(e, row)}
                >
                  <td className="p-3">
                    <span className="text-sm font-semibold text-primary flex items-center gap-1">
                      {row["Stock Number"]}
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  </td>
                  <td className="p-3 text-sm font-medium">
                    {row.Year} {row.Make} {row.Model}
                  </td>
                  <td className="p-3 text-sm">{row["Exterior Color"] || "-"}</td>
                  <td className="p-3 text-sm">{row.Trim || "-"}</td>
                  <td className="p-3 text-sm">{formatBodyDescription(row.Body) || "-"}</td>
                  <td className="p-3">
                    <Badge variant={getAgeBadgeVariant(row.Age)} className="text-xs">
                      {row.Age} days
                    </Badge>
                  </td>
                  <td className="p-3 text-sm font-semibold text-right">
                    ${Number(row.MSRP).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-2">
          {oldestUnits.map((row) => (
            <div
              key={row["Stock Number"]}
              className="group p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={(e) => handleStockClick(e, row)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-primary flex items-center gap-1">
                  {row["Stock Number"]}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <Badge variant={getAgeBadgeVariant(row.Age)} className="text-xs">
                  {row.Age} days
                </Badge>
              </div>
              <div className="text-sm font-medium mb-2">
                {row.Year} {row.Make} {row.Model}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exterior</span>
                  <span>{row["Exterior Color"] || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trim</span>
                  <span>{row.Trim || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Body</span>
                  <span>{formatBodyDescription(row.Body) || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MSRP</span>
                  <span className="font-semibold">${Number(row.MSRP).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
