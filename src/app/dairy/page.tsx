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
  Milk,
  Plus,
  Save,
  Clock,
  PieChart,
  Loader2,
  PlusCircle,
  History,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  getShops,
  getSettingsDairies,
  getDefaultDairyRate,
} from "@/lib/settings-catalog";
import type { ShopRecord, SettingsDairyRecord } from "@/lib/settings-catalog";
import { DB } from "@/lib/storage";
import {
  saveDairyEntry,
  getDairyEntries,
  getAllDairyEntries,
  type DairyEntry,
} from "@/lib/office-dairy-storage";
import { formatInr, monthOptionsFromJan2025 } from "@/lib/hisaab-storage";

export default function DairyPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [dairies, setDairies] = useState<SettingsDairyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("daily");

  // Tab 1: Daily Entry
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entryShop, setEntryShop] = useState("");
  const [entryDairy, setEntryDairy] = useState("");
  const [liters, setLiters] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);
  const [paid, setPaid] = useState<number>(0);

  // Tab 2: Monthly Ledger
  const [ledgerMonth, setLedgerMonth] = useState(format(new Date(), "yyyy-MM"));
  const [ledgerDairy, setLedgerDairy] = useState("");
  const [ledgerShop, setLedgerShop] = useState("");

  // Tab 3: Pending Payments
  const [allEntries, setAllEntries] = useState<DairyEntry[]>([]);

  const monthOptions = useMemo(() => monthOptionsFromJan2025(), []);

  // Inline Dairy Add
  const [isDairyDialogOpen, setIsDairyDialogOpen] = useState(false);
  const [newDairyName, setNewDairyName] = useState("");
  const [newDairyRate, setNewDairyRate] = useState<number>(0);

  useEffect(() => {
    const s = getShops();
    setShops(s);
    if (s.length > 0) {
      setEntryShop(s[0].name);
      setLedgerShop(s[0].name);
    }
    const dList = getSettingsDairies();
    setDairies(dList);
    if (dList.length > 0) {
      setEntryDairy(dList[0].name);
      setRate(dList[0].defaultRatePerLiter);
      setLedgerDairy(dList[0].name);
    }
    setAllEntries(getAllDairyEntries());
  }, []);

  const amount = useMemo(() => liters * rate, [liters, rate]);
  const balance = useMemo(() => amount - paid, [amount, paid]);

  const handleDairyChange = (name: string) => {
    setEntryDairy(name);
    setRate(getDefaultDairyRate(name, entryShop));
  };

  const handleSaveEntry = () => {
    if (!entryShop || !entryDairy || liters <= 0) {
      toast({ variant: "destructive", title: "Invalid entry", description: "Select shop, dairy and enter liters." });
      return;
    }
    setLoading(true);
    try {
      const entry: DairyEntry = {
        id: Date.now().toString(),
        date: entryDate,
        shop: entryShop,
        dairyName: entryDairy,
        liters,
        rate,
        amount,
        paid,
        balance,
      };
      saveDairyEntry(entry);
      toast({ title: "Entry saved", description: `${entryDairy} — ${liters}L` });
      
      // Reset form
      setLiters(0);
      setPaid(0);
      setAllEntries(getAllDairyEntries());
    } finally {
      setLoading(false);
    }
  };

  const handleAddDairy = () => {
    if (!newDairyName) return;
    const existing = getSettingsDairies();
    const newDairy: SettingsDairyRecord = {
      id: `dairy_${Date.now()}`,
      name: newDairyName,
      defaultRatePerLiter: newDairyRate,
      shop: entryShop,
    };
    const updated = [...existing, newDairy];
    DB.set("settings_dairies", updated);
    setDairies(updated);
    setEntryDairy(newDairyName);
    setRate(newDairyRate);
    setNewDairyName("");
    setNewDairyRate(0);
    setIsDairyDialogOpen(false);
    toast({ title: "Dairy added" });
  };

  const monthlyLedgerData = useMemo(() => {
    if (!ledgerShop || !ledgerDairy) return [];
    const entries = allEntries
      .filter(e => e.shop === ledgerShop && e.dairyName === ledgerDairy && e.date.startsWith(ledgerMonth))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    let runningBalance = 0;
    return entries.map(e => {
      runningBalance += e.balance;
      return { ...e, runningBalance };
    });
  }, [allEntries, ledgerShop, ledgerDairy, ledgerMonth]);

  const ledgerTotals = useMemo(() => {
    return monthlyLedgerData.reduce((acc, curr) => {
      acc.liters += curr.liters;
      acc.amount += curr.amount;
      acc.paid += curr.paid;
      acc.due += curr.balance;
      return acc;
    }, { liters: 0, amount: 0, paid: 0, due: 0 });
  }, [monthlyLedgerData]);

  const pendingPayments = useMemo(() => {
    const map = new Map<string, { shop: string; totalDue: number; lastEntry: string }>();
    allEntries.forEach(e => {
      const key = `${e.dairyName}:${e.shop}`;
      const existing = map.get(key) || { shop: e.shop, totalDue: 0, lastEntry: "" };
      existing.totalDue += e.balance;
      if (e.date > existing.lastEntry) existing.lastEntry = e.date;
      map.set(key, existing);
    });

    return Array.from(map.entries())
      .map(([key, data]) => ({ name: key.split(":")[0], ...data }))
      .filter(d => d.totalDue > 0)
      .sort((a, b) => b.totalDue - a.totalDue);
  }, [allEntries]);

  const handlePayNow = (name: string, shop: string) => {
    const amountStr = prompt(`Enter amount paid to ${name} (${shop}):`);
    if (amountStr === null) return;
    const amountPaid = Number(amountStr);
    if (isNaN(amountPaid) || amountPaid <= 0) {
      alert("Invalid amount");
      return;
    }

    const dairyEntries = allEntries
      .filter(e => e.dairyName === name && e.shop === shop && e.balance > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    let remaining = amountPaid;
    dairyEntries.forEach(e => {
      if (remaining <= 0) return;
      const payment = Math.min(e.balance, remaining);
      e.paid += payment;
      e.balance -= payment;
      remaining -= payment;
      saveDairyEntry(e);
    });

    setAllEntries(getAllDairyEntries());
    toast({ title: "Payment recorded", description: `Paid ₹${formatInr(amountPaid)} to ${name}.` });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black font-headline text-primary uppercase">
            Dairy Ledger
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
            <Milk className="w-4 h-4" /> Track milk supply and payments
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-full justify-start">
            <TabsTrigger value="daily" className="rounded-lg font-bold text-xs sm:text-sm">
              <PlusCircle className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Daily Entry
            </TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-lg font-bold text-xs sm:text-sm">
              <History className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Monthly Ledger
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg font-bold text-xs sm:text-sm">
              <Clock className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Pending Payments
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Daily Entry */}
          <TabsContent value="daily" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline text-xl">New Dairy Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Date</Label>
                    <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Shop</Label>
                    <Select value={entryShop} onValueChange={setEntryShop}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Dairy</Label>
                    <div className="flex gap-2">
                      <Select value={entryDairy} onValueChange={handleDairyChange}>
                        <SelectTrigger className="h-12 rounded-xl flex-1">
                          <SelectValue placeholder="Select Dairy" />
                        </SelectTrigger>
                        <SelectContent>
                          {dairies.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={() => setIsDairyDialogOpen(true)}>
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Liters Received</Label>
                    <Input type="number" step="0.5" value={liters || ""} onChange={e => setLiters(Number(e.target.value))} className="h-12 rounded-xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Rate per Liter ₹</Label>
                    <Input type="number" value={rate || ""} onChange={e => setRate(Number(e.target.value))} className="h-12 rounded-xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Total Amount ₹</Label>
                    <div className="h-12 rounded-xl flex items-center px-4 font-black bg-slate-100 text-slate-700">
                      ₹{formatInr(amount)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Amount Paid ₹</Label>
                    <Input type="number" value={paid || ""} onChange={e => setPaid(Number(e.target.value))} className="h-12 rounded-xl font-bold" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center border-t pt-6 gap-6">
                  <div className="text-left space-y-1">
                    <p className="text-xs font-black uppercase text-slate-400">Balance Amount</p>
                    <p className={`text-3xl font-black ${balance > 0 ? "text-red-600" : "text-green-700"}`}>₹{formatInr(balance)}</p>
                  </div>
                  <Button className="w-full sm:w-auto h-14 px-10 rounded-2xl font-black bg-primary" onClick={handleSaveEntry} disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} Save Entry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Monthly Ledger */}
          <TabsContent value="ledger">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="font-headline text-xl">Supplier Monthly Ledger</CardTitle>
                  <div className="flex flex-wrap gap-3">
                    <Select value={ledgerMonth} onValueChange={setLedgerMonth}>
                      <SelectTrigger className="h-10 rounded-xl w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={ledgerShop} onValueChange={setLedgerShop}>
                      <SelectTrigger className="h-10 rounded-xl w-36">
                        <SelectValue placeholder="Shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={ledgerDairy} onValueChange={setLedgerDairy}>
                      <SelectTrigger className="h-10 rounded-xl w-40">
                        <SelectValue placeholder="Dairy" />
                      </SelectTrigger>
                      <SelectContent>
                        {dairies.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-black text-xs pl-6">Date</TableHead>
                        <TableHead className="font-black text-xs text-center">Liters</TableHead>
                        <TableHead className="font-black text-xs text-center">Rate</TableHead>
                        <TableHead className="font-black text-xs text-right">Amount</TableHead>
                        <TableHead className="font-black text-xs text-right">Paid</TableHead>
                        <TableHead className="font-black text-xs text-right">Balance</TableHead>
                        <TableHead className="font-black text-xs text-right pr-6">Running Bal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyLedgerData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-20 text-center text-slate-400 italic">No entries for this selection.</TableCell>
                        </TableRow>
                      ) : (
                        monthlyLedgerData.map((e, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-bold text-xs pl-6">{format(new Date(e.date + "T12:00:00"), "dd MMM yy")}</TableCell>
                            <TableCell className="text-center text-xs">{e.liters}L</TableCell>
                            <TableCell className="text-center text-xs">₹{e.rate}</TableCell>
                            <TableCell className="text-right text-xs font-bold">₹{formatInr(e.amount)}</TableCell>
                            <TableCell className="text-right text-xs font-bold text-green-700">₹{formatInr(e.paid)}</TableCell>
                            <TableCell className={`text-right text-xs font-black ${e.balance > 0 ? "text-red-600" : "text-green-600"}`}>₹{formatInr(e.balance)}</TableCell>
                            <TableCell className="text-right text-xs font-black pr-6">₹{formatInr(e.runningBalance)}</TableCell>
                          </TableRow>
                        ))
                      )}
                      {monthlyLedgerData.length > 0 && (
                        <TableRow className="bg-slate-100 font-black border-t-2">
                          <TableCell className="pl-6">TOTALS</TableCell>
                          <TableCell className="text-center">{ledgerTotals.liters.toFixed(1)}L</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right">₹{formatInr(ledgerTotals.amount)}</TableCell>
                          <TableCell className="text-right text-green-700">₹{formatInr(ledgerTotals.paid)}</TableCell>
                          <TableCell colSpan={2} className="text-right text-red-600 pr-6">Total Due: ₹{formatInr(ledgerTotals.due)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Pending Payments */}
          <TabsContent value="pending">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Pending Dairy Payments</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-black text-xs pl-6">Dairy Name</TableHead>
                        <TableHead className="font-black text-xs">Shop</TableHead>
                        <TableHead className="font-black text-xs text-right text-red-600">Total Due ₹</TableHead>
                        <TableHead className="font-black text-xs text-center">Last Entry</TableHead>
                        <TableHead className="font-black text-xs text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-20 text-center text-slate-400 italic">No pending payments.</TableCell>
                        </TableRow>
                      ) : (
                        pendingPayments.map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-bold text-xs pl-6">{p.name}</TableCell>
                            <TableCell className="text-xs font-bold">{p.shop}</TableCell>
                            <TableCell className="text-right text-xs font-black text-red-600">₹{formatInr(p.totalDue)}</TableCell>
                            <TableCell className="text-center text-xs text-slate-500">{format(new Date(p.lastEntry + "T12:00:00"), "dd MMM yy")}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Button size="sm" className="rounded-lg font-bold text-xs h-8" onClick={() => handlePayNow(p.name, p.shop)}>
                                Pay Now
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isDairyDialogOpen} onOpenChange={setIsDairyDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Add New Dairy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">Dairy Name</Label>
              <Input
                value={newDairyName}
                onChange={(e) => setNewDairyName(e.target.value)}
                placeholder="e.g. Sanchi Dairy"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">Default Rate ₹/L</Label>
              <Input
                type="number"
                value={newDairyRate || ""}
                onChange={(e) => setNewDairyRate(Number(e.target.value))}
                className="h-11 rounded-xl font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setIsDairyDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-primary font-bold" onClick={handleAddDairy}>
              Add Dairy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
