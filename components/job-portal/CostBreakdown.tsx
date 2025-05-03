"use client";

import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import type { JobProgressLog } from "@/types/job";

interface CostBreakdownProps {
  progressLogs: JobProgressLog[] | undefined;
  totalCost: number;
  profit: number;
}

export function CostBreakdown({
  progressLogs,
  totalCost,
  profit,
}: CostBreakdownProps) {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
        <CardTitle>Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {progressLogs && progressLogs.filter((log) => log.cost).length > 0 ? (
          <div className="space-y-4">
            {progressLogs
              .filter((log) => log.cost)
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime()
              )
              .map((log) => (
                <div
                  key={log._id}
                  className="flex justify-between items-start p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <div className="font-medium">
                      £{log.cost?.toFixed(2) || "0.00"}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {format(new Date(log.timestamp), "MMM d, yyyy")}
                    </div>
                    <div className="text-sm mt-1 line-clamp-1">
                      {log.details}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {log.updatedByName}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-muted/30 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Cost Entries</h3>
            <p className="text-muted-foreground">
              No costs have been recorded for this job yet.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t bg-muted/30 flex justify-between p-4">
        <div className="text-sm text-muted-foreground">
          Total Costs:{" "}
          <span className="font-medium">£{totalCost.toFixed(2)}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Profit:{" "}
          <span
            className={`font-medium ${
              profit >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            £{profit.toFixed(2)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
