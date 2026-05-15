"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Store,
  Users,
  Milk,
  Building2,
  Package,
  Receipt,
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DB } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  ensureSettingsDefaults,
  getShops,
  syncFixedExpensesForShops,
  type ShopRecord,
  type SettingsStaffRecord,
  type SettingsDairyRecord,
  type SettingsOfficeRecord,
  type StockItemRecord,
  type FixedExpenseRecord,
} from "@/lib/settings-catalog";

function slugId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}`;
}

function ShopSelect({
  value,
  onChange,
  shops,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  shops: ShopRecord[];
  className?: string;
}) {
  return (
    <Select value={value || shops[0]?.name || ""} onValueChange={onChange}>
      <SelectTrigger className={className ?? "h-11 rounded-xl"}>
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
  );
}

export default function SettingsPage() {
  const { toast } = useToast();

  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [staff, setStaff] = useState<SettingsStaffRecord[]>([]);
  const [dairies, setDairies] = useState<SettingsDairyRecord[]>([]);
  const [offices, setOffices] = useState<SettingsOfficeRecord[]>([]);
  const [stockItems, setStockItems] = useState<StockItemRecord[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseRecord[]>([]);

  const [shopForm, setShopForm] = useState({ id: "", name: "" });
  const [staffForm, setStaffForm] = useState({
    id: "",
    name: "",
    monthlySalary: "",
    joinDate: new Date().toISOString().split("T")[0],
    shop: "",
  });
  const [dairyForm, setDairyForm] = useState({
    id: "",
    name: "",
    defaultRatePerLiter: "",
    shop: "",
  });
  const [officeForm, setOfficeForm] = useState({
    id: "",
    officeName: "",
    contact: "",
    shop: "",
  });
  const [stockForm, setStockForm] = useState({
    id: "",
    code: "",
    name: "",
    sellingPrice: "",
  });

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffEditDraft, setStaffEditDraft] = useState<SettingsStaffRecord | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "shop" | "staff" | "dairy" | "office" | "stock";
    id: string;
    label: string;
  } | null>(null);

  const loadAll = useCallback(() => {
    ensureSettingsDefaults();
    const shopList = getShops();
    syncFixedExpensesForShops(shopList);
    setShops(shopList);
    setStaff((DB.get("settings_staff") as SettingsStaffRecord[] | null) ?? []);
    setDairies((DB.get("settings_dairies") as SettingsDairyRecord[] | null) ?? []);
    setOffices((DB.get("settings_offices") as SettingsOfficeRecord[] | null) ?? []);
    setStockItems((DB.get("stock_items") as StockItemRecord[] | null) ?? []);
    setFixedExpenses((DB.get("fixed_expenses") as FixedExpenseRecord[] | null) ?? []);
    const defaultShop = shopList[0]?.name ?? "";
    setStaffForm((f) => ({ ...f, shop: f.shop || defaultShop }));
    setDairyForm((f) => ({ ...f, shop: f.shop || defaultShop }));
    setOfficeForm((f) => ({ ...f, shop: f.shop || defaultShop }));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;

    if (type === "shop") {
      const removed = shops.find((s) => s.id === id);
      const next = shops.filter((s) => s.id !== id);
      DB.set("shops", next);
      if (removed) {
        const nextStaff = staff.filter((s) => s.shop !== removed.name);
        DB.set("settings_staff", nextStaff);
        const nextDairies = dairies.filter((d) => d.shop !== removed.name);
        DB.set("settings_dairies", nextDairies);
        const nextOffices = offices.filter((o) => o.shop !== removed.name);
        DB.set("settings_offices", nextOffices);
      }
      syncFixedExpensesForShops(next);
      toast({ title: "Shop deleted", description: `"${deleteTarget.label}" removed.` });
    } else if (type === "staff") {
      DB.set(
        "settings_staff",
        staff.filter((s) => s.id !== id)
      );
      toast({ title: "Staff deleted", description: `"${deleteTarget.label}" removed.` });
    } else if (type === "dairy") {
      DB.set(
        "settings_dairies",
        dairies.filter((d) => d.id !== id)
      );
      toast({ title: "Dairy deleted", description: `"${deleteTarget.label}" removed.` });
    } else if (type === "office") {
      DB.set(
        "settings_offices",
        offices.filter((o) => o.id !== id)
      );
      toast({ title: "Office deleted", description: `"${deleteTarget.label}" removed.` });
    } else if (type === "stock") {
      const item = stockItems.find((s) => s.id === id);
      if (item?.isDefault) {
        toast({
          variant: "destructive",
          title: "Cannot delete",
          description: "Default stock items cannot be removed.",
        });
        setDeleteTarget(null);
        return;
      }
      DB.set(
        "stock_items",
        stockItems.filter((s) => s.id !== id)
      );
      toast({ title: "Stock item deleted", description: `"${deleteTarget.label}" removed.` });
    }

    setDeleteTarget(null);
    loadAll();
  };

  // ——— Shops ———
  const saveShop = () => {
    const name = shopForm.name.trim().toUpperCase();
    if (!name) {
      toast({ variant: "destructive", title: "Name required", description: "Enter a shop name." });
      return;
    }
    let next: ShopRecord[];
    if (shopForm.id) {
      const old = shops.find((s) => s.id === shopForm.id);
      next = shops.map((s) => (s.id === shopForm.id ? { ...s, name } : s));
      if (old && old.name !== name) {
        const patchName = (shop: string) => (shop === old.name ? name : shop);
        const nextStaff = staff.map((s) => ({ ...s, shop: patchName(s.shop) }));
        const nextDairies = dairies.map((d) => ({ ...d, shop: patchName(d.shop) }));
        const nextOffices = offices.map((o) => ({ ...o, shop: patchName(o.shop) }));
        const nextFixed = fixedExpenses.map((f) =>
          f.shop === old.name ? { ...f, shop: name } : f
        );
        DB.set("settings_staff", nextStaff);
        DB.set("settings_dairies", nextDairies);
        DB.set("settings_offices", nextOffices);
        DB.set("fixed_expenses", nextFixed);
      }
      toast({ title: "Shop updated", description: `${name} saved.` });
    } else {
      if (shops.some((s) => s.name === name)) {
        toast({ variant: "destructive", title: "Duplicate", description: "Shop already exists." });
        return;
      }
      next = [...shops, { id: slugId("shop"), name }];
      toast({ title: "Shop added", description: `${name} created.` });
    }
    DB.set("shops", next);
    syncFixedExpensesForShops(next);
    setShopForm({ id: "", name: "" });
    loadAll();
  };

  // ——— Staff ———
  const saveStaff = () => {
    const name = staffForm.name.trim();
    const salary = parseFloat(staffForm.monthlySalary);
    if (!name || isNaN(salary) || salary < 0) {
      toast({ variant: "destructive", title: "Invalid staff", description: "Name and valid salary required." });
      return;
    }
    const payload: SettingsStaffRecord = {
      id: staffForm.id || slugId("staff"),
      name,
      monthlySalary: salary,
      joinDate: staffForm.joinDate,
      shop: staffForm.shop || shops[0]?.name || "",
    };
    const next = staffForm.id
      ? staff.map((s) => (s.id === staffForm.id ? payload : s))
      : [...staff, payload];
    DB.set("settings_staff", next);
    toast({
      title: staffForm.id ? "Staff updated" : "Staff added",
      description: `${name} saved.`,
    });
    setStaffForm({
      id: "",
      name: "",
      monthlySalary: "",
      joinDate: new Date().toISOString().split("T")[0],
      shop: shops[0]?.name ?? "",
    });
    loadAll();
  };

  const startStaffInlineEdit = (row: SettingsStaffRecord) => {
    setEditingStaffId(row.id);
    setStaffEditDraft({ ...row });
  };

  const saveStaffInline = () => {
    if (!staffEditDraft) return;
    const name = staffEditDraft.name.trim();
    if (!name) {
      toast({ variant: "destructive", title: "Name required", description: "Staff name cannot be empty." });
      return;
    }
    const next = staff.map((s) => (s.id === staffEditDraft.id ? staffEditDraft : s));
    DB.set("settings_staff", next);
    toast({ title: "Staff updated", description: `${name} saved.` });
    setEditingStaffId(null);
    setStaffEditDraft(null);
    loadAll();
  };

  // ——— Dairies ———
  const saveDairy = () => {
    const name = dairyForm.name.trim();
    const rate = parseFloat(dairyForm.defaultRatePerLiter);
    if (!name || isNaN(rate) || rate < 0) {
      toast({ variant: "destructive", title: "Invalid dairy", description: "Name and rate required." });
      return;
    }
    const payload: SettingsDairyRecord = {
      id: dairyForm.id || slugId("dairy"),
      name,
      defaultRatePerLiter: rate,
      shop: dairyForm.shop || shops[0]?.name || "",
    };
    const next = dairyForm.id
      ? dairies.map((d) => (d.id === dairyForm.id ? payload : d))
      : [...dairies, payload];
    DB.set("settings_dairies", next);
    toast({
      title: dairyForm.id ? "Dairy updated" : "Dairy added",
      description: `${name} saved.`,
    });
    setDairyForm({ id: "", name: "", defaultRatePerLiter: "", shop: shops[0]?.name ?? "" });
    loadAll();
  };

  const editDairy = (row: SettingsDairyRecord) => {
    setDairyForm({
      id: row.id,
      name: row.name,
      defaultRatePerLiter: String(row.defaultRatePerLiter),
      shop: row.shop,
    });
  };

  // ——— Offices ———
  const saveOffice = () => {
    const officeName = officeForm.officeName.trim();
    if (!officeName) {
      toast({ variant: "destructive", title: "Name required", description: "Office name is required." });
      return;
    }
    const payload: SettingsOfficeRecord = {
      id: officeForm.id || slugId("office"),
      officeName,
      contact: officeForm.contact.trim(),
      shop: officeForm.shop || shops[0]?.name || "",
    };
    const next = officeForm.id
      ? offices.map((o) => (o.id === officeForm.id ? payload : o))
      : [...offices, payload];
    DB.set("settings_offices", next);
    toast({
      title: officeForm.id ? "Office updated" : "Office added",
      description: `${officeName} saved.`,
    });
    setOfficeForm({ id: "", officeName: "", contact: "", shop: shops[0]?.name ?? "" });
    loadAll();
  };

  const editOffice = (row: SettingsOfficeRecord) => {
    setOfficeForm({
      id: row.id,
      officeName: row.officeName,
      contact: row.contact,
      shop: row.shop,
    });
  };

  // ——— Stock ———
  const saveStock = () => {
    const code = stockForm.code.trim().toUpperCase();
    const name = stockForm.name.trim();
    const price = parseFloat(stockForm.sellingPrice);
    if (!code || !name || isNaN(price) || price < 0) {
      toast({
        variant: "destructive",
        title: "Invalid item",
        description: "Code, name, and selling price required.",
      });
      return;
    }
    if (!stockForm.id && stockItems.some((s) => s.code === code)) {
      toast({ variant: "destructive", title: "Duplicate code", description: "Code already exists." });
      return;
    }
    const existing = stockForm.id ? stockItems.find((s) => s.id === stockForm.id) : undefined;
    const payload: StockItemRecord = {
      id: stockForm.id || slugId("stock"),
      code,
      name,
      sellingPrice: price,
      isDefault: existing?.isDefault,
    };
    const next = stockForm.id
      ? stockItems.map((s) => (s.id === stockForm.id ? payload : s))
      : [...stockItems, payload];
    DB.set("stock_items", next);
    toast({
      title: stockForm.id ? "Item updated" : "Item added",
      description: `${code} — ${name} saved.`,
    });
    setStockForm({ id: "", code: "", name: "", sellingPrice: "" });
    loadAll();
  };

  const editStock = (row: StockItemRecord) => {
    setStockForm({
      id: row.id,
      code: row.code,
      name: row.name,
      sellingPrice: String(row.sellingPrice),
    });
  };

  const updateStockPrice = (id: string, sellingPrice: number) => {
    const next = stockItems.map((s) =>
      s.id === id ? { ...s, sellingPrice } : s
    );
    DB.set("stock_items", next);
    loadAll();
  };

  // ——— Fixed expenses ———
  const saveFixedExpense = (row: FixedExpenseRecord) => {
    const next = fixedExpenses.map((f) => (f.id === row.id ? row : f));
    DB.set("fixed_expenses", next);
    toast({ title: "Fixed expenses saved", description: `${row.shop} updated.` });
    loadAll();
  };

  const updateTheme = (theme: string) => {
    localStorage.setItem("theme", theme);
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    
    const isDarkMode = theme === "dark" || (theme === "classic" && localStorage.getItem("darkMode") === "true");
    if (isDarkMode) {
      html.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
    
    toast({ title: "Theme updated", description: `Applied ${theme} theme.` });
    window.location.reload(); // Refresh to ensure all components sync
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black font-headline text-primary uppercase">
            Master Settings
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
            <Settings className="w-4 h-4" />
            Shops, staff, dairies, offices, stock & fixed expenses
          </p>
          <div className="flex items-center gap-2">
            <Link href="/vendors">
              <Button variant="outline" className="h-11 rounded-xl font-bold">
                Manage Vendors
              </Button>
            </Link>
          </div>
        </header>

        <Tabs defaultValue="shops" className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto min-h-12 flex flex-wrap gap-1 w-full justify-start">
            <TabsTrigger value="shops" className="rounded-lg font-bold text-xs sm:text-sm">
              <Store className="w-3.5 h-3.5 mr-1 hidden sm:inline" /> Shops
            </TabsTrigger>
            <TabsTrigger value="staff" className="rounded-lg font-bold text-xs sm:text-sm">
              <Users className="w-3.5 h-3.5 mr-1 hidden sm:inline" /> Staff
            </TabsTrigger>
            <TabsTrigger value="dairies" className="rounded-lg font-bold text-xs sm:text-sm">
              <Milk className="w-3.5 h-3.5 mr-1 hidden sm:inline" /> Dairies
            </TabsTrigger>
            <TabsTrigger value="offices" className="rounded-lg font-bold text-xs sm:text-sm">
              <Building2 className="w-3.5 h-3.5 mr-1 hidden sm:inline" /> Offices
            </TabsTrigger>
            <TabsTrigger value="stock" className="rounded-lg font-bold text-xs sm:text-sm">
              <Package className="w-3.5 h-3.5 mr-1 hidden sm:inline" /> Stock Items
            </TabsTrigger>
            <TabsTrigger value="fixed" className="rounded-lg font-bold text-xs sm:text-sm">
              <Receipt className="w-3.5 h-3.5 mr-1 hidden sm:inline" /> Fixed Expenses
            </TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-lg font-bold text-xs sm:text-sm">
              <Settings className="w-3.5 h-3.5 mr-1 hidden sm:inline" /> Appearance
            </TabsTrigger>
          </TabsList>

          {/* TAB 7 — Appearance */}
          <TabsContent value="appearance">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader>
                <CardTitle className="font-headline">Appearance & Theme</CardTitle>
                <CardDescription>Personalize your MagicTea Elite experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ThemeOption
                    id="classic"
                    label="Classic Brown"
                    description="The original tea-inspired theme."
                    colors={["bg-[#5C3B28]", "bg-[#C6A052]"]}
                    onClick={() => updateTheme("classic")}
                  />
                  <ThemeOption
                    id="dark"
                    label="Dark Mode"
                    description="Easy on the eyes for late nights."
                    colors={["bg-slate-900", "bg-[#C6A052]"]}
                    onClick={() => updateTheme("dark")}
                  />
                  <ThemeOption
                    id="green"
                    label="Green Tea"
                    description="Fresh and soothing matcha theme."
                    colors={["bg-[#2D5A27]", "bg-[#8EBC72]"]}
                    onClick={() => updateTheme("green")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 1 — Shops */}
          <TabsContent value="shops">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline">Shops</CardTitle>
                <CardDescription>Default: NAVLAKHA, NOVELTY. Add or manage branches.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Shop name (e.g. NAVLAKHA)"
                    value={shopForm.name}
                    onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                    className="h-12 rounded-xl flex-1 uppercase"
                  />
                  <Button className="h-12 rounded-xl font-black bg-primary shrink-0" onClick={saveShop}>
                    <Save className="w-4 h-4 mr-2" />
                    {shopForm.id ? "Update Shop" : "Add Shop"}
                  </Button>
                  {shopForm.id && (
                    <Button
                      variant="outline"
                      className="h-12 rounded-xl"
                      onClick={() => setShopForm({ id: "", name: "" })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="overflow-x-auto rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-black">Shop Name</TableHead>
                        <TableHead className="text-right font-black">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shops.map((shop) => (
                        <TableRow key={shop.id}>
                          <TableCell className="font-bold">{shop.name}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg"
                              onClick={() => setShopForm({ id: shop.id, name: shop.name })}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive rounded-lg"
                              onClick={() =>
                                setDeleteTarget({ type: "shop", id: shop.id, label: shop.name })
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* TAB 2 — Staff */}
          <TabsContent value="staff">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline">Staff</CardTitle>
                <CardDescription>Manage staff per shop. Click edit for inline changes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-400">Name</Label>
                    <Input
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-400">Monthly Salary ₹</Label>
                    <Input
                      type="number"
                      value={staffForm.monthlySalary}
                      onChange={(e) => setStaffForm({ ...staffForm, monthlySalary: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-400">Join Date</Label>
                    <Input
                      type="date"
                      value={staffForm.joinDate}
                      onChange={(e) => setStaffForm({ ...staffForm, joinDate: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-400">Shop</Label>
                    <ShopSelect
                      value={staffForm.shop}
                      onChange={(v) => setStaffForm({ ...staffForm, shop: v })}
                      shops={shops}
                    />
                  </div>
                </div>
                <Button className="w-full sm:w-auto h-11 rounded-xl font-black bg-primary" onClick={saveStaff}>
                  <Plus className="w-4 h-4 mr-2" />
                  {staffForm.id ? "Update Staff" : "Add Staff"}
                </Button>
                <div className="overflow-x-auto rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-black">Name</TableHead>
                        <TableHead className="font-black">Salary</TableHead>
                        <TableHead className="font-black">Shop</TableHead>
                        <TableHead className="text-right font-black">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((row) =>
                        editingStaffId === row.id && staffEditDraft ? (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Input
                                value={staffEditDraft.name}
                                onChange={(e) =>
                                  setStaffEditDraft({ ...staffEditDraft, name: e.target.value })
                                }
                                className="h-9 rounded-lg"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={staffEditDraft.monthlySalary}
                                onChange={(e) =>
                                  setStaffEditDraft({
                                    ...staffEditDraft,
                                    monthlySalary: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-9 rounded-lg w-28"
                              />
                            </TableCell>
                            <TableCell>
                              <ShopSelect
                                value={staffEditDraft.shop}
                                onChange={(v) =>
                                  setStaffEditDraft({ ...staffEditDraft, shop: v })
                                }
                                shops={shops}
                                className="h-9 rounded-lg"
                              />
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button size="sm" className="rounded-lg" onClick={saveStaffInline}>
                                <Save className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-lg"
                                onClick={() => {
                                  setEditingStaffId(null);
                                  setStaffEditDraft(null);
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow key={row.id}>
                            <TableCell className="font-bold">{row.name}</TableCell>
                            <TableCell>₹{row.monthlySalary.toLocaleString()}</TableCell>
                            <TableCell>
                              <span className="text-xs font-bold uppercase text-slate-500">{row.shop}</span>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                onClick={() => startStaffInlineEdit(row)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive rounded-lg"
                                onClick={() =>
                                  setDeleteTarget({ type: "staff", id: row.id, label: row.name })
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3 — Dairies */}
          <TabsContent value="dairies">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline">Dairies</CardTitle>
                <CardDescription>Suppliers with default rate per liter.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Dairy Name</Label>
                    <Input
                      value={dairyForm.name}
                      onChange={(e) => setDairyForm({ ...dairyForm, name: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-400">Rate / Liter ₹</Label>
                    <Input
                      type="number"
                      value={dairyForm.defaultRatePerLiter}
                      onChange={(e) =>
                        setDairyForm({ ...dairyForm, defaultRatePerLiter: e.target.value })
                      }
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-400">Shop</Label>
                    <ShopSelect
                      value={dairyForm.shop}
                      onChange={(v) => setDairyForm({ ...dairyForm, shop: v })}
                      shops={shops}
                    />
                  </div>
                </div>
                <Button className="h-11 rounded-xl font-black bg-primary" onClick={saveDairy}>
                  <Plus className="w-4 h-4 mr-2" />
                  {dairyForm.id ? "Update Dairy" : "Add Dairy"}
                </Button>
                <div className="overflow-x-auto rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-black">Dairy Name</TableHead>
                        <TableHead className="font-black">Rate</TableHead>
                        <TableHead className="font-black">Shop</TableHead>
                        <TableHead className="text-right font-black">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dairies.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-bold">{row.name}</TableCell>
                          <TableCell>₹{row.defaultRatePerLiter}/L</TableCell>
                          <TableCell>{row.shop}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => editDairy(row)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive rounded-lg"
                              onClick={() =>
                                setDeleteTarget({ type: "dairy", id: row.id, label: row.name })
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* TAB 4 — Offices */}
          <TabsContent value="offices">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline">Offices</CardTitle>
                <CardDescription>Corporate clients for bulk tea delivery.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Office Name</Label>
                    <Input
                      value={officeForm.officeName}
                      onChange={(e) => setOfficeForm({ ...officeForm, officeName: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-400">Contact</Label>
                    <Input
                      value={officeForm.contact}
                      onChange={(e) => setOfficeForm({ ...officeForm, contact: e.target.value })}
                      className="h-11 rounded-xl"
                      placeholder="Phone / email"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-400">Shop</Label>
                    <ShopSelect
                      value={officeForm.shop}
                      onChange={(v) => setOfficeForm({ ...officeForm, shop: v })}
                      shops={shops}
                    />
                  </div>
                </div>
                <Button className="h-11 rounded-xl font-black bg-primary" onClick={saveOffice}>
                  <Plus className="w-4 h-4 mr-2" />
                  {officeForm.id ? "Update Office" : "Add Office"}
                </Button>
                <div className="overflow-x-auto rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-black">Office Name</TableHead>
                        <TableHead className="font-black">Contact</TableHead>
                        <TableHead className="font-black">Shop</TableHead>
                        <TableHead className="text-right font-black">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offices.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-bold">{row.officeName}</TableCell>
                          <TableCell>{row.contact || "—"}</TableCell>
                          <TableCell>{row.shop}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => editOffice(row)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive rounded-lg"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "office",
                                  id: row.id,
                                  label: row.officeName,
                                })
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* TAB 5 — Stock Items */}
          <TabsContent value="stock">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline">Stock Items</CardTitle>
                <CardDescription>
                  Default codes pre-loaded. Custom items can be added or removed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-400">Code</Label>
                    <Input
                      value={stockForm.code}
                      onChange={(e) => setStockForm({ ...stockForm, code: e.target.value })}
                      className="h-11 rounded-xl uppercase"
                      disabled={!!stockForm.id && stockItems.find((s) => s.id === stockForm.id)?.isDefault}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Full Name</Label>
                    <Input
                      value={stockForm.name}
                      onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-400">Selling Price ₹</Label>
                    <Input
                      type="number"
                      value={stockForm.sellingPrice}
                      onChange={(e) => setStockForm({ ...stockForm, sellingPrice: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
                <Button className="h-11 rounded-xl font-black bg-primary" onClick={saveStock}>
                  <Save className="w-4 h-4 mr-2" />
                  {stockForm.id ? "Update Item" : "Add Custom Item"}
                </Button>
                <div className="overflow-x-auto rounded-2xl border max-h-[480px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50 z-10">
                      <TableRow>
                        <TableHead className="font-black">Code</TableHead>
                        <TableHead className="font-black">Name</TableHead>
                        <TableHead className="font-black">Price ₹</TableHead>
                        <TableHead className="text-right font-black">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockItems.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono font-bold">{row.code}</TableCell>
                          <TableCell>
                            {row.name}
                            {row.isDefault && (
                              <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">
                                Default
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <InlinePriceInput
                              value={row.sellingPrice}
                              onSave={(price) => {
                                updateStockPrice(row.id, price);
                                toast({
                                  title: "Price updated",
                                  description: `${row.code} → ₹${price}`,
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg"
                              onClick={() => editStock(row)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {!row.isDefault && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive rounded-lg"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "stock",
                                    id: row.id,
                                    label: row.code,
                                  })
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6 — Fixed Expenses */}
          <TabsContent value="fixed">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white">
              <CardHeader>
                <CardTitle className="font-headline">Fixed Expenses</CardTitle>
                <CardDescription>
                  Monthly rent & electricity per shop — auto-fills in expense entries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fixedExpenses.map((row) => (
                  <FixedExpenseRow
                    key={row.id}
                    row={row}
                    onChange={(updated) => {
                      const next = fixedExpenses.map((f) =>
                        f.id === updated.id ? updated : f
                      );
                      setFixedExpenses(next);
                    }}
                    onSave={() => {
                      const current =
                        fixedExpenses.find((f) => f.id === row.id) ?? row;
                      saveFixedExpense(current);
                    }}
                  />
                ))}
                {fixedExpenses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Add shops first to configure fixed expenses.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm delete</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.label}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InlinePriceInput({
  value,
  onSave,
}: {
  value: number;
  onSave: (price: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <Input
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = parseFloat(draft);
        if (!isNaN(n) && n >= 0 && n !== value) onSave(n);
      }}
      className="h-9 w-24 rounded-lg font-bold"
    />
  );
}

function FixedExpenseRow({
  row,
  onChange,
  onSave,
}: {
  row: FixedExpenseRecord;
  onChange: (row: FixedExpenseRecord) => void;
  onSave: () => void;
}) {
  return (
    <div className="p-4 md:p-6 rounded-2xl border bg-slate-50/50 space-y-4">
      <h3 className="font-black text-primary uppercase tracking-wide">{row.shop}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase text-slate-400">Shop Rent ₹</Label>
          <Input
            type="number"
            value={row.shopRent}
            onChange={(e) =>
              onChange({ ...row, shopRent: parseFloat(e.target.value) || 0 })
            }
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold uppercase text-slate-400">Electricity estimate ₹</Label>
          <Input
            type="number"
            value={row.electricityEstimate}
            onChange={(e) =>
              onChange({ ...row, electricityEstimate: parseFloat(e.target.value) || 0 })
            }
            className="h-11 rounded-xl"
          />
        </div>
      </div>
      <Button className="h-10 rounded-xl font-bold bg-primary" onClick={onSave}>
        <Save className="w-4 h-4 mr-2" /> Save {row.shop}
      </Button>
    </div>
  );
}

function ThemeOption({ 
  id, 
  label, 
  description, 
  colors, 
  onClick 
}: { 
  id: string, 
  label: string, 
  description: string, 
  colors: string[], 
  onClick: () => void 
}) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    setActive(localStorage.getItem("theme") === id);
  }, [id]);

  return (
    <div 
      className={cn(
        "p-6 rounded-[2rem] border-2 cursor-pointer transition-all hover:shadow-xl",
        active ? "border-primary bg-primary/5" : "border-slate-100 bg-white"
      )}
      onClick={onClick}
    >
      <div className="flex gap-2 mb-4">
        {colors.map((c, i) => (
          <div key={i} className={cn("w-8 h-8 rounded-full shadow-sm", c)} />
        ))}
      </div>
      <h4 className="font-headline text-lg font-black mb-1">{label}</h4>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
