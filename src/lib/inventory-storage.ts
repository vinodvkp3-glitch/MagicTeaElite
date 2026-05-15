import { DB } from "@/lib/storage";

export interface StockItem {
  id: string;
  code: string;
  name: string;
  sellingPrice: number;
}

export interface DailyStockEntry {
  itemCode: string;
  opening: number;
  soldToday: number;
  stockIn: number;
  closing: number;
}

export interface DailyStockRecord {
  id: string;
  date: string;
  shop: string;
  entries: DailyStockEntry[];
}

export interface PurchaseItem {
  itemCode: string;
  itemName: string;
  qty: number;
  price: number;
  total: number;
}

export interface StockPurchaseRecord {
  id: string;
  date: string;
  shop: string;
  supplier: string;
  half: "1st Half (1-15)" | "2nd Half (16-31)";
  items: PurchaseItem[];
  grandTotal: number;
}

export function dailyStockKey(shop: string, date: string) {
  return `dailystock:${shop}:${date}`;
}

export function stockPurchaseKey(shop: string, yearMonth: string) {
  return `stockpurchase:${shop}:${yearMonth}`;
}

export function getDailyStock(shop: string, date: string): DailyStockRecord | null {
  return DB.get(dailyStockKey(shop, date)) as DailyStockRecord | null;
}

export function saveDailyStock(record: DailyStockRecord) {
  DB.set(dailyStockKey(record.shop, record.date), record);
}

export function getStockPurchases(shop: string, yearMonth: string): StockPurchaseRecord[] {
  return (DB.get(stockPurchaseKey(shop, yearMonth)) as StockPurchaseRecord[] | null) ?? [];
}

export function saveStockPurchase(record: StockPurchaseRecord) {
  const yearMonth = record.date.slice(0, 7);
  const existing = getStockPurchases(record.shop, yearMonth);
  const idx = existing.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    existing[idx] = record;
  } else {
    existing.push(record);
  }
  DB.set(stockPurchaseKey(record.shop, yearMonth), existing);
}
