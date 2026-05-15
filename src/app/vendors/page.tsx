"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { VendorService } from "@/lib/services/vendor-service";
import type { Vendor } from "@/lib/types";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    (async () => {
      const list = await VendorService.listVendorsByType();
      setVendors(list as Vendor[]);
    })();
  }, []);

  const createVendor = async () => {
    if (!name) return;
    await VendorService.createVendor({ name, contact, branchId, category: "general" } as any);
    const list = await VendorService.listVendorsByType();
    setVendors(list as Vendor[]);
    setName("");
    setContact("");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-24">
        <header className="mb-6">
          <h1 className="text-3xl font-black">Vendors</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h2 className="font-bold mb-4">Add Vendor</h2>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Contact</Label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div>
                <Label>Branch</Label>
                <Input value={branchId} onChange={(e) => setBranchId(e.target.value)} placeholder="e.g., NAVLAKHA" />
              </div>
              <Button onClick={createVendor}>Create</Button>
            </div>
          </Card>

          <div className="md:col-span-2">
            <Card className="p-6">
              <h2 className="font-bold mb-4">Vendor List</h2>
              <div className="space-y-3">
                {vendors.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-bold">{v.name}</div>
                      <div className="text-sm text-slate-500">{v.contact} • {v.branchId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/vendors/${v.id}`} className="text-sm font-bold text-primary">Manage</Link>
                    </div>
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
