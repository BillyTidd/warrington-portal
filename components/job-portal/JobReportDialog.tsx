"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, FolderOpen, Loader2 } from "lucide-react";
import JSZip from "jszip";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  report?: { folder?: { _id: string; name: string } | null };
}

interface ReportFolder {
  _id: string;
  name: string;
  customerAccountId: string;
  customerName: string;
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
  generatedAt: Date,
  folder?: ReportFolder
): string {
  const baseFilename = buildJobsPdfFilename(jobs, session, generatedAt);
  const folderPart = folder
    ? `-${folder.name.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 48)}-${folder._id.slice(-6)}`
    : "";
  return baseFilename.replace(/\.pdf$/i, `-${fileLabel}${folderPart}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
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
  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [folderLoadError, setFolderLoadError] = useState(false);
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

  useEffect(() => {
    if (!open || !session?.user?.id) return;

    let cancelled = false;

    async function loadFolders() {
      setIsLoadingFolders(true);
      setFolderLoadError(false);
      try {
        const params = new URLSearchParams();
        if (isAdmin && clientId !== "all") params.set("clientId", clientId);
        const response = await fetch(
          `/api/jobs/report/folders?${params.toString()}`,
          { cache: "no-store" }
        );
        if (!response.ok) throw new Error("Folders could not be loaded");

        const data = await response.json();
        if (!cancelled) {
          const nextFolders: ReportFolder[] = Array.isArray(data.folders)
            ? data.folders
            : [];
          setFolders(nextFolders);
          setSelectedFolderIds((current) =>
            current.filter((id) =>
              nextFolders.some((folder) => folder._id === id)
            )
          );
        }
      } catch (error) {
        console.error("Error loading report folders:", error);
        if (!cancelled) {
          setFolders([]);
          setSelectedFolderIds([]);
          setFolderLoadError(true);
          toast.error("Job folders could not be loaded");
        }
      } finally {
        if (!cancelled) setIsLoadingFolders(false);
      }
    }

    loadFolders();
    return () => {
      cancelled = true;
    };
  }, [open, session?.user?.id, isAdmin, clientId]);

  const toggleFolder = (folderId: string, checked: boolean) => {
    setSelectedFolderIds((current) =>
      checked
        ? Array.from(new Set([...current, folderId]))
        : current.filter((id) => id !== folderId)
    );
  };

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
      const generatedAt = new Date();
      const customerName =
        clientId === "all"
          ? "All customers"
          : clients.find((client) => client._id === clientId)?.name ||
            "Selected customer";
      const selectedFolders = selectedFolderIds.map((id) =>
        folders.find((folder) => folder._id === id)
      );
      if (selectedFolders.some((folder) => !folder)) {
        throw new Error("A selected folder is no longer available. Refresh the folder list.");
      }

      const targets = selectedFolders.length
        ? (selectedFolders as ReportFolder[])
        : [null];
      const generatedReports: Array<{
        doc: Awaited<ReturnType<typeof generateJobsPDF>>;
        filename: string;
        jobIds: string[];
        count: number;
        folder: ReportFolder | null;
      }> = [];

      for (const selectedFolder of targets) {
        const params = new URLSearchParams();
        if (period.startDateKey && period.endDateKey) {
          params.set("startDate", period.startDateKey);
          params.set("endDate", period.endDateKey);
        }
        if (isAdmin && clientId !== "all") {
          params.set("clientId", clientId);
        }
        if (selectedFolder) params.set("folderId", selectedFolder._id);

        const response = await fetch(`/api/jobs/report?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as ReportApiResponse;
        if (!response.ok) {
          throw new Error(payload.message || "Unable to prepare the report");
        }

        const reportJobs = Array.isArray(payload.jobs) ? payload.jobs : [];
        if (reportJobs.length === 0 && !selectedFolder) {
          toast.error("No jobs were found for the selected report options");
          return;
        }

        const reportFolder = selectedFolder
          ? {
              ...selectedFolder,
              name: payload.report?.folder?.name || selectedFolder.name,
            }
          : null;
        const doc = await generateJobsPDF(
          reportJobs,
          session,
          period.startDate || generatedAt,
          period.endDate || generatedAt,
          {
            periodLabel: period.label,
            customerLabel: isAdmin
              ? reportFolder?.customerName ||
                (clientId !== "all" ? customerName : undefined)
              : undefined,
            folderLabel: reportFolder?.name,
          }
        );

        generatedReports.push({
          doc,
          filename: reportFilename(
            reportJobs,
            session,
            period.fileLabel,
            generatedAt,
            reportFolder || undefined
          ),
          jobIds: reportJobs.map((job) => job._id).filter(Boolean),
          count: reportJobs.length,
          folder: reportFolder,
        });
      }

      if (generatedReports.length === 1) {
        generatedReports[0].doc.save(generatedReports[0].filename);
      } else {
        const zip = new JSZip();
        generatedReports.forEach(({ doc, filename }) => {
          zip.file(filename, doc.output("arraybuffer"));
        });
        const zipFile = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
        });
        downloadBlob(
          zipFile,
          `Warrington-Job-Reports-${period.fileLabel}-${generatedAt.toISOString().slice(0, 10)}.zip`
        );
      }

      toast.success(
        generatedReports.length === 1
          ? `PDF report downloaded with ${generatedReports[0].count} jobs`
          : `${generatedReports.length} separate folder reports downloaded in a ZIP`
      );
      setOpen(false);

      // Only administrators save shared portal copies. Customer and worker
      // reports are downloaded privately and may contain account-specific data.
      if (isAdmin) {
        setIsUploading(true);
        let failedUploads = 0;
        for (const report of generatedReports) {
          try {
            const formData = new FormData();
            formData.append("pdf", report.doc.output("blob"), report.filename);
            formData.append("reportType", "jobs-summary");
            formData.append("jobCount", String(report.count));
            formData.append(
              "reportName",
              `Portal Jobs Report - ${period.label} - ${report.folder?.name || customerName}`
            );
            formData.append("jobIds", report.jobIds.join(","));

            const uploadResponse = await fetch("/api/upload-pdf", {
              method: "POST",
              body: formData,
            });
            const uploadPayload = await uploadResponse.json().catch(() => null);

            if (!uploadResponse.ok || !uploadPayload?.success) {
              throw new Error(uploadPayload?.message || "Unable to save report");
            }
          } catch (uploadError) {
            failedUploads += 1;
            console.warn("PDF downloaded but could not be saved:", uploadError);
          }
        }
        if (failedUploads) {
          toast.warning(
            `${failedUploads} report${failedUploads === 1 ? "" : "s"} downloaded but could not be saved in the portal`
          );
        } else {
          toast.success(
            `${generatedReports.length} portal report${generatedReports.length === 1 ? "" : "s"} saved`
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
                onValueChange={(value) => {
                  setClientId(value);
                  setSelectedFolderIds([]);
                  setFolders([]);
                }}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Job folders (optional)</Label>
              {folders.length > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    className="text-amber-700 underline underline-offset-2 dark:text-amber-400"
                    onClick={() =>
                      setSelectedFolderIds(folders.map((folder) => folder._id))
                    }
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground underline underline-offset-2"
                    onClick={() => setSelectedFolderIds([])}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border p-2">
              {isLoadingFolders ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading folders...
                </div>
              ) : folderLoadError ? (
                <p className="p-2 text-sm text-red-600">
                  Folders could not be loaded. Reopen the report window to try again.
                </p>
              ) : folders.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  No job folders are available for this selection.
                </p>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder._id}
                    className="flex items-center gap-3 rounded px-2 py-2 hover:bg-muted"
                  >
                    <Checkbox
                      id={`report-folder-${folder._id}`}
                      checked={selectedFolderIds.includes(folder._id)}
                      onCheckedChange={(checked) =>
                        toggleFolder(folder._id, checked === true)
                      }
                    />
                    <FolderOpen className="h-4 w-4 shrink-0 text-amber-600" />
                    <Label
                      htmlFor={`report-folder-${folder._id}`}
                      className="min-w-0 flex-1 cursor-pointer font-normal"
                    >
                      <span className="block truncate">{folder.name}</span>
                      {(isAdmin && clientId === "all") ||
                      session?.user?.role === "employee" ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {folder.customerName}
                        </span>
                      ) : null}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              No folder selected: one report for all matching jobs. Select one
              folder for one PDF, or several folders for a ZIP of separate PDFs.
            </p>
          </div>

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
            disabled={isGenerating || isUploading || isLoadingFolders}
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
                {selectedFolderIds.length > 1
                  ? `Generate ${selectedFolderIds.length} PDFs`
                  : "Generate PDF"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
