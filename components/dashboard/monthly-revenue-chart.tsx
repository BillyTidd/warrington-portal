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
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MonthlyRevenueChartProps {
  data?: {
    chartData?: Array<{
      name: string;
      periodKey: string;
      total: number;
      count: number;
    }>;
    statistics?: {
      totalAmount?: number;
      averageAmount?: number;
      changeRate?: number;
      entriesCount?: number;
    };
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

export function MonthlyRevenueChart({
  data = { chartData: [], statistics: {} },
}: MonthlyRevenueChartProps) {
  const chartData = data.chartData || [];
  const statistics = data.statistics || {};

  if (chartData.length === 0) {
    return (
      <div className="flex h-[360px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 text-center">
        <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-medium">No operational-cost data</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No entries were recorded in this period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          Total: {currency.format(statistics.totalAmount || 0)}
        </Badge>
        <Badge variant="outline">
          Average per period: {currency.format(statistics.averageAmount || 0)}
        </Badge>
        <Badge variant="outline">
          Entries: {statistics.entriesCount || 0}
        </Badge>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 12, left: 4, bottom: 28 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={compactCurrency}
            />
            <Tooltip
              formatter={(value) => [
                currency.format(Number(value) || 0),
                "Operational cost",
              ]}
              labelClassName="font-medium"
            />
            <Bar
              dataKey="total"
              name="Operational cost"
              fill="#2563eb"
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
