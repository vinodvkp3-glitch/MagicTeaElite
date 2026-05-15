import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  runTransaction,
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { db } from "@/firebase";
import { 
  FinancialLedgerEntry, 
  ExpenseCategory,
  FinancialTransactionType
} from "@/lib/types";

const LEDGER_COL = "financial_ledger";

export const AccountingService = {
  /**
   * Record a financial transaction (Expense, Vendor Payment, etc.)
   */
  async recordTransaction(entry: Omit<FinancialLedgerEntry, "id" | "timestamp">): Promise<string> {
    const docRef = await addDoc(collection(db, LEDGER_COL), {
      ...entry,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  /**
   * Get ledger entries for a branch within a date range
   */
  async getBranchLedger(
    branchId: string, 
    startDate: string, 
    endDate: string
  ): Promise<FinancialLedgerEntry[]> {
    const q = query(
      collection(db, LEDGER_COL),
      where("branchId", "==", branchId),
      where("timestamp", ">=", startDate),
      where("timestamp", "<=", endDate),
      orderBy("timestamp", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialLedgerEntry));
  },

  /**
   * Aggregate monthly expenses by category for P&L
   */
  async getMonthlyCategoryTotals(branchId: string, yearMonth: string) {
    const start = `${yearMonth}-01T00:00:00Z`;
    const end = `${yearMonth}-31T23:59:59Z`;

    const entries = await this.getBranchLedger(branchId, start, end);
    
    const totals: Record<string, number> = {};
    entries.forEach(entry => {
      if (entry.type === "outflow") {
        totals[entry.category] = (totals[entry.category] || 0) + entry.amount;
      }
    });

    return totals;
  },

  /**
   * Get current "Money in Hand" (Cash vs Online) for a branch
   * Note: This requires a starting balance or aggregation of ALL time.
   * For this ERP, we aggregate by selected month as a "Month Liquidity" view.
   */
  async getLiquidity(branchId: string, yearMonth: string) {
    const start = `${yearMonth}-01T00:00:00Z`;
    const end = `${yearMonth}-31T23:59:59Z`;
    
    const entries = await this.getBranchLedger(branchId, start, end);
    
    return entries.reduce((acc, entry) => {
      const amount = entry.type === "inflow" ? entry.amount : -entry.amount;
      if (entry.paymentMethod === "cash") acc.cash += amount;
      else acc.online += amount;
      return acc;
    }, { cash: 0, online: 0 });
  }
};
