"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

// Illustrative placeholder series — wire to a real /api/reports/revenue endpoint
// that groups Payment rows by department/month via Prisma groupBy.
const data = [
  { month: "Jan", revenue: 42000, expenses: 28000 },
  { month: "Feb", revenue: 47500, expenses: 29500 },
  { month: "Mar", revenue: 51200, expenses: 31000 },
  { month: "Apr", revenue: 49800, expenses: 30500 },
  { month: "May", revenue: 55600, expenses: 32800 },
  { month: "Jun", revenue: 61200, expenses: 34100 },
];

export function RevenueChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue vs. Expenses</CardTitle>
      </CardHeader>
      <CardContent className="h-80 pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(210 16% 90%)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(210 16% 88%)" }} />
            <Legend />
            <Bar dataKey="revenue" fill="hsl(187 65% 24%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="hsl(35 90% 55%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
