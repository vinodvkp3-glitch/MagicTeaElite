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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calculator,
  Save,
  CalendarDays,
  Table2,
  PieChart,
  Wallet,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getShops, ensureSettingsDefaults, getFixedExpenseForShop } from "@/lib/settings-catalog";
import type { ShopRecord } from "@/lib/settings-catalog";
import type { SalaryRecord, StockPurchase } from "@/lib/types";
import { DB } from "@/lib/storage";
import {
  upsertHisaabEntry,
  getHisaabEntry,
  getHisaabMonth,
  getEntriesForDate,
  computeHisaabTotals,
  entryDayExpenses,
  formatInr,
  monthOptionsFromJan2025,
  daysInMonth,
  type HisaabEntry,
  type HisaabFormInput,
} from "@/lib/hisaab-storage";

const emptyForm = (): HisaabFormInput & { id?: string } => ({
  id: undefined,
  date: format(new Date(), "yyyy-MM-dd"),
  shop: "",
  cash: 0,
  onlineIdfc: 0,
  onlinePaytm: 0,
  expenses: 0,
  milkExp: 0,
  bigExpName: "",
  bigExpAmount: 0,
  remarks: "",
});

function num(v: string | number): number {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

export default function HisabPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  const [form, setForm] = useState(emptyForm());
  const [todayCards, setTodayCards] = useState<HisaabEntry[]>([]);

  const monthOptions = useMemo(() => monthOptionsFromJan2025(), []);
  const [tableMonth, setTableMonth] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [tableShop, setTableShop] = useState("");
  const [editEntry, setEditEntry] = useState<HisaabEntry | null>(null);
  const [editForm, setEditForm] = useState<HisaabFormInput & { id?: string }>(
    emptyForm()
  );

  const [summaryMonth, setSummaryMonth] = useState(format(new Date(), "yyyy-MM"));
  const [summaryShop, setSummaryShop] = useState("");

  const totals = useMemo(
    () =>
      computeHisaabTotals({
        cash: num(form.cash),
        onlineIdfc: num(form.onlineIdfc),
        onlinePaytm: num(form.onlinePaytm),
      }),
    [form.cash, form.onlineIdfc, form.onlinePaytm]
  );

  const editTotals = useMemo(
    () =>
      computeHisaabTotals({
        cash: num(editForm.cash),
        onlineIdfc: num(editForm.onlineIdfc),
        onlinePaytm: num(editForm.onlinePaytm),
      }),
    [editForm.cash, editForm.onlineIdfc, editForm.onlinePaytm]
  );

  const refreshShops = useCallback(() => {
    ensureSettingsDefaults();
    const list = getShops();
    setShops(list);
    const first = list[0]?.name ?? "";
    setForm((f) => ({ ...f, shop: f.shop || first }));
    setTableShop((s) => s || first);
    setSummaryShop((s) => s || first);
    return list;
  }, []);

  const refreshTodayCards = useCallback((date: string) => {
    setTodayCards(getEntriesForDate(date));
  }, []);

  const loadFormForDateShop = useCallback(
    (date: string, shop: string) => {
      const existing = getHisaabEntry(shop, date);
      if (existing) {
        setForm({
          id: existing.id,
          date: existing.date,
          shop: existing.shop,
          cash: existing.cash,
          onlineIdfc: existing.onlineIdfc,
          onlinePaytm: existing.onlinePaytm,
          expenses: existing.expenses,
          milkExp: existing.milkExp,
          bigExpName: existing.bigExpName,
          bigExpAmount: existing.bigExpAmount,
          remarks: existing.remarks,
        });
      } else {
        setForm({
          ...emptyForm(),
          date,
          shop,
        });
      }
    },
    []
  );

  useEffect(() => {
    const list = refreshShops();
    const today = format(new Date(), "yyyy-MM-dd");
    const shop = list[0]?.name ?? "";
    loadFormForDateShop(today, shop);
    refreshTodayCards(today);
  }, [refreshShops, loadFormForDateShop, refreshTodayCards]);

  useEffect(() => {
    if (form.shop && form.date) {
      loadFormForDateShop(form.date, form.shop);
    }
  }, [form.date, form.shop, loadFormForDateShop]);

  const handleSave = () => {
    if (!form.shop) {
      toast({ variant: "destructive", title: "Select a shop" });
      return;
    }
    setLoading(true);
    try {
      const saved = upsertHisaabEntry({
        ...form,
        cash: num(form.cash),
        onlineIdfc: num(form.onlineIdfc),
        onlinePaytm: num(form.onlinePaytm),
        expenses: num(form.expenses),
        milkExp: num(form.milkExp),
        bigExpAmount: num(form.bigExpAmount),
      });
      refreshTodayCards(form.date);
      toast({
        title: form.id ? "Hisab updated" : "Hisab saved",
        description: `${saved.shop} — ${saved.date} · ₹${formatInr(saved.total)} revenue`,
      });
      if (!form.id) {
        setForm((f) => ({ ...f, id: saved.id }));
      }
    } finally {
      setLoading(false);
    }
  };

  const monthEntries = useMemo(() => {
    if (!tableShop) return [];
    return getHisaabMonth(tableShop, tableMonth);
  }, [tableShop, tableMonth, activeTab]);

  const tableRows = useMemo(() => {
    return daysInMonth(tableMonth).map((date) => {
      const entry = monthEntries.find((e) => e.date === date);
      return { date, entry };
    });
  }, [tableMonth, monthEntries]);

  const tableTotals = useMemo(() => {
    return monthEntries.reduce(
      (acc, e) => {
        acc.cash += e.cash;
        acc.idfc += e.onlineIdfc;
        acc.paytm += e.onlinePaytm;
        acc.total += e.total;
        acc.dailyExp += e.expenses;
        acc.milkExp += e.milkExp;
        acc.bigExp += e.bigExpAmount;
        return acc;
      },
      {
        cash: 0,
        idfc: 0,
        paytm: 0,
        total: 0,
        dailyExp: 0,
        milkExp: 0,
        bigExp: 0,
      }
    );
  }, [monthEntries]);

  const openEditDialog = (entry: HisaabEntry) => {
    setEditEntry(entry);
    setEditForm({
      id: entry.id,
      date: entry.date,
      shop: entry.shop,
      cash: entry.cash,
      onlineIdfc: entry.onlineIdfc,
      onlinePaytm: entry.onlinePaytm,
      expenses: entry.expenses,
      milkExp: entry.milkExp,
      bigExpName: entry.bigExpName,
      bigExpAmount: entry.bigExpAmount,
      remarks: entry.remarks,
    });
  };

  const saveEditDialog = () => {
    if (!editEntry) return;
    upsertHisaabEntry({
      ...editForm,
      cash: num(editForm.cash),
      onlineIdfc: num(editForm.onlineIdfc),
      onlinePaytm: num(editForm.onlinePaytm),
      expenses: num(editForm.expenses),
      milkExp: num(editForm.milkExp),
      bigExpAmount: num(editForm.bigExpAmount),
    });
    toast({ title: "Entry updated", description: editForm.date });
    setEditEntry(null);
    refreshTodayCards(form.date);
  };

  const monthlySummary = useMemo(() => {
    if (!summaryShop) return null;
    const entries = getHisaabMonth(summaryShop, summaryMonth);
    const revenue = entries.reduce(
      (a, e) => ({
        cash: a.cash + e.cash,
        idfc: a.idfc + e.onlineIdfc,
        paytm: a.paytm + e.onlinePaytm,
        total: a.total + e.total,
      }),
      { cash: 0, idfc: 0, paytm: 0, total: 0 }
    );
    const dailyExp = entries.reduce((s, e) => s + e.expenses, 0);
    const milkExp = entries.reduce((s, e) => s + e.milkExp, 0);
    const bigExp = entries.reduce((s, e) => s + e.bigExpAmount, 0);

    const salaryRecords =
      (DB.get("salary_records") as SalaryRecord[] | null) ?? [];
    const staffSalary = salaryRecords
      .filter((r) => r.shop === summaryShop && r.month === summaryMonth)
      .reduce((s, r) => s + (r.paid || r.salary || 0), 0);

    const fixed = getFixedExpenseForShop(summaryShop);
    const shopRent = fixed?.shopRent ?? 0;

    const allExpenses =
      (DB.get("expenses") as { date: string; category: string; amount: number; notes?: string }[] | null) ?? [];
    const electricity = allExpenses
      .filter(
        (e) =>
          e.category === "electricity" &&
          e.date.startsWith(summaryMonth) &&
          (e.notes?.includes(summaryShop) ?? true)
      )
      .reduce((s, e) => s + e.amount, 0);

    const stockPurchases =
      (DB.get("stock_purchases") as StockPurchase[] | null) ?? [];
    const stockCost = stockPurchases
      .filter(
        (p) => p.shop === summaryShop && p.date.startsWith(summaryMonth)
      )
      .reduce((s, p) => s + (p.grandTotal || 0), 0);

    const totalCosts =
      dailyExp + milkExp + bigExp + staffSalary + shopRent + electricity + stockCost;
    const netProfit = revenue.total - totalCosts;

    return {
      revenue,
      dailyExp,
      milkExp,
      bigExp,
      staffSalary,
      shopRent,
      electricity,
      stockCost,
      totalCosts,
      netProfit,
    };
  }, [summaryShop, summaryMonth, activeTab]);

  const paisaAbhi = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const ym = today.slice(0, 7);
    return shops.map((shop) => {
      const entry = getHisaabMonth(shop.name, ym).find((e) => e.date === today);
      const cash = entry?.cash ?? 0;
      const online = entry?.totalOnline ?? 0;
      const expenses = entry ? entryDayExpenses(entry) : 0;
      const revenue = entry?.total ?? 0;
      const net = revenue - expenses;
      return { shop: shop.name, cash, online, expenses, revenue, net };
    });
  }, [shops, activeTab]);

  const combinedToday = useMemo(() => {
    const revenue = paisaAbhi.reduce((s, p) => s + p.revenue, 0);
    const expenses = paisaAbhi.reduce((s, p) => s + p.expenses, 0);
    return { revenue, expenses, net: revenue - expenses };
  }, [paisaAbhi]);

  const isUpdate = Boolean(form.id);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black font-headline text-primary">
            Daily Hisab
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
            <Calculator className="w-4 h-4" />
            NAVLAKHA & NOVELTY — revenue, expenses & profit
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-full justify-start">
            <TabsTrigger value="today" className="rounded-lg font-bold text-xs sm:text-sm">
              Aaj ka Hisaab
            </TabsTrigger>
            <TabsTrigger value="table" className="rounded-lg font-bold text-xs sm:text-sm">
              <Table2 className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Monthly Table
            </TabsTrigger>
            <TabsTrigger value="summary" className="rounded-lg font-bold text-xs sm:text-sm">
              <PieChart className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Monthly Summary
            </TabsTrigger>
            <TabsTrigger value="paisa" className="rounded-lg font-bold text-xs sm:text-sm">
              <Wallet className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Paisa Abhi
            </TabsTrigger>
          </TabsList>

          {/* TAB 1 */}
          <TabsContent value="today" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline text-xl md:text-2xl">
                  Aaj ka Hisaab
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">
                      Date
                    </Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => {
                        setForm({ ...form, date: e.target.value });
                        refreshTodayCards(e.target.value);
                      }}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">
                      Shop
                    </Label>
                    <Select
                      value={form.shop}
                      onValueChange={(v) => setForm({ ...form, shop: v })}
                    >
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
                  <Field
                    label="Cash Sales ₹"
                    value={form.cash}
                    onChange={(v) => setForm({ ...form, cash: v })}
                  />
                  <Field
                    label="Online - IDFC ₹"
                    value={form.onlineIdfc}
                    onChange={(v) => setForm({ ...form, onlineIdfc: v })}
                  />
                  <Field
                    label="Online - Paytm ₹"
                    value={form.onlinePaytm}
                    onChange={(v) => setForm({ ...form, onlinePaytm: v })}
                  />
                  <ReadOnlyField
                    label="Total Online ₹"
                    value={totals.totalOnline}
                  />
                  <ReadOnlyField
                    label="Total Revenue ₹"
                    value={totals.total}
                    highlight
                  />
                  <Field
                    label="Daily Expenses ₹"
                    value={form.expenses}
                    onChange={(v) => setForm({ ...form, expenses: v })}
                  />
                  <Field
                    label="Milk Expense ₹"
                    value={form.milkExp}
                    onChange={(v) => setForm({ ...form, milkExp: v })}
                  />
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">
                      Big Expense Name
                    </Label>
                    <Input
                      value={form.bigExpName}
                      onChange={(e) =>
                        setForm({ ...form, bigExpName: e.target.value })
                      }
                      placeholder="Optional"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <Field
                    label="Big Expense Amount ₹"
                    value={form.bigExpAmount}
                    onChange={(v) => setForm({ ...form, bigExpAmount: v })}
                  />
                  <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                    <Label className="text-xs font-bold uppercase text-slate-400">
                      Remarks
                    </Label>
                    <Input
                      value={form.remarks}
                      onChange={(e) =>
                        setForm({ ...form, remarks: e.target.value })
                      }
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  className="w-full sm:w-auto h-14 px-10 rounded-2xl font-black bg-primary"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  {isUpdate ? "Update Hisab" : "Save Hisab"}
                </Button>

                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Entries on {format(new Date(form.date + "T12:00:00"), "dd MMM yyyy")}
                  </h3>
                  {todayCards.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center bg-slate-50 rounded-2xl">
                      No entries saved for this date yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {todayCards.map((e) => (
                        <Card
                          key={e.id}
                          className="rounded-2xl border-2 border-slate-100 hover:border-primary/20 cursor-pointer transition-colors"
                          onClick={() => {
                            setForm({
                              id: e.id,
                              date: e.date,
                              shop: e.shop,
                              cash: e.cash,
                              onlineIdfc: e.onlineIdfc,
                              onlinePaytm: e.onlinePaytm,
                              expenses: e.expenses,
                              milkExp: e.milkExp,
                              bigExpName: e.bigExpName,
                              bigExpAmount: e.bigExpAmount,
                              remarks: e.remarks,
                            });
                          }}
                        >
                          <CardContent className="p-5 space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="font-black text-primary">{e.shop}</span>
                              <span className="text-xs text-slate-400">{e.date}</span>
                            </div>
                            <p className="text-lg font-black text-green-700">
                              ₹{formatInr(e.total)} revenue
                            </p>
                            <p className="text-sm text-red-600 font-bold">
                              − ₹{formatInr(entryDayExpenses(e))} expenses
                            </p>
                            {e.remarks && (
                              <p className="text-xs text-slate-500 italic">{e.remarks}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2 */}
          <TabsContent value="table">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="space-y-4">
                <CardTitle className="font-headline">Monthly Table</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={tableMonth} onValueChange={setTableMonth}>
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
                  <Select value={tableShop} onValueChange={setTableShop}>
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
                        <TableHead className="font-black text-xs text-green-700">Cash</TableHead>
                        <TableHead className="font-black text-xs text-green-700">IDFC</TableHead>
                        <TableHead className="font-black text-xs text-green-700">Paytm</TableHead>
                        <TableHead className="font-black text-xs text-green-700">Total</TableHead>
                        <TableHead className="font-black text-xs text-red-600">Daily Exp</TableHead>
                        <TableHead className="font-black text-xs text-red-600">Milk</TableHead>
                        <TableHead className="font-black text-xs text-red-600">Big Exp</TableHead>
                        <TableHead className="font-black text-xs">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableRows.map(({ date, entry }) => (
                        <TableRow
                          key={date}
                          className={
                            entry
                              ? "cursor-pointer hover:bg-primary/5"
                              : "text-slate-300"
                          }
                          onClick={() => entry && openEditDialog(entry)}
                        >
                          <TableCell className="font-bold text-xs whitespace-nowrap">
                            {format(new Date(date + "T12:00:00"), "dd MMM")}
                          </TableCell>
                          <TableCell className="text-green-700 font-bold text-xs">
                            {entry ? formatInr(entry.cash) : "—"}
                          </TableCell>
                          <TableCell className="text-green-700 font-bold text-xs">
                            {entry ? formatInr(entry.onlineIdfc) : "—"}
                          </TableCell>
                          <TableCell className="text-green-700 font-bold text-xs">
                            {entry ? formatInr(entry.onlinePaytm) : "—"}
                          </TableCell>
                          <TableCell className="text-green-800 font-black text-xs">
                            {entry ? formatInr(entry.total) : "—"}
                          </TableCell>
                          <TableCell className="text-red-600 font-bold text-xs">
                            {entry ? formatInr(entry.expenses) : "—"}
                          </TableCell>
                          <TableCell className="text-red-600 font-bold text-xs">
                            {entry ? formatInr(entry.milkExp) : "—"}
                          </TableCell>
                          <TableCell className="text-red-600 font-bold text-xs">
                            {entry ? formatInr(entry.bigExpAmount) : "—"}
                          </TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">
                            {entry?.remarks || entry?.bigExpName || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-primary/10 font-black border-t-2 border-primary/20">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-green-800">
                          {formatInr(tableTotals.cash)}
                        </TableCell>
                        <TableCell className="text-green-800">
                          {formatInr(tableTotals.idfc)}
                        </TableCell>
                        <TableCell className="text-green-800">
                          {formatInr(tableTotals.paytm)}
                        </TableCell>
                        <TableCell className="text-green-900">
                          {formatInr(tableTotals.total)}
                        </TableCell>
                        <TableCell className="text-red-700">
                          {formatInr(tableTotals.dailyExp)}
                        </TableCell>
                        <TableCell className="text-red-700">
                          {formatInr(tableTotals.milkExp)}
                        </TableCell>
                        <TableCell className="text-red-700">
                          {formatInr(tableTotals.bigExp)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3 */}
          <TabsContent value="summary">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline">Monthly Summary</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Select value={summaryMonth} onValueChange={setSummaryMonth}>
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
                  <Select value={summaryShop} onValueChange={setSummaryShop}>
                    <SelectTrigger className="h-11 rounded-xl w-full sm:w-48">
                      <SelectValue />
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
              <CardContent>
                {monthlySummary ? (
                  <div className="max-w-md mx-auto space-y-4 text-sm">
                    <SummaryBlock title="Total Revenue" amount={monthlySummary.revenue.total} positive>
                      <SummaryLine label="Cash" amount={monthlySummary.revenue.cash} indent />
                      <SummaryLine label="IDFC" amount={monthlySummary.revenue.idfc} indent />
                      <SummaryLine label="Paytm" amount={monthlySummary.revenue.paytm} indent />
                    </SummaryBlock>
                    <hr className="border-slate-200" />
                    <SummaryLine label="Daily Expenses" amount={monthlySummary.dailyExp} negative />
                    <SummaryLine label="Milk Expenses" amount={monthlySummary.milkExp} negative />
                    <SummaryLine label="Big Expenses" amount={monthlySummary.bigExp} negative />
                    <SummaryLine label="Staff Salary" amount={monthlySummary.staffSalary} negative />
                    <SummaryLine label="Shop Rent" amount={monthlySummary.shopRent} negative />
                    <SummaryLine label="Electricity" amount={monthlySummary.electricity} negative />
                    <SummaryLine label="Stock Cost" amount={monthlySummary.stockCost} negative />
                    <hr className="border-slate-200" />
                    <Card
                      className={`rounded-2xl border-2 ${
                        monthlySummary.netProfit >= 0
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <CardContent className="p-6 text-center">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
                          Net Profit
                        </p>
                        <p
                          className={`text-3xl font-black ${
                            monthlySummary.netProfit >= 0
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          ₹{formatInr(monthlySummary.netProfit)}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {summaryShop} · {summaryMonth}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    Select a shop to view summary.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4 */}
          <TabsContent value="paisa">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paisaAbhi.map((row) => (
                  <Card
                    key={row.shop}
                    className="border-none shadow-xl rounded-[2rem] bg-white"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="font-headline text-primary">
                        {row.shop}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <Row label="Cash" value={row.cash} />
                      <Row label="Online (IDFC + Paytm)" value={row.online} />
                      <Row label="Expenses today" value={row.expenses} negative />
                      <div className="pt-2 border-t flex justify-between font-black">
                        <span>Net today</span>
                        <span
                          className={
                            row.net >= 0 ? "text-green-700" : "text-red-600"
                          }
                        >
                          ₹{formatInr(row.net)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-primary text-white">
                <CardContent className="p-8 md:p-12 text-center">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-white/80 mb-2">
                    Dono shops mila ke
                  </p>
                  <p className="text-4xl md:text-5xl font-black">
                    ₹ {formatInr(combinedToday.net)}
                  </p>
                  <p className="text-white/70 text-sm mt-4">
                    Revenue ₹{formatInr(combinedToday.revenue)} − Expenses ₹
                    {formatInr(combinedToday.expenses)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editEntry} onOpenChange={(o) => !o && setEditEntry(null)}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline">Edit Entry</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              <Field
                label="Cash ₹"
                value={editForm.cash}
                onChange={(v) => setEditForm({ ...editForm, cash: v })}
              />
              <Field
                label="IDFC ₹"
                value={editForm.onlineIdfc}
                onChange={(v) => setEditForm({ ...editForm, onlineIdfc: v })}
              />
              <Field
                label="Paytm ₹"
                value={editForm.onlinePaytm}
                onChange={(v) => setEditForm({ ...editForm, onlinePaytm: v })}
              />
              <ReadOnlyField label="Total Online" value={editTotals.totalOnline} />
              <ReadOnlyField label="Total Revenue" value={editTotals.total} highlight />
              <Field
                label="Daily Exp ₹"
                value={editForm.expenses}
                onChange={(v) => setEditForm({ ...editForm, expenses: v })}
              />
              <Field
                label="Milk Exp ₹"
                value={editForm.milkExp}
                onChange={(v) => setEditForm({ ...editForm, milkExp: v })}
              />
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-bold uppercase">Big Exp Name</Label>
                <Input
                  value={editForm.bigExpName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, bigExpName: e.target.value })
                  }
                  className="h-10 rounded-xl"
                />
              </div>
              <Field
                label="Big Exp ₹"
                value={editForm.bigExpAmount}
                onChange={(v) => setEditForm({ ...editForm, bigExpAmount: v })}
              />
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-bold uppercase">Remarks</Label>
                <Input
                  value={editForm.remarks}
                  onChange={(e) =>
                    setEditForm({ ...editForm, remarks: e.target.value })
                  }
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditEntry(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-primary font-bold" onClick={saveEditDialog}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase text-slate-400">{label}</Label>
      <Input
        type="number"
        step="0.01"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(num(e.target.value))}
        className="h-12 rounded-xl font-bold"
      />
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase text-slate-400">{label}</Label>
      <div
        className={`h-12 rounded-xl flex items-center px-4 font-black ${
          highlight ? "bg-green-50 text-green-800 border border-green-200" : "bg-slate-100 text-slate-700"
        }`}
      >
        ₹{formatInr(value)}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  negative,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${negative ? "text-red-600" : ""}`}>
        ₹{formatInr(value)}
      </span>
    </div>
  );
}

function SummaryBlock({
  title,
  amount,
  positive,
  children,
}: {
  title: string;
  amount: number;
  positive?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex justify-between font-black text-base mb-2">
        <span>{title}</span>
        <span className={positive ? "text-green-700" : ""}>₹{formatInr(amount)}</span>
      </div>
      {children}
    </div>
  );
}

function SummaryLine({
  label,
  amount,
  indent,
  negative,
}: {
  label: string;
  amount: number;
  indent?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-1 ${indent ? "pl-4 text-slate-500" : ""} ${
        negative ? "text-red-600 font-bold" : ""
      }`}
    >
      <span>{indent ? `↳ ${label}` : label}</span>
      <span>₹{formatInr(amount)}</span>
    </div>
  );
}
