import { DB } from "@/lib/storage";

export interface HisaabEntry {
  id: string;
  date: string;
  shop: string;
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

export type HisaabFormInput = Omit<
  HisaabEntry,
  "id" | "totalOnline" | "total"
>;

export function hisaabKey(shop: string, yearMonth: string) {
  return `hisaab:${shop}:${yearMonth}`;
}

export function computeHisaabTotals(
  input: Pick<
    HisaabEntry,
    "cash" | "onlineIdfc" | "onlinePaytm"
  >
): { totalOnline: number; total: number } {
  const onlineIdfc = Number(input.onlineIdfc) || 0;
  const onlinePaytm = Number(input.onlinePaytm) || 0;
  const cash = Number(input.cash) || 0;
  return {
    totalOnline: onlineIdfc + onlinePaytm,
    total: cash + onlineIdfc + onlinePaytm,
  };
}

export function getHisaabMonth(shop: string, yearMonth: string): HisaabEntry[] {
  return (DB.get(hisaabKey(shop, yearMonth)) as HisaabEntry[] | null) ?? [];
}

export function setHisaabMonth(
  shop: string,
  yearMonth: string,
  entries: HisaabEntry[]
) {
  DB.set(hisaabKey(shop, yearMonth), entries);
}

export function getHisaabEntry(
  shop: string,
  date: string
): HisaabEntry | undefined {
  const yearMonth = date.slice(0, 7);
  return getHisaabMonth(shop, yearMonth).find((e) => e.date === date);
}

export function upsertHisaabEntry(
  input: HisaabFormInput & { id?: string }
): HisaabEntry {
  const yearMonth = input.date.slice(0, 7);
  const entries = getHisaabMonth(input.shop, yearMonth);
  const totals = computeHisaabTotals(input);
  const payload: HisaabEntry = {
    id: input.id ?? Date.now().toString(),
    date: input.date,
    shop: input.shop,
    cash: Number(input.cash) || 0,
    onlineIdfc: Number(input.onlineIdfc) || 0,
    onlinePaytm: Number(input.onlinePaytm) || 0,
    totalOnline: totals.totalOnline,
    total: totals.total,
    expenses: Number(input.expenses) || 0,
    milkExp: Number(input.milkExp) || 0,
    bigExpName: input.bigExpName ?? "",
    bigExpAmount: Number(input.bigExpAmount) || 0,
    remarks: input.remarks ?? "",
  };

  const idx = entries.findIndex((e) => e.date === input.date);
  if (idx >= 0) {
    entries[idx] = { ...payload, id: entries[idx].id };
  } else {
    entries.push(payload);
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  setHisaabMonth(input.shop, yearMonth, entries);
  return payload;
}

export function getEntriesForDate(date: string): HisaabEntry[] {
  const yearMonth = date.slice(0, 7);
  const shops = (DB.get("shops") as { name: string }[] | null) ?? [];
  const result: HisaabEntry[] = [];
  for (const shop of shops) {
    const entry = getHisaabMonth(shop.name, yearMonth).find((e) => e.date === date);
    if (entry) result.push(entry);
  }
  return result;
}

export function entryDayExpenses(e: HisaabEntry): number {
  return (e.expenses || 0) + (e.milkExp || 0) + (e.bigExpAmount || 0);
}

export function formatInr(amount: number): string {
  return amount.toLocaleString("en-IN");
}

export function monthOptionsFromJan2025(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const start = new Date(2025, 0, 1);
  const now = new Date();
  const cursor = new Date(start);
  while (cursor <= now) {
    const value = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const label = cursor.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
    options.push({ value, label });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return options.reverse();
}

export function daysInMonth(yearMonth: string): string[] {
  const [y, m] = yearMonth.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    return `${yearMonth}-${day}`;
  });
}
