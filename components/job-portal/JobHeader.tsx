"use client";

import type React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import type { Job } from "@/types/job";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateJobsPDF } from "@/lib/pdf-generator-jobs";

interface JobHeaderProps {
  currentDate: Date;
  onNavigate: (direction: "prev" | "next") => void;
  onNewJob: () => void;
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

    setIsGenerating(true);
    try {
      // Create a filename with current date
      const today = new Date();
      const formattedDate = today.toISOString().split("T")[0];
      const filename = `jobs-report-${formattedDate}.pdf`;

      // Generate the PDF with all displayed jobs
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30); // Default to last 30 days if needed

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1); // Include today

      const doc = await generateJobsPDF(jobs, session, startDate, endDate);

      // Download the PDF
      doc.save(filename);
      toast.success("PDF downloaded successfully");

      // Now save to database
      setIsUploading(true);

      // Convert the PDF to a blob
      const pdfBlob = doc.output("blob");

      // Create FormData to send the PDF to the server
      const formData = new FormData();
      formData.append("pdf", pdfBlob);
      formData.append("reportType", "jobs-summary");
      formData.append("jobCount", jobs.length.toString());
      formData.append("reportName", `Jobs Summary Report - ${formattedDate}`);

      // Add job IDs as a comma-separated string for reference
      const jobIds = jobs.map((job) => job._id).join(",");
      formData.append("jobIds", jobIds);

      // Upload to server which will handle database storage
      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        throw new Error(errorData.message || "Failed to upload PDF");
      }

      const result = await response.json();

      if (result.success) {
        toast.success("Report saved to database successfully");
      } else {
        throw new Error("Failed to save report to database");
      }
    } catch (error) {
      console.error("Error generating jobs report:", error);
      toast.error("Failed to generate report. Please try again.");
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
      className="relative overflow-hidden group"
    >
      <span className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 opacity-0 group-hover:opacity-10 transition-opacity"></span>
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isUploading ? "Saving..." : "Generating..."}
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Generate Report ({jobs.length})
        </>
      )}
    </Button>
  );
}

export function JobHeader({
  currentDate,
  onNavigate,
  onNewJob,
  canCreateJob = false,
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

          {canCreateJob && (
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
