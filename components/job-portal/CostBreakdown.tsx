"use client";

import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, Users } from "lucide-react";
import type { JobProgressLog } from "@/types/job";

interface CostBreakdownProps {
  progressLogs: JobProgressLog[] | undefined;
  workers?: { userId: string; workerName: string; paymentRate?: number }[];
  totalCost: number;
  profit: number;
  currencySymbol?: string;
}

const getLogCost = (log: JobProgressLog) =>
  log.overtimeCost || log.vehicleUsage?.totalCost || log.cost || 0;

export function CostBreakdown({
  progressLogs,
  workers,
  totalCost,
  profit,
  currencySymbol = "£",
}: CostBreakdownProps) {
  const costedLogs = (progressLogs || []).filter((log) => getLogCost(log) > 0);
  const paidWorkers = (workers || []).filter(
    (worker) => (worker.paymentRate || 0) > 0
  );
  const hasEntries = costedLogs.length > 0 || paidWorkers.length > 0;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40">
        <CardTitle>Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {hasEntries ? (
          <div className="space-y-4">
            {paidWorkers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Worker Payments
                </h4>
                {paidWorkers.map((worker) => (
                  <div
                    key={worker.userId}
                    className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{worker.workerName}</span>
                    </div>
                    <div className="font-medium">
                      {currencySymbol}
                      {(worker.paymentRate || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {costedLogs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Additional Costs
                </h4>
                {costedLogs
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
                          {currencySymbol}
                          {getLogCost(log).toFixed(2)}
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
            )}
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
