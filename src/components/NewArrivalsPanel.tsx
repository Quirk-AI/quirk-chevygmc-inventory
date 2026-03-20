// src/components/NewArrivalsPanel.tsx
import React, { FC, memo } from "react";
import { InventoryRow } from "../types";
import { generateVehicleUrl } from "../utils/vehicleUrl";
import { formatBodyDescription } from "../utils/modelFormatting";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Sparkles, ExternalLink } from "lucide-react";

interface Props {
  rows: InventoryRow[];
}

export const NewArrivalsPanel: FC<Props> = memo(({ rows }) => {
  if (!rows.length) return null;

  // Sort by age descending (7 days first, down to 1 day)
  const sortedRows = [...rows].sort((a, b) => b.Age - a.Age);

  const handleStockClick = (e: React.MouseEvent, row: InventoryRow) => {
    e.stopPropagation();
    const url = generateVehicleUrl(row);
    if (url) {
      const w = 1000;
      const h = 700;
      const left = (window.screen.width - w) / 2;
      const top = (window.screen.height - h) / 2;
      window.open(url, "vehiclePopup", `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-amber-500" />
          New Arrivals · Last 7 Days
          <Badge variant="secondary" className="ml-2">{rows.length}</Badge>
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
              {sortedRows.slice(0, 15).map((row) => (
                <tr
                  key={row["Stock Number"]}
                  className="border-b hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={(e) => handleStockClick(e, row)}
                >
                  <td className="p-3">
                    <span className="text-sm font-semibold text-primary flex items-center gap-1">
                      #{row["Stock Number"]}
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
                    <Badge variant="fresh" className="text-xs">
                      {row.Age} {row.Age === 1 ? "day" : "days"}
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
          {sortedRows.slice(0, 15).map((row) => (
            <div 
              key={row["Stock Number"]} 
              className="group p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all cursor-pointer"
              onClick={(e) => handleStockClick(e, row)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-primary flex items-center gap-1">
                  #{row["Stock Number"]}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <Badge variant="fresh" className="text-xs">
                  {row.Age} {row.Age === 1 ? "day" : "days"}
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
});

NewArrivalsPanel.displayName = "NewArrivalsPanel";
