"use client";

import type React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { Job } from "@/types/job";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  buildJobsPdfFilename,
  generateJobsPDF,
} from "@/lib/pdf-generator-jobs";

interface JobHeaderProps {
  currentDate: Date;
  onNavigate: (direction: "prev" | "next") => void;
  onNewJob?: () => void;
  canCreateJob?: boolean;
  jobs: Job[];
  children?: React.ReactNode;
  onRefresh?: () => void;
}

interface DirectReportButtonProps {
  jobs: Job[];
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

function DirectReportButton({
  jobs,
  variant = "default",
  size = "sm",
}: DirectReportButtonProps) {
  const { data: session } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleGenerateReport = async () => {
    if (!jobs || jobs.length === 0) {
      toast.error("No jobs available to generate report");
      return;
    }

    const generatedAt = new Date();
    setIsGenerating(true);
    try {
      const filename = buildJobsPdfFilename(jobs, session || {}, generatedAt);
      const doc = await generateJobsPDF(
        jobs,
        session || {},
        generatedAt,
        generatedAt
      );

      doc.save(filename);
      toast.success("PDF report downloaded");

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("pdf", doc.output("blob"), filename);
        formData.append("reportType", "jobs-summary");
        formData.append("jobCount", jobs.length.toString());
        formData.append(
          "reportName",
          `Portal Jobs Report - ${format(generatedAt, "dd MMM yyyy")}`
        );
        formData.append(
          "jobIds",
          jobs.map((job) => job._id).filter(Boolean).join(",")
        );

        const response = await fetch("/api/upload-pdf", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || "Failed to save report");
        }

        const result = await response.json();
        if (!result.success) throw new Error("Failed to save report");

        toast.success("A portal copy of the report was saved");
      } catch (uploadError) {
        console.warn("PDF downloaded but could not be saved:", uploadError);
        toast.warning("PDF downloaded, but the portal copy could not be saved");
      }
    } catch (error) {
      console.error("Error generating jobs report:", error);
      toast.error("Unable to generate the PDF. Please try again.");
    } finally {
      setIsGenerating(false);
      setIsUploading(false);
    }
  };

  return (
    <Button
      onClick={handleGenerateReport}
      disabled={isGenerating || isUploading || jobs.length === 0}
      variant={variant}
      size={size}
      className="relative overflow-hidden border-amber-500 bg-amber-500 text-black hover:bg-amber-400"
    >
      <span className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 opacity-0 group-hover:opacity-10 transition-opacity"></span>
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isUploading ? "Saving..." : "Generating..."}
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Generate PDF ({jobs.length})
        </>
      )}
    </Button>
  );
}

export function JobHeader({
  currentDate,
  onNavigate,
  onNewJob,
  canCreateJob = true,
  jobs,
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

          <DirectReportButton jobs={jobs} />
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
