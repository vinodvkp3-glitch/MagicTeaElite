
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { CartPanel } from "@/components/pos/CartPanel";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Coffee, Snowflake, Cake, Droplet, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PrintReceipt } from "@/components/pos/PrintReceipt";
import { logger } from "@/lib/utils";
import { DB } from "@/lib/storage";
import type { MenuItem, MenuCategory, CartItem, SalesTransaction, Customer, SystemSettings } from "@/lib/types";

const FALLBACK_CATEGORIES: MenuCategory[] = [
  { id: "hot", name: "Hot Tea", order: 0 },
  { id: "water", name: "Water Base", order: 1 },
  { id: "cold", name: "Cold Beverages", order: 2 },
  { id: "bakery", name: "Bakery", order: 3 },
];

const DEFAULT_SETTINGS: SystemSettings = {
  shopName: "The Magic Tea",
  tagline: "Premium Tea Experience",
  currency: "INR",
  taxRate: 5,
  autoBackup: true,
  lowStockAlert: true,
  printerEnabled: true,
  printerSize: "58mm",
  receiptHeader: "Thank you for visiting The Magic Tea!",
  receiptFooter: "Come back for more magic in every sip.",
};

const categoryIconMap: Record<string, typeof Coffee> = {
  hot: Coffee,
  water: Droplet,
  cold: Snowflake,
  bakery: Cake,
};

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<SalesTransaction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>(FALLBACK_CATEGORIES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeBranchId, setActiveBranchId] = useState("main_branch");
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isOnline, setIsOnline] = useState(true);

  const lastCheckoutTime = useRef<number>(0);
  const { toast } = useToast();

  const loadMenuData = () => {
    const categories = (DB.get("menu_categories") as MenuCategory[] | null) ?? [];
    const items = (DB.get("menu_items") as MenuItem[] | null) ?? [];
    const config = DB.get("system_config") as SystemSettings | null;

    if (categories.length === 0) {
      DB.set("menu_categories", FALLBACK_CATEGORIES);
      setMenuCategories(FALLBACK_CATEGORIES);
    } else {
      setMenuCategories([...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    }

    setMenuItems(items);
    if (config) setSettings(config);
  };

  useEffect(() => {
    const bid = localStorage.getItem("activeBranchId") || "main_branch";
    setActiveBranchId(bid);
    loadMenuData();

    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * i.price,
              }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1, total: item.price }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              quantity: Math.max(1, i.quantity + delta),
              total: Math.max(1, i.quantity + delta) * i.price,
            }
          : i
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const cartTotal = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const tax = (subtotal * (settings?.taxRate || 5)) / 100;
    return { subtotal, tax, total: subtotal + tax };
  }, [cart, settings]);

  const orderItemsName = (items: CartItem[]) =>
    items.map((i) => i.name).join(", ");

  const filteredItems = menuItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const categoriesToShow =
    menuCategories.length > 0 ? menuCategories : FALLBACK_CATEGORIES;

  const handleCheckout = async (method: "cash" | "online") => {
    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Cart Empty",
        description: "Please add items before checkout.",
      });
      return;
    }

    const now = Date.now();
    if (now - lastCheckoutTime.current < 2000) {
      logger.warn("Duplicate checkout attempt blocked.");
      return;
    }
    lastCheckoutTime.current = now;

    setIsProcessing(true);

    const transactionData: SalesTransaction = {
      branchId: activeBranchId,
      items: cart,
      ...cartTotal,
      paymentMethod: method,
      timestamp: new Date().toISOString(),
      staffId: "staff_1",
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      loyaltyPointsEarned: Math.floor(cartTotal.total / 10),
      isOffline: false,
      createdAt: new Date().toISOString(),
    };

    try {
      DB.push("sales_transactions", transactionData as unknown as Record<string, unknown>);
      const saleId = Date.now().toString();

      const deductions: Record<string, { qty: number; name: string }> = {};
      cart.forEach((item) => {
        item.recipe?.forEach((ing) => {
          if (!deductions[ing.id]) {
            deductions[ing.id] = { qty: 0, name: ing.name };
          }
          deductions[ing.id].qty += ing.qty * item.quantity;
        });
      });

      const ingredients = (DB.get("ingredients") as import("@/lib/types").Ingredient[] | null) ?? [];
      for (const [id, data] of Object.entries(deductions)) {
        const ing = ingredients.find((i) => i.id === id);
        if (ing) {
          DB.update("ingredients", id, {
            currentStock: Math.max(0, ing.currentStock - data.qty),
            lastUpdated: new Date().toISOString(),
          });
        }

        DB.push("stock_transactions", {
          ingredientId: id,
          ingredientName: data.name,
          change: -data.qty,
          type: "deduction",
          reason: `Sale: ${orderItemsName(cart)}`,
          timestamp: new Date().toISOString(),
          branchId: activeBranchId,
        });
      }

      setLastOrder({ ...transactionData, id: saleId });
      setCart([]);
      setSelectedCustomer(null);
      setShowReceipt(true);
      toast({
        title: "Order Confirmed",
        description: `Billed ₹${cartTotal.total.toFixed(2)}`,
      });
    } catch (error) {
      logger.error("Checkout failed:", error);
      toast({
        variant: "destructive",
        title: "System Error",
        description: "Could not process checkout. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFDFD]">
      <Navbar />
      <main className="flex-1 flex flex-col md:flex-row pt-4 md:pt-20 h-screen overflow-hidden">
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search menu..."
                className="pl-10 h-12 bg-muted/20 border-none shadow-sm rounded-xl text-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-white px-4 rounded-xl border shadow-sm h-12">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-xs font-bold uppercase hidden sm:inline">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          <Tabs
            defaultValue={categoriesToShow[0]?.id || "hot"}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="bg-muted/30 p-1 h-14 w-full flex overflow-x-auto no-scrollbar justify-start mb-4 rounded-xl">
              {categoriesToShow.map((cat) => {
                const Icon = categoryIconMap[cat.id] || Coffee;
                return (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.id}
                    className="flex-1 min-w-[110px] gap-2 font-black data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{cat.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {categoriesToShow.map((cat) => (
              <TabsContent
                key={cat.id}
                value={cat.id}
                className="flex-1 overflow-y-auto no-scrollbar pb-32 md:pb-10 focus-visible:outline-none"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredItems
                    .filter((i) => i.categoryId === cat.id)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="group flex flex-col items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl shadow-sm hover:border-primary/40 hover:shadow-xl transition-all active:scale-95 text-center relative h-[160px]"
                      >
                        <div className="flex-1 flex items-center justify-center">
                          <span className="font-bold text-sm leading-tight text-slate-700">
                            {item.name}
                          </span>
                        </div>
                        <div className="w-full pt-3 border-t border-dashed mt-2">
                          <span className="text-primary font-black block text-xl">
                            ₹{item.price}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="hidden md:flex w-96 flex-shrink-0 border-l bg-white shadow-2xl">
          <CartPanel
            items={cart}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onCheckout={handleCheckout}
            isProcessing={isProcessing}
            customer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
          />
        </div>
      </main>

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-[380px] p-0 overflow-hidden border-none shadow-2xl rounded-[3rem]">
          {lastOrder && settings && (
            <PrintReceipt
              order={lastOrder}
              settings={settings}
              onClose={() => setShowReceipt(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {isProcessing && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[100] flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="font-bold text-slate-800">Processing Sale...</p>
          </div>
        </div>
      )}
    </div>
  );
}
