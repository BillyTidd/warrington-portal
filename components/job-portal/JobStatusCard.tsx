"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface JobStatusCardProps {
  status: string;
  progressPercentage: number;
}

export function JobStatusCard({
  status,
  progressPercentage,
}: JobStatusCardProps) {
  return (
    <Card className="border-none shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 pb-3">
        <CardTitle className="text-lg">Job Status</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {progressPercentage}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div
              className={`p-3 rounded-lg ${
                status === "pending"
                  ? "bg-yellow-100 dark:bg-yellow-900/20"
                  : "bg-muted/30"
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 mx-auto mb-1 ${
                  status === "pending"
                    ? "text-yellow-500"
                    : "text-muted-foreground"
                }`}
              />
              <div
                className={`text-xs font-medium ${
                  status === "pending"
                    ? "text-yellow-700 dark:text-yellow-400"
                    : "text-muted-foreground"
                }`}
              >
                Pending
              </div>
            </div>
            <div
              className={`p-3 rounded-lg ${
                status === "in-progress"
                  ? "bg-blue-100 dark:bg-blue-900/20"
                  : "bg-muted/30"
              }`}
            >
              <Clock
                className={`h-5 w-5 mx-auto mb-1 ${
                  status === "in-progress"
                    ? "text-blue-500"
                    : "text-muted-foreground"
                }`}
              />
              <div
                className={`text-xs font-medium ${
                  status === "in-progress"
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-muted-foreground"
                }`}
              >
                In Progress
              </div>
            </div>
            <div
              className={`p-3 rounded-lg ${
                status === "completed"
                  ? "bg-green-100 dark:bg-green-900/20"
                  : "bg-muted/30"
              }`}
            >
              <CheckCircle
                className={`h-5 w-5 mx-auto mb-1 ${
                  status === "completed"
                    ? "text-green-500"
                    : "text-muted-foreground"
                }`}
              />
              <div
                className={`text-xs font-medium ${
                  status === "completed"
                    ? "text-green-700 dark:text-green-400"
                    : "text-muted-foreground"
                }`}
              >
                Completed
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
