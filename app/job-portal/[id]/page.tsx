"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CustomerAccountOption } from "@/types/customer-account";
import { useSession } from "next-auth/react";
import {
  Loader2,
  AlertTriangle,
  FileText,
  ArrowLeft,
  ClipboardList,
  BarChart3,
  Plus,
  Users,
  PoundSterling,
  Clock,
  Info,
  Paperclip,
  ExternalLink,
  Upload,
  Moon,
  Sun,
  Navigation,
  Hash,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Job, Worker, JobProgressLog } from "@/types/job";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import components
import { JobDetailsHeader } from "@/components/job-portal/JobDetailsHeader";
import { StatusUpdateSection } from "@/components/job-portal/StatusUpdateSection";
import { JobDetailsForm } from "@/components/job-portal/JobDetailsForm";
import { JobDescription } from "@/components/job-portal/JobDescription";
import { JobTimeline } from "@/components/job-portal/JobTimeline";
import { JobStatusCard } from "@/components/job-portal/JobStatusCard";
import { JobProgressForm } from "@/components/job-portal/JobProgressForm";
import { ProgressSummary } from "@/components/job-portal/ProgressSummary";
import { ProgressTimeline } from "@/components/job-portal/ProgressTimeline";
// import { ProgressEditModal } from "@/components/job-portal/ProgressEditModal";
import { CostBreakdown } from "@/components/job-portal/CostBreakdown";
import { PDFButton } from "@/components/job-portal/PDFButton";
import { ProgressEditModal } from "@/components/job-portal/ProgressEditModal";
import { WorkerConfirmations } from "@/components/job-portal/WorkerConfirmations";
import type { JobDocument } from "@/types/job-document";

const DOCUMENT_MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  doc: "application/msword",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
};

function getDocumentMimeType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return file.type || DOCUMENT_MIME_TYPES[extension] || "";
}

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [job, setJob] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedJob, setEditedJob] = useState<Partial<Job>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);
  const [workers, setWorkers] = useState<{ _id: string; name: string; phone?: string; whatsappNumber?: string; role: string; isApproved: boolean }[]>([]);
  const [clients, setClients] =
  useState<CustomerAccountOption[]>([]);
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  const [showProgressForm, setShowProgressForm] = useState(false);
  const backgroundJobErrorShownRef = useRef(false);

  // Progress edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProgress, setEditingProgress] = useState<JobProgressLog | null>(
    null
  );

  // R2 job-document upload state
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<JobDocument | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] =
    useState(false);

  const isAdmin = session?.user?.role === "admin";
  const isClient = session?.user?.role === "customer";
  const isWorker = session?.user?.role === "employee";

  // Check if current user is assigned to this job (works with both old and new format)
  const isAssignedToMe = job?.workers
    ? job.workers.some((worker: any) => worker.userId === session?.user?.id)
    : job?.userId === session?.user?.id; // Backward compatibility

  // Get the current worker's payment information
  const currentWorker = job?.workers?.find(
    (worker: any) => worker.userId === session?.user?.id
  );
  const workerPaymentRate =
    currentWorker?.paymentRate || job?.workerPaymentRate;
  const workerHourlyRate: any =
    currentWorker?.hourlyRate || job?.workerHourlyRate;

  const canUpdateJob = isAdmin || isAssignedToMe;
  const canEditJob = isAdmin;

  useEffect(() => {
    fetchJobDetails();
    if (isAdmin) {
      fetchWorkersAndClients();
    }
  }, [params.id, isAdmin]);

  useEffect(() => {
  if (!isClient || isEditing) {
    return;
  }

  const refreshInterval = window.setInterval(() => {
    fetchJobDetails(false);
  }, 10000);

  return () => {
    window.clearInterval(refreshInterval);
  };
}, [isClient, isEditing, params.id]);


  // Listen for edit progress events
  useEffect(() => {
    const handleEditProgress = (event: any) => {
      const progressLog = event.detail;
      setEditingProgress(progressLog);
      setIsEditModalOpen(true);
    };

    window.addEventListener("editProgress", handleEditProgress);
    return () => window.removeEventListener("editProgress", handleEditProgress);
  }, []);

  const fetchJobDetails = async (
  showLoading = true
) => {
  if (showLoading) {
    setIsLoading(true);
  }
    try {
      const response = await fetch(`/api/jobs/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job details");
      }
      const data = await response.json();
      setJob(data);
      setEditedJob(data);
      backgroundJobErrorShownRef.current = false;
    } catch (error) {
      console.error("Error fetching job:", error);
      if (showLoading || !backgroundJobErrorShownRef.current) {
        toast.error("Failed to load job details");
        backgroundJobErrorShownRef.current = true;
      }
    } finally {
  if (showLoading) {
    setIsLoading(false);
  }
}
  };

  const fetchWorkersAndClients = async () => {
    try {
      const [workersRes, clientsRes, confirmationsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/v1/admin/customer-accounts", {
  cache: "no-store",
}),
        fetch(`/api/jobs/${params.id}/worker-confirmations`),
      ]);

      if (!workersRes.ok || !clientsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const workersData = await workersRes.json();
      const clientsData = await clientsRes.json();
      const confirmationsData = confirmationsRes.ok ? await confirmationsRes.json() : [];

      const approvedWorkers = workersData
        .filter((user: any) => user.isApproved && user.role === "employee")
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      setWorkers(approvedWorkers);
      setClients(clientsData.customers || []);
      setConfirmations(Array.isArray(confirmationsData) ? confirmationsData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch workers and clients");
    }
  };

  const handleSaveJob = async () => {
    if (isAdmin && !editedJob.customer_account_id) {
  toast.error("Please select a customer account");
  return;
}

    setIsSaving(true);
    try {
      const response = await fetch(`/api/jobs/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedJob),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update job");
      }

      const updatedJob = await response.json();
      setJob(updatedJob);
      setIsEditing(false);
      toast.success("Job updated successfully");

      // If status was changed, log it in progress
      if (job?.status !== editedJob.status) {
        await fetch(`/api/jobs/${params.id}/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            details: `Status changed to ${editedJob.status}`,
            statusChange: true,
            newStatus: editedJob.status,
          }),
        });
      }
    } catch (error: any) {
      console.error("Error updating job:", error);
      toast.error(error.message || "Failed to update job");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteJob = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/jobs/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete job");
      }

      toast.success("Job deleted successfully");
      router.push("/job-portal");
    } catch (error: any) {
      console.error("Error deleting job:", error);
      toast.error(error.message || "Failed to delete job");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleAddProgress = async (progressData: Partial<any>) => {
    setIsSubmittingProgress(true);
    try {
      const submittedAmount = Number(progressData.amount || 0);

      // Prepare the data for the API
      const apiData = {
        details: progressData.description,
        workType: progressData.workType,
        costTreatment: isAdmin
  ? progressData.costTreatment
  : undefined,
        cost:
          progressData.workType === "extra"
            ? submittedAmount
            : progressData.workType === "vehicle"
              ? progressData.vehicleUsage?.totalCost
              : submittedAmount
                ? submittedAmount
                : undefined,
        overtimeHours: progressData.overtimeHours,
        overtimeCost:
          progressData.workType === "extra"
            ? submittedAmount
            : undefined,
        overtimeWorkerId: progressData.overtimeWorkerId,
        overtimeWorkerName: progressData.overtimeWorkerName,
        overtimeHourlyRate: progressData.overtimeHourlyRate,
        vehicleUsage: progressData.vehicleUsage,
        jobStatus: "pending", // All new progress starts as pending
      };

      const response = await fetch(`/api/jobs/${params.id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add progress");
      }

      await fetchJobDetails(); // Refresh job data
      setShowProgressForm(false);
      toast.success("Progress added successfully and is pending approval");
    } catch (error: any) {
      console.error("Error adding progress:", error);
      toast.error(error.message || "Failed to add progress");
    } finally {
      setIsSubmittingProgress(false);
    }
  };

  const handleDeleteProgress = async (logId: string) => {
    if (!logId) {
      console.error("Cannot delete: logId is missing");
      return;
    }

    console.log("Starting to delete log with ID or identifier:", logId);
    try {
      const response = await fetch(
        `/api/jobs/${params.id}/progress?logId=${encodeURIComponent(logId)}`,
        {
          method: "DELETE",
        }
      );

      console.log("Delete API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete progress log");
      }

      await fetchJobDetails(); // Refresh job data
      console.log("Job updated successfully after delete");
      toast.success("Progress log deleted successfully");
    } catch (error: any) {
      console.error("Error deleting progress log:", error);
      toast.error(error.message || "Failed to delete progress log");
    }
  };

  const handleEditProgress = async (
    logId: string,
    updates: {
      cost?: number;
      jobStatus: string;
      overtimeCost?: number;
      vehicleUsage?: any;
      costTreatment?: "billable" | "absorbed";
    }
  ) => {
    try {
      const response = await fetch(`/api/jobs/${params.id}/progress`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logId,
          ...updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update progress");
      }
      await fetchJobDetails(); // Refresh job data
      toast.success("Progress updated successfully");
    } catch (error: any) {
      console.error("Error updating progress:", error);
      toast.error(error.message || "Failed to update progress");
      throw error;
    }
  };

  const handleStatusChange = async (
    newStatus: "pending" | "in-progress" | "completed"
  ) => {
    if (!job || job.status === newStatus) return;

    setIsSaving(true);
    try {
      // Update the job status
      const response = await fetch(`/api/jobs/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...job,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update status");
      }

      // Add a progress log for the status change
      const progressResponse = await fetch(`/api/jobs/${params.id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          details: `Status changed to ${newStatus}`,
          statusChange: true,
          newStatus: newStatus,
        }),
      });

      if (!progressResponse.ok) {
        throw new Error("Failed to log status change");
      }

      // Send email notification when job is completed
      if (newStatus === "completed") {
        fetch("/api/send-job-completion-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job }),
        }).catch((error) => {
          console.error("Failed to send completion email:", error);
        });
      }

      await fetchJobDetails(); // Refresh job data
      toast.success("Status updated successfully");
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadDocuments = async () => {
    if (documentFiles.length === 0 || !job) {
      return;
    }

    setIsUploadingDocuments(true);

    try {
      const uploadedDocuments = await Promise.all(
        documentFiles.map(async (file) => {
          const mimeType = getDocumentMimeType(file);

          const presignResponse = await fetch(
            "/api/job-documents/presign",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                mimeType,
                size: file.size,
              }),
            }
          );

          const presignData = await presignResponse.json();

          if (!presignResponse.ok) {
            throw new Error(
              presignData.message || `Unable to prepare ${file.name}`
            );
          }

          const uploadResponse = await fetch(presignData.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": mimeType },
            body: file,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          return {
            objectKey: presignData.objectKey,
            originalName: file.name,
            mimeType,
            size: file.size,
          };
        })
      );

      const attachResponse = await fetch(
        `/api/jobs/${params.id}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documents: uploadedDocuments }),
        }
      );

      const attachData = await attachResponse.json();

      if (!attachResponse.ok) {
        throw new Error(
          attachData.message || "Unable to attach documents"
        );
      }

      setDocumentFiles([]);
      await fetchJobDetails(false);
      toast.success("Documents uploaded successfully");
    } catch (error) {
      console.error("Document upload failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Document upload failed"
      );
    } finally {
      setIsUploadingDocuments(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete || !isAdmin) {
      return;
    }

    setIsDeletingDocument(true);

    try {
      const response = await fetch(
        `/api/job-documents/${encodeURIComponent(
          documentToDelete._id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to remove document"
        );
      }

      setDocumentToDelete(null);
      await fetchJobDetails(false);
      toast.success("Document removed successfully");
    } catch (error) {
      console.error("Document deletion failed:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to remove document"
      );
    } finally {
      setIsDeletingDocument(false);
    }
  };

  // Helper function to render assigned workers
  const renderAssignedWorkers = () => {
    if (job?.workers && job.workers.length > 0) {
      return (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Assigned Workers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-40">
              <div className="space-y-2">
                {job.workers.map((worker: Worker) => (
                  <div
                    key={worker.userId}
                    className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-muted/50"
                  >
                    <span>{worker.workerName}</span>
                    {worker.userId === session?.user?.id && (
                      <Badge variant="outline" className="ml-2">
                        You
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      );
    } else if (job?.workerName) {
      // Backward compatibility for old job format
      return (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Assigned Worker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-1 px-2">
              <span>{job.workerName}</span>
              {job.userId === session?.user?.id && (
                <Badge variant="outline" className="ml-2">
                  You
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  // Render worker payment information if the current user is assigned to this job
  const renderWorkerPayment = () => {
    if (!isAssignedToMe || !job) return null;

    if (!workerPaymentRate && !workerHourlyRate) return null;

    return (
      <Card className="mb-4 border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 pb-3">
          <CardTitle className="text-lg flex items-center">
            <PoundSterling className="h-5 w-5 mr-2 text-emerald-500" />
            Your Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {workerPaymentRate && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Payment:</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                £{workerPaymentRate.toFixed(2)}
              </span>
            </div>
          )}

          {workerHourlyRate && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                Overtime Rate:
              </span>
              <span className="font-medium">
                £{workerHourlyRate.toFixed(2)}/hour
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Calculate approved costs only for financial summaries
  const getApprovedCosts = () => {
    if (!job?.progressLogs) return 0;
    return job.progressLogs
      .filter((log: any) => log.jobStatus === "approved" && !log.statusChange)
      .reduce((sum: any, log: any) => {
        const cost =
          log.overtimeCost || log.vehicleUsage?.totalCost || log.cost || 0;
        return sum + cost;
      }, 0);
  };

  // Same as getApprovedCosts, but using each entry's originally submitted
  // amount — this is what workers see, so an admin-edited price is never
  // shown to the worker who submitted it.
  const getWorkerVisibleApprovedCosts = () => {
    if (!job?.progressLogs) return 0;
    return job.progressLogs
      .filter((log: any) => log.jobStatus === "approved" && !log.statusChange)
      .reduce((sum: any, log: any) => {
        const cost =
          log.originalCost ??
          (log.overtimeCost || log.vehicleUsage?.totalCost || log.cost || 0);
        return sum + cost;
      }, 0);
  };

  // Split approved costs into billable (Expenses entries, already passed
  // through to clientPrice on approval — no profit impact) vs absorbed
  // (Overtime/Mileage — internal costs that actually reduce profit)
const getApprovedCostsBreakdown = () => {
  if (!job?.progressLogs) {
    return {
      billable: 0,
      absorbed: 0,
    };
  }

  return job.progressLogs
    .filter(
      (log: any) =>
        log.jobStatus === "approved" &&
        !log.statusChange
    )
    .reduce(
      (
        totals: {
          billable: number;
          absorbed: number;
        },
        log: any
      ) => {
        const rawCost =
          log.overtimeCost ??
          log.vehicleUsage?.totalCost ??
          log.cost ??
          0;

        const parsedCost = Number(rawCost);

        const cost = Number.isFinite(parsedCost)
          ? parsedCost
          : 0;

        // Use the Admin's selection.
        // Use the old workType rule only for
        // historical approved records.
        const treatment =
          log.costTreatment ??
          (log.workType === "regular"
            ? "billable"
            : "absorbed");

        if (treatment === "billable") {
          totals.billable += cost;
        } else {
          totals.absorbed += cost;
        }

        return totals;
      },
      {
        billable: 0,
        absorbed: 0,
      }
    );
};

  // Render detailed worker payment information for admin view
  const renderAdminWorkerPayments = () => {
    if (!isAdmin || !job || !job.workers || job.workers.length === 0)
      return null;

    // Calculate total payment for all workers
    const totalWorkerPayments = job.workers.reduce(
      (sum: any, worker: any) => sum + (worker.paymentRate || 0),
      0
    );

    return (
      <Card className="mb-6 border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 pb-3">
          <CardTitle className="text-lg flex items-center">
            <PoundSterling className="h-5 w-5 mr-2 text-blue-500" />
            Worker Payment Details
          </CardTitle>
          <CardDescription>
            Payment rates and overtime information for all assigned workers
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Fixed Rate</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {job.workers.map((worker: any) => (
                <TableRow key={worker.userId}>
                  <TableCell className="font-medium">
                    {worker.workerName}
                  </TableCell>
                  <TableCell>
                    {worker.paymentRate ? (
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        £{worker.paymentRate.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Not set
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {worker.hourlyRate ? (
                      <span className="font-medium">
                        £{worker.hourlyRate.toFixed(2)}/hr
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Not set
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    >
                      Active
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
        <CardFooter className="bg-blue-50/50 dark:bg-blue-950/20 border-t px-6 py-3">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center">
              <Info className="h-4 w-4 text-blue-500 mr-2" />
              <span className="text-sm text-muted-foreground">
                Total worker payments
              </span>
            </div>
            <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
              £{totalWorkerPayments.toFixed(2)}
            </span>
          </div>
        </CardFooter>
      </Card>
    );
  };

  // Render financial overview for admin
  const renderAdminFinancialOverview = () => {
    if (!isAdmin || !job) return null;

    const clientPrice = job.clientPrice || 0;
    const totalWorkerPayments = job.workers
      ? job.workers.reduce(
          (sum: any, worker: any) => sum + (worker.paymentRate || 0),
          0
        )
      : job.workerPaymentRate || 0;
const { billable: billableCosts, absorbed: absorbedCosts } =
  getApprovedCostsBreakdown();

const totalCosts =
  totalWorkerPayments +
  billableCosts +
  absorbedCosts;

const profit =
  clientPrice - totalCosts;

const profitMargin =
  clientPrice > 0
    ? (profit / clientPrice) * 100
    : 0;

    return (
      <Card className="mb-6 border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/40 pb-3">
          <CardTitle className="text-lg flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-yellow-500" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Client Price</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                £{clientPrice.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Worker Payments</p>
              <p className="text-xl font-bold text-red-500">
                -£{totalWorkerPayments.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center flex-wrap gap-1.5">
                Billable Costs
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 leading-4 font-normal border-blue-500 text-blue-600 dark:text-blue-400"
                >
                  In Price
                </Badge>
              </p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                £{billableCosts.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center flex-wrap gap-1.5">
                Absorbed Costs
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 leading-4 font-normal border-amber-500 text-amber-600 dark:text-amber-400"
                >
                  Reduces profit
                </Badge>
              </p>
              <p className="text-xl font-bold text-red-500">
                -£{absorbedCosts.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Profit</p>
              <p
                className={`text-xl font-bold ${
                  profit >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                £{profit.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Profit Margin</p>
              <Badge
                className={`${
                  profitMargin >= 20
                    ? "bg-green-500"
                    : profitMargin >= 0
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
              >
                {profitMargin.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderClientFinancialOverview = () => {
    const clientPrice = Number(job.clientPrice) || 0;

    return (
      <Card className="mb-6 border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/40 pb-3">
          <CardTitle className="text-lg flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-yellow-500" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Job Price</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              £{clientPrice.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading job details...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-muted/30 rounded-full p-6 w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Job not found</h2>
            <p className="text-muted-foreground mb-6">
              The job you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <Button size="lg" onClick={() => router.push("/job-portal")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Job Portal
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const progressPercentage =
    job.status === "completed" ? 100 : job.status === "in-progress" ? 50 : 0;
  const approvedCosts = getApprovedCosts();
  const totalWorkerPayments = job.workers
    ? job.workers.reduce(
        (sum: number, worker: any) => sum + (worker.paymentRate || 0),
        0
      )
    : job.workerPaymentRate || 0;

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <JobDetailsHeader
          job={job}
          isEditing={isEditing}
          editedJob={editedJob}
          isSaving={isSaving}
          isAdmin={isAdmin}
          canEditJob={canEditJob}
          canUpdateJob={canUpdateJob}
          progressPercentage={progressPercentage}
          setEditedJob={setEditedJob}
          setIsEditing={setIsEditing}
          handleSaveJob={handleSaveJob}
          setShowProgressForm={setShowProgressForm}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
          isAssignedToMe={isAssignedToMe}
        />

        {/* Customers must not generate internal job reports. */}
        {(isAdmin || isWorker) && (
          <div className="mb-4 flex flex-col justify-end gap-2 sm:flex-row">
            <PDFButton job={job} variant="outline" />
            <PDFButton job={job} variant="outline" saveToDatabase={true} />
          </div>
        )}

        {/* Status Update Section */}
        {canUpdateJob && !isEditing && (
          <StatusUpdateSection
            jobStatus={job.status || "pending"}
            isSaving={isSaving}
            handleStatusChange={handleStatusChange}
          />
        )}

        {/* Admin Financial Overview (visible only to admins) */}
        {isAdmin && !isEditing && renderAdminFinancialOverview()}
        {isClient && renderClientFinancialOverview()}
        {/* Admin Worker Payments (visible only to admins) */}
        {isAdmin && !isEditing && renderAdminWorkerPayments()}

        {/* Main Content Tabs */}
        <Tabs
          defaultValue="details"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList
            className={`grid mb-6 ${isAdmin ? "grid-cols-5" : "grid-cols-3"}`}
          >
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30"
            >
              <FileText className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Details</span>
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30"
            >
              <ClipboardList className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Expenses / Progress</span>
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30"
            >
              <Paperclip className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Documents</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="financials"
                className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30"
              >
                <BarChart3 className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Financials</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger
                value="confirmations"
                className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30"
              >
                <Users className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Confirmations</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column - Job details */}
              <div className="lg:col-span-2">
                {isEditing ? (
                  <JobDetailsForm
                    editedJob={editedJob}
                    setEditedJob={setEditedJob}
                    isAdmin={isAdmin}
                    workers={workers}
                    clients={clients}
                    confirmations={confirmations}
                  />
                ) : (
                  <>
                    {/* Display assigned workers */}
                    {renderAssignedWorkers()}

                    {/* Display worker payment information if assigned to this job */}
                    {renderWorkerPayment()}

                    <JobDescription job={job} isCustomer={isClient} />
                  </>
                )}
              </div>

              {/* Right column - Job stats */}
              <div className="lg:col-span-1 space-y-6">
                <JobTimeline job={job} />
                <JobStatusCard
                  status={job.status || "pending"}
                  progressPercentage={progressPercentage}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column - Add progress */}
              <div className="lg:col-span-1 space-y-6">
                {canUpdateJob && (
                  <>
                    {showProgressForm ? (
                      <JobProgressForm
                        onSubmit={handleAddProgress}
                        onCancel={() => setShowProgressForm(false)}
                        isAdmin={isAdmin}
                        isSubmitting={isSubmittingProgress}
                        workerHourlyRate={workerHourlyRate}
                        currencySymbol="£"
                        job={job}
                        currentUserId={session?.user?.id}
                      />
                    ) : (
                      <div>
                        <Card className="border-none shadow-lg">
                          <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40">
                            <CardTitle>Progress Tracking</CardTitle>
                            <CardDescription>
                              Keep track of your work on this job
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="text-center py-6">
                              <div className="bg-muted/30 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <ClipboardList className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <h3 className="text-lg font-medium mb-2">
                                Track Your Progress
                              </h3>
                              <p className="text-muted-foreground mb-4">
                                Record updates, costs, and activities as you
                                work on this job.
                              </p>
                              <Button onClick={() => setShowProgressForm(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Expense
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    <ProgressSummary
                      progressLogs={job.progressLogs}
                      totalCost={
                        isWorker
                          ? getWorkerVisibleApprovedCosts()
                          : approvedCosts
                      }
                      currencySymbol="£"
                    />
                  </>
                )}
              </div>

              {/* Right column - Progress timeline */}
              <div className="lg:col-span-2">
                <ProgressTimeline
                  progressLogs={job.progressLogs}
                  canUpdateJob={canUpdateJob}
                  handleDeleteProgress={handleDeleteProgress}
                  handleEditProgress={handleEditProgress}
                  setShowProgressForm={setShowProgressForm}
                  currencySymbol="£"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">




              {/* Current Job Documents */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-3 dark:from-blue-950/40 dark:to-indigo-950/40">
                  <CardTitle className="flex items-center text-lg">
                    <FileText className="mr-2 h-5 w-5 text-blue-500" />
                    Job Documents
                  </CardTitle>

                  <CardDescription>
                    Documents attached to this job estimate
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                  {job.documents?.length > 0 ? (
                    <div className="space-y-3">
                      {job.documents.map((document: any) => {
                        const isImage =
                          document.mimeType?.startsWith("image/");

                        return (
                          <div
                            key={document._id?.toString()}
                            className="overflow-hidden rounded-lg border bg-muted/50"
                          >
                            {isImage && (
                              <a
                                href={document.downloadPath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={document.downloadPath}
                                  alt={document.originalName}
                                  className="h-40 w-full object-cover"
                                />
                              </a>
                            )}

                            <div className="flex items-center gap-3 p-3">
                              {!isImage && (
                                <FileText className="h-8 w-8 flex-shrink-0 text-blue-500" />
                              )}

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {document.originalName}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {(Number(document.size || 0) /
                                    1024 /
                                    1024).toFixed(2)}{" "}
                                  MB
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <a
                                  href={document.downloadPath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="outline" size="sm">
                                    <ExternalLink className="mr-1 h-4 w-4" />
                                    Open
                                  </Button>
                                </a>

                                {isAdmin && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950"
                                    onClick={() =>
                                      setDocumentToDelete(document)
                                    }
                                  >
                                    <Trash2 className="mr-1 h-4 w-4" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : job.pdfUrl ? (
                    // Backward compatibility for older Cloudinary PDF files
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                      <FileText className="h-8 w-8 flex-shrink-0 text-blue-500" />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {job.pdfFilename || "Job PDF Document"}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Legacy job document
                        </p>
                      </div>

                      <Link
                        href={`/api/download-pdf?url=${encodeURIComponent(
                          job.pdfUrl
                        )}${
                          job.pdfFilename
                            ? `&filename=${encodeURIComponent(
                                job.pdfFilename
                              )}`
                            : ""
                        }`}
                        target="_blank"
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-1 h-4 w-4" />
                          Open
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <Paperclip className="mx-auto mb-3 h-10 w-10 opacity-40" />

                      <p className="text-sm">
                        No documents are attached to this job.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Admin and the owning customer can add R2-backed documents. */}
              {(isAdmin || isClient) && (
                <Card className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 pb-3 dark:from-amber-950/40 dark:to-yellow-950/40">
                    <CardTitle className="flex items-center text-lg">
                      <Upload className="mr-2 h-5 w-5 text-amber-500" />
                      Upload Documents
                    </CardTitle>
                    <CardDescription>
                      Upload PDF, image, Word, Excel, CSV or TXT files. Maximum
                      25 MB per file and 10 files at once.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-muted-foreground transition-colors hover:border-amber-400 hover:text-amber-600">
                      <Paperclip className="h-5 w-5" />
                      <span>Select one or more documents</span>

                      <input
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt"
                        className="hidden"
                        disabled={isUploadingDocuments}
                        onChange={(event) => {
                          const selectedFiles = Array.from(
                            event.target.files || []
                          );

                          const invalidFile = selectedFiles.find(
                            (file) => file.size > 25 * 1024 * 1024
                          );

                          if (invalidFile) {
                            toast.error(
                              `${invalidFile.name} exceeds the 25 MB limit`
                            );
                            event.target.value = "";
                            return;
                          }

                          if (
                            documentFiles.length + selectedFiles.length >
                            10
                          ) {
                            toast.error(
                              "You can upload a maximum of 10 files at once"
                            );
                            event.target.value = "";
                            return;
                          }

                          setDocumentFiles((currentFiles) => [
                            ...currentFiles,
                            ...selectedFiles,
                          ]);
                          event.target.value = "";
                        }}
                      />
                    </label>

                    {documentFiles.length > 0 && (
                      <div className="space-y-2">
                        {documentFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${file.size}-${index}`}
                            className="flex items-center gap-3 rounded-md border p-3"
                          >
                            <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />
                            <span className="min-w-0 flex-1 truncate text-sm">
                              {file.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isUploadingDocuments}
                              onClick={() =>
                                setDocumentFiles((currentFiles) =>
                                  currentFiles.filter(
                                    (_, fileIndex) => fileIndex !== index
                                  )
                                )
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      type="button"
                      className="w-full"
                      disabled={
                        documentFiles.length === 0 || isUploadingDocuments
                      }
                      onClick={handleUploadDocuments}
                    >
                      {isUploadingDocuments ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload {documentFiles.length || ""} Document
                          {documentFiles.length === 1 ? "" : "s"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Job Extra Details — team, shift, reference, multipliers */}
            {(job.jobEstimate?.team ||
              job.jobEstimate?.jobShift ||
              job.jobEstimate?.jobReference ||
              job.jobEstimate?.londonStartingPoint ||
              job.jobEstimate?.manager ||
              job.jobEstimate?.managerDetails) && (
              <Card className="mt-6 border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Info className="h-5 w-5 mr-2 text-amber-500" />
                    Job Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {job.jobEstimate?.team && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">
                          Team
                        </p>
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 w-fit"
                        >
                          <Navigation className="h-3 w-3" />
                          {job.jobEstimate.team === "london"
                            ? "London"
                            : "Default"}
                        </Badge>
                      </div>
                    )}
                    {job.jobEstimate?.jobShift && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">
                          Shift
                        </p>
                        {job.jobEstimate.jobShift === "night" ? (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 w-fit text-indigo-600 border-indigo-400"
                          >
                            <Moon className="h-3 w-3" />
                            Night (×1.5)
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 w-fit text-amber-600 border-amber-400"
                          >
                            <Sun className="h-3 w-3" />
                            Day
                          </Badge>
                        )}
                      </div>
                    )}
                    {job.jobEstimate?.jobReference && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">
                          Reference
                        </p>
                        <p className="font-medium flex items-center gap-1">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {job.jobEstimate.jobReference}
                        </p>
                      </div>
                    )}
                    {job.jobEstimate?.londonStartingPoint && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">
                          Starting Point
                        </p>
                        <p className="font-medium flex items-center gap-1">
                          <Navigation className="h-3 w-3 text-muted-foreground" />
                          {job.jobEstimate.londonStartingPoint}
                        </p>
                      </div>
                    )}
                    {(
                      job.jobEstimate?.manager ||
                      job.jobEstimate?.managerDetails
                    ) && (
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">
                          Customer Site Manager
                        </p>

                        <p className="font-medium">
                          {job.jobEstimate?.managerDetails
                            ?.fullName ||
                            job.jobEstimate?.manager}
                        </p>

                        {job.jobEstimate?.managerDetails
                          ?.email && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {job.jobEstimate.managerDetails.email}
                          </p>
                        )}

                        {job.jobEstimate?.managerDetails
                          ?.phone && (
                          <p className="text-xs text-muted-foreground">
                            {job.jobEstimate.managerDetails.phone}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Rate multipliers */}
                  {job.estimatedCosts && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        Rate Adjustments
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {job.jobEstimate?.jobShift === "night" && (
                          <Badge className="bg-indigo-500 text-white">
                            Night ×1.5
                          </Badge>
                        )}
                        {job.estimatedCosts?.isWeekend && (
                          <Badge className="bg-orange-500 text-white">
                            Weekend ×1.5
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="financials" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  {/* <FinancialSummary
                    clientPrice={job.clientPrice || 0}
                    totalCost={approvedCosts} // Only approved costs
                    profit={profit}
                    currencySymbol="£"
                  /> */}
                </div>

                <div className="lg:col-span-2">
                  <CostBreakdown
                    progressLogs={job.progressLogs?.filter(
                      (log: any) => log.jobStatus === "approved"
                    )} // Only approved logs
                    workers={job.workers}
                    totalCost={approvedCosts + totalWorkerPayments}
                    profit={
                      (job.clientPrice || 0) -
                      (approvedCosts + totalWorkerPayments)
                    }
                    currencySymbol="£"
                  />
                </div>
              </div>
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="confirmations" className="mt-0">
              <WorkerConfirmations jobId={params.id} workers={workers} />
            </TabsContent>
          )}
        </Tabs>

        {/* Progress Edit Modal */}
        <ProgressEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingProgress(null);
          }}
          progressLog={editingProgress}
          onUpdate={handleEditProgress}
          currencySymbol="£"
        />

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this job?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                job and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteJob}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Job"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={Boolean(documentToDelete)}
          onOpenChange={(open) => {
            if (!open && !isDeletingDocument) {
              setDocumentToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Remove this document permanently?
              </AlertDialogTitle>

              <AlertDialogDescription>
                {documentToDelete?.originalName || "This document"} will be
                removed from the job and from private file storage. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingDocument}>
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeletingDocument}
                onClick={(event) => {
                  event.preventDefault();
                  handleDeleteDocument();
                }}
              >
                {isDeletingDocument ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Document
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
