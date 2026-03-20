import { FC, useCallback, useMemo } from "react";
import "./index.css";
import "./styles/theme.css";

import { useInventoryStore } from "./store/inventoryStore";
import { useInventoryLoader } from "./hooks/useInventoryLoader";
import { isInTransit, sortByAgeDescending } from "./utils/inventoryUtils";
import {
  getModelDisplayName,
  rowMatchesModelFilter,
  shouldSplitByModelNumber
} from "./utils/modelFormatting";
import { AgingBuckets, PriceBuckets, DrillType, InventoryRow } from "./types";
import {
  DRILL_TYPES,
  DRILL_TITLES,
  MODEL_DRILL_PREFIX,
  isModelDrill as isModelDrillType,
  getModelFromDrill,
} from "./constants/drillTypes";

import { ErrorBoundary, SectionErrorBoundary } from "./components/ErrorBoundary";
import { HeaderBar } from "./components/HeaderBar";
import { FiltersBar } from "./components/FiltersBar";
import { KpiBar } from "./components/KpiBar";
import { ChartsSection } from "./components/ChartsSection";
import { NewArrivalsPanel } from "./components/NewArrivalsPanel";
import { OldestUnitsPanel } from "./components/OldestUnitsPanel";
import { InventoryTable } from "./components/InventoryTable";
import { DrilldownTable } from "./components/DrilldownTable";
import { VehicleDetailDrawer } from "./components/VehicleDetailDrawer";
import { LoadingIndicator } from "./components/LoadingIndicator";
import { StaleIndicator } from "./components/StaleIndicator";

const STOP_WORDS = new Set([
  "i", "im", "i'm", "looking", "for", "to", "the", "a", "an",
  "with", "show", "me", "find", "need", "want", "please",
]);

const App: FC = () => {
  const { refetch } = useInventoryLoader();

  const rows = useInventoryStore((s) => s.rows);
  const error = useInventoryStore((s) => s.error);
  const isLoading = useInventoryStore((s) => s.isLoading);
  const isStale = useInventoryStore((s) => s.isStale);
  const lastUpdated = useInventoryStore((s) => s.lastUpdated);
  const isRefreshing = useInventoryStore((s) => s.isRefreshing);
  const filters = useInventoryStore((s) => s.filters);
  const searchTerm = useInventoryStore((s) => s.searchTerm);
  const drillType = useInventoryStore((s) => s.drillType);
  const selectedVehicle = useInventoryStore((s) => s.selectedVehicle);
  const selectedMake = useInventoryStore((s) => s.selectedMake);

  const setFilters = useInventoryStore((s) => s.setFilters);
  const setSearchTerm = useInventoryStore((s) => s.setSearchTerm);
  const setDrillType = useInventoryStore((s) => s.setDrillType);
  const setSelectedVehicle = useInventoryStore((s) => s.setSelectedVehicle);
  const setSelectedMake = useInventoryStore((s) => s.setSelectedMake);
  const resetAll = useInventoryStore((s) => s.resetAll);
  const setRefreshing = useInventoryStore((s) => s.setRefreshing);

  // Filter out invalid rows first
  const validRows = useMemo(() => {
    return rows.filter((r) => r["Stock Number"] && r.Model && r.Year > 0);
  }, [rows]);

  const modelsList = useMemo(() => {
    const modelsSet = new Set<string>();
    validRows.forEach((r) => {
      if (shouldSplitByModelNumber(r.Model) && r["Model Number"]) {
        modelsSet.add(getModelDisplayName(r.Model, r["Model Number"]));
      } else {
        modelsSet.add(r.Model);
      }
    });
    return Array.from(modelsSet).sort();
  }, [validRows]);

  const agingBuckets = useMemo<AgingBuckets>(() => {
    const b = { bucket0_30: 0, bucket31_60: 0, bucket61_90: 0, bucket90_plus: 0 };
    validRows.forEach((r) => {
      if (isInTransit(r)) return;
      if (r.Age <= 30) b.bucket0_30++;
      else if (r.Age <= 60) b.bucket31_60++;
      else if (r.Age <= 90) b.bucket61_90++;
      else b.bucket90_plus++;
    });
    return b;
  }, [validRows]);

  const priceBuckets = useMemo<PriceBuckets>(() => {
    const b = { under40k: 0, from40kTo60k: 0, from60kTo80k: 0, over80k: 0 };
    validRows.forEach((r) => {
      if (r.MSRP <= 0) return;
      if (r.MSRP < 40000) b.under40k++;
      else if (r.MSRP < 60000) b.from40kTo60k++;
      else if (r.MSRP < 80000) b.from60kTo80k++;
      else b.over80k++;
    });
    return b;
  }, [validRows]);

  // Calculate average age for KPI
  const avgAge = useMemo(() => {
    const onLotRows = validRows.filter((r) => !isInTransit(r) && r.Age > 0);
    if (onLotRows.length === 0) return 0;
    const totalAge = onLotRows.reduce((sum, r) => sum + r.Age, 0);
    return Math.round(totalAge / onLotRows.length);
  }, [validRows]);

  const sortedRows = useMemo(() => {
    return [...validRows].sort((a, b) => {
      if (a.Model !== b.Model) return a.Model.localeCompare(b.Model);
      return b.Age - a.Age;
    });
  }, [validRows]);

  const filteredRows = useMemo(() => {
    return sortedRows.filter((row) => {
      // Filter by Make
      if (filters.make && row.Make !== filters.make) return false;
      
      // Filter by Model (handles display names with body styles)
      if (filters.model && !rowMatchesModelFilter(row, filters.model)) return false;
      
      if (filters.year !== "ALL" && String(row.Year) !== filters.year) return false;
      if (filters.priceMin) {
        const minPrice = Number(filters.priceMin);
        if (!isNaN(minPrice) && row.MSRP < minPrice) return false;
      }
      if (filters.priceMax) {
        const maxPrice = Number(filters.priceMax);
        if (!isNaN(maxPrice) && row.MSRP > maxPrice) return false;
      }
      if (filters.stockNumber) {
        const stockNum = filters.stockNumber.toLowerCase().trim();
        const rowStockNum = row["Stock Number"].toLowerCase().trim();
        if (!rowStockNum.includes(stockNum)) return false;
      }
      return true;
    });
  }, [sortedRows, filters]);

  const filteredNewArrivals = useMemo(() => {
    return filteredRows.filter((r) => r.Age > 0 && r.Age <= 7 && !isInTransit(r));
  }, [filteredRows]);

  const filteredInTransit = useMemo(() => {
    return filteredRows.filter((r) => isInTransit(r));
  }, [filteredRows]);

  const modelPieData = useMemo(() => {
    const countByModel: Record<string, number> = {};
    validRows.forEach((r) => {
      countByModel[r.Model] = (countByModel[r.Model] ?? 0) + 1;
    });
    return Object.entries(countByModel)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [validRows]);

  const newArrivalRows = useMemo(() => {
    return validRows.filter((r) => r.Age > 0 && r.Age <= 7 && !isInTransit(r));
  }, [validRows]);

  const inTransitRows = useMemo(() => {
    return validRows.filter((r) => isInTransit(r));
  }, [validRows]);

  // In Stock rows = not in transit
  const inStockRows = useMemo(() => {
    return validRows.filter((r) => !isInTransit(r));
  }, [validRows]);

  const drillData = useMemo(() => {
    if (!drillType) return null;

    const buildGroups = (inputRows: InventoryRow[]) => {
      const groups: Record<string, InventoryRow[]> = {};
      inputRows.forEach((r) => {
        const modelNumber = r["Model Number"] ? String(r["Model Number"]) : "";
        const key = r.Make && r.Model
          ? `${r.Make}|${r.Model}${modelNumber ? `|${modelNumber}` : ""}`
          : `${r.Make || "Unknown"}|${r.Model || "Unknown"}`;
        if (!groups[key]) groups[key] = [];
        groups[key]?.push(r);
      });
      Object.keys(groups).forEach((key) => {
        const group = groups[key];
        if (group) groups[key] = sortByAgeDescending(group);
      });
      return groups;
    };

    if (drillType === DRILL_TYPES.TOTAL) return buildGroups(filteredRows);
    if (drillType === DRILL_TYPES.IN_TRANSIT) return buildGroups(inTransitRows);
    if (drillType === DRILL_TYPES.IN_STOCK) return buildGroups(inStockRows);

    let result: InventoryRow[] = [];
    if (drillType === DRILL_TYPES.NEW) result = [...newArrivalRows];
    if (drillType === DRILL_TYPES.AGE_0_30) result = validRows.filter((r) => r.Age <= 30 && !isInTransit(r));
    if (drillType === DRILL_TYPES.AGE_31_60) result = validRows.filter((r) => r.Age > 30 && r.Age <= 60 && !isInTransit(r));
    if (drillType === DRILL_TYPES.AGE_61_90) result = validRows.filter((r) => r.Age > 60 && r.Age <= 90 && !isInTransit(r));
    if (drillType === DRILL_TYPES.AGE_90_PLUS) result = validRows.filter((r) => r.Age > 90 && !isInTransit(r));

    // Price drill types
    if (drillType === DRILL_TYPES.PRICE_UNDER_40K) result = validRows.filter((r) => r.MSRP > 0 && r.MSRP < 40000);
    if (drillType === DRILL_TYPES.PRICE_40K_60K) result = validRows.filter((r) => r.MSRP >= 40000 && r.MSRP < 60000);
    if (drillType === DRILL_TYPES.PRICE_60K_80K) result = validRows.filter((r) => r.MSRP >= 60000 && r.MSRP < 80000);
    if (drillType === DRILL_TYPES.PRICE_OVER_80K) result = validRows.filter((r) => r.MSRP >= 80000);

    // Handle model drill type
    if (drillType.startsWith(MODEL_DRILL_PREFIX)) {
      const modelName = getModelFromDrill(drillType);
      result = validRows.filter((r) => r.Model === modelName);
    }

    return buildGroups(result);
  }, [drillType, validRows, filteredRows, newArrivalRows, inTransitRows, inStockRows]);

  // Get title for drilldown
  const getDrillTitle = (type: string): string => {
    if (type.startsWith(MODEL_DRILL_PREFIX)) {
      const modelName = getModelFromDrill(type);
      const count = validRows.filter((r) => r.Model === modelName).length;
      return `${modelName} Inventory (${count} vehicles)`;
    }
    return DRILL_TITLES[type] ?? "Inventory";
  };

  const hasModelFilter = !!filters.model;

  // Explicit checks for drill types
  const isAgingDrill = drillType === DRILL_TYPES.AGE_0_30 || drillType === DRILL_TYPES.AGE_31_60 || drillType === DRILL_TYPES.AGE_61_90 || drillType === DRILL_TYPES.AGE_90_PLUS;
  const isPriceDrill = drillType === DRILL_TYPES.PRICE_UNDER_40K || drillType === DRILL_TYPES.PRICE_40K_60K || drillType === DRILL_TYPES.PRICE_60K_80K || drillType === DRILL_TYPES.PRICE_OVER_80K;
  const isNewArrivalsDrill = drillType === DRILL_TYPES.NEW;
  const isInTransitDrill = drillType === DRILL_TYPES.IN_TRANSIT;
  const isInStockDrill = drillType === DRILL_TYPES.IN_STOCK;
  const isModelDrill = isModelDrillType(drillType);
  const isDrillActive = isAgingDrill || isPriceDrill || isNewArrivalsDrill || isInTransitDrill || isInStockDrill || isModelDrill;

  const handleSmartSearch = useCallback((text: string) => {
    setSearchTerm(text);
    const tokens = text.toLowerCase().split(/\s+/).filter((t) => t && !STOP_WORDS.has(t));
    if (tokens.length === 0) {
      setFilters({ model: "" });
      return;
    }
    const token = tokens[0];
    if (token) {
      const found = modelsList.find((m: string) => m.toLowerCase().includes(token));
      if (found) setFilters({ model: found });
    }
  }, [modelsList, setFilters, setSearchTerm]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
  }, [refetch, setRefreshing]);

  // Handle pie chart model click - drill down to that model
  const handleModelClick = useCallback((modelName: string) => {
    const drillValue: DrillType = `${MODEL_DRILL_PREFIX}${modelName}`;
    setDrillType(drillValue);
  }, [setDrillType]);

  if (isLoading && validRows.length === 0) {
    return (
      <div className="app-root">
        <HeaderBar />
        <main className="container">
          <LoadingIndicator message="Loading inventory..." size="large" />
        </main>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-root">
        <HeaderBar />
        <main className="container">
          {lastUpdated && (
            <StaleIndicator
              isStale={isStale}
              lastUpdated={lastUpdated}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          )}

          {error && (
            <section className="panel">
              <div className="section-title">File Error</div>
              <p>{error}</p>
            </section>
          )}

          {validRows.length > 0 && (
            <>
              <FiltersBar
                models={modelsList}
                filters={filters}
                onChange={setFilters}
                onSmartSearch={handleSmartSearch}
                rows={validRows}
                drillType={drillType}
                drillData={drillData}
                onSetDrillType={setDrillType}
                onRowClick={setSelectedVehicle}
                onReset={resetAll}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedMake={selectedMake}
                onMakeChange={setSelectedMake}
              />

              {/* KPI Bar - show when not drilling and no model filter */}
              {!hasModelFilter && !isDrillActive && (
                <SectionErrorBoundary section="KPI metrics">
                  <KpiBar
                    totalVehicles={filteredRows.length}
                    totalNew={filteredNewArrivals.length}
                    inTransit={filteredInTransit.length}
                    onTotalClick={resetAll}
                    onNewClick={() => setDrillType(DRILL_TYPES.NEW)}
                    onTransitClick={() => setDrillType(DRILL_TYPES.IN_TRANSIT)}
                    onInStockClick={() => setDrillType(DRILL_TYPES.IN_STOCK)}
                  />
                </SectionErrorBoundary>
              )}

              {/* Drilldown Table - show when ANY drill is active */}
              {isDrillActive && drillData && (
                <SectionErrorBoundary section="drilldown inventory">
                  <DrilldownTable
                    groups={drillData}
                    onBack={() => setDrillType(null)}
                    onRowClick={setSelectedVehicle}
                    title={getDrillTitle(drillType!)}
                  />
                </SectionErrorBoundary>
              )}

              {/* Charts - show when not drilling and no model filter */}
              {!hasModelFilter && !isDrillActive && (
                <SectionErrorBoundary section="charts">
                  <ChartsSection
                    modelPieData={modelPieData}
                    priceBuckets={priceBuckets}
                    priceHandlers={{
                      onUnder40k: () => setDrillType(DRILL_TYPES.PRICE_UNDER_40K),
                      on40kTo60k: () => setDrillType(DRILL_TYPES.PRICE_40K_60K),
                      on60kTo80k: () => setDrillType(DRILL_TYPES.PRICE_60K_80K),
                      onOver80k: () => setDrillType(DRILL_TYPES.PRICE_OVER_80K),
                    }}
                    onModelClick={handleModelClick}
                  />
                </SectionErrorBoundary>
              )}

              {/* New Arrivals Panel - show when not drilling and no model filter */}
              {!isDrillActive && !filters.model && (
                <SectionErrorBoundary section="new arrivals">
                  <NewArrivalsPanel rows={filteredNewArrivals} />
                </SectionErrorBoundary>
              )}

              {/* Oldest Units Panel - show when not drilling and no model filter */}
              {!isDrillActive && !filters.model && (
                <SectionErrorBoundary section="oldest units">
                  <OldestUnitsPanel rows={validRows} onRowClick={setSelectedVehicle} />
                </SectionErrorBoundary>
              )}

              {/* Main Inventory Table - show when not drilling */}
              {!isDrillActive && (
                <SectionErrorBoundary section="inventory table">
                  <InventoryTable rows={filteredRows} onRowClick={setSelectedVehicle} />
                </SectionErrorBoundary>
              )}

              {/* Total drilldown (legacy) */}
              {drillType === DRILL_TYPES.TOTAL && drillData && (
                <SectionErrorBoundary section="drilldown">
                  <DrilldownTable
                    groups={drillData}
                    onBack={() => setDrillType(null)}
                    onRowClick={setSelectedVehicle}
                  />
                </SectionErrorBoundary>
              )}

              <VehicleDetailDrawer
                vehicle={selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
              />
            </>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
