
"use client";

import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Milk, Droplet, AlertTriangle, History, Save, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DB } from "@/lib/storage";
import type { MilkLog } from "@/lib/types";
import { format } from "date-fns";
import { StatCard } from "@/components/dashboard/StatCard";

export default function MilkPage() {
  const [logs, setLogs] = useState<MilkLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  const loadLogs = () => {
    const all = (DB.get("milk_logs") as MilkLog[] | null) ?? [];
    setLogs(
      [...all]
        .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
        .slice(0, 50)
    );
    setFetching(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayLogs = logs.filter(l => l.date === today);
    const inflow = todayLogs.filter(l => l.type === 'inflow').reduce((s, l) => s + l.quantity, 0);
    const wastage = todayLogs.filter(l => l.type === 'wastage').reduce((s, l) => s + l.quantity, 0);
    
    return { inflow, wastage };
  }, [logs]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const type = formData.get("type") as 'inflow' | 'wastage';
    const quantity = parseFloat(formData.get("quantity") as string);
    const reason = formData.get("reason") as string;

    if (isNaN(quantity) || quantity <= 0) {
      toast({ variant: "destructive", title: "Invalid Quantity" });
      return;
    }

    setLoading(true);
    try {
      DB.push("milk_logs", {
        type,
        quantity,
        unit: "Liters",
        reason: reason || (type === "inflow" ? "Daily Supply" : "General Wastage"),
        date: format(new Date(), "yyyy-MM-dd"),
        timestamp: new Date().toISOString(),
      });
      loadLogs();
      toast({ title: "Record Saved", description: `${quantity}L ${type} recorded.` });
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save record." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <header className="mb-8">
          <h1 className="text-4xl font-black font-headline text-primary">Milk Management</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Milk className="w-4 h-4" /> Track daily dairy inflow and wastage
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard title="Today's Supply" value={`${stats.inflow}L`} icon={Droplet} subtext="Fresh inflow" />
          <StatCard title="Today's Wastage" value={`${stats.wastage}L`} icon={AlertTriangle} className={stats.wastage > 2 ? "border-l-4 border-l-destructive" : ""} subtext="Reported waste" />
          <StatCard title="Est. Stock" value="42.5L" icon={Milk} subtext="Calculated remaining" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-8 h-fit">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="font-headline text-2xl">Log Entry</CardTitle>
              <CardDescription>Record milk arrival or wastage</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400">Entry Type</Label>
                <select name="type" className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:ring-2 focus:ring-primary">
                  <option value="inflow">Fresh Supply (IN)</option>
                  <option value="wastage">Wastage (OUT)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400">Quantity (Liters)</Label>
                <Input name="quantity" type="number" step="0.1" required placeholder="0.0" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400">Note / Reason</Label>
                <Input name="reason" placeholder="e.g. Sanchi Dairy Supply" className="h-12 rounded-xl" />
              </div>
              <Button type="submit" className="w-full bg-primary font-black h-12 rounded-xl shadow-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                Add Entry
              </Button>
            </form>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="px-8 pt-8">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <CardTitle className="font-headline text-2xl">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="pl-8">Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="pr-8">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="pl-8 text-xs text-muted-foreground">
                        {log.timestamp ? format(new Date(log.timestamp), 'HH:mm') : 'Recent'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize border-none ${log.type === 'inflow' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {log.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-black">{log.quantity}L</TableCell>
                      <TableCell className="pr-8 text-xs text-slate-500 italic">{log.reason}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && !fetching && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-20 text-center text-slate-300 font-bold">
                        No milk logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
