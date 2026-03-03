// src/components/FiltersBar.tsx
import { FC, memo, useMemo } from "react";
import { Filters, DrillType, AgingBuckets, InventoryRow, DealerSource } from "../types";
import { ThemeToggle } from "./ui/ThemeToggle";
import { DEALER_LABELS } from "../inventoryHelpers";
import { 
  getModelDisplayName, 
  shouldSplitByModelNumber 
} from "../utils/modelFormatting";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card } from "./ui/card";
import { Search } from "lucide-react";

interface Props {
  models: string[];
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  onSmartSearch: (text: string) => void;
  rows: InventoryRow[];
  agingBuckets: AgingBuckets;
  drillType: DrillType;
  drillData: Record<string, InventoryRow[]> | null;
  onSetDrillType: (type: DrillType) => void;
  onRowClick: (row: InventoryRow) => void;
  onReset: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedMake: DealerSource;
  onMakeChange: (make: DealerSource) => void;
}

export const FiltersBar: FC<Props> = memo(({
  models,
  filters,
  onChange,
  rows,
  selectedMake,
  onMakeChange,
}) => {
  const years = Array.from(new Set(rows.map((r) => r.Year)))
    .filter((y) => y > 0)
    .sort((a, b) => b - a);

  // Get unique Makes from the current inventory
  const makes = useMemo(() => {
    const makeSet = new Set<string>();
    rows.forEach((r) => {
      if (r.Make && r.Make.trim() !== "") {
        makeSet.add(r.Make);
      }
    });
    return Array.from(makeSet).sort();
  }, [rows]);

  // Filter models based on selected make filter - use friendly display names
  const filteredModels = useMemo(() => {
    if (!filters.make) return models;
    const modelsForMake = new Set<string>();
    rows.forEach((r) => {
      if (r.Make === filters.make) {
        if (shouldSplitByModelNumber(r.Model) && r["Model Number"]) {
          modelsForMake.add(getModelDisplayName(r.Model, r["Model Number"]));
        } else {
          modelsForMake.add(r.Model);
        }
      }
    });
    return Array.from(modelsForMake).sort();
  }, [rows, filters.make, models]);

  const dealerOptions: DealerSource[] = ["chevrolet", "buick-gmc"];

  // Common label style - black text, same for all breakpoints
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-black dark:text-white mb-1 block";
  const dealerLabelClass = "text-xs md:text-sm font-bold uppercase tracking-wide text-black dark:text-white mb-1 block";

  return (
    <Card className="mb-4 p-3 md:p-4">
      <div className="flex flex-wrap items-end gap-2 md:gap-4">
        {/* DEALERSHIP */}
        <div className="w-full md:w-auto md:min-w-[160px]">
          <label className={dealerLabelClass}>Choose Dealership</label>
          <Select value={selectedMake} onValueChange={(v) => onMakeChange(v as DealerSource)}>
            <SelectTrigger className="h-9 md:h-10" aria-label="Choose dealership">
              <SelectValue placeholder="Select dealership" />
            </SelectTrigger>
            <SelectContent>
              {dealerOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {DEALER_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* YEAR */}
        <div className="flex-1 min-w-[80px] md:flex-none md:min-w-[100px]">
          <label className={labelClass}>Year</label>
          <Select value={filters.year} onValueChange={(v) => onChange({ year: v })}>
            <SelectTrigger className="h-9 md:h-10" aria-label="Filter by year">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* MAKE */}
        <div className="flex-1 min-w-[80px] md:flex-none md:min-w-[120px]">
          <label className={labelClass}>Make</label>
          <Select
            value={filters.make || "ALL_MAKES"}
            onValueChange={(v) => onChange({ make: v === "ALL_MAKES" ? "" : v, model: "" })}
          >
            <SelectTrigger className="h-9 md:h-10" aria-label="Filter by make">
              <SelectValue placeholder="All Makes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_MAKES">All Makes</SelectItem>
              {makes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* MODEL */}
        <div className="flex-1 min-w-[80px] md:flex-none md:min-w-[140px]">
          <label className={labelClass}>Model</label>
          <Select
            value={filters.model || "ALL_MODELS"}
            onValueChange={(v) => onChange({ model: v === "ALL_MODELS" ? "" : v })}
          >
            <SelectTrigger className="h-9 md:h-10" aria-label="Filter by model">
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_MODELS">All Models</SelectItem>
              {filteredModels.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* STOCK NUMBER */}
        <div className="flex-1 min-w-[80px] md:flex-none md:min-w-[140px]">
          <label className={labelClass}>
            <span className="hidden md:inline">Stock Number</span>
            <span className="md:hidden">Stock #</span>
          </label>
          <Input
            type="text"
            placeholder="Search..."
            value={filters.stockNumber}
            onChange={(e) => onChange({ stockNumber: e.target.value })}
            className="h-9 md:h-10"
            aria-label="Search by stock number"
          />
        </div>

        {/* ACTIONS - Search Button + Theme Toggle */}
        <div className="w-full md:w-auto flex items-end gap-2 md:gap-3 md:ml-auto mt-2 md:mt-0">
          <Button variant="default" className="gap-2 h-9 md:h-10 flex-1 md:flex-none">
            <Search className="h-4 w-4" />
            <span className="md:inline">Search</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </Card>
  );
});

FiltersBar.displayName = "FiltersBar";
