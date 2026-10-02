"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultJobReportPeriodValues,
  resolveJobReportPeriod,
  type JobReportPeriodType,
} from "@/lib/job-report-period";
import {
  buildJobsPdfFilename,
  generateJobsPDF,
} from "@/lib/pdf-generator-jobs";
import type { Job } from "@/types/job";

interface ReportClient {
  _id: string;
  name: string;
}

interface ReportApiResponse {
  jobs?: Job[];
  message?: string;
}

const PERIOD_OPTIONS: Array<{
  value: JobReportPeriodType;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "All orders",
    description: "Every job currently available to your account",
  },
  {
    value: "day",
    label: "Specific day",
    description: "Jobs starting on one selected date",
  },
  {
    value: "week",
    label: "Specific week",
    description: "Monday to Sunday for the selected week",
  },
  {
    value: "month",
    label: "Specific month",
    description: "All jobs starting within one calendar month",
  },
  {
    value: "year",
    label: "Specific year",
    description: "All jobs starting within one calendar year",
  },
  {
    value: "custom",
    label: "Custom date range",
    description: "Choose an exact start date and end date",
  },
];

function reportFilename(
  jobs: Job[],
  session: Session | null,
  fileLabel: string,
  generatedAt: Date
): string {
  const baseFilename = buildJobsPdfFilename(jobs, session, generatedAt);
  return baseFilename.replace(/\.pdf$/i, `-${fileLabel}.pdf`);
}

export function JobReportDialog() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [periodType, setPeriodType] =
    useState<JobReportPeriodType>("all");
  const [periodValues, setPeriodValues] = useState(() =>
    defaultJobReportPeriodValues()
  );
  const [clientId, setClientId] = useState("all");
  const [clients, setClients] = useState<ReportClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (!open || !isAdmin) return;

    let cancelled = false;

    const loadClients = async () => {
      setIsLoadingClients(true);

      try {
        const response = await fetch("/api/clients", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load customers");
        }

        const payload: unknown = await response.json();
        const source = Array.isArray(payload)
          ? payload
          : payload &&
              typeof payload === "object" &&
              Array.isArray(
                (payload as { clients?: unknown[] }).clients
              )
            ? (payload as { clients: unknown[] }).clients
            : [];

        const nextClients = source
          .map((client) => {
            const record = client as Record<string, unknown>;
            return {
              _id: String(record._id || ""),
              name: String(
                record.name || record.company || "Unnamed customer"
              ),
            };
          })
          .filter((client: ReportClient) => client._id)
          .sort((a: ReportClient, b: ReportClient) =>
            a.name.localeCompare(b.name)
          );

        if (!cancelled) setClients(nextClients);
      } catch (error) {
        console.error("Error loading report customers:", error);
        if (!cancelled) {
          setClients([]);
          toast.error("Customers could not be loaded for the report filter");
        }
      } finally {
        if (!cancelled) setIsLoadingClients(false);
      }
    };

    loadClients();

    return () => {
      cancelled = true;
    };
  }, [open, isAdmin]);

  const selectedPeriodDescription = useMemo(
    () =>
      PERIOD_OPTIONS.find((option) => option.value === periodType)
        ?.description || "",
    [periodType]
  );

  const updatePeriodValue = (
    field: keyof typeof periodValues,
    value: string
  ) => {
    setPeriodValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
      const period = resolveJobReportPeriod(periodType, periodValues);
      const params = new URLSearchParams();

      if (period.startDateKey && period.endDateKey) {
        params.set("startDate", period.startDateKey);
        params.set("endDate", period.endDateKey);
      }

      if (isAdmin && clientId !== "all") {
        params.set("clientId", clientId);
      }

      const response = await fetch(`/api/jobs/report?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as ReportApiResponse;

      if (!response.ok) {
        throw new Error(payload.message || "Unable to prepare the report");
      }

      const reportJobs = Array.isArray(payload.jobs) ? payload.jobs : [];
      if (reportJobs.length === 0) {
        toast.error("No jobs were found for the selected report options");
        return;
      }

      const generatedAt = new Date();
      const customerName =
        clientId === "all"
          ? "All customers"
          : clients.find((client) => client._id === clientId)?.name ||
            "Selected customer";

      const doc = await generateJobsPDF(
        reportJobs,
        session,
        period.startDate || generatedAt,
        period.endDate || generatedAt,
        {
          periodLabel: period.label,
          customerLabel:
            isAdmin && clientId !== "all" ? customerName : undefined,
        }
      );
      const filename = reportFilename(
        reportJobs,
        session,
        period.fileLabel,
        generatedAt
      );

      doc.save(filename);
      toast.success(`PDF report downloaded with ${reportJobs.length} jobs`);
      setOpen(false);

      // Only administrators save shared portal copies. Customer and worker
      // reports are downloaded privately and may contain account-specific data.
      if (isAdmin) {
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append("pdf", doc.output("blob"), filename);
          formData.append("reportType", "jobs-summary");
          formData.append("jobCount", String(reportJobs.length));
          formData.append(
            "reportName",
            `Portal Jobs Report - ${period.label} - ${customerName}`
          );
          formData.append(
            "jobIds",
            reportJobs.map((job) => job._id).filter(Boolean).join(",")
          );

          const uploadResponse = await fetch("/api/upload-pdf", {
            method: "POST",
            body: formData,
          });
          const uploadPayload = await uploadResponse.json().catch(() => null);

          if (!uploadResponse.ok || !uploadPayload?.success) {
            throw new Error(uploadPayload?.message || "Unable to save report");
          }

          toast.success("A portal copy of the report was saved");
        } catch (uploadError) {
          console.warn("PDF downloaded but could not be saved:", uploadError);
          toast.warning(
            "PDF downloaded, but the portal copy could not be saved"
          );
        }
      }
    } catch (error) {
      console.error("Error generating jobs report:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to generate the PDF. Please try again."
      );
    } finally {
      setIsGenerating(false);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={isGenerating || isUploading}
          className="border border-amber-500 bg-amber-500 text-black hover:bg-amber-400"
        >
          <FileDown className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Generate Report</span>
          <span className="sm:hidden">Report</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate Job Report</DialogTitle>
          <DialogDescription>
            Choose which jobs should be included in the PDF. Date filters use
            each job&apos;s start date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="report-customer">Customer</Label>
              <Select
                value={clientId}
                onValueChange={setClientId}
                disabled={isLoadingClients}
              >
                <SelectTrigger id="report-customer">
                  <SelectValue
                    placeholder={
                      isLoadingClients ? "Loading customers..." : "All customers"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select one customer or leave this as All customers.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="report-period">Report period</Label>
            <Select
              value={periodType}
              onValueChange={(value) =>
                setPeriodType(value as JobReportPeriodType)
              }
            >
              <SelectTrigger id="report-period">
                <SelectValue placeholder="Select a report period" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedPeriodDescription}
            </p>
          </div>

          {periodType === "day" && (
            <div className="space-y-2">
              <Label htmlFor="report-day">Day</Label>
              <Input
                id="report-day"
                type="date"
                value={periodValues.day}
                onChange={(event) =>
                  updatePeriodValue("day", event.target.value)
                }
              />
            </div>
          )}

          {periodType === "week" && (
            <div className="space-y-2">
              <Label htmlFor="report-week-day">Choose a day in the week</Label>
              <Input
                id="report-week-day"
                type="date"
                value={periodValues.weekDay}
                onChange={(event) =>
                  updatePeriodValue("weekDay", event.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                The report will include Monday through Sunday for this week.
              </p>
            </div>
          )}

          {periodType === "month" && (
            <div className="space-y-2">
              <Label htmlFor="report-month">Month</Label>
              <Input
                id="report-month"
                type="month"
                value={periodValues.month}
                onChange={(event) =>
                  updatePeriodValue("month", event.target.value)
                }
              />
            </div>
          )}

          {periodType === "year" && (
            <div className="space-y-2">
              <Label htmlFor="report-year">Year</Label>
              <Input
                id="report-year"
                type="number"
                min={2000}
                max={2100}
                inputMode="numeric"
                value={periodValues.year}
                onChange={(event) =>
                  updatePeriodValue("year", event.target.value)
                }
              />
            </div>
          )}

          {periodType === "custom" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="report-custom-start">Start date</Label>
                <Input
                  id="report-custom-start"
                  type="date"
                  value={periodValues.customStart}
                  onChange={(event) =>
                    updatePeriodValue("customStart", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-custom-end">End date</Label>
                <Input
                  id="report-custom-end"
                  type="date"
                  value={periodValues.customEnd}
                  min={periodValues.customStart || undefined}
                  onChange={(event) =>
                    updatePeriodValue("customEnd", event.target.value)
                  }
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isGenerating || isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerateReport}
            disabled={isGenerating || isUploading}
            className="bg-amber-500 text-black hover:bg-amber-400"
          >
            {isGenerating || isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploading ? "Saving report..." : "Generating report..."}
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Generate PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
