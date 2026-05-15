"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Save,
  CalendarDays,
  Table2,
  PieChart,
  Users,
  Plus,
  ArrowRightLeft,
  Loader2,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { getShops, getSettingsStaff } from "@/lib/settings-catalog";
import type { ShopRecord, SettingsStaffRecord } from "@/lib/settings-catalog";
import {
  upsertExpenseEntry,
  getExpensesMonth,
  getSalariesMonth,
  upsertSalaryPayment,
  type ExpenseEntry,
  type SalaryPayment,
} from "@/lib/expense-storage";
import { formatInr, monthOptionsFromJan2025 } from "@/lib/hisaab-storage";
import { Progress } from "@/components/ui/progress";

const quickExpenses = [
  "Shop Rent",
  "Electricity",
  "Staff Salary",
  "Stock Entry",
  "Gas",
  "Repair",
];

const emptyExpense = (date: string, shop: string): Omit<ExpenseEntry, "id"> => ({
  date,
  shop,
  dailyExp: 0,
  milkExp: 0,
  bigExpName: "",
  bigExpAmount: 0,
  comments: "",
});

function num(v: string | number): number {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [staff, setStaff] = useState<SettingsStaffRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("daily");

  // Tab 1: Daily Entry
  const [dailyDate, setDailyDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dailyShop, setDailyShop] = useState("");
  const [expenseForm, setExpenseForm] = useState<Omit<ExpenseEntry, "id"> & { id?: string }>(
    emptyExpense(dailyDate, dailyShop)
  );
  const [todayExpenses, setTodayExpenses] = useState<ExpenseEntry[]>([]);

  // Tab 2: Monthly View
  const [viewMonth, setViewMonth] = useState(format(new Date(), "yyyy-MM"));
  const [viewShop, setViewShop] = useState("");

  // Tab 3: Compare
  const [compareMonth, setCompareMonth] = useState(format(new Date(), "yyyy-MM"));

  // Tab 4: Salary
  const [salaryMonth, setSalaryMonth] = useState(format(new Date(), "yyyy-MM"));
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);

  const monthOptions = useMemo(() => monthOptionsFromJan2025(), []);

  useEffect(() => {
    const s = getShops();
    setShops(s);
    if (s.length > 0) {
      setDailyShop(s[0].name);
      setViewShop(s[0].name);
    }
    setStaff(getSettingsStaff());
  }, []);

  const loadDailyEntry = useCallback(() => {
    if (!dailyShop || !dailyDate) return;
    const month = dailyDate.slice(0, 7);
    const entries = getExpensesMonth(dailyShop, month);
    const entry = entries.find((e) => e.date === dailyDate);
    if (entry) {
      setExpenseForm(entry);
    } else {
      setExpenseForm(emptyExpense(dailyDate, dailyShop));
    }

    // Load all shops' expenses for this date for the summary
    const allToday: ExpenseEntry[] = [];
    shops.forEach((s) => {
      const shopEntries = getExpensesMonth(s.name, month);
      const shopEntry = shopEntries.find((e) => e.date === dailyDate);
      if (shopEntry) allToday.push(shopEntry);
    });
    setTodayExpenses(allToday);
  }, [dailyShop, dailyDate, shops]);

  useEffect(() => {
    loadDailyEntry();
  }, [loadDailyEntry]);

  const handleSaveExpense = () => {
    if (!expenseForm.shop) {
      toast({ variant: "destructive", title: "Select a shop" });
      return;
    }
    setLoading(true);
    try {
      const saved = upsertExpenseEntry({
        ...expenseForm,
        dailyExp: num(expenseForm.dailyExp),
        milkExp: num(expenseForm.milkExp),
        bigExpAmount: num(expenseForm.bigExpAmount),
      });
      loadDailyEntry();
      toast({
        title: "Expense saved",
        description: `${saved.shop} — ${saved.date}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const monthlyData = useMemo(() => {
    if (!viewShop || !viewMonth) return [];
    const entries = getExpensesMonth(viewShop, viewMonth);
    const start = startOfMonth(new Date(viewMonth + "-01"));
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });

    return days.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const entry = entries.find((e) => e.date === dateStr);
      return {
        date: dateStr,
        entry,
        total: entry ? entry.dailyExp + entry.milkExp + entry.bigExpAmount : 0,
      };
    });
  }, [viewShop, viewMonth, activeTab]);

  const monthlyTotals = useMemo(() => {
    return monthlyData.reduce(
      (acc, curr) => {
        if (curr.entry) {
          acc.daily += curr.entry.dailyExp;
          acc.milk += curr.entry.milkExp;
          acc.big += curr.entry.bigExpAmount;
          acc.grand += curr.total;
        }
        return acc;
      },
      { daily: 0, milk: 0, big: 0, grand: 0 }
    );
  }, [monthlyData]);

  const compareData = useMemo(() => {
    const result = shops.map((shop) => {
      const entries = getExpensesMonth(shop.name, compareMonth);
      const totals = entries.reduce(
        (acc, e) => {
          acc.daily += e.dailyExp;
          acc.milk += e.milkExp;
          acc.big += e.bigExpAmount;
          acc.total += e.dailyExp + e.milkExp + e.bigExpAmount;
          return acc;
        },
        { daily: 0, milk: 0, big: 0, total: 0 }
      );
      return { shop: shop.name, ...totals };
    });
    return result;
  }, [shops, compareMonth, activeTab]);

  const loadSalaries = useCallback(() => {
    const existing = getSalariesMonth(salaryMonth);
    const updated = staff.map((s) => {
      const found = existing.find((p) => p.staffId === s.id);
      if (found) return found;
      return {
        id: Date.now().toString() + s.id,
        staffId: s.id,
        staffName: s.name,
        shop: s.shop,
        month: salaryMonth,
        monthlySalary: s.monthlySalary,
        advance: 0,
        paid: 0,
        remaining: s.monthlySalary,
        status: "Pending" as const,
      };
    });
    setSalaryPayments(updated);
  }, [salaryMonth, staff]);

  useEffect(() => {
    loadSalaries();
  }, [loadSalaries]);

  const handleUpdateSalary = (staffId: string, field: keyof SalaryPayment, value: any) => {
    setSalaryPayments((prev) =>
      prev.map((p) => {
        if (p.staffId === staffId) {
          const updated = { ...p, [field]: value };
          if (field === "advance" || field === "paid") {
            updated.remaining = updated.monthlySalary - num(updated.advance) - num(updated.paid);
          }
          return updated;
        }
        return p;
      })
    );
  };

  const handleSaveSalary = (payment: SalaryPayment) => {
    upsertSalaryPayment({
      ...payment,
      advance: num(payment.advance),
      paid: num(payment.paid),
      status: payment.remaining <= 0 ? "Paid" : "Pending",
    });
    toast({ title: "Salary updated", description: payment.staffName });
    loadSalaries();
  };

  const isHighlighted = (name: string) => {
    const lower = name.toLowerCase();
    return (
      lower.includes("salary") ||
      lower.includes("rent") ||
      lower.includes("electricity") ||
      lower.includes("stock")
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black font-headline text-primary">
            Expenses
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
            Manage daily costs, milk, and big bills
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-full justify-start">
            <TabsTrigger value="daily" className="rounded-lg font-bold text-xs sm:text-sm">
              Daily Entry
            </TabsTrigger>
            <TabsTrigger value="monthly" className="rounded-lg font-bold text-xs sm:text-sm">
              <Table2 className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Monthly View
            </TabsTrigger>
            <TabsTrigger value="compare" className="rounded-lg font-bold text-xs sm:text-sm">
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="salary" className="rounded-lg font-bold text-xs sm:text-sm">
              <Users className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Add Salary
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Daily Entry */}
          <TabsContent value="daily" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Daily Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Date</Label>
                    <Input
                      type="date"
                      value={dailyDate}
                      onChange={(e) => setDailyDate(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Shop</Label>
                    <Select value={dailyShop} onValueChange={setDailyShop}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Daily Expenses ₹</Label>
                    <Input
                      type="number"
                      value={expenseForm.dailyExp || ""}
                      onChange={(e) => setExpenseForm({ ...expenseForm, dailyExp: num(e.target.value) })}
                      placeholder="Daily costs"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Milk Expense ₹</Label>
                    <Input
                      type="number"
                      value={expenseForm.milkExp || ""}
                      onChange={(e) => setExpenseForm({ ...expenseForm, milkExp: num(e.target.value) })}
                      placeholder="Milk daily"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Big Expense Amount ₹</Label>
                    <Input
                      type="number"
                      value={expenseForm.bigExpAmount || ""}
                      onChange={(e) => setExpenseForm({ ...expenseForm, bigExpAmount: num(e.target.value) })}
                      placeholder="e.g. 5000"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Big Expense Name</Label>
                    <Input
                      value={expenseForm.bigExpName}
                      onChange={(e) => setExpenseForm({ ...expenseForm, bigExpName: e.target.value })}
                      placeholder="e.g. Gas Cylinder"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs font-bold uppercase text-slate-400">Comments</Label>
                    <Input
                      value={expenseForm.comments}
                      onChange={(e) => setExpenseForm({ ...expenseForm, comments: e.target.value })}
                      placeholder="Additional notes"
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase text-slate-400">Quick Buttons</Label>
                  <div className="flex flex-wrap gap-2">
                    {quickExpenses.map((name) => (
                      <Button
                        key={name}
                        variant="outline"
                        size="sm"
                        className="rounded-full font-bold text-xs"
                        onClick={() => setExpenseForm({ ...expenseForm, bigExpName: name })}
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full sm:w-auto h-14 px-10 rounded-2xl font-black bg-primary"
                  onClick={handleSaveExpense}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                  Save Expense
                </Button>

                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Today's Expense Summary ({dailyDate})
                  </h3>
                  {todayExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center bg-slate-50 rounded-2xl">
                      No expenses recorded for today.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {todayExpenses.map((e) => (
                        <Card key={e.id} className="rounded-2xl border-2 border-slate-100 bg-slate-50">
                          <CardContent className="p-4 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-black text-primary">{e.shop}</span>
                              <span className="text-lg font-black text-red-600">
                                ₹{formatInr(e.dailyExp + e.milkExp + e.bigExpAmount)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-0.5">
                              {e.dailyExp > 0 && <div>Daily: ₹{formatInr(e.dailyExp)}</div>}
                              {e.milkExp > 0 && <div>Milk: ₹{formatInr(e.milkExp)}</div>}
                              {e.bigExpAmount > 0 && (
                                <div className="font-bold text-slate-700">
                                  {e.bigExpName}: ₹{formatInr(e.bigExpAmount)}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Monthly View */}
          <TabsContent value="monthly">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="space-y-4">
                <CardTitle className="font-headline">Monthly View</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={viewMonth} onValueChange={setViewMonth}>
                    <SelectTrigger className="h-11 rounded-xl w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={viewShop} onValueChange={setViewShop}>
                    <SelectTrigger className="h-11 rounded-xl w-full sm:w-48">
                      <SelectValue placeholder="Shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-black text-xs">Date</TableHead>
                        <TableHead className="font-black text-xs">Daily Exp</TableHead>
                        <TableHead className="font-black text-xs">Milk Exp</TableHead>
                        <TableHead className="font-black text-xs">Big Exp Name</TableHead>
                        <TableHead className="font-black text-xs">Big Exp Amt</TableHead>
                        <TableHead className="font-black text-xs">Comments</TableHead>
                        <TableHead className="font-black text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.map(({ date, entry, total }) => {
                        const highlighted = entry?.bigExpName ? isHighlighted(entry.bigExpName) : false;
                        return (
                          <TableRow
                            key={date}
                            className={`${highlighted ? "bg-amber-50" : ""} ${entry ? "" : "text-slate-300"}`}
                          >
                            <TableCell className="font-bold text-xs">
                              {format(new Date(date + "T12:00:00"), "dd MMM")}
                            </TableCell>
                            <TableCell className="text-xs">
                              {entry?.dailyExp ? "₹" + formatInr(entry.dailyExp) : "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {entry?.milkExp ? "₹" + formatInr(entry.milkExp) : "—"}
                            </TableCell>
                            <TableCell className={`text-xs ${highlighted ? "font-black" : ""}`}>
                              {entry?.bigExpName || "—"}
                            </TableCell>
                            <TableCell className={`text-xs ${highlighted ? "font-black" : ""}`}>
                              {entry?.bigExpAmount ? "₹" + formatInr(entry.bigExpAmount) : "—"}
                            </TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">
                              {entry?.comments || "—"}
                            </TableCell>
                            <TableCell className="text-xs font-black text-right">
                              {total ? "₹" + formatInr(total) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-slate-100 font-black border-t-2">
                        <TableCell>TOTALS</TableCell>
                        <TableCell className="text-red-700">₹{formatInr(monthlyTotals.daily)}</TableCell>
                        <TableCell className="text-red-700">₹{formatInr(monthlyTotals.milk)}</TableCell>
                        <TableCell colSpan={2} className="text-red-700">
                          Big Exp: ₹{formatInr(monthlyTotals.big)}
                        </TableCell>
                        <TableCell className="text-right">GRAND TOTAL:</TableCell>
                        <TableCell className="text-right text-red-600 text-lg font-black">
                          ₹{formatInr(monthlyTotals.grand)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Both Shops Compare */}
          <TabsContent value="compare">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline">Both Shops Compare</CardTitle>
                <div className="pt-2">
                  <Select value={compareMonth} onValueChange={setCompareMonth}>
                    <SelectTrigger className="h-11 rounded-xl w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {compareData.map((data) => (
                    <div key={data.shop} className="space-y-4">
                      <h3 className="text-xl font-black text-primary text-center uppercase tracking-wider">
                        {data.shop}
                      </h3>
                      <div className="space-y-3 bg-slate-50 p-6 rounded-[2rem]">
                        <CompareRow label="Big Exp" amount={data.big} />
                        <CompareRow label="Daily Exp" amount={data.daily} />
                        <CompareRow label="Milk Exp" amount={data.milk} />
                        <div className="pt-4 border-t-2 border-slate-200 flex justify-between items-center">
                          <span className="font-black text-lg">TOTAL:</span>
                          <span className="font-black text-2xl text-red-600">₹{formatInr(data.total)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="font-black text-center text-slate-400 uppercase text-xs tracking-[0.2em]">
                    Expense Distribution
                  </h4>
                  {compareData.length >= 2 && (
                    <div className="space-y-6 max-w-2xl mx-auto">
                      <ProgressComparison
                        label="Overall Expenses"
                        data={compareData}
                        field="total"
                      />
                      <ProgressComparison
                        label="Milk Expenses"
                        data={compareData}
                        field="milk"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Add Salary */}
          <TabsContent value="salary">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="space-y-4">
                <CardTitle className="font-headline">Add Salary</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={salaryMonth} onValueChange={setSalaryMonth}>
                    <SelectTrigger className="h-11 rounded-xl w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-black text-xs">Name</TableHead>
                        <TableHead className="font-black text-xs">Salary</TableHead>
                        <TableHead className="font-black text-xs">Advance</TableHead>
                        <TableHead className="font-black text-xs">Paid</TableHead>
                        <TableHead className="font-black text-xs">Remaining</TableHead>
                        <TableHead className="font-black text-xs">Status</TableHead>
                        <TableHead className="font-black text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salaryPayments.map((p) => (
                        <TableRow key={p.staffId}>
                          <TableCell className="font-bold text-xs">
                            <div>{p.staffName}</div>
                            <div className="text-[10px] text-slate-400">{p.shop}</div>
                          </TableCell>
                          <TableCell className="text-xs">₹{formatInr(p.monthlySalary)}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={p.advance || ""}
                              onChange={(e) => handleUpdateSalary(p.staffId, "advance", e.target.value)}
                              className="h-8 w-20 text-xs rounded-md"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={p.paid || ""}
                              onChange={(e) => handleUpdateSalary(p.staffId, "paid", e.target.value)}
                              className="h-8 w-20 text-xs rounded-md"
                            />
                          </TableCell>
                          <TableCell className={`text-xs font-bold ${p.remaining > 0 ? "text-red-600" : "text-green-600"}`}>
                            ₹{formatInr(p.remaining)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                p.status === "Paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {p.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              className="h-8 rounded-lg font-bold text-xs"
                              onClick={() => handleSaveSalary(p)}
                            >
                              Mark Paid
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CompareRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-slate-500 font-bold">{label}:</span>
      <span className="font-black text-lg">₹{formatInr(amount)}</span>
    </div>
  );
}

function ProgressComparison({
  label,
  data,
  field,
}: {
  label: string;
  data: any[];
  field: string;
}) {
  const max = Math.max(...data.map((d) => d[field]), 1);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
        <span>{label}</span>
      </div>
      {data.map((d) => (
        <div key={d.shop} className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span>{d.shop}</span>
            <span>₹{formatInr(d[field])}</span>
          </div>
          <Progress value={(d[field] / max) * 100} className="h-2" />
        </div>
      ))}
    </div>
  );
}
