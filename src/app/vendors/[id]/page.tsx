"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VendorService } from "@/lib/services/vendor-service";
import { AccountingService } from "@/lib/services/accounting-service";
import type { Vendor } from "@/lib/types";
import { useSearchParams } from "next/navigation";

export default function VendorDetailPage() {
  const params = useSearchParams();
  const id = params.get("id") || "";
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<"cash" | "online">("cash");
  const [notes, setNotes] = useState("");
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const v = await VendorService.getVendor(id);
      setVendor(v as Vendor);
      const l = await VendorService.getVendorLedger(id);
      setLedger(l || []);
    })();
  }, [id]);

  const recordPayment = async () => {
    if (!vendor || amount <= 0) return;
    await AccountingService.recordTransaction({
      branchId: vendor.branchId,
      amount,
      type: "outflow",
      category: "vendor_payment",
      paymentMethod: method,
      description: notes || `Payment to ${vendor.name}`,
      vendorId: vendor.id,
      userId: "system",
    } as any);
    const l = await VendorService.getVendorLedger(vendor.id);
    setLedger(l || []);
    setAmount(0);
    setNotes("");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 pt-20 pb-24">
        <Card className="p-6">
          <h1 className="text-2xl font-black">{vendor?.name || "Vendor"}</h1>
          <p className="text-sm text-slate-500">{vendor?.contact} • {vendor?.branchId}</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-3">Record Payment</h3>
              <div className="space-y-3">
                <div>
                  <Label>Amount</Label>
                  <Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Method</Label>
                  <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="w-full p-2 rounded-md border">
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <Button onClick={recordPayment}>Record Payment</Button>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3">Payment History</h3>
              <div className="space-y-2 max-h-80 overflow-auto">
                {ledger.map((l) => (
                  <div key={l.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between">
                      <div className="font-bold">₹{l.amount}</div>
                      <div className="text-sm text-slate-500">{l.paymentMethod || l.type}</div>
                    </div>
                    <div className="text-sm text-slate-500">{l.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
