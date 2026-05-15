"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  ReceiptText,
  Settings,
  Users,
  ChevronDown,
  Moon,
  Sun,
  Briefcase,
  Truck,
  Wallet,
  Menu,
  X,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "POS", href: "/pos", icon: ShoppingCart },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Vendors", href: "/vendors", icon: Truck },
  { name: "Reports", href: "/reports", icon: ReceiptText },
  { name: "Staff", href: "/staff", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

const vendorSubItems = [
  { name: "Milk", href: "/vendors/milk" },
  { name: "Gas", href: "/vendors/gas" },
  { name: "Distributor", href: "/vendors/distributor" },
  { name: "Payments", href: "/vendors" },
];

export function Navbar() {
  const pathname = usePathname();
  const [activeShop, setActiveShop] = useState<string>("DONO");
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const storedShop = localStorage.getItem("activeShop") || "DONO";
    setActiveShop(storedShop);

    const role = localStorage.getItem("role");
    setUserRole(role);

    const theme = localStorage.getItem("theme") || "classic";
    const darkMode = localStorage.getItem("darkMode") === "true";
    setIsDark(darkMode);
    
    applyTheme(theme, darkMode);
  }, []);

  const applyTheme = (theme: string, darkMode: boolean) => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    if (darkMode || theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  };

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem("darkMode", String(nextDark));
    const currentTheme = localStorage.getItem("theme") || "classic";
    applyTheme(currentTheme, nextDark);
  };

  const handleShopSwitch = (shop: string) => {
    setActiveShop(shop);
    localStorage.setItem("activeShop", shop);
    window.location.reload();
  };

  if (!mounted) return null;

  // Role-aware visibility: restrict vendor management to privileged roles
  const hasVendorAccess = () => {
    if (!mounted) return true;
    if (!userRole) return true; // default visible in dev
    return ["admin", "manager", "owner"].includes(userRole);
  };

  // Filter nav items by role
  const filteredNav = navItems.filter((item) => {
    if (item.name === "Vendors" && !hasVendorAccess()) return false;
    return true;
  });

  // Split items for "More" dropdown: show first 6 items, rest in "More"
  const visibleItems = filteredNav.slice(0, 6);
  const moreItems = filteredNav.slice(6);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b h-16 flex items-center justify-between px-2 md:px-4 shadow-sm">
        <div className="flex items-center gap-2 lg:gap-4">
          <Link href="/" className="flex items-center gap-1.5 shrink-0 mr-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-headline font-bold text-sm">M</span>
            </div>
            <span className="font-headline font-black text-base text-primary tracking-tight hidden md:inline">MagicTea Elite</span>
          </Link>

          {/* DESKTOP NAV - Font 11px, reduced padding */}
          <div className="hidden xl:flex items-center gap-0.5">
            {visibleItems.map((item) => (
              item.name === "Vendors" ? (
                <DropdownMenu key="vendors">
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className={cn(
                      "h-9 px-2 rounded-lg flex items-center gap-1.5 font-bold transition-all",
                      pathname === item.href ? "text-primary bg-primary/5 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5"
                    )}>
                      <item.icon className={cn("w-3.5 h-3.5", pathname === item.href ? "text-primary" : "text-slate-400")} />
                      <span className="text-[11px] uppercase tracking-wider">{item.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44 rounded-xl p-2 shadow-xl border-none">
                    {vendorSubItems.map((s) => (
                      <Link key={s.name} href={s.href}>
                        <DropdownMenuItem className={cn("rounded-lg font-bold py-2.5 px-3 cursor-pointer flex items-center gap-2", pathname === s.href ? "text-primary bg-primary/5" : "text-slate-600")}>{s.name}</DropdownMenuItem>
                      </Link>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <NavLink key={item.name} item={item} isActive={pathname === item.href} />
              )
            ))}

            {/* "More" Dropdown for desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-2 rounded-lg flex items-center gap-1.5 font-bold text-slate-500 hover:text-primary transition-all">
                  <MoreHorizontal className="w-4 h-4" />
                  <span className="text-[11px] uppercase tracking-wider">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 rounded-xl p-2 shadow-xl border-none">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return item.name === "Vendors" ? (
                    // Vendors submenu inside More (if it ends up here)
                    <div key="vendors-sub" className="px-2 py-1">
                      <div className="text-xs font-black uppercase text-slate-400 px-3 py-1">Vendors</div>
                      {vendorSubItems.map((s) => (
                        <Link key={s.name} href={s.href}>
                          <DropdownMenuItem className={cn("rounded-lg font-bold py-2.5 px-3 cursor-pointer flex items-center gap-2", pathname === s.href ? "text-primary bg-primary/5" : "text-slate-600")}>
                            <span className="text-xs uppercase">{s.name}</span>
                          </DropdownMenuItem>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link key={item.name} href={item.href}>
                      <DropdownMenuItem className={cn("rounded-lg font-bold py-2.5 px-3 cursor-pointer flex items-center gap-2", pathname === item.href ? "text-primary bg-primary/5" : "text-slate-600")}>
                        <Icon className="w-4 h-4" />
                        <span className="text-xs uppercase">{item.name}</span>
                      </DropdownMenuItem>
                    </Link>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={toggleDarkMode}>
            {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </Button>

          {/* Shop Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                <div className={cn("w-1.5 h-1.5 rounded-full", activeShop === "DONO" ? "bg-blue-500" : "bg-green-500")} />
                <span className="text-[10px] uppercase tracking-widest">{activeShop}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl p-2 shadow-2xl border-none">
              <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-1.5">Select Shop</DropdownMenuLabel>
              <DropdownMenuItem className="rounded-lg font-bold py-2.5 px-3 cursor-pointer text-xs" onClick={() => handleShopSwitch("NAVLAKHA")}>NAVLAKHA</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg font-bold py-2.5 px-3 cursor-pointer text-xs" onClick={() => handleShopSwitch("NOVELTY")}>NOVELTY</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg font-bold py-2.5 px-3 cursor-pointer text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20" onClick={() => handleShopSwitch("DONO")}>DONO (Combined)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* MOBILE MENU TOGGLE */}
          <Button variant="ghost" size="icon" className="xl:hidden h-9 w-9 rounded-lg" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </nav>

      {/* MOBILE MENU - Full Screen */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 p-6 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-headline font-bold text-lg">M</span>
              </div>
              <span className="font-headline font-black text-xl text-primary uppercase">MagicTea Menu</span>
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="w-6 h-6" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              if (item.name === "Vendors") {
                return (
                  <div key="mobile-vendors" className="col-span-2">
                    <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className={cn(
                        "w-full h-24 rounded-3xl flex flex-col gap-2 font-black text-[10px] uppercase transition-all",
                        isActive ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10" : "border-slate-100 dark:border-slate-800 hover:border-primary/50"
                      )}>
                        <Icon className={cn("w-6 h-6", isActive ? "text-primary" : "text-slate-400")} />
                        {item.name}
                      </Button>
                    </Link>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {vendorSubItems.map((s) => (
                        <Link key={s.name} href={s.href} onClick={() => setIsMobileMenuOpen(false)}>
                          <Button variant="ghost" className="w-full h-14 rounded-2xl text-sm font-bold bg-slate-50">
                            {s.name}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className={cn(
                    "w-full h-24 rounded-3xl flex flex-col gap-2 font-black text-[10px] uppercase transition-all",
                    isActive ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10" : "border-slate-100 dark:border-slate-800 hover:border-primary/50"
                  )}>
                    <Icon className={cn("w-6 h-6", isActive ? "text-primary" : "text-slate-400")} />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="mt-auto pt-6 border-t dark:border-slate-800 flex justify-center">
            <Button variant="outline" className="h-12 w-full rounded-2xl font-black gap-2" onClick={toggleDarkMode}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {isDark ? "Light Mode" : "Dark Mode"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ item, isActive }: { item: any, isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-9 px-2 rounded-lg flex items-center gap-1.5 font-bold transition-all",
          isActive 
            ? "text-primary bg-primary/5 shadow-sm" 
            : "text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5"
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-slate-400")} />
        <span className="text-[11px] uppercase tracking-wider">{item.name}</span>
      </Button>
    </Link>
  );
}
