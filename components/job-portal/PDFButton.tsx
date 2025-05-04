"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateJobPDF } from "@/lib/excelGenerator";
import type { Job } from "@/types/job";

interface PDFButtonProps {
  job: Job;
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  saveToDatabase?: boolean;
  showOnlyCurrentUserLogs?: boolean;
}

export function PDFButton({
  job,
  variant = "default",
  size = "default",
  saveToDatabase = false,
  showOnlyCurrentUserLogs = false,
}: PDFButtonProps) {
  const { data: session } = useSession();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Create a simplified filename with no special characters
      const safeFilename = `job-report-${job._id}.pdf`;

      // Generate the PDF document
      const doc = await generateJobPDF(job, session);

      if (saveToDatabase) {
        setIsUploading(true);

        // Convert the PDF to a blob
        const pdfBlob = doc.output("blob");

        // Create FormData to send the PDF to the server
        const formData = new FormData();
        formData.append("pdf", pdfBlob);
        formData.append("jobId", job._id);
        formData.append("jobName", job.jobName);

        // Add flag to filter logs by current user if requested
        if (showOnlyCurrentUserLogs) {
          formData.append("filterByUser", "true");
        }

        // Upload to server which will handle Google Drive upload
        const response = await fetch("/api/upload-pdf", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to upload PDF");
        }

        const result = await response.json();

        if (result.success) {
          toast.success("PDF report generated and saved successfully");
        } else {
          throw new Error("Failed to save report to database");
        }
      } else {
        // Just download the PDF locally
        doc.save(safeFilename);
        toast.success("PDF report generated successfully");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again later.");
    } finally {
      setIsGeneratingPDF(false);
      setIsUploading(false);
    }
  };

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isGeneratingPDF || isUploading}
      variant={variant}
      size={size}
      className="relative overflow-hidden group"
    >
      <span className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 opacity-0 group-hover:opacity-10 transition-opacity"></span>
      {isGeneratingPDF ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isUploading ? "Uploading..." : "Generating..."}
        </>
      ) : (
        <>
          {saveToDatabase ? (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Generate & Save Report
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate PDF Report
            </>
          )}
        </>
      )}
    </Button>
  );
}
