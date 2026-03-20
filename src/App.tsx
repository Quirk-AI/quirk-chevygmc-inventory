import { FC, useCallback, useMemo } from "react";
import "./index.css";
import "./styles/theme.css";

import { useInventoryStore } from "./store/inventoryStore";
import { useInventoryLoader } from "./hooks/useInventoryLoader";
import { useInventoryMetrics } from "./hooks/useInventoryMetrics";
import { useDrilldown } from "./hooks/useDrilldown";
import { useFilteredInventory } from "./hooks/useFilteredInventory";
import {
  getModelDisplayName,
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

const App: FC = () => {
  const { refetch } = useInventoryLoader();

  const rows = useInventoryStore((s) => s.rows);
  const error = useInventoryStore((s) => s.error);
  const isLoading = useInventoryStore((s) => s.isLoading);
  const isStale = useInventoryStore((s) => s.isStale);
  const lastUpdated = useInventoryStore((s) => s.lastUpdated);
  const isRefreshing = useInventoryStore((s) => s.isRefreshing);
  const filters = useInventoryStore((s) => s.filters);
  const drillType = useInventoryStore((s) => s.drillType);
  const selectedVehicle = useInventoryStore((s) => s.selectedVehicle);
  const selectedMake = useInventoryStore((s) => s.selectedMake);

  const setFilters = useInventoryStore((s) => s.setFilters);
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
    filteredRows, filteredNewArrivals, filteredInTransit
  } = useFilteredInventory(validRows, filters);

  const {
    priceBuckets, modelPieData,
    inTransitRows, inStockRows
  } = useInventoryMetrics(filteredRows);

  const {
    drillData, getDrillTitle, isDrillActive,
  } = useDrilldown(drillType, filteredRows, inTransitRows, inStockRows);

  const hasModelFilter = !!filters.model;

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
                rows={validRows}
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
                  <OldestUnitsPanel rows={filteredRows} />
                </SectionErrorBoundary>
              )}

              {/* Main Inventory Table - show when not drilling */}
              {!isDrillActive && (
                <SectionErrorBoundary section="inventory table">
                  <InventoryTable rows={filteredRows} onRowClick={setSelectedVehicle} />
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
