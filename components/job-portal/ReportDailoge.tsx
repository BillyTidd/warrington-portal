"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { generateJobsPDF } from "@/lib/pdf-generator-jobs";
interface ReportButtonProps {
  jobs: any[];
  triggerId?: string;
  className?: string;
}

export function ReportDialog({
  jobs,
  triggerId,
  className,
}: ReportButtonProps) {
  const { data: session } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (jobs.length === 0) {
      toast.error("No jobs available to generate a report");
      return;
    }

    setIsGenerating(true);
    try {
      // Get current date for filename
      const today = new Date();

      // Generate PDF report directly with the current jobs
      const doc = await generateJobsPDF(jobs, session, today, today);

      // Create a filename with current date
      const dateStr = format(today, "yyyy-MM-dd");
      const filename = `job-report-${dateStr}.pdf`;

      // Save the PDF
      doc.save(filename);

      toast.success(`Report generated successfully with ${jobs.length} jobs`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      id={triggerId}
      onClick={handleGenerateReport}
      disabled={isGenerating}
      variant="outline"
      className={`bg-white text-amber-600 hover:bg-amber-50 shadow-md hover:shadow-lg transition-all ${className}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        "Generate Report"
      )}
    </Button>
  );
}
