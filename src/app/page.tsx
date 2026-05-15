"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  PlusCircle,
  ShoppingCart,
  ReceiptText,
  Package,
  Briefcase,
  Users,
  ChevronRight,
  ArrowRightLeft,
} from "lucide-react";
import Link from "next/link";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { DB } from "@/lib/storage";
import { getHisaabMonth, formatInr } from "@/lib/hisaab-storage";
import { getExpensesMonth } from "@/lib/expense-storage";
import { getStockItems, getSettingsStaff } from "@/lib/settings-catalog";
import { getDailyStock } from "@/lib/inventory-storage";
import { getAllOfficeOrders, getAllDairyEntries } from "@/lib/office-dairy-storage";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [activeShop, setActiveShop] = useState<string>("DONO");

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("activeShop") || "DONO";
    setActiveShop(stored);
  }, []);

  // Today's Data
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const yearMonth = useMemo(() => today.slice(0, 7), [today]);

  const shopData = useMemo(() => {
    const shops = ["NAVLAKHA", "NOVELTY"];
    return shops.map((shop) => {
      const entry = getHisaabMonth(shop, yearMonth).find((e) => e.date === today);
      return {
        shop,
        cash: entry?.cash || 0,
        online: entry?.totalOnline || 0,
        total: entry?.total || 0,
        expenses: (entry?.expenses || 0) + (entry?.milkExp || 0) + (entry?.bigExpAmount || 0),
      };
    });
  }, [today, yearMonth]);

  const combinedToday = useMemo(() => {
    return shopData.reduce(
      (acc, curr) => {
        acc.cash += curr.cash;
        acc.online += curr.online;
        acc.total += curr.total;
        acc.expenses += curr.expenses;
        return acc;
      },
      { cash: 0, online: 0, total: 0, expenses: 0 }
    );
  }, [shopData]);

  // Monthly Data
  const monthlyStats = useMemo(() => {
    const shops = ["NAVLAKHA", "NOVELTY"];
    let revenue = 0;
    let expenses = 0;

    shops.forEach((shop) => {
      const hisaab = getHisaabMonth(shop, yearMonth);
      revenue += hisaab.reduce((sum, e) => sum + e.total, 0);
      
      const expEntries = getExpensesMonth(shop, yearMonth);
      expenses += expEntries.reduce((sum, e) => sum + e.dailyExp + e.milkExp + e.bigExpAmount, 0);
    });

    return { revenue, expenses, net: revenue - expenses };
  }, [yearMonth]);

  // Alerts Data
  const alerts = useMemo(() => {
    const items = getStockItems();
    const lowStock = items.filter((item) => {
      const stock = getDailyStock("NAVLAKHA", today)?.entries.find(e => e.itemCode === item.code)?.closing || 0;
      const stock2 = getDailyStock("NOVELTY", today)?.entries.find(e => e.itemCode === item.code)?.closing || 0;
      return (stock + stock2) < 20;
    }).length;

    const officeDue = getAllOfficeOrders().reduce((sum, o) => sum + o.balance, 0);
    const dairyDue = getAllDairyEntries().reduce((sum, e) => sum + e.balance, 0);
    const pendingSalary = getSettingsStaff().length; // Simplified for dashboard

    return { lowStock, officeDue, dairyDue, pendingSalary };
  }, [today]);

  // Chart Data (Last 6 Months)
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    return months.map((m) => {
      const ym = format(m, "yyyy-MM");
      const label = format(m, "MMM");
      
      const navlakhaRev = getHisaabMonth("NAVLAKHA", ym).reduce((sum, e) => sum + e.total, 0);
      const noveltyRev = getHisaabMonth("NOVELTY", ym).reduce((sum, e) => sum + e.total, 0);
      
      const navExp = getExpensesMonth("NAVLAKHA", ym).reduce((sum, e) => sum + e.dailyExp + e.milkExp + e.bigExpAmount, 0);
      const novExp = getExpensesMonth("NOVELTY", ym).reduce((sum, e) => sum + e.dailyExp + e.milkExp + e.bigExpAmount, 0);

      return {
        name: label,
        Navlakha: navlakhaRev,
        Novelty: noveltyRev,
        Expenses: navExp + novExp,
      };
    });
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <header className="mb-8">
          <h1 className="text-4xl font-black font-headline text-primary uppercase tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground font-medium">Business performance at a glance</p>
        </header>

        {/* ROW 1: Today's Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {shopData.map((s) => (
            <Card key={s.shop} className="border-none shadow-xl rounded-[2rem] bg-white p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{s.shop}</p>
                <Badge variant="outline" className="bg-primary/5 text-primary border-none font-bold">Today</Badge>
              </div>
              <h3 className="text-3xl font-black text-slate-800 mb-1">₹{formatInr(s.total)}</h3>
              <p className="text-xs font-bold text-slate-500">
                Cash: ₹{formatInr(s.cash)} | Online: ₹{formatInr(s.online)}
              </p>
            </Card>
          ))}
          <Card className="border-none shadow-2xl rounded-[2rem] bg-primary text-white p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-black uppercase text-white/60 tracking-widest">COMBINED REVENUE</p>
              <IndianRupee className="w-5 h-5 text-white/40" />
            </div>
            <h3 className="text-4xl font-black mb-1">₹{formatInr(combinedToday.total)}</h3>
            <p className="text-xs font-bold text-white/80">
              Total Cash + Online (Both Shops)
            </p>
          </Card>
        </div>

        {/* ROW 2 & 3: Monthly & Money in Hand */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] bg-white p-8">
            <h3 className="font-headline text-xl font-black mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              This Month So Far
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase text-slate-400">Total Revenue</p>
                <p className="text-2xl font-black text-slate-800">₹{formatInr(monthlyStats.revenue)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase text-slate-400">Total Expenses</p>
                <p className="text-2xl font-black text-red-600">₹{formatInr(monthlyStats.expenses)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase text-slate-400">Net Profit</p>
                <p className={`text-2xl font-black ${monthlyStats.net >= 0 ? "text-green-600" : "text-red-700"}`}>
                  ₹{formatInr(monthlyStats.net)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] bg-slate-900 text-white p-8 md:p-10 overflow-hidden relative min-h-[300px] flex flex-col justify-center">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-secondary/20 rounded-2xl">
                  <Wallet className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="font-headline text-3xl font-black tracking-tight">
                  Money in Hand NOW
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-white/40">NAVLAKHA Shop</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-white/10 pb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-white/30 uppercase">Cash</p>
                      <p className="text-xl font-black">₹{formatInr(shopData[0].cash)}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-white/30 uppercase">Online</p>
                      <p className="text-xl font-black text-secondary">₹{formatInr(shopData[0].online)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-white/40">NOVELTY Shop</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-white/10 pb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-white/30 uppercase">Cash</p>
                      <p className="text-xl font-black">₹{formatInr(shopData[1].cash)}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-white/30 uppercase">Online</p>
                      <p className="text-xl font-black text-secondary">₹{formatInr(shopData[1].online)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/10">
                <span className="text-sm font-black uppercase tracking-[0.3em] text-secondary/80">Grand Total Liquidity</span>
                <span className="text-4xl md:text-5xl font-black text-white">₹{formatInr(combinedToday.total)}</span>
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-secondary/10 rounded-full blur-[100px]"></div>
            <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]"></div>
          </Card>
        </div>

        {/* ROW 4: Alerts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <AlertCard
            label="Stock Low"
            value={`${alerts.lowStock} items`}
            icon={Package}
            status={alerts.lowStock > 0 ? "critical" : "good"}
          />
          <AlertCard
            label="Office Due"
            value={`₹${formatInr(alerts.officeDue)}`}
            icon={Briefcase}
            status={alerts.officeDue > 1000 ? "warning" : "good"}
          />
          <AlertCard
            label="Dairy Due"
            value={`₹${formatInr(alerts.dairyDue)}`}
            icon={AlertCircle}
            status={alerts.dairyDue > 5000 ? "warning" : "good"}
          />
          <AlertCard
            label="Salary Pending"
            value={`${alerts.pendingSalary} staff`}
            icon={Users}
            status="critical"
          />
        </div>

        {/* ROW 5: Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickAction href="/hisab" label="Aaj ka Hisaab" icon={ReceiptText} />
          <QuickAction href="/expenses" label="New Expense" icon={TrendingDown} />
          <QuickAction href="/inventory" label="Stock Entry" icon={PlusCircle} />
          <QuickAction href="/office" label="Office Order" icon={Briefcase} />
        </div>

        {/* ROW 6: Chart */}
        <Card className="border-none shadow-xl rounded-[2rem] bg-white p-8 overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline text-xl font-black">Performance: Last 6 Months</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <div className="w-3 h-3 rounded-full bg-primary"></div> Navlakha
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div> Novelty
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <div className="w-3 h-3 rounded-full bg-slate-400"></div> Expenses
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: "#94A3B8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: "#94A3B8" }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip
                  cursor={{ fill: "#F8FAFC" }}
                  contentStyle={{ borderRadius: "1rem", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                  formatter={(v: number) => [`₹${formatInr(v)}`, ""]}
                />
                <Bar dataKey="Navlakha" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="Novelty" fill="#f97316" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="Expenses" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </main>
    </div>
  );
}

function AlertCard({ label, value, icon: Icon, status }: { label: string; value: string; icon: any; status: "good" | "warning" | "critical" }) {
  const color = status === "critical" ? "text-red-600" : status === "warning" ? "text-amber-500" : "text-green-600";
  const bg = status === "critical" ? "bg-red-50" : status === "warning" ? "bg-amber-50" : "bg-green-50";
  const iconColor = status === "critical" ? "red" : status === "warning" ? "amber" : "green";

  return (
    <Card className={`border-none shadow-lg rounded-2xl p-4 flex items-center gap-4 ${bg}`}>
      <div className={`p-2.5 rounded-xl bg-white shadow-sm text-${iconColor}-500`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{label}</p>
        <p className={`text-lg font-black ${color}`}>{value}</p>
      </div>
    </Card>
  );
}

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  return (
    <Link href={href}>
      <Button variant="outline" className="w-full h-24 rounded-3xl border-2 border-slate-100 hover:border-primary hover:bg-primary/5 flex flex-col gap-2 transition-all group">
        <Icon className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
        <span className="text-xs font-black text-slate-600 group-hover:text-primary transition-colors">{label}</span>
      </Button>
    </Link>
  );
}
