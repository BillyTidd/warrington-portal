"use client";

import { useState } from "react";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isValid,
} from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { generateJobsPDF } from "@/lib/pdf-generator-jobs";

interface ReportDialogProps {
  jobs: any[];
  triggerId?: string;
}

export function ReportDialog({ jobs, triggerId }: ReportDialogProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState<
    "yesterday" | "week" | "month" | "custom"
  >("week");
  const [startDate, setStartDate] = useState<Date | undefined>(
    startOfWeek(new Date())
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    endOfWeek(new Date())
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Update date range based on selection
  const handleDateRangeChange = (
    value: "yesterday" | "week" | "month" | "custom"
  ) => {
    setDateRange(value);

    const today = new Date();

    switch (value) {
      case "yesterday":
        const yesterday = subDays(today, 1);
        setStartDate(yesterday);
        setEndDate(yesterday);
        break;
      case "week":
        setStartDate(startOfWeek(today));
        setEndDate(endOfWeek(today));
        break;
      case "month":
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
      case "custom":
        // Keep current dates for custom
        break;
    }
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate || !isValid(startDate) || !isValid(endDate)) {
      toast.error("Please select valid start and end dates");
      return;
    }

    setIsGenerating(true);
    try {
      // Filter jobs based on date range and user role
      let filteredJobs = jobs.filter((job) => {
        // Safely parse the assign date
        let assignDate;
        try {
          assignDate = job.assignDate ? new Date(job.assignDate) : null;
        } catch (e) {
          console.warn("Invalid date format for job:", job.id);
          return false;
        }

        // Skip jobs with invalid dates
        if (!assignDate || isNaN(assignDate.getTime())) return false;

        const isInDateRange = assignDate >= startDate && assignDate <= endDate;

        // For regular users, only include their assigned jobs
        if (session?.user?.role !== "admin") {
          const isAssignedToUser = job.workers
            ? job.workers.some(
                (worker: any) => worker.userId === session?.user?.id
              )
            : job.userId === session?.user?.id;

          return isInDateRange && isAssignedToUser;
        }

        return isInDateRange;
      });

      if (filteredJobs.length === 0) {
        toast.error("No jobs found in the selected date range");
        setIsGenerating(false);
        return;
      }

      // For non-admin users, filter each job's progress logs to only include their own
      if (session?.user?.role !== "admin") {
        filteredJobs = filteredJobs.map((job) => ({
          ...job,
          progressLogs: job.progressLogs
            ? job.progressLogs.filter(
                (log: any) => log.updatedBy === session?.user?.id
              )
            : [],
        }));
      }

      // Generate PDF report
      const doc = await generateJobsPDF(
        filteredJobs,
        session,
        startDate,
        endDate
      );

      // Create a filename with date range
      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");
      const filename = `job-report-${startDateStr}-to-${endDateStr}.pdf`;

      // Save the PDF
      doc.save(filename);

      toast.success(
        `Report generated successfully with ${filteredJobs.length} jobs`
      );
      setOpen(false);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id={triggerId}
          variant="outline"
          className="bg-white text-violet-600 hover:bg-violet-50 shadow-md hover:shadow-lg transition-all"
        >
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Jobs Report</DialogTitle>
          <DialogDescription>
            {session?.user?.role === "admin"
              ? "Create a comprehensive report of all jobs for a specific time period."
              : "Create a report of your assigned jobs for a specific time period."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Time Period</label>
            <Select
              value={dateRange}
              onValueChange={(value: any) => handleDateRangeChange(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Date Range</label>
            <div className="flex items-center gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                    disabled={dateRange !== "custom"}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate && endDate ? (
                      <>
                        {format(startDate, "PPP")} - {format(endDate, "PPP")}
                      </>
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: startDate,
                      to: endDate,
                    }}
                    onSelect={(range) => {
                      setStartDate(range?.from);
                      setEndDate(range?.to);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerateReport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
