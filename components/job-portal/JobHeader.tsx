"use client";

import type React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { Job } from "@/types/job";
import { JobReportDialog } from "@/components/job-portal/JobReportDialog";

interface JobHeaderProps {
  currentDate: Date;
  onNavigate: (direction: "prev" | "next") => void;
  onNewJob?: () => void;
  canCreateJob?: boolean;
  jobs: Job[];
  children?: React.ReactNode;
  onRefresh?: () => void;
}

export function JobHeader({
  currentDate,
  onNavigate,
  onNewJob,
  canCreateJob = true,
  children,
  onRefresh,
}: JobHeaderProps) {
  const currentMonth = format(currentDate, "MMMM yyyy");

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* Top section with title and action buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">
          Job Portal
        </h1>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="flex items-center gap-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}

          {canCreateJob && onNewJob && (
            <Button
              onClick={onNewJob}
              size="sm"
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              New Job
            </Button>
          )}

          <JobReportDialog />
        </div>
      </div>

      {/* Bottom section with navigation and filters */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-gray-50 dark:bg-gray-950 rounded-b-lg">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("prev")}
            className="h-8 w-8 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous</span>
          </Button>

          <h2 className="text-lg font-medium text-gray-900 dark:text-white px-2">
            {currentMonth}
          </h2>

          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("next")}
            className="h-8 w-8 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next</span>
          </Button>
        </div>

        <div className="mt-2 sm:mt-0">{children}</div>
      </div>
    </div>
  );
}
