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
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Plus,
  Trash2,
  Edit2,
  Package,
  ShoppingCart,
  TrendingUp,
  Settings2,
  Loader2,
  CalendarDays,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { getShops, getStockItems } from "@/lib/settings-catalog";
import type { ShopRecord, StockItemRecord } from "@/lib/settings-catalog";
import { DB } from "@/lib/storage";
import {
  getDailyStock,
  saveDailyStock,
  getStockPurchases,
  saveStockPurchase,
  type DailyStockRecord,
  type StockPurchaseRecord,
  type DailyStockEntry,
  type PurchaseItem,
} from "@/lib/inventory-storage";
import { formatInr, monthOptionsFromJan2025 } from "@/lib/hisaab-storage";

export default function InventoryPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [stockItems, setStockItems] = useState<StockItemRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("daily");

  // Tab 1: Daily Stock
  const [dailyDate, setDailyDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dailyShop, setDailyShop] = useState("");
  const [dailyEntries, setDailyEntries] = useState<DailyStockEntry[]>([]);

  // Tab 2: Purchase
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [purchaseShop, setPurchaseShop] = useState("");
  const [supplier, setSupplier] = useState("");
  const [half, setHalf] = useState<"1st Half (1-15)" | "2nd Half (16-31)">("1st Half (1-15)");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<StockPurchaseRecord[]>([]);

  // Tab 3: Profit
  const [profitMonth, setProfitMonth] = useState(format(new Date(), "yyyy-MM"));
  const [profitShop, setProfitShop] = useState("");

  // Tab 4: Customize Items
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItemRecord | null>(null);
  const [itemForm, setItemForm] = useState({ code: "", name: "", sellingPrice: 0 });

  const monthOptions = useMemo(() => monthOptionsFromJan2025(), []);

  // Initialization
  useEffect(() => {
    const s = getShops();
    const items = getStockItems();
    setShops(s);
    setStockItems(items);
    if (s.length > 0) {
      setDailyShop(s[0].name);
      setPurchaseShop(s[0].name);
      setProfitShop(s[0].name);
    }
  }, []);

  // Daily Stock Logic
  const loadDailyStock = useCallback(() => {
    if (!dailyShop || !dailyDate) return;
    const current = getDailyStock(dailyShop, dailyDate);
    if (current) {
      // Merge current entries with any new stock items
      const merged = stockItems.map((item) => {
        const entry = current.entries.find((e) => e.itemCode === item.code);
        return entry || {
          itemCode: item.code,
          opening: 0,
          soldToday: 0,
          stockIn: 0,
          closing: 0,
        };
      });
      setDailyEntries(merged);
    } else {
      // Auto-fill from previous day
      const prevDate = format(subDays(new Date(dailyDate), 1), "yyyy-MM-dd");
      const prev = getDailyStock(dailyShop, prevDate);
      const initial = stockItems.map((item) => {
        const prevEntry = prev?.entries.find((e) => e.itemCode === item.code);
        const opening = prevEntry ? prevEntry.closing : 0;
        return {
          itemCode: item.code,
          opening,
          soldToday: 0,
          stockIn: 0,
          closing: opening,
        };
      });
      setDailyEntries(initial);
    }
  }, [dailyShop, dailyDate, stockItems]);

  useEffect(() => {
    loadDailyStock();
  }, [loadDailyStock]);

  const updateDailyEntry = (code: string, field: keyof DailyStockEntry, value: number) => {
    setDailyEntries((prev) =>
      prev.map((e) => {
        if (e.itemCode === code) {
          const updated = { ...e, [field]: value };
          updated.closing = updated.opening + updated.stockIn - updated.soldToday;
          return updated;
        }
        return e;
      })
    );
  };

  const handleSaveDaily = () => {
    if (!dailyShop) return;
    setLoading(true);
    try {
      saveDailyStock({
        id: Date.now().toString(),
        date: dailyDate,
        shop: dailyShop,
        entries: dailyEntries,
      });
      toast({ title: "Daily stock saved", description: `${dailyShop} — ${dailyDate}` });
    } finally {
      setLoading(false);
    }
  };

  // Purchase Logic
  useEffect(() => {
    if (activeTab === "purchase" && purchaseShop) {
      const ym = purchaseDate.slice(0, 7);
      setPurchaseHistory(getStockPurchases(purchaseShop, ym));
    }
  }, [activeTab, purchaseShop, purchaseDate]);

  const addPurchaseRow = () => {
    if (stockItems.length === 0) return;
    const first = stockItems[0];
    setPurchaseItems([
      ...purchaseItems,
      { itemCode: first.code, itemName: first.name, qty: 0, price: 0, total: 0 },
    ]);
  };

  const updatePurchaseItem = (idx: number, field: keyof PurchaseItem, value: any) => {
    setPurchaseItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx], [field]: value };
      if (field === "itemCode") {
        const stock = stockItems.find((s) => s.code === value);
        if (stock) item.itemName = stock.name;
      }
      if (field === "qty" || field === "price") {
        item.total = (Number(item.qty) || 0) * (Number(item.price) || 0);
      }
      next[idx] = item;
      return next;
    });
  };

  const removePurchaseRow = (idx: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const purchaseGrandTotal = useMemo(
    () => purchaseItems.reduce((sum, item) => sum + item.total, 0),
    [purchaseItems]
  );

  const handleSavePurchase = () => {
    if (!purchaseShop || purchaseItems.length === 0) return;
    setLoading(true);
    try {
      const record: StockPurchaseRecord = {
        id: Date.now().toString(),
        date: purchaseDate,
        shop: purchaseShop,
        supplier,
        half,
        items: purchaseItems,
        grandTotal: purchaseGrandTotal,
      };
      saveStockPurchase(record);

      // Create expense entry
      const yearMonth = purchaseDate.slice(0, 7);
      const expenseKey = `expenses:${purchaseShop}:${yearMonth}`;
      const expenses = (DB.get(expenseKey) as any[] | null) ?? [];
      expenses.push({
        id: `purchase_${record.id}`,
        date: purchaseDate,
        shop: purchaseShop,
        dailyExp: 0,
        milkExp: 0,
        bigExpName: "Stock Entry",
        bigExpAmount: purchaseGrandTotal,
        comments: `Supplier: ${supplier}, Half: ${half}`,
        type: "stock_entry", // As requested
      });
      DB.set(expenseKey, expenses);

      toast({ title: "Purchase saved", description: `Added to inventory and expenses.` });
      setPurchaseItems([]);
      setSupplier("");
      const ym = purchaseDate.slice(0, 7);
      setPurchaseHistory(getStockPurchases(purchaseShop, ym));
    } finally {
      setLoading(false);
    }
  };

  // Profit Logic
  const profitData = useMemo(() => {
    if (!profitShop || !profitMonth) return [];
    
    // Get all days in the month
    const start = startOfMonth(new Date(profitMonth + "-01"));
    const end = endOfMonth(start);
    const dailyRecords: DailyStockRecord[] = [];
    let current = start;
    while (current <= end) {
      const dateStr = format(current, "yyyy-MM-dd");
      const rec = getDailyStock(profitShop, dateStr);
      if (rec) dailyRecords.push(rec);
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }

    const purchases = getStockPurchases(profitShop, profitMonth);

    return stockItems.map((item) => {
      const soldQty = dailyRecords.reduce((sum, rec) => {
        const entry = rec.entries.find((e) => e.itemCode === item.code);
        return sum + (entry?.soldToday || 0);
      }, 0);

      const purchasedQty = purchases.reduce((sum, rec) => {
        const pItem = rec.items.find((pi) => pi.itemCode === item.code);
        return sum + (pItem?.qty || 0);
      }, 0);

      const purchaseCost = purchases.reduce((sum, rec) => {
        const pItem = rec.items.find((pi) => pi.itemCode === item.code);
        return sum + (pItem?.total || 0);
      }, 0);

      const revenue = soldQty * item.sellingPrice;
      const profit = revenue - purchaseCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        item: item.name,
        purchasedQty,
        purchaseCost,
        soldQty,
        revenue,
        profit,
        margin,
      };
    });
  }, [profitShop, profitMonth, stockItems, activeTab]);

  const profitTotals = useMemo(() => {
    return profitData.reduce(
      (acc, d) => {
        acc.cost += d.purchaseCost;
        acc.revenue += d.revenue;
        acc.profit += d.profit;
        return acc;
      },
      { cost: 0, revenue: 0, profit: 0 }
    );
  }, [profitData]);

  // Customize Logic
  const handleSaveItem = () => {
    if (!itemForm.code || !itemForm.name) return;
    const items = [...stockItems];
    if (editingItem) {
      const idx = items.findIndex((i) => i.id === editingItem.id);
      if (idx >= 0) {
        items[idx] = { ...editingItem, ...itemForm };
      }
    } else {
      items.push({
        id: `stock_${itemForm.code.toLowerCase()}_${Date.now()}`,
        ...itemForm,
      });
    }
    DB.set("stock_items", items);
    setStockItems(items);
    setIsItemDialogOpen(false);
    setEditingItem(null);
    setItemForm({ code: "", name: "", sellingPrice: 0 });
    toast({ title: editingItem ? "Item updated" : "Item added" });
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      const items = stockItems.filter((i) => i.id !== id);
      DB.set("stock_items", items);
      setStockItems(items);
      toast({ title: "Item deleted" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black font-headline text-primary">
            STOCK MANAGEMENT
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
            MagicTea Elite Stock Management
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-full justify-start">
            <TabsTrigger value="daily" className="rounded-lg font-bold text-xs sm:text-sm">
              <Package className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Daily Stock
            </TabsTrigger>
            <TabsTrigger value="purchase" className="rounded-lg font-bold text-xs sm:text-sm">
              <ShoppingCart className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Stock Kharida
            </TabsTrigger>
            <TabsTrigger value="profit" className="rounded-lg font-bold text-xs sm:text-sm">
              <TrendingUp className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Profit Calc
            </TabsTrigger>
            <TabsTrigger value="customize" className="rounded-lg font-bold text-xs sm:text-sm">
              <Settings2 className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Customize
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Daily Stock */}
          <TabsContent value="daily" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="font-headline text-xl">Daily Stock Tracker</CardTitle>
                  <div className="flex flex-wrap gap-3">
                    <Input
                      type="date"
                      value={dailyDate}
                      onChange={(e) => setDailyDate(e.target.value)}
                      className="h-10 rounded-xl w-40"
                    />
                    <Select value={dailyShop} onValueChange={setDailyShop}>
                      <SelectTrigger className="h-10 rounded-xl w-40">
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
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-black text-xs">Code</TableHead>
                        <TableHead className="font-black text-xs">Item Name</TableHead>
                        <TableHead className="font-black text-xs">Opening</TableHead>
                        <TableHead className="font-black text-xs">Sold Today</TableHead>
                        <TableHead className="font-black text-xs">Stock IN</TableHead>
                        <TableHead className="font-black text-xs text-right">Closing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyEntries.map((entry) => {
                        const alertClass =
                          entry.closing < 10
                            ? "bg-red-50 text-red-600"
                            : entry.closing < 20
                            ? "bg-amber-50 text-amber-600"
                            : "";
                        return (
                          <TableRow key={entry.itemCode} className={alertClass}>
                            <TableCell className="font-bold text-xs">{entry.itemCode}</TableCell>
                            <TableCell className="text-xs">
                              {stockItems.find((i) => i.code === entry.itemCode)?.name || "—"}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={entry.opening || ""}
                                onChange={(e) =>
                                  updateDailyEntry(entry.itemCode, "opening", Number(e.target.value))
                                }
                                className="h-8 w-20 text-xs rounded-md"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={entry.soldToday || ""}
                                onChange={(e) =>
                                  updateDailyEntry(entry.itemCode, "soldToday", Number(e.target.value))
                                }
                                className="h-8 w-20 text-xs rounded-md"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={entry.stockIn || ""}
                                onChange={(e) =>
                                  updateDailyEntry(entry.itemCode, "stockIn", Number(e.target.value))
                                }
                                className="h-8 w-20 text-xs rounded-md"
                              />
                            </TableCell>
                            <TableCell className="text-right font-black text-sm">
                              {entry.closing}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="p-6">
                  <Button
                    className="w-full sm:w-auto h-12 px-10 rounded-xl font-black bg-primary"
                    onClick={handleSaveDaily}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Daily Stock
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Purchase */}
          <TabsContent value="purchase" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Stock Purchase Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Date</Label>
                    <Input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Shop</Label>
                    <Select value={purchaseShop} onValueChange={setPurchaseShop}>
                      <SelectTrigger className="h-11 rounded-xl">
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
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Supplier Name</Label>
                    <Input
                      placeholder="e.g. Samosa Wala"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Half</Label>
                    <Select value={half} onValueChange={(v: any) => setHalf(v)}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st Half (1-15)">1st Half (1-15)</SelectItem>
                        <SelectItem value="2nd Half (16-31)">2nd Half (16-31)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-black text-xs">Item Name</TableHead>
                        <TableHead className="font-black text-xs">Qty</TableHead>
                        <TableHead className="font-black text-xs">Price ₹</TableHead>
                        <TableHead className="font-black text-xs">Total ₹</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select
                              value={item.itemCode}
                              onValueChange={(v) => updatePurchaseItem(idx, "itemCode", v)}
                            >
                              <SelectTrigger className="h-9 w-40 text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {stockItems.map((s) => (
                                  <SelectItem key={s.id} value={s.code}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.qty || ""}
                              onChange={(e) => updatePurchaseItem(idx, "qty", e.target.value)}
                              className="h-9 w-24 text-xs rounded-lg"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.price || ""}
                              onChange={(e) => updatePurchaseItem(idx, "price", e.target.value)}
                              className="h-9 w-24 text-xs rounded-lg"
                            />
                          </TableCell>
                          <TableCell className="font-bold text-sm">
                            ₹{formatInr(item.total)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => removePurchaseRow(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <Button variant="outline" className="rounded-xl font-bold h-11" onClick={addPurchaseRow}>
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase">Grand Total</p>
                    <p className="text-3xl font-black text-primary">₹{formatInr(purchaseGrandTotal)}</p>
                  </div>
                </div>

                <Button
                  className="w-full h-14 rounded-2xl font-black bg-primary"
                  onClick={handleSavePurchase}
                  disabled={loading || purchaseItems.length === 0}
                >
                  <Save className="w-5 h-5 mr-2" /> Save Purchase Entry
                </Button>

                <div className="space-y-3 pt-6 border-t">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    Purchase History ({purchaseDate.slice(0, 7)})
                  </h3>
                  {purchaseHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-10 text-center bg-slate-50 rounded-2xl italic">
                      No purchases recorded for this month.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {purchaseHistory.map((rec) => (
                        <div key={rec.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                          <div>
                            <p className="font-black text-primary">{rec.supplier}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {rec.date} — {rec.half}
                            </p>
                          </div>
                          <p className="font-black text-lg">₹{formatInr(rec.grandTotal)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Profit */}
          <TabsContent value="profit">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="font-headline text-xl">Profit & Margin Calculator</CardTitle>
                  <div className="flex gap-3">
                    <Select value={profitMonth} onValueChange={setProfitMonth}>
                      <SelectTrigger className="h-11 rounded-xl w-40">
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
                    <Select value={profitShop} onValueChange={setProfitShop}>
                      <SelectTrigger className="h-11 rounded-xl w-40">
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
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-black text-xs">Item</TableHead>
                        <TableHead className="font-black text-xs">Purchased</TableHead>
                        <TableHead className="font-black text-xs">Cost ₹</TableHead>
                        <TableHead className="font-black text-xs">Sold</TableHead>
                        <TableHead className="font-black text-xs">Revenue ₹</TableHead>
                        <TableHead className="font-black text-xs">PROFIT ₹</TableHead>
                        <TableHead className="font-black text-xs text-right">Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitData.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-bold text-xs">{d.item}</TableCell>
                          <TableCell className="text-xs">{d.purchasedQty}</TableCell>
                          <TableCell className="text-xs">₹{formatInr(d.purchaseCost)}</TableCell>
                          <TableCell className="text-xs">{d.soldQty}</TableCell>
                          <TableCell className="text-xs">₹{formatInr(d.revenue)}</TableCell>
                          <TableCell className={`font-black text-xs ${d.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ₹{formatInr(d.profit)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold">
                            <Badge variant={d.margin > 20 ? "default" : "secondary"}>
                              {d.margin.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-100 font-black border-t-2">
                        <TableCell colSpan={2}>GRAND TOTALS</TableCell>
                        <TableCell className="text-red-700">₹{formatInr(profitTotals.cost)}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-green-700">₹{formatInr(profitTotals.revenue)}</TableCell>
                        <TableCell className={`text-lg ${profitTotals.profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                          ₹{formatInr(profitTotals.profit)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Customize */}
          <TabsContent value="customize">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="font-headline text-xl">Stock Items List</CardTitle>
                <Button
                  className="rounded-xl font-bold bg-primary h-10"
                  onClick={() => {
                    setEditingItem(null);
                    setItemForm({ code: "", name: "", sellingPrice: 0 });
                    setIsItemDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add New Item
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-black text-xs">Code</TableHead>
                        <TableHead className="font-black text-xs">Item Name</TableHead>
                        <TableHead className="font-black text-xs">Selling Price ₹</TableHead>
                        <TableHead className="font-black text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-bold text-xs">{item.code}</TableCell>
                          <TableCell className="text-xs font-bold">{item.name}</TableCell>
                          <TableCell className="text-xs font-black text-green-700">
                            ₹{formatInr(item.sellingPrice)}
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:text-primary"
                              onClick={() => {
                                setEditingItem(item);
                                setItemForm({
                                  code: item.code,
                                  name: item.name,
                                  sellingPrice: item.sellingPrice,
                                });
                                setIsItemDialogOpen(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:text-red-500"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
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

      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">
              {editingItem ? "Edit Stock Item" : "Add New Stock Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">Code</Label>
              <Input
                value={itemForm.code}
                onChange={(e) => setItemForm({ ...itemForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. AM"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">Item Name</Label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="e.g. Aam Panna"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">Selling Price ₹</Label>
              <Input
                type="number"
                value={itemForm.sellingPrice || ""}
                onChange={(e) => setItemForm({ ...itemForm, sellingPrice: Number(e.target.value) })}
                className="h-11 rounded-xl font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setIsItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-primary font-bold" onClick={handleSaveItem}>
              {editingItem ? "Update Item" : "Save Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
