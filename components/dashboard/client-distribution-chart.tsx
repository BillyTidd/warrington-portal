"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Users } from "lucide-react";

interface ClientCostItem {
  name: string;
  value: number;
  amount: number;
  count: number;
  percentage: number;
}

interface ClientDistributionChartProps {
  data?: {
    chartData?: ClientCostItem[];
    totalAmount?: number;
  };
  timeframe?: string;
}

const colours = [
  "#2563eb",
  "#0d9488",
  "#d97706",
  "#7c3aed",
  "#e11d48",
  "#64748b",
];

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function ClientDistributionChart({
  data = { chartData: [], totalAmount: 0 },
}: ClientDistributionChartProps) {
  const chartData = data.chartData || [];

  if (chartData.length === 0) {
    return (
      <div className="flex h-[360px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 text-center">
        <Users className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-medium">No client data available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No client entries were recorded in this period.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
      <div className="h-[360px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={78}
              outerRadius={125}
              paddingAngle={2}
            >
              {chartData.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={colours[index % colours.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => [
                `${currency.format(Number(value) || 0)} (${Number(
                  item.payload.percentage || 0
                ).toFixed(1)}%)`,
                "Operational cost",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Total operational cost</p>
          <p className="text-2xl font-semibold">
            {currency.format(data.totalAmount || 0)}
          </p>
        </div>

        <div className="space-y-2">
          {chartData.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 rounded-md border p-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colours[index % colours.length] }}
                  />
                  <span className="truncate text-sm font-medium">
                    {item.name}
                  </span>
                </div>
                <p className="ml-[18px] text-xs text-muted-foreground">
                  {item.count} {item.count === 1 ? "entry" : "entries"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">
                  {currency.format(item.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
