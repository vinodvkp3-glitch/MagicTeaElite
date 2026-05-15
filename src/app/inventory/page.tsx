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
  AlertTriangle,
  Scale,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getShops } from "@/lib/settings-catalog";
import type { ShopRecord } from "@/lib/settings-catalog";
import { InventoryService } from "@/lib/services/inventory-service";
import type { Ingredient, StockLedgerEntry, StockTransactionType } from "@/lib/types";
import { formatInr } from "@/lib/hisaab-storage";

export default function InventoryPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [activeBranch, setActiveBranch] = useState("NAVLAKHA");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ledger");

  // Initialization
  useEffect(() => {
    const s = getShops();
    setShops(s);
    if (s.length > 0) {
      setActiveBranch(s[0].name);
    }
    loadInventory();
    loadLedger();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await InventoryService.getBranchInventory(activeBranch);
      setIngredients(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Error loading inventory", description: "Could not fetch stock levels from Firestore." });
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async () => {
    setLoading(true);
    try {
      const entries = await InventoryService.getBranchLedger(activeBranch, 100);
      setLedgerEntries(entries);
    } catch (err) {
      toast({ variant: "destructive", title: "Error loading ledger", description: "Could not fetch inventory ledger." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
    loadLedger();
  }, [activeBranch]);

  // Valuation calculation
  const valuation = useMemo(() => {
    return ingredients.reduce((sum, item) => sum + (item.currentStock * item.costPrice), 0);
  }, [ingredients]);

  const handleRecordMovement = async (
    ingredientId: string,
    change: number,
    type: StockTransactionType,
    reason: string,
    costPrice: number
  ) => {
    try {
      await InventoryService.recordMovement(activeBranch, {
        ingredientId,
        change,
        type,
        reason,
        costPrice,
        userId: "admin", // Placeholder until Auth phase
      });
      loadInventory();
      toast({ title: "Stock updated", description: `Recorded ${type} for item.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Update failed", description: "Transaction could not be completed." });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <header className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black font-headline text-primary">
              STOCK MANAGEMENT
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
              <Package className="w-4 h-4" /> Professional Enterprise Ledger
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={activeBranch} onValueChange={setActiveBranch}>
              <SelectTrigger className="h-12 w-48 rounded-xl bg-white shadow-sm border-none font-bold">
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
            <Card className="h-12 flex items-center px-6 rounded-xl bg-primary text-white border-none shadow-lg">
              <Scale className="w-4 h-4 mr-2 opacity-70" />
              <span className="text-xs font-black uppercase tracking-widest mr-2">Valuation:</span>
              <span className="font-bold">₹{formatInr(valuation)}</span>
            </Card>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-full justify-start">
            <TabsTrigger value="ledger" className="rounded-lg font-bold text-xs sm:text-sm px-6">
              Inventory Ledger
            </TabsTrigger>
            <TabsTrigger value="wastage" className="rounded-lg font-bold text-xs sm:text-sm px-6">
              Wastage Log
            </TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-lg font-bold text-xs sm:text-sm px-6">
              Stock Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ledger" className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 py-6">
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Live Stock Levels
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="font-bold text-sm">Accessing Firestore Ledger...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50">
                          <TableHead className="font-black text-xs pl-8">Ingredient</TableHead>
                          <TableHead className="font-black text-xs">Category</TableHead>
                          <TableHead className="font-black text-xs text-center">Current Stock</TableHead>
                          <TableHead className="font-black text-xs text-center">Cost Price</TableHead>
                          <TableHead className="font-black text-xs text-right pr-8">Valuation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ingredients.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-20 text-center text-slate-400 italic">No ingredients found for this branch.</TableCell>
                          </TableRow>
                        ) : (
                          ingredients.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-bold text-sm pl-8">{item.name}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize text-[10px] font-black">{item.category}</Badge>
                              </TableCell>
                              <TableCell className="text-center font-black">
                                {item.currentStock} <span className="text-[10px] text-slate-400 font-bold ml-1">{item.unit}</span>
                              </TableCell>
                              <TableCell className="text-center font-bold text-slate-500">₹{formatInr(item.costPrice)}</TableCell>
                              <TableCell className="text-right font-black text-primary pr-8">₹{formatInr(item.currentStock * item.costPrice)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 py-6">
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Inventory Ledger Entries
                </CardTitle>
                <p className="text-sm text-slate-500">Last 100 movements for {activeBranch}. Includes purchases, wastage, adjustments and sale deductions.</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="font-black text-xs pl-8">Timestamp</TableHead>
                        <TableHead className="font-black text-xs">Ingredient</TableHead>
                        <TableHead className="font-black text-xs">Type</TableHead>
                        <TableHead className="font-black text-xs text-center">Change</TableHead>
                        <TableHead className="font-black text-xs text-center">Stock Before</TableHead>
                        <TableHead className="font-black text-xs text-center">Stock After</TableHead>
                        <TableHead className="font-black text-xs text-right pr-8">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-20 text-center text-slate-400 italic">No ledger activity available for this branch.</TableCell>
                        </TableRow>
                      ) : (
                        ledgerEntries.map((entry) => (
                          <TableRow key={entry.id ?? `${entry.ingredientId}-${entry.timestamp}`}>
                            <TableCell className="text-xs text-slate-500 pl-8">{new Date(entry.timestamp).toLocaleString()}</TableCell>
                            <TableCell className="font-bold text-sm">{entry.ingredientName}</TableCell>
                            <TableCell className="capitalize text-xs">{entry.type.replace(/_/g, " ")}</TableCell>
                            <TableCell className={`text-center font-black ${entry.change < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                              {entry.change}
                            </TableCell>
                            <TableCell className="text-center">{entry.prevStock}</TableCell>
                            <TableCell className="text-center">{entry.newStock}</TableCell>
                            <TableCell className="text-right pr-8 text-xs text-slate-500">{entry.reason}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ingredients.filter(i => i.currentStock <= i.reorderLevel).map(item => (
                <Card key={item.id} className="border-none shadow-lg rounded-2xl bg-red-50 border-l-4 border-red-500">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-red-400 mb-1">Low Stock Alert</p>
                      <h3 className="font-black text-lg text-red-900">{item.name}</h3>
                      <p className="text-sm font-bold text-red-600">Currently: {item.currentStock} {item.unit}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-500 opacity-20" />
                  </CardContent>
                </Card>
              ))}
              {ingredients.filter(i => i.currentStock <= i.reorderLevel).length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-[2rem] shadow-xl border-none">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-headline text-xl font-black text-slate-800">All Levels Normal</h3>
                  <p className="text-slate-400 font-bold text-sm">No items currently below reorder levels.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="wastage">
             <Card className="border-none shadow-xl rounded-[2rem] bg-white p-10 flex flex-col items-center justify-center text-center">
                <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                   <Trash2 className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="font-headline text-2xl font-black mb-2">Wastage Tracking</h3>
                <p className="text-slate-500 font-medium max-w-md">Professional wastage logging with cost-impact analysis is being initialized in the next step of Phase 1.</p>
             </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
