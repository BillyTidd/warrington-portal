"use client";

import type React from "react";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  FileText,
  Filter,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Job } from "@/types/job";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);

    try {
      // In a real application, this would be an actual API endpoint
      console.log("Generating report for jobs:", jobs);

      // Simulate API call
      setTimeout(() => {
        toast.success("Job report generated successfully");
        setIsGeneratingReport(false);
      }, 1500);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-violet-600 to-purple-600">
      {/* First Row - Month and Year */}
      <div className="flex flex-col sm:flex-row items-center space-x-4 mb-4 sm:mb-0 w-full">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Job Management
          </h2>
        </div>
      </div>

      {/* Second Row - Navigation */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-4 sm:mb-0 w-full">
        {/* <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("prev")}
            className="bg-white/10 border-none text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("next")}
            className="bg-white/10 border-none text-white hover:bg-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div> */}

        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-white/10 border-none text-white hover:bg-white/20"
            >
              <Filter className="mr-2 h-4 w-4" />
              <span>Filter</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={statusFilter.includes("pending")}
              onCheckedChange={(checked) => {
                if (checked) {
                  setStatusFilter([...statusFilter, "pending"]);
                } else {
                  setStatusFilter(statusFilter.filter((s) => s !== "pending"));
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
        </DropdownMenu> */}
        {children}
      </div>

      {/* Third Row - Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-4 items-center w-full mt-4 sm:mt-0">
        <Button
          onClick={onNewJob}
          className="bg-white text-violet-600 hover:bg-violet-50 w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>New Job</span>
        </Button>

        <Button
          onClick={handleGenerateReport}
          className="bg-white text-violet-600 hover:bg-violet-50 w-full sm:w-auto mt-4 sm:mt-0 shadow-md hover:shadow-lg transition-all"
        >
          {isGeneratingReport ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              <span>Generate Report</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
