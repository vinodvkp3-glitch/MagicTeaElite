
"use client";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface Props {
  sales: any[];
}

export default function ProductRevenueChart({ sales }: Props) {
  const prodStats: Record<string, number> = {};
  sales.forEach(s => {
    s.items.forEach((item: any) => {
      prodStats[item.name] = (prodStats[item.name] || 0) + item.total;
    });
  });
  
  const data = Object.entries(prodStats)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 11, fontWeight: 'bold' }} />
        <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} barSize={25} />
      </BarChart>
    </ResponsiveContainer>
  );
}
