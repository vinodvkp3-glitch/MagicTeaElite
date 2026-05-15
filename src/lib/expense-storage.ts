import { DB } from "@/lib/storage";

export interface ExpenseEntry {
  id: string;
  shop: string;
  date: string;
  dailyExp: number;
  milkExp: number;
  bigExpAmount: number;
  bigExpName: string;
  comments?: string;
}

export function expenseKey(shop: string, yearMonth: string) {
  return `expenses:${shop}:${yearMonth}`;
}

export function getExpensesMonth(shop: string, yearMonth: string): ExpenseEntry[] {
  return (DB.get(expenseKey(shop, yearMonth)) as ExpenseEntry[] | null) ?? [];
}

export function saveExpenseEntry(entry: ExpenseEntry) {
  const ym = entry.date.slice(0, 7);
  const entries = getExpensesMonth(entry.shop, ym);
  const idx = entries.findIndex((item) => item.id === entry.id);
  if (idx !== -1) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  DB.set(expenseKey(entry.shop, ym), entries);
}

export function getAllExpenses(): ExpenseEntry[] {
  if (typeof window === "undefined") return [];
  const allEntries: ExpenseEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("expenses:")) {
      const entries = DB.get(key) as ExpenseEntry[] | null;
      if (entries) allEntries.push(...entries);
    }
  }
  return allEntries;
}
