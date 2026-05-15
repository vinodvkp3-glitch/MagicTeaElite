
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

const SALES_DATA = [
  { name: '6 AM', sales: 400 },
  { name: '9 AM', sales: 2200 },
  { name: '12 PM', sales: 1800 },
  { name: '3 PM', sales: 1500 },
  { name: '6 PM', sales: 3400 },
  { name: '9 PM', sales: 2800 },
];

export default function DashboardCharts() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={SALES_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: '#64748B' }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: '#64748B' }}
          tickFormatter={(val) => `₹${val}`}
        />
        <Tooltip 
          cursor={{ fill: 'rgba(210, 1, 3, 0.05)' }}
          contentStyle={{ 
            borderRadius: '12px', 
            border: 'none', 
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            backgroundColor: '#fff' 
          }}
        />
        <Bar 
          dataKey="sales" 
          fill="hsl(var(--primary))" 
          radius={[4, 4, 0, 0]} 
          barSize={40}
          animationDuration={1000}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
