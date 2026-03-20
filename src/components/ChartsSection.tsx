// src/components/ChartsSection.tsx
import { FC, memo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PriceBuckets, ModelPieDatum } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

interface Props {
  modelPieData: ModelPieDatum[];
  priceBuckets: PriceBuckets;
  priceHandlers: {
    onUnder40k: () => void;
    on40kTo60k: () => void;
    on60kTo80k: () => void;
    onOver80k: () => void;
  };
  onModelClick?: (model: string) => void;
}

const MODEL_COLORS = [
  "#0066B1", // Chevy Blue
  "#16a34a", // Quirk Green
  "#f97316", // Orange
  "#eab308", // Yellow
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#64748b", // Slate
];

interface PriceBucketProps {
  label: string;
  value: number;
  variant: "fresh" | "normal" | "watch" | "risk";
  badgeText: string;
  onClick: () => void;
}

const PriceBucket: FC<PriceBucketProps> = ({ label, value, variant, badgeText, onClick }) => {
  const variantStyles = {
    fresh: "hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
    normal: "hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30",
    watch: "hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30",
    risk: "hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30",
  };

  return (
    <button
      type="button"
      aria-label={`View ${value} vehicles priced ${label}`}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-lg border bg-card transition-all cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        variantStyles[variant]
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-3xl font-bold tabular-nums">{value}</span>
      <Badge variant={variant}>{badgeText}</Badge>
    </button>
  );
};

export const ChartsSection: FC<Props> = memo(({
  modelPieData,
  priceBuckets,
  priceHandlers,
  onModelClick,
}) => {
  // Handle pie chart segment click
  const handlePieClick = (data: ModelPieDatum) => {
    if (onModelClick && data?.name) {
      onModelClick(data.name);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Model Mix Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-base font-semibold">
            Inventory Mix - Top Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={modelPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                onClick={handlePieClick}
                style={{ cursor: "pointer" }}
              >
                {modelPieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={MODEL_COLORS[index % MODEL_COLORS.length]}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--card-foreground))",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {modelPieData.slice(0, 6).map((item, index) => (
              <button
                key={item.name}
                onClick={() => onModelClick?.(item.name)}
                className="flex items-center gap-1.5 text-xs hover:bg-accent px-2 py-1 rounded transition-colors cursor-pointer"
              >
                <span 
                  className="w-2.5 h-2.5 rounded-sm" 
                  style={{ background: MODEL_COLORS[index % MODEL_COLORS.length] }} 
                />
                <span className="text-muted-foreground hover:text-foreground">{item.name}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Click on a segment or legend to filter by model
          </p>
        </CardContent>
      </Card>

      {/* MSRP Price Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-base font-semibold">
            MSRP Price Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <PriceBucket
              label="Under $40K"
              value={priceBuckets.under40k}
              variant="fresh"
              badgeText="Value"
              onClick={priceHandlers.onUnder40k}
            />
            <PriceBucket
              label="$40K – $60K"
              value={priceBuckets.from40kTo60k}
              variant="normal"
              badgeText="Mid-Range"
              onClick={priceHandlers.on40kTo60k}
            />
            <PriceBucket
              label="$60K – $80K"
              value={priceBuckets.from60kTo80k}
              variant="watch"
              badgeText="Premium"
              onClick={priceHandlers.on60kTo80k}
            />
            <PriceBucket
              label="$80K+"
              value={priceBuckets.over80k}
              variant="risk"
              badgeText="Luxury"
              onClick={priceHandlers.onOver80k}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Click a price range to view vehicles
          </p>
        </CardContent>
      </Card>
    </div>
  );
});

ChartsSection.displayName = "ChartsSection";
