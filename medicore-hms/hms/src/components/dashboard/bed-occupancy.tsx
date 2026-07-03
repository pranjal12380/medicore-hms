"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["hsl(187 65% 24%)", "hsl(210 16% 88%)"];

export function BedOccupancy({ data }: { data: { total: number; occupied: number; available: number } }) {
  const chartData = [
    { name: "Occupied", value: data.occupied },
    { name: "Available", value: data.available },
  ];
  const pct = data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bed Occupancy</CardTitle>
      </CardHeader>
      <CardContent className="relative h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" innerRadius={65} outerRadius={90} paddingAngle={2}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(210 16% 88%)" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">{pct}%</span>
          <span className="text-xs text-muted-foreground">occupied</span>
        </div>
      </CardContent>
    </Card>
  );
}
