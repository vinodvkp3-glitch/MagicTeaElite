import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase";
import { 
  Ingredient, 
  InventoryBatch,
  StockLedgerEntry, 
  StockTransactionType 
} from "@/lib/types";
import { AccountingService } from "./accounting-service";

const INGREDIENTS_COL = "ingredients";
const LEDGER_COL = "inventory_ledger";
const BATCHES_COL = "inventory_batches";

export const InventoryService = {
  /**
   * Get all ingredients for a specific branch
   */
  async getBranchInventory(branchId: string): Promise<Ingredient[]> {
    const q = query(
      collection(db, INGREDIENTS_COL),
      where("branchId", "==", branchId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient));
  },

  async getBranchLedger(branchId: string, count = 50): Promise<StockLedgerEntry[]> {
    const q = query(
      collection(db, LEDGER_COL),
      where("branchId", "==", branchId),
      orderBy("timestamp", "desc"),
      limit(count)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockLedgerEntry));
  },

  async getIngredientLedger(ingredientId: string, branchId: string, count = 50): Promise<StockLedgerEntry[]> {
    const q = query(
      collection(db, LEDGER_COL),
      where("branchId", "==", branchId),
      where("ingredientId", "==", ingredientId),
      orderBy("timestamp", "desc"),
      limit(count)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockLedgerEntry));
  },

  /**
   * Record a stock movement (Purchase, Wastage, Adjustment, etc.)
   */
  async recordMovement(
    branchId: string,
    movement: {
      ingredientId: string;
      change: number;
      type: StockTransactionType;
      reason: string;
      costPrice: number;
      refId?: string;
      vendorId?: string;
      purchaseTimestamp?: string;
      userId: string;
    }
  ): Promise<void> {
    const ingredientRef = doc(db, INGREDIENTS_COL, movement.ingredientId);
    const ledgerRef = doc(collection(db, LEDGER_COL));

    await runTransaction(db, async (transaction) => {
      const ingredientDoc = await transaction.get(ingredientRef);
      if (!ingredientDoc.exists()) {
        throw new Error("Ingredient does not exist");
      }

      const currentData = ingredientDoc.data() as Ingredient;
      const prevStock = currentData.currentStock;
      const newStock = prevStock + movement.change;
      const newCostPrice = movement.type === "purchase" && movement.change > 0
        ? ((prevStock * currentData.costPrice) + (movement.change * movement.costPrice)) / (prevStock + movement.change)
        : currentData.costPrice;

      transaction.update(ingredientRef, {
        currentStock: newStock,
        lastUpdated: new Date().toISOString(),
        ...(movement.type === "purchase" ? { lastCostPrice: movement.costPrice, costPrice: newCostPrice } : {}),
      });

      const ledgerEntry: StockLedgerEntry = {
        branchId,
        ingredientId: movement.ingredientId,
        ingredientName: currentData.name,
        change: movement.change,
        prevStock,
        newStock,
        type: movement.type,
        reason: movement.reason,
        costPrice: movement.costPrice,
        vendorId: movement.vendorId,
        refId: movement.refId,
        timestamp: new Date().toISOString(),
        userId: movement.userId,
      };

      if (movement.type === "purchase" && movement.change > 0) {
        const batchRef = doc(collection(db, BATCHES_COL));
        const unitCost = movement.costPrice;
        const quantity = movement.change;
        transaction.set(batchRef, {
          id: batchRef.id,
          branchId,
          ingredientId: movement.ingredientId,
          ingredientName: currentData.name,
          vendorId: movement.vendorId || null,
          invoiceRef: movement.refId || null,
          purchaseTimestamp: movement.purchaseTimestamp || new Date().toISOString(),
          quantity,
          consumedQuantity: 0,
          remainingQuantity: quantity,
          availableQuantity: quantity,
          unitCost,
          batchCost: Math.abs(quantity * unitCost),
          effectiveCost: unitCost,
          createdAt: serverTimestamp(),
        });
        ledgerEntry.batchId = batchRef.id;
      }

      transaction.set(ledgerRef, {
        ...ledgerEntry,
        createdAt: serverTimestamp(),
      });
    });

    if (movement.type === "purchase") {
      await AccountingService.recordTransaction({
        branchId,
        amount: Math.abs(movement.change) * movement.costPrice,
        type: "outflow",
        category: "stock_purchase",
        paymentMethod: "cash",
        description: `Stock Purchase: ${movement.ingredientId} (${movement.change} units)`,
        refId: movement.refId,
        userId: movement.userId,
      });
    }
  },

  /**
   * Deduct stock based on recipe (for POS sales)
   */
  async deductByRecipe(
    branchId: string,
    recipeItems: Array<{ ingredientId: string; ingredientName: string; qty: number; costPrice?: number }>,
    refId: string,
    userId: string
  ): Promise<void> {
    if (recipeItems.length === 0) return;

    await runTransaction(db, async (transaction) => {
      for (const item of recipeItems) {
        const ingredientRef = doc(db, INGREDIENTS_COL, item.ingredientId);
        const ingredientDoc = await transaction.get(ingredientRef);

        if (!ingredientDoc.exists()) {
          throw new Error(`Ingredient not found: ${item.ingredientId}`);
        }

        const currentData = ingredientDoc.data() as Ingredient;
        const prevStock = currentData.currentStock;
        const newStock = prevStock - item.qty;

        transaction.update(ingredientRef, {
          currentStock: newStock,
          lastUpdated: new Date().toISOString(),
        });

        const ledgerRef = doc(collection(db, LEDGER_COL));
        const ledgerEntry: StockLedgerEntry = {
          branchId,
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          change: -item.qty,
          prevStock,
          newStock,
          type: "sale_deduction",
          reason: `POS sale deduction for ${refId}`,
          costPrice: item.costPrice ?? currentData.costPrice,
          refId,
          timestamp: new Date().toISOString(),
          userId,
        };

        transaction.set(ledgerRef, {
          ...ledgerEntry,
          createdAt: serverTimestamp(),
        });
      }
    });
  },

  async getBranchBatches(branchId: string): Promise<InventoryBatch[]> {
    const q = query(
      collection(db, BATCHES_COL),
      where("branchId", "==", branchId),
      orderBy("purchaseTimestamp", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryBatch));
  },

  async getIngredientBatches(branchId: string, ingredientId: string): Promise<InventoryBatch[]> {
    const q = query(
      collection(db, BATCHES_COL),
      where("branchId", "==", branchId),
      where("ingredientId", "==", ingredientId),
      orderBy("purchaseTimestamp", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryBatch));
  },

  async calculateIngredientWeightedAverageCost(branchId: string, ingredientId: string): Promise<number> {
    const batches = await this.getIngredientBatches(branchId, ingredientId);
    const totals = batches.reduce(
      (acc, batch) => {
        const qty = batch.remainingQuantity ?? batch.quantity;
        acc.quantity += qty;
        acc.cost += qty * batch.effectiveCost;
        return acc;
      },
      { quantity: 0, cost: 0 }
    );
    return totals.quantity > 0 ? totals.cost / totals.quantity : 0;
  },

  /**
   * Calculate total inventory valuation for a branch
   */
  async getValuation(branchId: string): Promise<number> {
    const inventory = await this.getBranchInventory(branchId);
    return inventory.reduce((total, item) => total + (item.currentStock * item.costPrice), 0);
  },

  /**
   * Get count of items below reorder level across all or specific branch
   */
  async getLowStockAlerts(branchId?: string): Promise<number> {
    let q = query(collection(db, INGREDIENTS_COL));
    if (branchId) {
      q = query(q, where("branchId", "==", branchId));
    }
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => doc.data() as Ingredient);
    return items.filter(i => i.currentStock <= i.reorderLevel).length;
  },

  /**
   * Get total stock purchase cost for a branch in a given month
   */
  async getMonthlyStockCost(branchId: string, yearMonth: string): Promise<number> {
    const start = `${yearMonth}-01T00:00:00Z`;
    const end = `${yearMonth}-31T23:59:59Z`; // Simplistic end-of-month

    const q = query(
      collection(db, LEDGER_COL),
      where("branchId", "==", branchId),
      where("type", "==", "purchase"),
      where("timestamp", ">=", start),
      where("timestamp", "<=", end)
    );
    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => doc.data() as StockLedgerEntry);
    return entries.reduce((total, entry) => total + (Math.abs(entry.change) * entry.costPrice), 0);
  }
};
