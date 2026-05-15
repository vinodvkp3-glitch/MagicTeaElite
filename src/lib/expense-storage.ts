import { DB } from "@/lib/storage";

export interface ExpenseEntry {
  id: string;
  date: string;
  shop: string;
  dailyExp: number;
  milkExp: number;
  bigExpName: string;
  bigExpAmount: number;
  comments: string;
}

export interface SalaryPayment {
  id: string;
  staffId: string;
  staffName: string;
  shop: string;
  month: string; // YYYY-MM
  monthlySalary: number;
  advance: number;
  paid: number;
  remaining: number;
  status: "Paid" | "Pending";
}

export function expenseKey(shop: string, yearMonth: string) {
  return `expenses:${shop}:${yearMonth}`;
}

export function salaryKey(yearMonth: string) {
  return `salaries:${yearMonth}`;
}

export function getExpensesMonth(shop: string, yearMonth: string): ExpenseEntry[] {
  return (DB.get(expenseKey(shop, yearMonth)) as ExpenseEntry[] | null) ?? [];
}

export function setExpensesMonth(
  shop: string,
  yearMonth: string,
  entries: ExpenseEntry[]
) {
  DB.set(expenseKey(shop, yearMonth), entries);
}

export function upsertExpenseEntry(entry: Omit<ExpenseEntry, "id"> & { id?: string }): ExpenseEntry {
  const yearMonth = entry.date.slice(0, 7);
  const entries = getExpensesMonth(entry.shop, yearMonth);
  const payload: ExpenseEntry = {
    ...entry,
    id: entry.id ?? Date.now().toString(),
  };

  const idx = entries.findIndex((e) => e.date === entry.date);
  if (idx >= 0) {
    entries[idx] = { ...payload, id: entries[idx].id };
  } else {
    entries.push(payload);
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  setExpensesMonth(entry.shop, yearMonth, entries);
  return payload;
}

export function getSalariesMonth(yearMonth: string): SalaryPayment[] {
  return (DB.get(salaryKey(yearMonth)) as SalaryPayment[] | null) ?? [];
}

export function setSalariesMonth(yearMonth: string, salaries: SalaryPayment[]) {
  DB.set(salaryKey(yearMonth), salaries);
}

export function upsertSalaryPayment(payment: Omit<SalaryPayment, "id"> & { id?: string }): SalaryPayment {
  const salaries = getSalariesMonth(payment.month);
  const payload: SalaryPayment = {
    ...payment,
    id: payment.id ?? Date.now().toString(),
  };

  const idx = salaries.findIndex((s) => s.staffId === payment.staffId && s.month === payment.month);
  if (idx >= 0) {
    salaries[idx] = { ...payload, id: salaries[idx].id };
  } else {
    salaries.push(payload);
  }
  setSalariesMonth(payment.month, salaries);
  return payload;
}
