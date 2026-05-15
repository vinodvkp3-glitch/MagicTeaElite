"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { VendorService } from "@/lib/services/vendor-service";
import type { GasCylinderEntry } from "@/lib/types";
import { format } from "date-fns";

export default function GasDashboard() {
  const [entries, setEntries] = useState<GasCylinderEntry[]>([]);

  useEffect(() => {
    (async () => {
      const e = await VendorService.getGasEntries();
      setEntries(e as GasCylinderEntry[]);
    })();
  }, []);

  const avgRefill = entries.length ? Math.round(entries.reduce((s, e) => s + e.refillCost, 0) / entries.length) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-24">
        <header className="mb-6">
          <h1 className="text-3xl font-black">Gas Dashboard</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6">
            <p className="text-sm text-slate-500">Entries</p>
            <div className="text-2xl font-black">{entries.length}</div>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-slate-500">Avg Refill Cost</p>
            <div className="text-2xl font-black">₹{avgRefill}</div>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-slate-500">Latest Refill</p>
            <div className="text-2xl font-black">{entries[0] ? `₹${entries[0].refillCost}` : "—"}</div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="font-bold mb-4">Recent Refills</h2>
          <div className="space-y-3">
            {entries.slice(0, 20).map((s) => (
              <div key={s.id} className="p-3 border rounded-lg">
                <div className="flex justify-between">
                  <div>{s.branchId} • {s.vendorId}</div>
                  <div className="text-sm text-slate-500">{format(new Date(s.date), "yyyy-MM-dd")}</div>
                </div>
                <div className="mt-2 text-sm">Cylinder: {s.cylinderId || "—"} • Cost: ₹{s.refillCost} • Days: {s.usageDays || "—"}</div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
