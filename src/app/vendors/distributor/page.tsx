"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { VendorService } from "@/lib/services/vendor-service";
import type { DistributorInvoice } from "@/lib/types";

export default function DistributorPage() {
  const [vendorId, setVendorId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
    const [itemsJson, setItemsJson] = useState("[]");
  const [invoices, setInvoices] = useState<DistributorInvoice[]>([]);

  useEffect(() => {
    (async () => {
      if (!vendorId) return;
      const inv = await VendorService.getDistributorInvoicesForVendor(vendorId);
      setInvoices(inv as DistributorInvoice[]);
    })();
  }, [vendorId]);

  const createInvoice = async () => {
    try {
      const items = JSON.parse(itemsJson) as any[];
      const subtotal = items.reduce((s, it) => s + (it.total || 0), 0);
      const inv: DistributorInvoice = {
        vendorId,
        branchId: "",
        invoiceNumber,
        date: new Date().toISOString().slice(0, 10),
        items,
        subtotal,
        tax: 0,
        total: subtotal,
        paid: 0,
        status: "open",
      };
      await VendorService.recordDistributorInvoice(inv as any);
      const invs = await VendorService.getDistributorInvoicesForVendor(vendorId);
      setInvoices(invs as DistributorInvoice[]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-24">
        <header className="mb-6">
          <h1 className="text-3xl font-black">Distributor Invoices</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h2 className="font-bold mb-4">Create Invoice</h2>
            <div className="space-y-3">
              <div>
                <Label>Vendor ID</Label>
                <Input value={vendorId} onChange={(e) => setVendorId(e.target.value)} />
              </div>
              <div>
                <Label>Invoice No</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
              <div>
                <Label>Items (JSON)</Label>
                <Input value={itemsJson} onChange={(e) => setItemsJson(e.target.value)} />
              </div>
              <Button onClick={createInvoice}>Create</Button>
            </div>
          </Card>

          <div className="md:col-span-2">
            <Card className="p-6">
              <h2 className="font-bold mb-4">Invoices</h2>
              <div className="space-y-3">
                {invoices.map((i) => (
                  <div key={i.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between">
                      <div className="font-bold">{i.invoiceNumber}</div>
                      <div className="text-sm text-slate-500">Status: {i.status}</div>
                    </div>
                    <div className="text-sm mt-2">Total: ₹{i.total} • Paid: ₹{i.paid}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
