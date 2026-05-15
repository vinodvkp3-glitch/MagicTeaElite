import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { AccountingService } from "@/lib/services/accounting-service";
import type {
  Vendor,
  VendorType,
  MilkSupplyEntry,
  GasCylinderEntry,
  DistributorInvoice,
  FinancialLedgerEntry,
} from "@/lib/types";

const VENDOR_COL = "vendors";
const MILK_SUPPLIES = "vendor_milk_supplies";
const GAS_CYLINDERS = "vendor_gas_cylinders";
const DISTRIBUTOR_INVOICES = "vendor_invoices";

export const VendorService = {
  async createVendor(v: Omit<Vendor, "id"> & { type?: VendorType }) {
    const ref = await addDoc(collection(db, VENDOR_COL), { ...v, type: v.type || "local", createdAt: new Date().toISOString() });
    return { id: ref.id, ...v } as Vendor;
  },

  // Record payment against a distributor invoice
  async recordInvoicePayment(invoiceId: string, amount: number, paymentMethod: "cash" | "online" = "cash", userId = "system") {
    const invRef = doc(db, DISTRIBUTOR_INVOICES, invoiceId);
    const invSnap = await getDoc(invRef);
    if (!invSnap.exists()) throw new Error("Invoice not found");
    const inv = invSnap.data() as DistributorInvoice;

    // create ledger payment entry linked to invoice
    await AccountingService.recordTransaction({
      branchId: inv.branchId,
      amount,
      type: "outflow",
      category: "vendor_payment",
      paymentMethod,
      description: `Payment for Invoice ${inv.invoiceNumber}`,
      vendorId: inv.vendorId,
      refId: invoiceId,
      userId,
    } as Omit<FinancialLedgerEntry, "id">);

    // update invoice paid/status
    const newPaid = (inv.paid || 0) + amount;
    const newStatus: DistributorInvoice["status"] = newPaid >= inv.total ? "paid" : "partially_paid";
    await updateDoc(invRef, { paid: newPaid, status: newStatus });

    return { invoiceId, paid: newPaid, status: newStatus };
  },

  async getVendor(id: string): Promise<Vendor | null> {
    const d = await getDoc(doc(db, VENDOR_COL, id));
    if (!d.exists()) return null;
    return { id: d.id, ...(d.data() as Vendor) };
  },

  async listVendorsByType(type?: VendorType) {
    const col = collection(db, VENDOR_COL);
    if (!type) {
      const snap = await getDocs(query(col, orderBy("name")));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Vendor) }));
    }
    const q = query(col, where("type", "==", type), orderBy("name"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Vendor) }));
  },

  // Milk supply logging: records supply and creates an immutable ledger entry
  async recordMilkSupply(s: MilkSupplyEntry, paymentMethod: "cash" | "online" = "cash") {
    const ref = await addDoc(collection(db, MILK_SUPPLIES), { ...s, timestamp: new Date().toISOString() });
    const id = ref.id;

    await AccountingService.recordTransaction({
      branchId: s.branchId,
      amount: s.totalCost,
      type: "outflow",
      category: "milk",
      paymentMethod,
      description: `Milk supply (${s.receivedLiters}L) from ${s.vendorId}`,
      vendorId: s.vendorId,
      refId: id,
      userId: "system",
    } as Omit<FinancialLedgerEntry, "id">);

    return { id, ...s } as MilkSupplyEntry;
  },

  // Gas cylinder/refill logging
  async recordGasRefill(e: GasCylinderEntry, paymentMethod: "cash" | "online" = "cash") {
    const ref = await addDoc(collection(db, GAS_CYLINDERS), { ...e, timestamp: new Date().toISOString() });
    const id = ref.id;

    await AccountingService.recordTransaction({
      branchId: e.branchId,
      amount: e.refillCost,
      type: "outflow",
      category: "miscellaneous",
      paymentMethod,
      description: `Gas refill ${e.cylinderId ?? ""} from ${e.vendorId}`,
      vendorId: e.vendorId,
      refId: id,
      userId: "system",
    } as Omit<FinancialLedgerEntry, "id">);

    return { id, ...e } as GasCylinderEntry;
  },

  // Distributor invoice (bulk purchase) recording
  async recordDistributorInvoice(inv: DistributorInvoice) {
    const ref = await addDoc(collection(db, DISTRIBUTOR_INVOICES), { ...inv, timestamp: new Date().toISOString() });
    const id = ref.id;

    // Record as a ledger outflow (invoice open until paid)
    await AccountingService.recordTransaction({
      branchId: inv.branchId,
      amount: inv.total,
      type: "outflow",
      category: "stock_purchase",
      paymentMethod: "cash",
      description: `Distributor Invoice ${inv.invoiceNumber} from ${inv.vendorId}`,
      vendorId: inv.vendorId,
      refId: id,
      userId: "system",
    } as Omit<FinancialLedgerEntry, "id">);

    return { id, ...inv } as DistributorInvoice;
  },

  // Query vendor-related ledger entries
  async getVendorLedger(vendorId: string, start?: string, end?: string) {
    const col = collection(db, "financial_ledger");
    let q = query(col, where("vendorId", "==", vendorId), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  },

  async getMilkSupplies(vendorId?: string, branchId?: string) {
    let q = collection(db, MILK_SUPPLIES);
    const clauses: any[] = [];
    if (vendorId) clauses.push(where("vendorId", "==", vendorId));
    if (branchId) clauses.push(where("branchId", "==", branchId));
    if (clauses.length > 0) q = query(collection(db, MILK_SUPPLIES), ...clauses, orderBy("date", "desc"));
    const snap = await getDocs(q as any);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as MilkSupplyEntry) }));
  },

  async getGasEntries(vendorId?: string, branchId?: string) {
    let q = collection(db, GAS_CYLINDERS);
    const clauses: any[] = [];
    if (vendorId) clauses.push(where("vendorId", "==", vendorId));
    if (branchId) clauses.push(where("branchId", "==", branchId));
    if (clauses.length > 0) q = query(collection(db, GAS_CYLINDERS), ...clauses, orderBy("date", "desc"));
    const snap = await getDocs(q as any);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as GasCylinderEntry) }));
  },

  async getDistributorInvoicesForVendor(vendorId: string) {
    const q = query(collection(db, DISTRIBUTOR_INVOICES), where("vendorId", "==", vendorId), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as DistributorInvoice) }));
  },

  // Get pending balance computed from distributor invoices minus payments linked to invoice refId
  async getVendorPendingBalance(vendorId: string) {
    const invoicesQ = query(collection(db, DISTRIBUTOR_INVOICES), where("vendorId", "==", vendorId));
    const invSnap = await getDocs(invoicesQ);
    const invoices = invSnap.docs.map((d) => ({ id: d.id, ...(d.data() as DistributorInvoice) }));

    const ledgerQ = query(collection(db, "financial_ledger"), where("vendorId", "==", vendorId));
    const ledgerSnap = await getDocs(ledgerQ);
    const ledger = ledgerSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    let pending = 0;
    invoices.forEach((inv) => {
      const paid = ledger
        .filter((l) => l.refId === inv.id && l.type === "outflow" && l.category === "vendor_payment")
        .reduce((s, l) => s + (l.amount || 0), 0);
      pending += inv.total - paid;
    });

    return pending;
  },

  // Simple monthly vendor summary
  async getMonthlyVendorSummary(vendorId: string, yearMonth: string) {
    const start = `${yearMonth}-01T00:00:00Z`;
    const end = `${yearMonth}-31T23:59:59Z`;
    const ledgerQ = query(collection(db, "financial_ledger"), where("vendorId", "==", vendorId), orderBy("timestamp", "desc"));
    const snap = await getDocs(ledgerQ);
    const entries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    const monthEntries = entries.filter((e) => e.timestamp && e.timestamp.startsWith(yearMonth));
    const totalOutflow = monthEntries.filter((e) => e.type === "outflow").reduce((s, e) => s + (e.amount || 0), 0);
    const totalInflow = monthEntries.filter((e) => e.type === "inflow").reduce((s, e) => s + (e.amount || 0), 0);

    return { vendorId, yearMonth, totalOutflow, totalInflow, entries: monthEntries };
  },
};

export default VendorService;
