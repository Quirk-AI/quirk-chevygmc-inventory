// src/services/inventoryService.ts
// Central inventory service dispatcher.
// Currently uses static Excel files from /public/ (demo/internal-pilot mode).
// To switch to an authenticated API, implement InventoryService in a new
// source module and change the export below.

import { InventoryRow, DealerSource } from "../types";
import { staticInventoryService } from "./staticInventorySource";

export interface InventoryService {
  fetchInventory(source: DealerSource): Promise<InventoryRow[]>;
}

// Active data source — swap this to use a different backend
const inventoryService: InventoryService = staticInventoryService;

export default inventoryService;
