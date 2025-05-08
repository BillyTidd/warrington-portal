"use client";

import type React from "react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Calendar,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Job } from "@/types/job";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportDialog } from "./ReportDailoge";

interface JobHeaderProps {
  currentDate: Date;
  onNavigate: (direction: "prev" | "next") => void;
  onNewJob: () => void;
  jobs: Job[];
  children?: React.ReactNode;
}

export function JobHeader({
  currentDate,
  onNavigate,
  onNewJob,
  jobs,
  children,
}: JobHeaderProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  return (
    <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg shadow-lg overflow-hidden">
      {/* Header Top Section */}
      <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title and Icon */}
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            {isAdmin ? "Job Management" : "My Jobs"}
          </h2>
        </div>

        {/* Action Buttons for larger screens */}
        <div className="hidden md:flex items-center gap-3">
          {/* Report button for all users */}
          <Button
            variant="outline"
            className="bg-white text-violet-600 hover:bg-violet-50 shadow-md hover:shadow-lg transition-all"
            onClick={() => {
              const reportDialog = document.getElementById(
                "report-dialog-trigger"
              );
              if (reportDialog) {
                (reportDialog as HTMLButtonElement).click();
              }
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>Generate Report</span>
          </Button>

          {isAdmin && (
            <Button
              onClick={onNewJob}
              className="bg-white text-violet-600 hover:bg-violet-50 shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>New Job</span>
            </Button>
          )}
        </div>
      </div>

      {/* Header Bottom Section */}
      <div className="bg-violet-700/40 p-3 md:p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("prev")}
            className="bg-white/10 border-none text-white hover:bg-white/20 h-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("next")}
            className="bg-white/10 border-none text-white hover:bg-white/20 h-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-none text-white hover:bg-white/20 h-9"
              >
                <Filter className="mr-2 h-4 w-4" />
                <span className="hidden xs:inline">Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("pending")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setStatusFilter([...statusFilter, "pending"]);
                  } else {
                    setStatusFilter(
                      statusFilter.filter((s) => s !== "pending")
                    );
                  }
                }}
              >
                Pending
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("in-progress")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setStatusFilter([...statusFilter, "in-progress"]);
                  } else {
                    setStatusFilter(
                      statusFilter.filter((s) => s !== "in-progress")
                    );
                  }
                }}
              >
                In Progress
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes("completed")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setStatusFilter([...statusFilter, "completed"]);
                  } else {
                    setStatusFilter(
                      statusFilter.filter((s) => s !== "completed")
                    );
                  }
                }}
              >
                Completed
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {children}
        </div>

        {/* Action Buttons for mobile */}
        <div className="flex md:hidden items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-violet-600 hover:bg-violet-50 shadow-sm hover:shadow-md transition-all flex-1 sm:flex-none"
            onClick={() => {
              const reportDialog = document.getElementById(
                "report-dialog-trigger"
              );
              if (reportDialog) {
                (reportDialog as HTMLButtonElement).click();
              }
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>Generate Report</span>
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              onClick={onNewJob}
              className="bg-white text-violet-600 hover:bg-violet-50 shadow-sm hover:shadow-md transition-all flex-1 sm:flex-none"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>New Job</span>
            </Button>
          )}
        </div>
      </div>

      {/* Hidden ReportDialog with accessible trigger */}
      <span className="hidden">
        <ReportDialog jobs={jobs} triggerId="report-dialog-trigger" />
      </span>
    </div>
  );
}
