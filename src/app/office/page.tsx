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
  Briefcase,
  Plus,
  Trash2,
  Save,
  Clock,
  PieChart,
  Loader2,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getShops, getSettingsOffices } from "@/lib/settings-catalog";
import type { ShopRecord, SettingsOfficeRecord } from "@/lib/settings-catalog";
import { DB } from "@/lib/storage";
import {
  saveOfficeOrder,
  getOfficeOrders,
  getAllOfficeOrders,
  type OfficeOrder,
  type OfficeItem,
} from "@/lib/office-dairy-storage";
import { formatInr, monthOptionsFromJan2025 } from "@/lib/hisaab-storage";

const emptyItem = (): OfficeItem => ({ name: "Tea", qty: 1, rate: 12, amount: 12 });

export default function OfficePage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [offices, setOffices] = useState<SettingsOfficeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("new");

  // Tab 1: New Order
  const [orderDate, setOrderDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [orderShop, setOrderShop] = useState("");
  const [orderOffice, setOrderOffice] = useState("");
  const [orderItems, setOrderItems] = useState<OfficeItem[]>([emptyItem()]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // Tab 2: Pending Dues
  const [allOrders, setAllOrders] = useState<OfficeOrder[]>([]);

  // Tab 3: Monthly Report
  const [reportMonth, setReportMonth] = useState(format(new Date(), "yyyy-MM"));

  const monthOptions = useMemo(() => monthOptionsFromJan2025(), []);

  // Inline Office Add
  const [isOfficeDialogOpen, setIsOfficeDialogOpen] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState("");

  useEffect(() => {
    const s = getShops();
    setShops(s);
    if (s.length > 0) setOrderShop(s[0].name);
    setOffices(getSettingsOffices());
    setAllOrders(getAllOfficeOrders());
  }, []);

  const totalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.amount, 0);
  }, [orderItems]);

  const balance = useMemo(() => {
    return totalAmount - (paidAmount || 0);
  }, [totalAmount, paidAmount]);

  const handleAddItem = () => {
    setOrderItems([...orderItems, emptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof OfficeItem, value: any) => {
    const newItems = [...orderItems];
    const item = { ...newItems[index], [field]: value };
    if (field === "qty" || field === "rate") {
      item.amount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
    }
    newItems[index] = item;
    setOrderItems(newItems);
  };

  const handleSaveOrder = () => {
    if (!orderShop || !orderOffice || orderItems.length === 0) {
      toast({ variant: "destructive", title: "Missing fields", description: "Select shop, office and add items." });
      return;
    }
    setLoading(true);
    try {
      const order: OfficeOrder = {
        id: Date.now().toString(),
        date: orderDate,
        shop: orderShop,
        officeName: orderOffice,
        items: orderItems,
        total: totalAmount,
        paid: Number(paidAmount) || 0,
        balance,
        notes,
      };
      saveOfficeOrder(order);
      toast({ title: "Order saved", description: `${orderOffice} — ₹${formatInr(totalAmount)}` });
      
      // Reset form
      setOrderItems([emptyItem()]);
      setPaidAmount(0);
      setNotes("");
      setAllOrders(getAllOfficeOrders());
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffice = () => {
    if (!newOfficeName) return;
    const existing = getSettingsOffices();
    const newOffice: SettingsOfficeRecord = {
      id: `off_${Date.now()}`,
      officeName: newOfficeName,
      contact: "",
      shop: orderShop,
    };
    const updated = [...existing, newOffice];
    DB.set("settings_offices", updated);
    setOffices(updated);
    setOrderOffice(newOfficeName);
    setNewOfficeName("");
    setIsOfficeDialogOpen(false);
    toast({ title: "Office added" });
  };

  const pendingDues = useMemo(() => {
    const map = new Map<string, { totalOrders: number; totalAmount: number; paid: number; balance: number; lastDate: string }>();
    allOrders.forEach((o) => {
      const existing = map.get(o.officeName) || { totalOrders: 0, totalAmount: 0, paid: 0, balance: 0, lastDate: "" };
      existing.totalOrders += 1;
      existing.totalAmount += o.total;
      existing.paid += o.paid;
      existing.balance += o.balance;
      if (o.date > existing.lastDate) existing.lastDate = o.date;
      map.set(o.officeName, existing);
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .filter((d) => d.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [allOrders]);

  const handleMarkPaid = (officeName: string) => {
    const amountStr = prompt(`Enter amount paid by ${officeName}:`);
    if (amountStr === null) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid amount");
      return;
    }

    // Find all unpaid orders for this office and apply payment
    const officeOrders = allOrders
      .filter((o) => o.officeName === officeName && o.balance > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    let remainingPayment = amount;
    officeOrders.forEach((o) => {
      if (remainingPayment <= 0) return;
      const paymentToApply = Math.min(o.balance, remainingPayment);
      o.paid += paymentToApply;
      o.balance -= paymentToApply;
      remainingPayment -= paymentToApply;
      saveOfficeOrder(o);
    });

    setAllOrders(getAllOfficeOrders());
    toast({ title: "Payment recorded", description: `Applied ₹${formatInr(amount)} to ${officeName} dues.` });
  };

  const monthlyReport = useMemo(() => {
    const officeMap = new Map<string, { orders: number; amount: number; paid: number; balance: number }>();
    allOrders.filter(o => o.date.startsWith(reportMonth)).forEach(o => {
      const existing = officeMap.get(o.officeName) || { orders: 0, amount: 0, paid: 0, balance: 0 };
      existing.orders += 1;
      existing.amount += o.total;
      existing.paid += o.paid;
      existing.balance += o.balance;
      officeMap.set(o.officeName, existing);
    });

    const list = Array.from(officeMap.entries()).map(([name, data]) => ({ name, ...data }));
    const totals = list.reduce((acc, curr) => {
      acc.amount += curr.amount;
      acc.paid += curr.paid;
      acc.balance += curr.balance;
      return acc;
    }, { amount: 0, paid: 0, balance: 0 });

    const topOffice = list.length > 0 ? list.reduce((a, b) => a.amount > b.amount ? a : b) : null;

    return { list, totals, topOffice };
  }, [allOrders, reportMonth]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black font-headline text-primary uppercase">
            Office Chai Delivery
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
            <Briefcase className="w-4 h-4" /> Track office orders and pending dues
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-full justify-start">
            <TabsTrigger value="new" className="rounded-lg font-bold text-xs sm:text-sm">
              <PlusCircle className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              New Order
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg font-bold text-xs sm:text-sm">
              <Clock className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Pending Dues
            </TabsTrigger>
            <TabsTrigger value="report" className="rounded-lg font-bold text-xs sm:text-sm">
              <PieChart className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Monthly Report
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: New Order */}
          <TabsContent value="new" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline text-xl">New Office Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Date</Label>
                    <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Shop</Label>
                    <Select value={orderShop} onValueChange={setOrderShop}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Office</Label>
                    <div className="flex gap-2">
                      <Select value={orderOffice} onValueChange={setOrderOffice}>
                        <SelectTrigger className="h-12 rounded-xl flex-1">
                          <SelectValue placeholder="Select Office" />
                        </SelectTrigger>
                        <SelectContent>
                          {offices.map(o => <SelectItem key={o.id} value={o.officeName}>{o.officeName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={() => setIsOfficeDialogOpen(true)}>
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-bold uppercase text-slate-500">Order Items</Label>
                    <Button variant="outline" size="sm" className="rounded-lg font-bold h-8" onClick={handleAddItem}>
                      <Plus className="w-4 h-4 mr-1" /> Add Row
                    </Button>
                  </div>
                  <div className="overflow-x-auto border rounded-2xl">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-black text-xs">Item Name</TableHead>
                          <TableHead className="font-black text-xs">Qty</TableHead>
                          <TableHead className="font-black text-xs">Rate ₹</TableHead>
                          <TableHead className="font-black text-xs text-right">Amount ₹</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Input value={item.name} onChange={e => handleUpdateItem(idx, "name", e.target.value)} className="h-9 min-w-[120px] rounded-lg" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={item.qty || ""} onChange={e => handleUpdateItem(idx, "qty", e.target.value)} className="h-9 w-20 rounded-lg text-center" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={item.rate || ""} onChange={e => handleUpdateItem(idx, "rate", e.target.value)} className="h-9 w-24 rounded-lg text-center" />
                            </TableCell>
                            <TableCell className="text-right font-bold">₹{formatInr(item.amount)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => handleRemoveItem(idx)} disabled={orderItems.length === 1}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end border-t pt-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-400">Amount Paid ₹</Label>
                        <Input type="number" value={paidAmount || ""} onChange={e => setPaidAmount(Number(e.target.value))} className="h-12 rounded-xl font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-400">Balance ₹</Label>
                        <div className={`h-12 rounded-xl flex items-center px-4 font-black ${balance > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                          ₹{formatInr(balance)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-slate-400">Notes</Label>
                      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Udhaar note or order detail" className="h-12 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-4 text-right">
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-slate-400">Order Total</p>
                      <p className="text-4xl font-black text-primary">₹{formatInr(totalAmount)}</p>
                    </div>
                    <Button className="w-full sm:w-auto h-14 px-10 rounded-2xl font-black bg-primary" onClick={handleSaveOrder} disabled={loading}>
                      {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} Save Order
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Pending Dues */}
          <TabsContent value="pending">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Outstanding Balances</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-black text-xs">Office</TableHead>
                        <TableHead className="font-black text-xs text-center">Orders</TableHead>
                        <TableHead className="font-black text-xs text-right">Total Amt</TableHead>
                        <TableHead className="font-black text-xs text-right">Paid</TableHead>
                        <TableHead className="font-black text-xs text-right text-red-600">BALANCE DUE</TableHead>
                        <TableHead className="font-black text-xs text-center">Last Order</TableHead>
                        <TableHead className="font-black text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDues.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-20 text-center text-slate-400 italic">No pending dues found.</TableCell>
                        </TableRow>
                      ) : (
                        pendingDues.map((d) => (
                          <TableRow key={d.name}>
                            <TableCell className="font-bold text-xs">{d.name}</TableCell>
                            <TableCell className="text-center text-xs">{d.totalOrders}</TableCell>
                            <TableCell className="text-right text-xs font-bold">₹{formatInr(d.totalAmount)}</TableCell>
                            <TableCell className="text-right text-xs font-bold text-green-700">₹{formatInr(d.paid)}</TableCell>
                            <TableCell className="text-right text-xs font-black text-red-600">₹{formatInr(d.balance)}</TableCell>
                            <TableCell className="text-center text-xs text-slate-500">{format(new Date(d.lastDate + "T12:00:00"), "dd MMM yy")}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" className="rounded-lg font-bold text-xs h-8" onClick={() => handleMarkPaid(d.name)}>
                                Mark Paid
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

          {/* TAB 3: Monthly Report */}
          <TabsContent value="report">
            <div className="space-y-6">
              <Card className="border-none shadow-xl rounded-[2rem] bg-white">
                <CardHeader className="flex flex-row justify-between items-center">
                  <CardTitle className="font-headline text-xl">Monthly Office Report</CardTitle>
                  <Select value={reportMonth} onValueChange={setReportMonth}>
                    <SelectTrigger className="h-11 rounded-xl w-40">
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
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-black text-xs pl-6">Office Name</TableHead>
                          <TableHead className="font-black text-xs text-center">Orders</TableHead>
                          <TableHead className="font-black text-xs text-right">Amount ₹</TableHead>
                          <TableHead className="font-black text-xs text-right">Paid ₹</TableHead>
                          <TableHead className="font-black text-xs text-right">Due ₹</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyReport.list.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-20 text-center text-slate-400 italic">No orders for this month.</TableCell>
                          </TableRow>
                        ) : (
                          monthlyReport.list.map((o) => (
                            <TableRow key={o.name} className={monthlyReport.topOffice?.name === o.name ? "bg-primary/5" : ""}>
                              <TableCell className="font-bold text-xs pl-6">
                                {o.name}
                                {monthlyReport.topOffice?.name === o.name && (
                                  <Badge className="ml-2 h-4 text-[8px] uppercase">Top Orderer</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center text-xs">{o.orders}</TableCell>
                              <TableCell className="text-right text-xs font-bold">₹{formatInr(o.amount)}</TableCell>
                              <TableCell className="text-right text-xs font-bold text-green-700">₹{formatInr(o.paid)}</TableCell>
                              <TableCell className={`text-right text-xs font-black ${o.balance > 0 ? "text-red-600" : "text-green-600"}`}>₹{formatInr(o.balance)}</TableCell>
                            </TableRow>
                          ))
                        )}
                        {monthlyReport.list.length > 0 && (
                          <TableRow className="bg-slate-100 font-black border-t-2">
                            <TableCell className="pl-6">GRAND TOTAL</TableCell>
                            <TableCell className="text-center">{monthlyReport.list.reduce((s, o) => s + o.orders, 0)}</TableCell>
                            <TableCell className="text-right">₹{formatInr(monthlyReport.totals.amount)}</TableCell>
                            <TableCell className="text-right">₹{formatInr(monthlyReport.totals.paid)}</TableCell>
                            <TableCell className="text-right text-red-600">₹{formatInr(monthlyReport.totals.balance)}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {monthlyReport.topOffice && (
                <Card className="border-none shadow-2xl rounded-[2.5rem] bg-primary text-white">
                  <CardContent className="p-8 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-white/80 mb-2">Highest Orderer this month</p>
                      <p className="text-4xl font-black">{monthlyReport.topOffice.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-white/80 mb-2">Total Amount</p>
                      <p className="text-4xl font-black">₹{formatInr(monthlyReport.topOffice.amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isOfficeDialogOpen} onOpenChange={setIsOfficeDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Add New Office</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">Office Name</Label>
              <Input
                value={newOfficeName}
                onChange={(e) => setNewOfficeName(e.target.value)}
                placeholder="e.g. HDFC Bank"
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setIsOfficeDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-primary font-bold" onClick={handleAddOffice}>
              Add Office
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
