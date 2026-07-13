"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Clock, ClipboardList } from "lucide-react";

interface StatusUpdateSectionProps {
  jobStatus: string;
  isSaving: boolean;
  handleStatusChange: (
    status: "pending" | "in-progress" | "completed"
  ) => Promise<void>;
}

export function StatusUpdateSection({
  jobStatus,
  isSaving,
  handleStatusChange,
}: StatusUpdateSectionProps) {
  return (
    <Card className="mb-6 border-none shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 pb-3">
        <CardTitle className="text-lg flex items-center">
          <ClipboardList className="h-5 w-5 mr-2 text-amber-500" />
          Update Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={jobStatus === "pending" ? "default" : "outline"}
            onClick={() => handleStatusChange("pending")}
            disabled={isSaving || jobStatus === "pending"}
            className={`relative overflow-hidden group ${
              jobStatus === "pending"
                ? "bg-yellow-500 hover:bg-yellow-600 text-white dark:bg-yellow-600 dark:hover:bg-yellow-700"
                : ""
            }`}
          >
            <span
              className={`absolute inset-0 bg-yellow-100 dark:bg-yellow-900/20 ${
                jobStatus === "pending"
                  ? "opacity-0"
                  : "opacity-0 group-hover:opacity-10"
              } transition-opacity`}
            ></span>
            <AlertTriangle className="mr-2 h-4 w-4 relative z-10" />
            <span className="relative z-10">Pending</span>
          </Button>
          <Button
            variant={jobStatus === "in-progress" ? "default" : "outline"}
            onClick={() => handleStatusChange("in-progress")}
            disabled={isSaving || jobStatus === "in-progress"}
            className={`relative overflow-hidden group ${
              jobStatus === "in-progress"
                ? "bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                : ""
            }`}
          >
            <span
              className={`absolute inset-0 bg-blue-100 dark:bg-blue-900/20 ${
                jobStatus === "in-progress"
                  ? "opacity-0"
                  : "opacity-0 group-hover:opacity-10"
              } transition-opacity`}
            ></span>
            <Clock className="mr-2 h-4 w-4 relative z-10" />
            <span className="relative z-10">In Progress</span>
          </Button>
          <Button
            variant={jobStatus === "completed" ? "default" : "outline"}
            onClick={() => handleStatusChange("completed")}
            disabled={isSaving || jobStatus === "completed"}
            className={`relative overflow-hidden group ${
              jobStatus === "completed"
                ? "bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700"
                : ""
            }`}
          >
            <span
              className={`absolute inset-0 bg-green-100 dark:bg-green-900/20 ${
                jobStatus === "completed"
                  ? "opacity-0"
                  : "opacity-0 group-hover:opacity-10"
              } transition-opacity`}
            ></span>
            <CheckCircle className="mr-2 h-4 w-4 relative z-10" />
            <span className="relative z-10">Completed</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
