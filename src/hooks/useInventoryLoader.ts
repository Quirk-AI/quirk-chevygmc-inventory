import { useEffect, useCallback, useRef } from "react";
import { InventoryRow, DealerSource } from "../types";
import { useInventoryStore } from "../store/inventoryStore";
import { excelInventoryService } from "../services/inventoryService";

const STALE_TIME = 5 * 60 * 1000;
const CACHE_TIME = 30 * 60 * 1000;

const getCacheKey = (make: DealerSource) => `inventory-data-cache-${make}`;

interface CachedData {
  rows: InventoryRow[];
  timestamp: number;
}

export function useInventoryLoader() {
  const setRows = useInventoryStore((s) => s.setRows);
  const setLoading = useInventoryStore((s) => s.setLoading);
  const setStale = useInventoryStore((s) => s.setStale);
  const setError = useInventoryStore((s) => s.setError);
  const setLastUpdated = useInventoryStore((s) => s.setLastUpdated);
  const setRefreshing = useInventoryStore((s) => s.setRefreshing);
  const selectedMake = useInventoryStore((s) => s.selectedMake);

  const hasFetched = useRef<DealerSource | null>(null);

  const loadFromCache = useCallback((make: DealerSource): CachedData | null => {
    try {
      const cached = localStorage.getItem(getCacheKey(make));
      if (cached) {
        const parsed: CachedData = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_TIME) return parsed;
        localStorage.removeItem(getCacheKey(make));
      }
    } catch (e) {
      console.warn("Cache load failed:", e);
    }
    return null;
  }, []);

  const saveToCache = useCallback((data: InventoryRow[], make: DealerSource) => {
    try {
      const cacheData: CachedData = { rows: data, timestamp: Date.now() };
      localStorage.setItem(getCacheKey(make), JSON.stringify(cacheData));
    } catch (e) {
      console.warn("Cache save failed:", e);
    }
  }, []);

  const fetchInventory = useCallback(async (useCache = true, make: DealerSource = selectedMake) => {
    if (useCache) {
      const cached = loadFromCache(make);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        setRows(cached.rows);
        setLastUpdated(new Date(cached.timestamp));
        setStale(age > STALE_TIME);
        setLoading(false);
        if (age <= STALE_TIME) return;
      }
    }

    try {
      const parsed = await excelInventoryService.fetchInventory(make);

      setRows(parsed);
      setError(null);
      setLastUpdated(new Date());
      setStale(false);
      saveToCache(parsed, make);
    } catch (err) {
      console.error("Inventory load failed:", err);
      setError("Error loading inventory data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadFromCache, saveToCache, setRows, setLoading, setStale, setError, setLastUpdated, setRefreshing, selectedMake]);

  const refetch = useCallback(async () => {
    setRefreshing(true);
    await fetchInventory(false, selectedMake);
  }, [fetchInventory, setRefreshing, selectedMake]);

  // Initial fetch and refetch when make changes
  useEffect(() => {
    if (hasFetched.current === selectedMake) return;
    hasFetched.current = selectedMake;
    setLoading(true);
    fetchInventory(true, selectedMake);
  }, [fetchInventory, selectedMake, setLoading]);

  useEffect(() => {
    const interval = setInterval(() => {
      const lastUpdated = useInventoryStore.getState().lastUpdated;
      if (lastUpdated) {
        const age = Date.now() - lastUpdated.getTime();
        if (age > STALE_TIME) {
          setStale(true);
        }
      }
    }, STALE_TIME);
    return () => clearInterval(interval);
  }, [setStale]);

  return { refetch };
}
