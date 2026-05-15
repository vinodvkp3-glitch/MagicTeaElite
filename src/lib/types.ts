// Domain types (shop operations)
export type Shop = "NAVLAKHA" | "NOVELTY";

export interface DailyEntry {
  id: string;
  date: string;
  shop: Shop;
  cash: number;
  onlineIdfc: number;
  onlinePaytm: number;
  totalOnline: number;
  total: number;
  expenses: number;
  milkExp: number;
  bigExpName: string;
  bigExpAmount: number;
  remarks: string;
}

export interface StockItem {
  id: string;
  code: string;
  name: string;
  sellingPrice: number;
  shop: Shop;
}

export interface StockPurchase {
  id: string;
  date: string;
  shop: Shop;
  half: string;
  items: unknown[];
  supplier: string;
  grandTotal: number;
}

export interface DailyStock {
  id: string;
  date: string;
  shop: Shop;
  items: unknown[];
}

export interface DomainExpense {
  id: string;
  date: string;
  shop: Shop;
  type: string;
  name: string;
  amount: number;
  comments: string;
}

export interface OfficeOrder {
  id: string;
  date: string;
  shop: Shop;
  officeName: string;
  items: unknown[];
  total: number;
  paid: number;
  balance: number;
}

export interface DairyEntry {
  id: string;
  date: string;
  shop: Shop;
  dairyName: string;
  liters: number;
  rate: number;
  amount: number;
  paid: number;
  balance: number;
}

export interface StaffMemberRecord {
  id: string;
  shop: Shop;
  name: string;
  monthlySalary: number;
}

export interface SalaryRecord {
  id: string;
  staffId: string;
  staffName: string;
  shop: Shop;
  month: string;
  salary: number;
  advance: number;
  paid: number;
  remaining: number;
}

// Application UI types (ERP / POS)
export type CategoryId = string;
export type AttendanceStatus = "P" | "A" | "H" | "OT" | "PH" | "";

export interface RecipeIngredient {
  id: string;
  name: string;
  qty: number;
  unit: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  order?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  categoryId: CategoryId;
  recipe?: RecipeIngredient[];
}

export interface CartItem extends MenuItem {
  quantity: number;
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  totalSpent: number;
  lastVisit: string;
  branchId: string;
}

export interface SalesTransaction {
  id?: string;
  branchId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "online";
  timestamp: string;
  staffId: string;
  customerId?: string;
  customerName?: string;
  loyaltyPointsEarned?: number;
  isOffline?: boolean;
  createdAt?: string;
}

export interface Ingredient {
  id: string;
  branchId: string;
  name: string;
  currentStock: number;
  unit: string;
  reorderLevel: number;
  costPrice: number;
  lastCostPrice?: number;
  vendorId?: string;
  wastagePercent?: number;
  leadTimeDays?: number;
  safetyStockDays?: number;
  minOrderQty?: number;
  maxOrderQty?: number;
  category:
    | "dairy"
    | "dry"
    | "disposables"
    | "bakery"
    | "packaging"
    | "beverages";
  lastUpdated?: string;
}

export type StockTransactionType =
  | "purchase"
  | "sale_deduction"
  | "wastage"
  | "adjustment"
  | "opening";

export interface StockLedgerEntry {
  id?: string;
  branchId: string;
  ingredientId: string;
  ingredientName: string;
  change: number;
  prevStock: number;
  newStock: number;
  type: StockTransactionType;
  reason: string;
  costPrice: number;
  vendorId?: string;
  refId?: string;
  batchId?: string;
  timestamp: string;
  userId: string;
}

export interface InventoryBatch {
  id?: string;
  branchId: string;
  ingredientId: string;
  ingredientName: string;
  vendorId?: string;
  invoiceRef?: string;
  purchaseTimestamp: string;
  quantity: number;
  consumedQuantity: number;
  remainingQuantity: number;
  availableQuantity: number;
  unitCost: number;
  batchCost: number;
  effectiveCost: number;
  createdAt?: string;
}

export interface StockTransaction {
  id?: string;
  branchId: string;
  ingredientId: string;
  ingredientName: string;
  change: number;
  type: "deduction" | "refill" | "adjustment" | "wastage";
  reason: string;
  vendorId?: string;
  timestamp: string;
}

export type ExpenseCategory =
  | "daily_expenses"
  | "salary"
  | "rent"
  | "utilities"
  | "repairs"
  | "stock_purchase"
  | "vendor_payment"
  | "miscellaneous"
  | "milk";

export type FinancialTransactionType = "inflow" | "outflow";

export interface FinancialLedgerEntry {
  id?: string;
  branchId: string;
  amount: number;
  type: FinancialTransactionType;
  category: ExpenseCategory | "sale" | "refund";
  paymentMethod: "cash" | "online";
  description: string;
  vendorId?: string; // Optional: For dairy/stock vendors
  refId?: string; // ID of related stock transaction or sale
  timestamp: string;
  userId: string;
}

export interface Vendor {
  id: string;
  branchId: string;
  name: string;
  contact: string;
  category: string;
}

export type VendorType = "local" | "distributor" | "expense";

export interface MilkSupplyEntry {
  id?: string;
  vendorId: string;
  branchId: string;
  date: string;
  receivedLiters: number;
  usedLiters: number;
  wastageLiters: number;
  unitCost: number; // per liter
  totalCost: number;
  notes?: string;
  timestamp?: string;
}

export interface GasCylinderEntry {
  id?: string;
  vendorId: string;
  branchId: string;
  date: string;
  cylinderId?: string;
  refillCost: number;
  usageDays?: number;
  notes?: string;
  timestamp?: string;
}

export interface DistributorInvoice {
  id?: string;
  vendorId: string;
  branchId: string;
  invoiceNumber: string;
  date: string;
  items: { sku?: string; name: string; qty: number; unitCost: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  status: "open" | "partially_paid" | "paid";
  timestamp?: string;
}

export interface Expense {
  id?: string;
  branchId: string;
  amount: number;
  category:
    | "milk"
    | "grocery"
    | "gas"
    | "electricity"
    | "salary"
    | "maintenance"
    | "miscellaneous";
  notes: string;
  date: string;
  paymentMethod: "cash" | "online";
  timestamp: string;
}

export interface DailyHisab {
  id?: string;
  branchId: string;
  date: string;
  openingCash: number;
  cashSales: number;
  onlineSales: number;
  zomatoSales: number;
  expensesTotal: number;
  staffAdvances: number;
  depositAmount: number;
  lockerAmount: number;
  closingCashActual: number;
  expectedCash: number;
  difference: number;
  status: "balanced" | "difference";
  timestamp: string;
}

export interface StaffMember {
  id: string;
  branchId: string;
  name: string;
  monthlySal: number;
  baseHrs: number;
  rate: number;
  phone: string;
  aadhaar: string;
  dob: string;
  address: string;
  branch: string;
  joinDate: string;
  role: string;
  photo: string;
  emergencyContact: string;
  pin: string;
  faBonus?: number;
}

export interface AttendanceRecord {
  id?: string;
  branchId: string;
  staffId: string;
  date: string;
  status: AttendanceStatus;
  s1In: string;
  s1Out: string;
  s2In: string;
  s2Out: string;
  adv: number;
  note: string;
  totalHrs: number;
}

export interface LeaveRequest {
  id?: string;
  branchId: string;
  staffId: string;
  staffName: string;
  date: string;
  type: "sick" | "personal" | "emergency" | "other";
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  contact: string;
  managerId?: string;
  isActive: boolean;
}

export interface OfficeDelivery {
  id?: string;
  branchId: string;
  officeName: string;
  month: string;
  deliveredQty: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: "pending" | "partial" | "paid";
  notes?: string;
  createdAt?: string;
}

export interface OfficeLedgerEntry {
  id?: string;
  branchId: string;
  officeName: string;
  date: string;
  amount: number;
  type: "udhaar" | "payment";
  note?: string;
  createdAt?: string;
}

export interface DairyLedgerEntry {
  id?: string;
  branchId: string;
  supplierName: string;
  date: string;
  liters: number;
  ratePerLitre: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentStatus: "pending" | "partial" | "paid";
  note?: string;
  createdAt?: string;
}

export interface AuditLog {
  id?: string;
  timestamp: string;
  userId: string;
  userName?: string;
  branchId?: string;
  action: string;
  entity: string;
  details?: string;
}

export interface SystemSettings {
  shopName: string;
  tagline: string;
  currency: string;
  taxRate: number;
  autoBackup: boolean;
  lowStockAlert: boolean;
  printerEnabled: boolean;
  printerSize: "58mm" | "80mm";
  receiptHeader: string;
  receiptFooter: string;
}

export interface MilkLog {
  id?: string;
  type: "inflow" | "wastage";
  quantity: number;
  unit: string;
  source?: string;
  reason?: string;
  timestamp: string;
  date: string;
}
