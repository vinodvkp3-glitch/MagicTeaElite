"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  History,
  Download,
  BarChart3,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format, startOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { DB } from "@/lib/storage";
import { getHisaabMonth, formatInr, monthOptionsFromJan2025 } from "@/lib/hisaab-storage";
import { getExpensesMonth } from "@/lib/expense-storage";
import { getStockPurchases } from "@/lib/inventory-storage";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("pnl");
  const [pnlMonth, setPnlMonth] = useState(format(new Date(), "yyyy-MM"));
  const [historyMonth, setHistoryMonth] = useState(format(new Date(), "yyyy-MM"));
  const [historyShop, setHistoryShop] = useState("NAVLAKHA");
  const [yearlyYear, setYearlyYear] = useState(new Date().getFullYear().toString());

  const monthOptions = useMemo(() => monthOptionsFromJan2025(), []);

  // TAB 1: Monthly P&L
  const pnlData = useMemo(() => {
    const shops = ["NAVLAKHA", "NOVELTY"];
    return shops.map((shop) => {
      const hisaab = getHisaabMonth(shop, pnlMonth);
      const revenue = hisaab.reduce((sum, e) => sum + e.total, 0);
      
      const purchases = getStockPurchases(shop, pnlMonth);
      const stockCost = purchases.reduce((sum, p) => sum + p.grandTotal, 0);
      
      const expEntries = getExpensesMonth(shop, pnlMonth);
      const dailyExp = expEntries.reduce((sum, e) => sum + e.dailyExp, 0);
      const milkExp = expEntries.reduce((sum, e) => sum + e.milkExp, 0);
      
      // Categorize big expenses
      let bigExp = 0, salary = 0, rent = 0, electricity = 0;
      expEntries.forEach(e => {
        const name = e.bigExpName.toLowerCase();
        if (name.includes("salary")) salary += e.bigExpAmount;
        else if (name.includes("rent")) rent += e.bigExpAmount;
        else if (name.includes("electricity")) electricity += e.bigExpAmount;
        else bigExp += e.bigExpAmount;
      });

      const totalExp = stockCost + dailyExp + milkExp + bigExp + salary + rent + electricity;
      const net = revenue - totalExp;

      return {
        shop,
        revenue,
        stockCost,
        dailyExp,
        milkExp,
        bigExp,
        salary,
        rent,
        electricity,
        net,
      };
    });
  }, [pnlMonth]);

  const combinedNet = useMemo(() => pnlData.reduce((sum, s) => sum + s.net, 0), [pnlData]);

  // TAB 2: Month History
  const historyData = useMemo(() => {
    const hisaab = getHisaabMonth(historyShop, historyMonth);
    const start = startOfMonth(new Date(historyMonth + "-01"));
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });

    const table = days.map(d => {
      const dateStr = format(d, "yyyy-MM-dd");
      const entry = hisaab.find(e => e.date === dateStr);
      return {
        date: dateStr,
        revenue: entry?.total || 0,
        expenses: entry ? (entry.expenses || 0) + (entry.milkExp || 0) + (entry.bigExpAmount || 0) : 0,
        net: entry ? entry.total - ((entry.expenses || 0) + (entry.milkExp || 0) + (entry.bigExpAmount || 0)) : 0
      };
    });

    const totalRev = table.reduce((sum, d) => sum + d.revenue, 0);
    const totalExp = table.reduce((sum, d) => sum + d.expenses, 0);
    const topDay = [...table].sort((a, b) => b.revenue - a.revenue)[0];

    return { table, totalRev, totalExp, topDay };
  }, [historyMonth, historyShop]);

  // TAB 3: Yearly View
  const yearlyData = useMemo(() => {
    const year = parseInt(yearlyYear);
    const months = eachMonthOfInterval({
      start: startOfYear(new Date(year, 0, 1)),
      end: new Date(year, 11, 31)
    });

    const shops = ["NAVLAKHA", "NOVELTY"];
    const data = months.map(m => {
      const ym = format(m, "yyyy-MM");
      let revenue = 0;
      let expenses = 0;

      shops.forEach(shop => {
        const hisaab = getHisaabMonth(shop, ym);
        revenue += hisaab.reduce((sum, e) => sum + e.total, 0);
        
        const expEntries = getExpensesMonth(shop, ym);
        expenses += expEntries.reduce((sum, e) => sum + e.dailyExp + e.milkExp + e.bigExpAmount, 0);
      });

      return {
        month: format(m, "MMM"),
        revenue,
        expenses,
        net: revenue - expenses
      };
    });

    const bestMonth = [...data].sort((a, b) => b.net - a.net)[0];
    const worstMonth = [...data].sort((a, b) => a.net - b.net)[0];
    const annualTotal = data.reduce((acc, curr) => {
      acc.revenue += curr.revenue;
      acc.expenses += curr.expenses;
      acc.net += curr.net;
      return acc;
    }, { revenue: 0, expenses: 0, net: 0 });

    return { data, bestMonth, worstMonth, annualTotal };
  }, [yearlyYear]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-4xl font-black font-headline text-primary uppercase tracking-tight">Financial Reports</h1>
            <p className="text-muted-foreground font-medium">Analyze profits, growth and expenses</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl font-bold h-11 bg-white">
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-full justify-start">
            <TabsTrigger value="pnl" className="rounded-lg font-bold text-xs sm:text-sm px-6">Monthly P&L</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg font-bold text-xs sm:text-sm px-6">Month History</TabsTrigger>
            <TabsTrigger value="yearly" className="rounded-lg font-bold text-xs sm:text-sm px-6">Yearly View</TabsTrigger>
          </TabsList>

          {/* TAB 1: Monthly P&L */}
          <TabsContent value="pnl" className="space-y-8">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="flex flex-row justify-between items-center bg-slate-50/50 border-b">
                <CardTitle className="font-headline text-xl">Profit & Loss Comparison</CardTitle>
                <Select value={pnlMonth} onValueChange={setPnlMonth}>
                  <SelectTrigger className="h-10 rounded-xl w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 border-b">
                        <TableHead className="w-48"></TableHead>
                        {pnlData.map(s => (
                          <TableHead key={s.shop} className="text-center font-black text-primary text-sm uppercase tracking-widest py-6">
                            {s.shop}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <PnLRow label="Total Revenue" values={pnlData.map(s => s.revenue)} highlight />
                      <PnLRow label="Stock Purchases" values={pnlData.map(s => s.stockCost)} prefix="─ " indent />
                      <PnLRow label="Daily Expenses" values={pnlData.map(s => s.dailyExp)} prefix="─ " indent />
                      <PnLRow label="Milk Expenses" values={pnlData.map(s => s.milkExp)} prefix="─ " indent />
                      <PnLRow label="Big Expenses" values={pnlData.map(s => s.bigExp)} prefix="─ " indent />
                      <PnLRow label="Staff Salary" values={pnlData.map(s => s.salary)} prefix="─ " indent />
                      <PnLRow label="Shop Rent" values={pnlData.map(s => s.rent)} prefix="─ " indent />
                      <PnLRow label="Electricity" values={pnlData.map(s => s.electricity)} prefix="─ " indent />
                      <TableRow className="bg-slate-50 font-black border-t-2">
                        <TableCell className="pl-8 text-lg">NET PROFIT</TableCell>
                        {pnlData.map(s => (
                          <TableCell key={s.shop} className={`text-center text-xl ${s.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ₹{formatInr(s.net)} {s.net >= 0 ? "✅" : "❌"}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl rounded-[3rem] bg-slate-900 text-white p-10 relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <p className="text-white/60 font-black uppercase tracking-[0.3em] text-sm">Combined Net Profit</p>
                <h2 className="text-7xl font-black text-secondary">₹{formatInr(combinedNet)}</h2>
                <Badge className={`${combinedNet >= 0 ? "bg-green-500" : "bg-red-500"} text-white px-6 py-1 rounded-full text-sm font-black`}>
                  {combinedNet >= 0 ? "PROFITABLE MONTH" : "LOSS INCURRED"}
                </Badge>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
            </Card>
          </TabsContent>

          {/* TAB 2: Month History */}
          <TabsContent value="history" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card className="border-none shadow-xl rounded-[2rem] bg-white p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">Select Month</Label>
                    <Select value={historyMonth} onValueChange={setHistoryMonth}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">Select Shop</Label>
                    <Select value={historyShop} onValueChange={setHistoryShop}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NAVLAKHA">NAVLAKHA</SelectItem>
                        <SelectItem value="NOVELTY">NOVELTY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-6 border-t space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-400">Monthly Revenue</p>
                    <p className="text-2xl font-black text-primary">₹{formatInr(historyData.totalRev)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-400">Monthly Expenses</p>
                    <p className="text-2xl font-black text-red-500">₹{formatInr(historyData.totalExp)}</p>
                  </div>
                  {historyData.topDay && (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <p className="text-[10px] font-black uppercase text-primary mb-1">Top Selling Day</p>
                      <p className="font-black text-slate-800">{format(new Date(historyData.topDay.date + "T12:00:00"), "dd MMM")}</p>
                      <p className="text-xl font-black text-primary">₹{formatInr(historyData.topDay.revenue)}</p>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="lg:col-span-3 border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
                <CardHeader>
                  <CardTitle className="font-headline text-lg">Day-by-Day Performance</CardTitle>
                </CardHeader>
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="font-black text-xs pl-8">Date</TableHead>
                        <TableHead className="font-black text-xs text-right">Revenue ₹</TableHead>
                        <TableHead className="font-black text-xs text-right">Expenses ₹</TableHead>
                        <TableHead className="font-black text-xs text-right pr-8">Net ₹</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.table.map((d, i) => (
                        <TableRow key={i} className={d.revenue === 0 ? "opacity-40" : ""}>
                          <TableCell className="font-bold text-xs pl-8">{format(new Date(d.date + "T12:00:00"), "dd MMM (EEE)")}</TableCell>
                          <TableCell className="text-right text-xs font-bold">₹{formatInr(d.revenue)}</TableCell>
                          <TableCell className="text-right text-xs font-bold text-red-500">₹{formatInr(d.expenses)}</TableCell>
                          <TableCell className={`text-right text-xs font-black pr-8 ${d.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ₹{formatInr(d.net)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: Yearly View */}
          <TabsContent value="yearly" className="space-y-8">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="flex flex-row justify-between items-center bg-slate-50/50">
                <CardTitle className="font-headline text-xl">Annual Performance</CardTitle>
                <Select value={yearlyYear} onValueChange={setYearlyYear}>
                  <SelectTrigger className="h-10 rounded-xl w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-black text-xs pl-8">Month</TableHead>
                      <TableHead className="font-black text-xs text-right">Revenue ₹</TableHead>
                      <TableHead className="font-black text-xs text-right">Expenses ₹</TableHead>
                      <TableHead className="font-black text-xs text-right pr-8">Net Profit ₹</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearlyData.data.map((m, i) => {
                      const isBest = yearlyData.bestMonth?.month === m.month && m.net > 0;
                      const isWorst = yearlyData.worstMonth?.month === m.month && m.net < 0;
                      return (
                        <TableRow key={i} className={isBest ? "bg-green-50" : isWorst ? "bg-red-50" : ""}>
                          <TableCell className="font-bold text-sm pl-8">
                            {m.month}
                            {isBest && <Badge className="ml-2 bg-green-500 h-4 text-[8px] uppercase">Best</Badge>}
                            {isWorst && <Badge className="ml-2 bg-red-500 h-4 text-[8px] uppercase">Worst</Badge>}
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold">₹{formatInr(m.revenue)}</TableCell>
                          <TableCell className="text-right text-sm font-bold text-red-500">₹{formatInr(m.expenses)}</TableCell>
                          <TableCell className={`text-right text-sm font-black pr-8 ${m.net >= 0 ? "text-green-600" : "text-red-700"}`}>
                            ₹{formatInr(m.net)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-slate-100 font-black border-t-2">
                      <TableCell className="pl-8 text-lg">ANNUAL TOTAL</TableCell>
                      <TableCell className="text-right text-lg">₹{formatInr(yearlyData.annualTotal.revenue)}</TableCell>
                      <TableCell className="text-right text-lg text-red-600">₹{formatInr(yearlyData.annualTotal.expenses)}</TableCell>
                      <TableCell className={`text-right text-2xl pr-8 ${yearlyData.annualTotal.net >= 0 ? "text-green-600" : "text-red-700"}`}>
                        ₹{formatInr(yearlyData.annualTotal.net)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-[2rem] bg-white p-8">
              <h3 className="font-headline text-lg font-black mb-8">Net Profit Trend ({yearlyYear})</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: "#94A3B8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: "#94A3B8" }} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip
                      cursor={{ fill: "#F8FAFC" }}
                      contentStyle={{ borderRadius: "1rem", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                      formatter={(v: number) => [`₹${formatInr(v)}`, "Net Profit"]}
                    />
                    <Bar dataKey="net" radius={[6, 6, 0, 0]} barSize={40}>
                      {yearlyData.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.net >= 0 ? "hsl(var(--primary))" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PnLRow({ label, values, highlight = false, indent = false, prefix = "" }: { label: string; values: number[]; highlight?: boolean; indent?: boolean; prefix?: string }) {
  return (
    <TableRow className={highlight ? "bg-slate-50/50 font-black" : ""}>
      <TableCell className={`pl-8 text-sm ${indent ? "pl-12 text-slate-500 font-medium" : "font-bold"}`}>
        {prefix}{label}
      </TableCell>
      {values.map((v, i) => (
        <TableCell key={i} className={`text-center text-sm ${highlight ? "font-black" : ""}`}>
          ₹{formatInr(v)}
        </TableCell>
      ))}
    </TableRow>
  );
}
