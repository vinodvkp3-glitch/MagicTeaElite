import { DB } from "@/lib/storage";

// Office Chai Types
export interface OfficeItem {
  name: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface OfficeOrder {
  id: string;
  date: string;
  shop: string;
  officeName: string;
  items: OfficeItem[];
  total: number;
  paid: number;
  balance: number;
  notes: string;
}

// Dairy Ledger Types
export interface DairyEntry {
  id: string;
  date: string;
  shop: string;
  dairyName: string;
  liters: number;
  rate: number;
  amount: number;
  paid: number;
  balance: number;
}

// Keys
export function officeKey(shop: string, yearMonth: string) {
  return `office:${shop}:${yearMonth}`;
}

export function dairyKey(shop: string, yearMonth: string) {
  return `dairy:${shop}:${yearMonth}`;
}

// Office Storage Functions
export function getOfficeOrders(shop: string, yearMonth: string): OfficeOrder[] {
  return (DB.get(officeKey(shop, yearMonth)) as OfficeOrder[] | null) ?? [];
}

export function saveOfficeOrder(order: OfficeOrder) {
  const ym = order.date.slice(0, 7);
  const orders = getOfficeOrders(order.shop, ym);
  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    orders[idx] = order;
  } else {
    orders.push(order);
  }
  DB.set(officeKey(order.shop, ym), orders);
}

export function getAllOfficeOrders(): OfficeOrder[] {
  if (typeof window === "undefined") return [];
  const allOrders: OfficeOrder[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("office:")) {
      const orders = DB.get(key) as OfficeOrder[] | null;
      if (orders) allOrders.push(...orders);
    }
  }
  return allOrders;
}

// Dairy Storage Functions
export function getDairyEntries(shop: string, yearMonth: string): DairyEntry[] {
  return (DB.get(dairyKey(shop, yearMonth)) as DairyEntry[] | null) ?? [];
}

export function saveDairyEntry(entry: DairyEntry) {
  const ym = entry.date.slice(0, 7);
  const entries = getDairyEntries(entry.shop, ym);
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  DB.set(dairyKey(entry.shop, ym), entries);
}

export function getAllDairyEntries(): DairyEntry[] {
  if (typeof window === "undefined") return [];
  const allEntries: DairyEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("dairy:")) {
      const entries = DB.get(key) as DairyEntry[] | null;
      if (entries) allEntries.push(...entries);
    }
  }
  return allEntries;
}
