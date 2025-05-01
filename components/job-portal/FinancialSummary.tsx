"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface FinancialSummaryProps {
  clientPrice: number;
  totalCost: number;
  profit: number;
}

export function FinancialSummary({
  clientPrice,
  totalCost,
  profit,
}: FinancialSummaryProps) {
  return (
    <Card className="border-none shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
        <CardTitle>Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Client Price
            </div>
            <div className="text-2xl font-bold">${clientPrice.toFixed(2)}</div>
          </div>

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Total Costs
            </div>
            <div className="text-2xl font-bold text-red-500">
              -${totalCost.toFixed(2)}
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground mb-1">Profit</div>
            <div
              className={`text-2xl font-bold ${
                profit >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              ${profit.toFixed(2)}
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Profit Margin
            </div>
            <div
              className={`text-2xl font-bold ${
                profit >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {clientPrice ? Math.round((profit / clientPrice) * 100) : 0}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
