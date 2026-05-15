
"use client";

import { Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import type { SalesTransaction, SystemSettings } from "@/app/pos/types";
import { format } from "date-fns";

interface PrintReceiptProps {
  order: SalesTransaction;
  settings: SystemSettings;
  onClose: () => void;
}

export function PrintReceipt({ order, settings, onClose }: PrintReceiptProps) {
  const is80mm = settings.printerSize === '80mm';
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-white print:p-0">
      <div className="bg-primary p-6 text-center text-white no-print">
        <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
          <Printer className="w-6 h-6 text-white" />
        </div>
        <DialogTitle className="text-white font-headline text-xl mb-1">Receipt Ready</DialogTitle>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Order #{order.id?.slice(-4) || 'TEMP'}</p>
      </div>
      
      {/* Thermal Receipt Content */}
      <div className={`p-4 mx-auto ${is80mm ? 'w-[80mm]' : 'w-[58mm]'} font-mono text-[11px] leading-tight text-black`}>
        <div className="text-center space-y-1 mb-4">
          <p className="text-sm font-black uppercase">{settings.shopName}</p>
          <p className="text-[9px]">{settings.tagline}</p>
          <div className="h-px bg-black/10 border-b border-dashed my-2" />
          <p className="text-[9px]">{format(new Date(order.timestamp), 'dd/MM/yyyy HH:mm')}</p>
        </div>

        <div className="space-y-1 mb-4">
          <div className="flex justify-between font-bold border-b border-dotted pb-1 mb-1">
            <span className="w-[60%]">Item</span>
            <span className="w-[10%] text-center">Qty</span>
            <span className="w-[30%] text-right">Amt</span>
          </div>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span className="w-[60%] truncate">{item.name}</span>
              <span className="w-[10%] text-center">{item.quantity}</span>
              <span className="w-[30%] text-right">₹{item.total}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t border-dotted pt-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST (5%)</span>
            <span>₹{order.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-black pt-1 border-t mt-1">
            <span>TOTAL</span>
            <span>₹{order.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-4 text-center space-y-2">
          <div className="flex justify-center py-2">
             <div className="p-2 border-2 border-black rounded-lg">
                <QrCode className="w-16 h-16" />
             </div>
          </div>
          <p className="text-[8px] font-bold uppercase">{settings.receiptFooter}</p>
          <p className="text-[8px] italic">Method: {order.paymentMethod.toUpperCase()}</p>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3 bg-slate-50 border-t no-print">
        <Button className="w-full bg-slate-900 text-white rounded-xl h-12 font-black" onClick={handlePrint}>Print Now</Button>
        <Button variant="outline" className="w-full rounded-xl h-12 font-black border-2" onClick={onClose}>Finish</Button>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .receipt-print-area, .receipt-print-area * { visibility: visible; }
          .receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
