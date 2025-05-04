"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { JobProgressLog } from "@/types/job";

interface ProgressSummaryProps {
  progressLogs: JobProgressLog[] | undefined;
  totalCost: number;
  currencySymbol?: string;
}

export function ProgressSummary({
  progressLogs,
  totalCost,
  currencySymbol = "£",
}: ProgressSummaryProps) {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 pb-3">
        <CardTitle className="text-lg">Progress Summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Total Updates
            </div>
            <div className="text-2xl font-bold">
              {progressLogs?.length || 0}
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground mb-1">Total Cost</div>
            <div className="text-2xl font-bold">£{totalCost.toFixed(2)}</div>
          </div>

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Last Updated
            </div>
            <div className="text-lg">
              {progressLogs && progressLogs.length > 0
                ? formatDistanceToNow(new Date(progressLogs[0].timestamp), {
                    addSuffix: true,
                  })
                : "Never"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
