import { useMemo } from "react";
import { InventoryRow, AgingBuckets, PriceBuckets, ModelPieDatum } from "../types";
import { isInTransit } from "../utils/inventoryUtils";

interface InventoryMetrics {
  agingBuckets: AgingBuckets;
  priceBuckets: PriceBuckets;
  avgAge: number;
  modelPieData: ModelPieDatum[];
  inTransitRows: InventoryRow[];
  inStockRows: InventoryRow[];
}

export function useInventoryMetrics(validRows: InventoryRow[]): InventoryMetrics {
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

  const inTransitRows = useMemo(() => {
    return validRows.filter((r) => isInTransit(r));
  }, [validRows]);

  // In Stock rows = not in transit
  const inStockRows = useMemo(() => {
    return validRows.filter((r) => !isInTransit(r));
  }, [validRows]);

  return { agingBuckets, priceBuckets, avgAge, modelPieData, inTransitRows, inStockRows };
}
