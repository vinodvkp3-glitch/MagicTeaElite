
"use client";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { parseStoredDate } from "@/lib/utils";

interface Props {
  sales: any[];
  expenses: any[];
  range: { start: string; end: string };
}

export default function FinancialTrendChart({ sales, expenses, range }: Props) {
  const data = eachDayOfInterval({
    start: parseISO(range.start),
    end: parseISO(range.end)
  }).map(day => {
    const daySales = sales.filter(s => {
      const d = parseStoredDate(s.createdAt ?? s.timestamp);
      return isSameDay(d, day);
    }).reduce((sum, s) => sum + s.total, 0);
    
    const dayExp = expenses.filter(e => {
      const d = parseStoredDate(e.timestamp ?? e.date);
      return isSameDay(d, day);
    }).reduce((sum, e) => sum + e.amount, 0);

    return {
      date: format(day, 'MMM dd'),
      revenue: daySales,
      expense: dayExp
    };
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(v) => `₹${v}`} />
        <Tooltip 
          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
          formatter={(v: number) => `₹${v.toLocaleString()}`}
        />
        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
        <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
