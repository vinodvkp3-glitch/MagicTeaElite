"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { VendorService } from "@/lib/services/vendor-service";
import type { MilkSupplyEntry } from "@/lib/types";
import { format } from "date-fns";

export default function MilkDashboard() {
  const [supplies, setSupplies] = useState<MilkSupplyEntry[]>([]);

  useEffect(() => {
    (async () => {
      const s = await VendorService.getMilkSupplies();
      setSupplies(s as MilkSupplyEntry[]);
    })();
  }, []);

  const totalReceived = supplies.reduce((s, e) => s + e.receivedLiters, 0);
  const totalUsed = supplies.reduce((s, e) => s + e.usedLiters, 0);
  const totalWastage = supplies.reduce((s, e) => s + e.wastageLiters, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-24">
        <header className="mb-6">
          <h1 className="text-3xl font-black">Milk Dashboard</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6">
            <p className="text-sm text-slate-500">Total Received (L)</p>
            <div className="text-2xl font-black">{totalReceived}</div>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-slate-500">Total Used (L)</p>
            <div className="text-2xl font-black">{totalUsed}</div>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-slate-500">Total Wastage (L)</p>
            <div className="text-2xl font-black">{totalWastage}</div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="font-bold mb-4">Recent Supplies</h2>
          <div className="space-y-3">
            {supplies.slice(0, 20).map((s) => (
              <div key={s.id} className="p-3 border rounded-lg">
                <div className="flex justify-between">
                  <div>{s.branchId} • {s.vendorId}</div>
                  <div className="text-sm text-slate-500">{format(new Date(s.date), "yyyy-MM-dd")}</div>
                </div>
                <div className="mt-2 text-sm">
                  Received: {s.receivedLiters}L • Used: {s.usedLiters}L • Wastage: {s.wastageLiters}L • Cost ₹{s.totalCost}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
