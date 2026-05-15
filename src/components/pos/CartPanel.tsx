
"use client";

import { useState } from "react";
import { Trash2, Plus, Minus, CreditCard, Banknote, ShoppingCart, Loader2, UserPlus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { DB } from "@/lib/storage";
import type { CartItem, Customer } from "@/app/pos/types";

interface CartPanelProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: (method: 'cash' | 'online') => void;
  isProcessing?: boolean;
  customer: Customer | null;
  onSelectCustomer: (c: Customer | null) => void;
}

export function CartPanel({ items, onUpdateQuantity, onRemove, onCheckout, isProcessing, customer, onSelectCustomer }: CartPanelProps) {
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05; 
  const total = subtotal + tax;

  const handleCustomerSearch = async () => {
    if (phoneSearch.length < 10) return;
    setSearchingCustomer(true);
    try {
      const customers = (DB.get("customers") as Customer[] | null) ?? [];
      const found = customers.find((c) => c.phone === phoneSearch);
      if (found) {
        onSelectCustomer(found);
      }
    } finally {
      setSearchingCustomer(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b bg-primary/5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-black font-headline text-primary">Order</h2>
            <p className="text-xs text-muted-foreground font-bold tracking-tight">{items.reduce((s, i) => s + i.quantity, 0)} ITEMS SELECTED</p>
          </div>
          <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm">ACTIVE</span>
        </div>

        {!customer ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input 
                placeholder="Customer Phone No." 
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomerSearch()}
                className="pl-8 h-9 rounded-xl text-xs bg-white"
              />
            </div>
            <Button size="sm" variant="outline" className="h-9 rounded-xl px-3 border-2" onClick={handleCustomerSearch} disabled={searchingCustomer}>
              {searchingCustomer ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-xl border border-secondary/20">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-secondary text-white rounded-full"><ShoppingCart className="w-3 h-3" /></div>
              <div>
                <p className="text-xs font-black text-secondary">{customer.name}</p>
                <p className="text-[10px] text-muted-foreground">{customer.points} Loyalty Pts</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => onSelectCustomer(null)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-6">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20">
            <ShoppingCart className="w-16 h-16 mb-4" />
            <p className="font-bold">Cart is empty</p>
            <p className="text-xs">Select items from the menu</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 group">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm leading-tight">{item.name}</h4>
                    <button onClick={() => onRemove(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-0.5 border">
                      <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md transition-all"><Minus className="w-3 h-3" /></button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md transition-all"><Plus className="w-3 h-3" /></button>
                    </div>
                    <span className="font-black text-primary">₹{item.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-6 bg-slate-50 border-t space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground font-medium">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground font-medium">
            <span>Tax (5%)</span>
            <span>₹{tax.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center pt-1">
            <span className="text-lg font-black text-slate-800">Total</span>
            <span className="text-2xl font-black text-primary">₹{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-14 rounded-2xl border-2 font-black flex flex-col gap-0.5 hover:bg-white" 
            onClick={() => onCheckout('cash')}
            disabled={items.length === 0 || isProcessing}
          >
            <Banknote className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">CASH</span>
          </Button>
          <Button 
            className="h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black flex flex-col gap-0.5 shadow-lg shadow-primary/20" 
            onClick={() => onCheckout('online')}
            disabled={items.length === 0 || isProcessing}
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5 mb-0.5" />}
            <span className="text-[10px]">ONLINE</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
