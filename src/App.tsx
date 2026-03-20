import { FC, useCallback, useMemo } from "react";
import "./index.css";
import "./styles/theme.css";

import { useInventoryStore } from "./store/inventoryStore";
import { useInventoryLoader } from "./hooks/useInventoryLoader";
import { useInventoryMetrics } from "./hooks/useInventoryMetrics";
import { useDrilldown } from "./hooks/useDrilldown";
import { isInTransit } from "./utils/inventoryUtils";
import {
  getModelDisplayName,
  rowMatchesModelFilter,
  shouldSplitByModelNumber
} from "./utils/modelFormatting";
import { DrillType } from "./types";
import {
  DRILL_TYPES,
  MODEL_DRILL_PREFIX,
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

  const {
    priceBuckets, modelPieData,
    inTransitRows, inStockRows
  } = useInventoryMetrics(validRows);

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

  const {
    drillData, getDrillTitle, isDrillActive,
  } = useDrilldown(drillType, validRows, filteredRows, inTransitRows, inStockRows);

  const hasModelFilter = !!filters.model;

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
