import { DB } from "@/lib/storage";

export interface ShopRecord {
  id: string;
  name: string;
}

export interface SettingsStaffRecord {
  id: string;
  name: string;
  monthlySalary: number;
  joinDate: string;
  shop: string;
}

export interface SettingsDairyRecord {
  id: string;
  name: string;
  defaultRatePerLiter: number;
  shop: string;
}

export interface SettingsOfficeRecord {
  id: string;
  officeName: string;
  contact: string;
  shop: string;
}

export interface StockItemRecord {
  id: string;
  code: string;
  name: string;
  sellingPrice: number;
  isDefault?: boolean;
}

export interface FixedExpenseRecord {
  id: string;
  shop: string;
  shopRent: number;
  electricityEstimate: number;
}

const DEFAULT_SHOPS: ShopRecord[] = [
  { id: "shop_navlakha", name: "NAVLAKHA" },
  { id: "shop_novelty", name: "NOVELTY" },
];

const DEFAULT_STOCK_DATA: { code: string; name: string; sellingPrice: number }[] = [
  { code: 'AM', name: 'Aam Panna', sellingPrice: 35 },
  { code: 'BFP', name: 'Bhakarwadi FP', sellingPrice: 15 },
  { code: 'BSP', name: 'Bhakarwadi SP', sellingPrice: 99 },
  { code: 'BT', name: 'Butter Toast', sellingPrice: 30 },
  { code: 'HC', name: 'Hot Coffee', sellingPrice: 30 },
  { code: 'CC', name: 'Cold Coffee', sellingPrice: 50 },
  { code: 'CR', name: 'Cream Roll', sellingPrice: 14 },
  { code: 'GT', name: 'Ginger Tea', sellingPrice: 30 },
  { code: 'JT', name: 'Jaggery Tea', sellingPrice: 24 },
  { code: 'JCR', name: 'Jaggery Cream Roll', sellingPrice: 16 },
  { code: 'JOC', name: 'Jaggery Oat Cookies', sellingPrice: 23 },
  { code: 'LHMT', name: 'Lemon Honey Mint Tea', sellingPrice: 25 },
  { code: 'LSC', name: 'Less Sugar Cold', sellingPrice: 35 },
  { code: 'LST', name: 'Less Sugar Tea', sellingPrice: 30 },
  { code: 'NS', name: 'Normal Sugar Tea', sellingPrice: 12 },
  { code: 'PIT', name: 'Peach Ice Tea', sellingPrice: 35 },
  { code: 'RM', name: 'Rose Milk', sellingPrice: 50 },
  { code: 'SC', name: 'Sponge Cake', sellingPrice: 23 },
  { code: 'TM', name: 'Turmeric Milk', sellingPrice: 30 },
  { code: 'WST', name: 'Without Sugar Tea', sellingPrice: 30 },
];

function makeDefaultStockItems(): StockItemRecord[] {
  return DEFAULT_STOCK_DATA.map((item) => ({
    id: `stock_${item.code.toLowerCase()}`,
    code: item.code,
    name: item.name,
    sellingPrice: item.sellingPrice,
    isDefault: true,
  }));
}

export function ensureSettingsDefaults() {
  if (!DB.get("shops")) {
    DB.set("shops", DEFAULT_SHOPS);
  }
  if (!DB.get("settings_staff")) {
    DB.set("settings_staff", []);
  }
  if (!DB.get("settings_dairies")) {
    DB.set("settings_dairies", []);
  }
  if (!DB.get("settings_offices")) {
    DB.set("settings_offices", []);
  }
  if (!DB.get("stock_items")) {
    DB.set("stock_items", makeDefaultStockItems());
  }
  if (!DB.get("fixed_expenses")) {
    const shops = (DB.get("shops") as ShopRecord[] | null) ?? DEFAULT_SHOPS;
    DB.set(
      "fixed_expenses",
      shops.map((s) => ({
        id: `fixed_${s.id}`,
        shop: s.name,
        shopRent: 0,
        electricityEstimate: 0,
      }))
    );
  }
}

export function getShops(): ShopRecord[] {
  ensureSettingsDefaults();
  return (DB.get("shops") as ShopRecord[] | null) ?? DEFAULT_SHOPS;
}

export function getShopNames(): string[] {
  return getShops().map((s) => s.name);
}

export function getSettingsStaff(): SettingsStaffRecord[] {
  ensureSettingsDefaults();
  return (DB.get("settings_staff") as SettingsStaffRecord[] | null) ?? [];
}

export function getSettingsDairies(): SettingsDairyRecord[] {
  ensureSettingsDefaults();
  return (DB.get("settings_dairies") as SettingsDairyRecord[] | null) ?? [];
}

export function getSettingsOffices(): SettingsOfficeRecord[] {
  ensureSettingsDefaults();
  return (DB.get("settings_offices") as SettingsOfficeRecord[] | null) ?? [];
}

export function getStockItems(): StockItemRecord[] {
  ensureSettingsDefaults();
  return (DB.get("stock_items") as StockItemRecord[] | null) ?? makeDefaultStockItems();
}

export function getFixedExpenses(): FixedExpenseRecord[] {
  ensureSettingsDefaults();
  return (DB.get("fixed_expenses") as FixedExpenseRecord[] | null) ?? [];
}

export function getFixedExpenseForShop(shopName: string): FixedExpenseRecord | undefined {
  return getFixedExpenses().find((f) => f.shop === shopName);
}

export function syncFixedExpensesForShops(shops: ShopRecord[]) {
  const existing = getFixedExpenses();
  const merged: FixedExpenseRecord[] = shops.map((s) => {
    const found = existing.find((f) => f.shop === s.name);
    return (
      found ?? {
        id: `fixed_${s.id}`,
        shop: s.name,
        shopRent: 0,
        electricityEstimate: 0,
      }
    );
  });
  DB.set("fixed_expenses", merged);
}

export function getDairyNamesForShop(shop?: string): string[] {
  const list = getSettingsDairies();
  const filtered = shop ? list.filter((d) => d.shop === shop) : list;
  return filtered.map((d) => d.name);
}

export function getOfficeNamesForShop(shop?: string): string[] {
  const list = getSettingsOffices();
  const filtered = shop ? list.filter((o) => o.shop === shop) : list;
  return filtered.map((o) => o.officeName);
}

export function getDefaultDairyRate(name: string, shop?: string): number {
  const dairy = getSettingsDairies().find(
    (d) => d.name === name && (!shop || d.shop === shop)
  );
  return dairy?.defaultRatePerLiter ?? 0;
}
