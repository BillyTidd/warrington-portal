"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { UserRound } from "lucide-react";

interface EmployeeTotal {
  name: string;
  total: number;
  count: number;
}

interface EmployeePerformanceChartProps {
  data?: {
    employeeTotals?: EmployeeTotal[];
  };
  timeframe?: string;
}

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function compactCurrency(value: number) {
  if (Math.abs(value) >= 1000) return `£${(value / 1000).toFixed(1)}k`;
  return `£${value}`;
}

export function EmployeePerformanceChart({
  data = { employeeTotals: [] },
}: EmployeePerformanceChartProps) {
  const employeeTotals = data.employeeTotals || [];

  if (employeeTotals.length === 0) {
    return (
      <div className="flex h-[360px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 text-center">
        <UserRound className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-medium">No employee data available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No employee entries were recorded in this period.
        </p>
      </div>
    );
  }

  const height = Math.max(360, employeeTotals.length * 54);

  return (
    <div className="max-h-[520px] overflow-y-auto pr-2">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={employeeTotals}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={compactCurrency}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value, _name, item) => [
                `${currency.format(Number(value) || 0)} across ${
                  item.payload.count
                } ${item.payload.count === 1 ? "entry" : "entries"}`,
                "Operational cost",
              ]}
            />
            <Bar
              dataKey="total"
              name="Operational cost"
              fill="#0d9488"
              radius={[0, 6, 6, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
