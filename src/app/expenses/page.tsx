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
  Users,
  Plus,
  ArrowRightLeft,
  Loader2,
  Trash2,
  Wallet,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { getShops, getSettingsStaff } from "@/lib/settings-catalog";
import type { ShopRecord, SettingsStaffRecord } from "@/lib/settings-catalog";
import { AccountingService } from "@/lib/services/accounting-service";
import type { 
  FinancialLedgerEntry, 
  ExpenseCategory, 
} from "@/lib/types";
import { formatInr, monthOptionsFromJan2025 } from "@/lib/hisaab-storage";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const quickExpenses = [
  { name: "Daily Costs", category: "daily_expenses" as ExpenseCategory },
  { name: "Milk Bill", category: "milk" as ExpenseCategory },
  { name: "Staff Salary", category: "salary" as ExpenseCategory },
  { name: "Shop Rent", category: "rent" as ExpenseCategory },
  { name: "Electricity", category: "utilities" as ExpenseCategory },
  { name: "Repair Work", category: "repairs" as ExpenseCategory },
];

export default function ExpensesPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [staff, setStaff] = useState<SettingsStaffRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("daily");

  // Tab 1: Daily Entry
  const [dailyDate, setDailyDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dailyShop, setDailyShop] = useState("");
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseName, setExpenseName] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("daily_expenses");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [comments, setComments] = useState("");
  const [todayLedger, setTodayLedger] = useState<FinancialLedgerEntry[]>([]);

  // Tab 2: Monthly View
  const [viewMonth, setViewMonth] = useState(format(new Date(), "yyyy-MM"));
  const [viewShop, setViewShop] = useState("");
  const [monthlyLedger, setMonthlyLedger] = useState<FinancialLedgerEntry[]>([]);

  // Tab 4: Salary
  const [salaryMonth, setSalaryMonth] = useState(format(new Date(), "yyyy-MM"));

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

  const loadDailyLedger = useCallback(async () => {
    if (!dailyShop || !dailyDate) return;
    const start = `${dailyDate}T00:00:00Z`;
    const end = `${dailyDate}T23:59:59Z`;
    const entries = await AccountingService.getBranchLedger(dailyShop, start, end);
    setTodayLedger(entries);
  }, [dailyShop, dailyDate]);

  useEffect(() => {
    loadDailyLedger();
  }, [loadDailyLedger]);

  const handleSaveExpense = async () => {
    if (!dailyShop || expenseAmount <= 0 || !expenseName) {
      toast({ variant: "destructive", title: "Incomplete details" });
      return;
    }
    setLoading(true);
    try {
      await AccountingService.recordTransaction({
        branchId: dailyShop,
        amount: expenseAmount,
        type: "outflow",
        category: expenseCategory,
        paymentMethod,
        description: expenseName + (comments ? ` (${comments})` : ""),
        userId: "admin",
      });
      loadDailyLedger();
      toast({ title: "Expense recorded", description: `${expenseName} — ₹${formatInr(expenseAmount)}` });
      // Reset
      setExpenseAmount(0);
      setExpenseName("");
      setComments("");
      setExpenseCategory("daily_expenses");
    } catch (err) {
      toast({ variant: "destructive", title: "Error saving expense" });
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyLedger = useCallback(async () => {
    if (!viewShop || !viewMonth) return;
    const start = `${viewMonth}-01T00:00:00Z`;
    const end = `${viewMonth}-31T23:59:59Z`;
    const entries = await AccountingService.getBranchLedger(viewShop, start, end);
    setMonthlyLedger(entries);
  }, [viewShop, viewMonth]);

  useEffect(() => {
    if (activeTab === "monthly") loadMonthlyLedger();
  }, [activeTab, loadMonthlyLedger]);

  const monthlyTotals = useMemo(() => {
    return monthlyLedger.reduce(
      (acc, entry) => {
        if (entry.category === "daily_expenses") acc.daily += entry.amount;
        else if (entry.category === "milk") acc.milk += entry.amount;
        else acc.big += entry.amount;
        acc.grand += entry.amount;
        return acc;
      },
      { daily: 0, milk: 0, big: 0, grand: 0 }
    );
  }, [monthlyLedger]);

  const handleSaveSalary = async (staffId: string, name: string, shop: string, amount: number) => {
    if (amount <= 0) return;
    setLoading(true);
    try {
      await AccountingService.recordTransaction({
        branchId: shop,
        amount,
        type: "outflow",
        category: "salary",
        paymentMethod: "cash",
        description: `Salary Payment: ${name} (${salaryMonth})`,
        userId: "admin",
        refId: staffId
      });
      toast({ title: "Salary Paid", description: `${name} — ₹${formatInr(amount)}` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error recording salary" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <header className="mb-6 md:mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl md:text-4xl font-black font-headline text-primary uppercase">
              Financial Ledger
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm font-medium">
              <TrendingDown className="w-4 h-4 text-red-500" /> Professional Expense Tracking
            </p>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-full justify-start">
            <TabsTrigger value="daily" className="rounded-lg font-bold text-xs sm:text-sm px-6">
              Daily Entry
            </TabsTrigger>
            <TabsTrigger value="monthly" className="rounded-lg font-bold text-xs sm:text-sm px-6">
              <Table2 className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Monthly View
            </TabsTrigger>
            <TabsTrigger value="salary" className="rounded-lg font-bold text-xs sm:text-sm px-6">
              <Users className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Staff Payroll
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Daily Entry */}
          <TabsContent value="daily" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Record Transaction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">Transaction Date</Label>
                    <Input
                      type="date"
                      value={dailyDate}
                      onChange={(e) => setDailyDate(e.target.value)}
                      className="h-12 rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">Shop / Branch</Label>
                    <Select value={dailyShop} onValueChange={setDailyShop}>
                      <SelectTrigger className="h-12 rounded-xl font-bold border-slate-200">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">Expense Name</Label>
                    <Input
                      value={expenseName}
                      onChange={(e) => setExpenseName(e.target.value)}
                      placeholder="e.g. Gas Cylinder"
                      className="h-12 rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">Amount ₹</Label>
                    <Input
                      type="number"
                      value={expenseAmount || ""}
                      onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-12 rounded-xl font-black text-red-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                      <SelectTrigger className="h-12 rounded-xl font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Outflow</SelectItem>
                        <SelectItem value="online">Online Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">Category</Label>
                    <Select value={expenseCategory} onValueChange={(v: any) => setExpenseCategory(v)}>
                      <SelectTrigger className="h-12 rounded-xl font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily_expenses">Daily Small Costs</SelectItem>
                        <SelectItem value="milk">Milk Purchase</SelectItem>
                        <SelectItem value="salary">Staff Salary</SelectItem>
                        <SelectItem value="rent">Shop Rent</SelectItem>
                        <SelectItem value="utilities">Utilities (Elec/Gas)</SelectItem>
                        <SelectItem value="stock_purchase">Stock/Raw Materials</SelectItem>
                        <SelectItem value="repairs">Repairs & Maint</SelectItem>
                        <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs font-black uppercase text-slate-400">Notes / Comments</Label>
                    <Input
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Additional details (optional)"
                      className="h-12 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-black uppercase text-slate-400">Quick Selection</Label>
                  <div className="flex flex-wrap gap-2">
                    {quickExpenses.map((btn) => (
                      <Button
                        key={btn.name}
                        variant="outline"
                        size="sm"
                        className="rounded-full font-bold text-xs h-9 hover:bg-primary hover:text-white transition-all"
                        onClick={() => {
                          setExpenseName(btn.name);
                          setExpenseCategory(btn.category);
                        }}
                      >
                        {btn.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full sm:w-auto h-14 px-12 rounded-2xl font-black bg-primary shadow-lg shadow-primary/20"
                  onClick={handleSaveExpense}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                  Confirm Expense Entry
                </Button>

                <div className="space-y-4 pt-8 border-t">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    Ledger for {dailyDate}
                  </h3>
                  {todayLedger.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-10 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed">
                      No transactions recorded for this day.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {todayLedger.map((e) => (
                        <Card key={e.id} className="rounded-2xl border-none bg-slate-50 shadow-sm overflow-hidden border-l-4 border-red-500">
                          <CardContent className="p-5 flex justify-between items-center">
                            <div className="space-y-1">
                              <p className="font-black text-slate-800">{e.description}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{e.category}</Badge>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{e.paymentMethod}</span>
                              </div>
                            </div>
                            <p className="text-xl font-black text-red-600">₹{formatInr(e.amount)}</p>
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
          <TabsContent value="monthly" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="space-y-4 bg-slate-50/50 border-b py-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
                   <CardTitle className="font-headline text-2xl">Monthly Ledger View</CardTitle>
                   <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Select value={viewMonth} onValueChange={setViewMonth}>
                      <SelectTrigger className="h-11 rounded-xl w-full sm:w-44 font-bold">
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
                      <SelectTrigger className="h-11 rounded-xl w-full sm:w-44 font-bold border-slate-200">
                        <SelectValue placeholder="Branch" />
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
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-black text-xs pl-8">Date</TableHead>
                        <TableHead className="font-black text-xs">Description</TableHead>
                        <TableHead className="font-black text-xs">Category</TableHead>
                        <TableHead className="font-black text-xs">Method</TableHead>
                        <TableHead className="font-black text-xs text-right pr-8">Amount ₹</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyLedger.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-20 text-center text-slate-400 italic font-medium">No transactions found for this selection.</TableCell>
                        </TableRow>
                      ) : (
                        monthlyLedger.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-bold text-xs pl-8">
                              {format(new Date(entry.timestamp), "dd MMM")}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-slate-700">
                              {entry.description}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[9px] font-black uppercase">{entry.category}</Badge>
                            </TableCell>
                            <TableCell className="text-[10px] font-black uppercase text-slate-400">
                              {entry.paymentMethod}
                            </TableCell>
                            <TableCell className="text-right font-black text-red-600 pr-8">
                              ₹{formatInr(entry.amount)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {monthlyLedger.length > 0 && (
                        <TableRow className="bg-slate-100 font-black border-t-2">
                          <TableCell colSpan={2} className="pl-8 uppercase tracking-widest text-xs">Monthly Outflow Totals</TableCell>
                          <TableCell className="text-red-700">Daily: ₹{formatInr(monthlyTotals.daily)}</TableCell>
                          <TableCell className="text-red-700">Milk: ₹{formatInr(monthlyTotals.milk)}</TableCell>
                          <TableCell className="text-right text-red-600 text-lg font-black pr-8">
                            GRAND TOTAL: ₹{formatInr(monthlyTotals.grand)}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Staff Payroll */}
          <TabsContent value="salary" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="flex flex-row justify-between items-center bg-slate-50/50 py-6 border-b">
                <CardTitle className="font-headline text-xl">Staff Payroll Management</CardTitle>
                <Select value={salaryMonth} onValueChange={setSalaryMonth}>
                  <SelectTrigger className="h-11 rounded-xl w-44 font-bold border-slate-200">
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
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-black text-xs pl-8">Name</TableHead>
                        <TableHead className="font-black text-xs">Shop</TableHead>
                        <TableHead className="font-black text-xs">Standard Salary</TableHead>
                        <TableHead className="font-black text-xs text-right pr-8">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-bold text-sm pl-8">{p.name}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-400 uppercase tracking-widest">{p.shop}</TableCell>
                          <TableCell className="font-black">₹{formatInr(p.monthlySalary)}</TableCell>
                          <TableCell className="text-right pr-8">
                            <Button
                              size="sm"
                              className="rounded-xl font-black text-xs px-6 h-9 bg-primary shadow-sm hover:scale-105 transition-transform"
                              onClick={() => {
                                const amt = prompt(`Enter salary amount to pay ${p.name}:`, p.monthlySalary.toString());
                                if (amt) handleSaveSalary(p.id, p.name, p.shop, parseFloat(amt));
                              }}
                              disabled={loading}
                            >
                              <Plus className="w-4 h-4 mr-1" /> Record Payment
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
