
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CalendarCheck2, 
  ClipboardList, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  Loader2
} from "lucide-react";
import { DB } from "@/lib/storage";
import { getSettingsStaff, ensureSettingsDefaults } from "@/lib/settings-catalog";
import type { SettingsStaffRecord } from "@/lib/settings-catalog";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from "date-fns";
import type { StaffMember, AttendanceRecord, LeaveRequest, AttendanceStatus } from "@/app/pos/types";
import { calculateHours, getAutoStatus, getEmpHourlyRate } from "@/lib/attendance-utils";

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  const upsertAttendance = (record: AttendanceRecord) => {
    const records = (DB.get("attendance") as AttendanceRecord[] | null) ?? [];
    const key = `${record.staffId}_${record.date}`;
    const existingIdx = records.findIndex(
      (r) => `${r.staffId}_${r.date}` === key || r.id === key
    );
    const entry = { ...record, id: key, branchId: record.branchId || "main_branch" };
    if (existingIdx >= 0) {
      records[existingIdx] = { ...records[existingIdx], ...entry };
    } else {
      records.push(entry);
    }
    DB.set("attendance", records);
    const map: Record<string, AttendanceRecord> = {};
    records.forEach((r) => {
      map[`${r.staffId}_${r.date}`] = r;
    });
    setAttendance(map);
  };

  const mapSettingsStaff = (s: SettingsStaffRecord): StaffMember => ({
    id: s.id,
    branchId: "main_branch",
    name: s.name,
    monthlySal: s.monthlySalary,
    baseHrs: 8,
    rate: s.monthlySalary > 0 ? s.monthlySalary / 26 / 8 : 0,
    phone: "",
    aadhaar: "",
    dob: "",
    address: "",
    branch: s.shop,
    joinDate: s.joinDate,
    role: "Staff",
    photo: "",
    emergencyContact: "",
    pin: "",
  });

  const loadData = () => {
    ensureSettingsDefaults();
    const catalogStaff = getSettingsStaff();
    const legacyStaff = (DB.get("staff") as StaffMember[] | null) ?? [];
    setStaff(
      catalogStaff.length > 0
        ? catalogStaff.map(mapSettingsStaff)
        : legacyStaff
    );
    const start = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
    const allAttendance = (DB.get("attendance") as AttendanceRecord[] | null) ?? [];
    const records: Record<string, AttendanceRecord> = {};
    allAttendance
      .filter((r) => r.date >= start && r.date <= end)
      .forEach((data) => {
        records[`${data.staffId}_${data.date}`] = data;
      });
    setAttendance(records);
    const allLeaves = (DB.get("leave_requests") as LeaveRequest[] | null) ?? [];
    setLeaves(
      [...allLeaves].sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || "")
      )
    );
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  useEffect(() => {
    if (staff.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staff[0].id);
    }
  }, [staff, selectedStaffId]);

  const days = useMemo(() => eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth)
  }), [selectedMonth]);

  const stats = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const presentToday = Object.values(attendance).filter(r => r.date === todayStr && (r.status === 'P' || r.status === 'OT')).length;
    return {
      total: staff.length,
      present: presentToday,
      leaves: leaves.filter(l => l.status === 'pending').length
    };
  }, [staff.length, attendance, leaves]);

  const handleStatusChange = useCallback(async (date: string, status: AttendanceStatus) => {
    if (!selectedStaffId) return;
    const key = `${selectedStaffId}_${date}`;
    const record =
      attendance[key] || {
        staffId: selectedStaffId,
        date,
        status: "" as AttendanceStatus,
        s1In: "",
        s1Out: "",
        s2In: "",
        s2Out: "",
        adv: 0,
        note: "",
        totalHrs: 0,
        branchId: "main_branch",
      };
    upsertAttendance({ ...record, status });
  }, [selectedStaffId, attendance]);

  const handleTimeUpdate = useCallback(
    async (date: string, field: string, value: string) => {
      if (!selectedStaffId) return;
      const key = `${selectedStaffId}_${date}`;
      const record =
        attendance[key] || {
          staffId: selectedStaffId,
          date,
          status: "" as AttendanceStatus,
          s1In: "",
          s1Out: "",
          s2In: "",
          s2Out: "",
          adv: 0,
          note: "",
          totalHrs: 0,
          branchId: "main_branch",
        };

      const updatedRecord = { ...record, [field]: value };
      const h1 = calculateHours(updatedRecord.s1In, updatedRecord.s1Out);
      const h2 = calculateHours(updatedRecord.s2In, updatedRecord.s2Out);
      updatedRecord.totalHrs = h1 + h2;

      if (updatedRecord.totalHrs > 0 && !updatedRecord.status) {
        updatedRecord.status = getAutoStatus(updatedRecord.totalHrs);
      }

      upsertAttendance(updatedRecord);
    },
    [selectedStaffId, attendance]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-20 md:pt-24 pb-24">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black font-headline text-primary">Staff Manager</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Users className="w-4 h-4" /> Attendance & Payroll
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 rounded-xl font-bold h-12 shadow-lg">
            <UserPlus className="w-4 h-4 mr-2" /> Add Staff
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-xl rounded-[2rem] bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-2xl text-primary"><Users className="w-6 h-6" /></div>
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-black text-slate-800">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl rounded-[2rem] bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 bg-green-50 rounded-2xl text-green-600"><CalendarCheck2 className="w-6 h-6" /></div>
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">Present Today</p>
                <p className="text-2xl font-black text-slate-800">{stats.present}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl rounded-[2rem] bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 bg-amber-50 rounded-2xl text-amber-600"><ClipboardList className="w-6 h-6" /></div>
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">Pending Leaves</p>
                <p className="text-2xl font-black text-slate-800">{stats.leaves}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-12">
            <TabsTrigger value="overview" className="rounded-lg font-bold">Monthly Overview</TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-lg font-bold">Daily Attendance</TabsTrigger>
            <TabsTrigger value="staff" className="rounded-lg font-bold">Staff List</TabsTrigger>
            <TabsTrigger value="leaves" className="rounded-lg font-bold">Leaves</TabsTrigger>
          </TabsList>

          {/* Conditional Rendering to reduce DOM size and improve TBT */}
          {activeTab === "overview" && (
            <TabsContent value="overview" forceMount>
             <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between px-8 py-6 bg-slate-50">
                  <div>
                    <CardTitle className="font-headline text-xl">Payroll Summary</CardTitle>
                    <CardDescription>{format(selectedMonth, 'MMMM yyyy')}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="font-bold min-w-[100px] text-center">{format(selectedMonth, 'MMM yy')}</span>
                    <Button variant="outline" size="icon" onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="pl-8 font-black uppercase text-[10px]">Staff</TableHead>
                        <TableHead className="text-center font-black uppercase text-[10px]">Days</TableHead>
                        <TableHead className="text-center font-black uppercase text-[10px]">Hrs</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px]">Basic</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px]">Advance</TableHead>
                        <TableHead className="pr-8 text-right font-black uppercase text-[10px]">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map(s => {
                        let totalHrs = 0;
                        let workDays = 0;
                        let advance = 0;
                        days.forEach(day => {
                          const r = attendance[`${s.id}_${format(day, 'yyyy-MM-dd')}`];
                          if (r) {
                            totalHrs += r.totalHrs || 0;
                            if (['P', 'H', 'OT'].includes(r.status)) workDays++;
                            advance += r.adv || 0;
                          }
                        });
                        const rate = getEmpHourlyRate(s.monthlySal, days.length, s.baseHrs);
                        const basicPay = Math.round(totalHrs * rate);
                        const net = Math.max(0, basicPay - advance);

                        return (
                          <TableRow key={s.id}>
                            <TableCell className="pl-8 py-4">
                              <div className="font-bold text-slate-800">{s.name}</div>
                              <div className="text-[10px] text-muted-foreground uppercase">{s.role}</div>
                            </TableCell>
                            <TableCell className="text-center font-bold">{workDays}</TableCell>
                            <TableCell className="text-center font-bold">{totalHrs.toFixed(1)}h</TableCell>
                            <TableCell className="text-right font-black text-primary">₹{basicPay}</TableCell>
                            <TableCell className="text-right font-bold text-red-500">- ₹{advance}</TableCell>
                            <TableCell className="pr-8 text-right font-black text-green-600 text-lg">₹{net}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
             </Card>
            </TabsContent>
          )}

          {activeTab === "attendance" && (
            <TabsContent value="attendance" forceMount>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="space-y-4">
                  <Card className="border-none shadow-xl rounded-[2rem] bg-white p-4">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground ml-2 mb-2 block">Select Staff</Label>
                    <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto no-scrollbar">
                      {staff.map(s => (
                        <button 
                          key={s.id}
                          onClick={() => setSelectedStaffId(s.id)}
                          className={`text-left px-4 py-3 rounded-xl font-bold transition-all ${
                            selectedStaffId === s.id ? 'bg-primary text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>
                <div className="lg:col-span-3">
                  <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                    <CardHeader className="bg-primary/5 px-8 py-6 border-b border-primary/10">
                      <div className="flex justify-between items-center">
                        <CardTitle className="font-headline text-2xl text-primary">{staff.find(s=>s.id===selectedStaffId)?.name || 'Attendance'}</CardTitle>
                        <Badge variant="outline" className="h-8 rounded-lg font-black border-primary text-primary">
                          ₹{staff.find(s=>s.id===selectedStaffId)?.monthlySal}/mo
                        </Badge>
                      </div>
                    </CardHeader>
                    <div className="overflow-x-auto max-h-[500px]">
                      <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="pl-8 font-black uppercase text-[10px]">Date</TableHead>
                            <TableHead className="font-black uppercase text-[10px]">Status</TableHead>
                            <TableHead className="font-black uppercase text-[10px]">S1</TableHead>
                            <TableHead className="font-black uppercase text-[10px]">S2</TableHead>
                            <TableHead className="text-center font-black uppercase text-[10px]">Hrs</TableHead>
                            <TableHead className="pr-8 font-black uppercase text-[10px]">Adv</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {days.map(day => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const rec = attendance[`${selectedStaffId}_${dateKey}`] || { status: '', s1In: '', s1Out: '', s2In: '', s2Out: '', adv: 0, totalHrs: 0 };
                            return (
                              <TableRow key={dateKey} className={isToday(day) ? 'bg-primary/5' : ''}>
                                <TableCell className="pl-8 font-bold text-xs">
                                  {format(day, 'dd MMM')}
                                </TableCell>
                                <TableCell>
                                  <Select value={rec.status} onValueChange={(v) => handleStatusChange(dateKey, v as AttendanceStatus)}>
                                    <SelectTrigger className="h-8 w-24 font-bold border-none text-[10px] rounded-lg bg-slate-100">
                                      <SelectValue placeholder="—" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="P">Present</SelectItem>
                                      <SelectItem value="A">Absent</SelectItem>
                                      <SelectItem value="H">Half Day</SelectItem>
                                      <SelectItem value="OT">Overtime</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input className="h-7 w-10 text-[9px] p-0 text-center" value={rec.s1In} onChange={(e) => handleTimeUpdate(dateKey, 's1In', e.target.value)} />
                                    <Input className="h-7 w-10 text-[9px] p-0 text-center" value={rec.s1Out} onChange={(e) => handleTimeUpdate(dateKey, 's1Out', e.target.value)} />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input className="h-7 w-10 text-[9px] p-0 text-center" value={rec.s2In} onChange={(e) => handleTimeUpdate(dateKey, 's2In', e.target.value)} />
                                    <Input className="h-7 w-10 text-[9px] p-0 text-center" value={rec.s2Out} onChange={(e) => handleTimeUpdate(dateKey, 's2Out', e.target.value)} />
                                  </div>
                                </TableCell>
                                <TableCell className="text-center font-black text-xs">
                                  {rec.totalHrs.toFixed(1)}h
                                </TableCell>
                                <TableCell className="pr-8">
                                  <Input type="number" className="h-7 w-12 text-[10px] p-1 text-right" value={rec.adv} onChange={(e) => handleTimeUpdate(dateKey, 'adv', e.target.value)} />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}

          {activeTab === "staff" && (
            <TabsContent value="staff" forceMount>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map(s => (
                  <Card key={s.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                    <div className="bg-primary p-6 text-white">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-black mb-2 uppercase">
                        {s.name[0]}
                      </div>
                      <div className="font-headline text-lg font-bold">{s.name}</div>
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{s.role}</p>
                    </div>
                    <CardContent className="p-6 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div><p className="text-muted-foreground font-black uppercase">Mobile</p><p className="font-bold">{s.phone || '—'}</p></div>
                        <div><p className="text-muted-foreground font-black uppercase">Branch</p><p className="font-bold">{s.branch}</p></div>
                      </div>
                      <Button variant="outline" className="w-full rounded-xl h-9 font-bold text-xs">Edit Details</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {activeTab === "leaves" && (
            <TabsContent value="leaves" forceMount>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                  <CardHeader className="px-8 py-6 bg-slate-50 border-b">
                    <CardTitle className="font-headline text-xl">Pending Requests</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {leaves.filter(l => l.status === 'pending').length === 0 ? (
                      <p className="text-center text-muted-foreground py-10 font-bold">No pending requests</p>
                    ) : (
                      <div className="space-y-4">
                        {leaves.filter(l => l.status === 'pending').map(l => (
                          <div key={l.id} className="p-4 bg-slate-50 rounded-xl border border-dashed">
                            <div className="flex justify-between mb-2">
                              <p className="font-black text-slate-800 text-sm">{l.staffName}</p>
                              <Badge className="bg-amber-100 text-amber-700 text-[10px]">{l.date}</Badge>
                            </div>
                            <p className="text-xs text-slate-500 mb-3 italic">"{l.reason}"</p>
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 bg-green-600 text-white font-bold h-8 text-[10px]">Approve</Button>
                              <Button size="sm" variant="outline" className="flex-1 text-red-600 h-8 text-[10px]">Reject</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
