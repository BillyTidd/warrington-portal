"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { parseISO, differenceInDays } from "date-fns";
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
import type { Job, Worker } from "@/types/job";
import type { CustomerAccountOption } from "@/types/customer-account";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
import { FinancialSummary } from "@/components/job-portal/FinancialSummary";
import { CostBreakdown } from "@/components/job-portal/CostBreakdown";
import { generateJobPDF } from "@/lib/excelGenerator";

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
  const [workers, setWorkers] = useState<any[]>([]);
  const [clients, setClients] =
  useState<CustomerAccountOption[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  const [showProgressForm, setShowProgressForm] = useState(false);

  const isAdmin = session?.user?.role === "admin";

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

  const fetchJobDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/jobs/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job details");
      }
      const data = await response.json();
      setJob(data);
      setEditedJob(data);
    } catch (error) {
      console.error("Error fetching job:", error);
      toast.error("Failed to load job details");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkersAndClients = async () => {
    try {
      const [workersRes, clientsRes] = await Promise.all([
  fetch("/api/admin/users", {
    cache: "no-store",
  }),
  fetch("/api/v1/admin/customer-accounts", {
    cache: "no-store",
  }),
]);

      if (!workersRes.ok || !clientsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const workersData = await workersRes.json();
      const clientsData = await clientsRes.json();

      // Filter approved workers
      const approvedWorkers = workersData.filter(
        (user: any) => user.isApproved
      );

      setWorkers(approvedWorkers);
setClients(clientsData.customers || []);
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
      // Prepare the data for the API
      const apiData = {
        details: progressData.description,
        cost:
          progressData.workType === "extra"
            ? progressData.overtimeHours * workerHourlyRate
            : progressData.amount
            ? Number.parseFloat(progressData.amount.toString())
            : undefined,
        workType: progressData.workType,
costTreatment: isAdmin
  ? progressData.costTreatment
  : undefined,
        overtimeHours: progressData.overtimeHours,
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

      const updatedJob = await response.json();
      setJob(updatedJob);
      setShowProgressForm(false);
      toast.success("Progress added successfully");
    } catch (error: any) {
      console.error("Error adding progress:", error);
      toast.error(error.message || "Failed to add progress");
    } finally {
      setIsSubmittingProgress(false);
    }
  };

  const handleDeleteProgress = async (logId: string) => {
    try {
      const response = await fetch(
        `/api/jobs/${params.id}/progress?logId=${logId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete progress log");
      }

      const updatedJob = await response.json();
      setJob(updatedJob);
      toast.success("Progress log deleted successfully");
    } catch (error: any) {
      console.error("Error deleting progress log:", error);
      toast.error(error.message || "Failed to delete progress log");
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

      const updatedJob = await progressResponse.json();
      setJob(updatedJob);
      setEditedJob(updatedJob);
      toast.success("Status updated successfully");
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!job) return;

    try {
      const doc = await generateJobPDF(job, session);
      doc.save(`job-${job._id}-report.pdf`);
      toast.success("PDF report generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
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
                {job.workers.map((worker: any) => (
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

  const daysRemaining = differenceInDays(parseISO(job.expireDate), new Date());
  const isOverdue = daysRemaining < 0 && job.status !== "completed";
  const progressPercentage =
    job.status === "completed" ? 100 : job.status === "in-progress" ? 50 : 0;
  const totalCost =
    job.progressLogs?.reduce(
      (sum: any, log: any) => sum + (log.cost || 0),
      0
    ) || 0;
  const profit = (job.clientPrice || 0) - totalCost;

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
          daysRemaining={daysRemaining}
          isOverdue={isOverdue}
          progressPercentage={progressPercentage}
          setEditedJob={setEditedJob}
          setIsEditing={setIsEditing}
          handleSaveJob={handleSaveJob}
          setShowProgressForm={setShowProgressForm}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
          isAssignedToMe={isAssignedToMe}
        />

        {/* PDF Generation Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={handleGeneratePDF}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Generate PDF Report
          </Button>
        </div>

        {/* Status Update Section */}
        {canUpdateJob && !isEditing && (
          <StatusUpdateSection
            jobStatus={job.status || "pending"}
            isSaving={isSaving}
            handleStatusChange={handleStatusChange}
          />
        )}

        {/* Main Content Tabs */}
        <Tabs
          defaultValue="details"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30"
            >
              <FileText className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Progress
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="financials"
                className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Financials
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
                  />
                ) : (
                  <>
                    {/* Display assigned workers */}
                    {renderAssignedWorkers()}

                    {/* Display worker payment information if assigned to this job */}
                    {renderWorkerPayment()}

                    <JobDescription description={job.description} />
                  </>
                )}
              </div>

              {/* Right column - Job stats */}
              <div className="lg:col-span-1 space-y-6">
                <JobTimeline
                  job={job}
                  daysRemaining={daysRemaining}
                  isOverdue={isOverdue}
                />
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
                                Add Progress Update
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    <ProgressSummary
                      progressLogs={job.progressLogs}
                      totalCost={totalCost}
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
                  setShowProgressForm={setShowProgressForm}
                  currencySymbol="£"
                />
              </div>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="financials" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  <FinancialSummary
                    clientPrice={job.clientPrice || 0}
                    totalCost={totalCost}
                    profit={profit}
                    currencySymbol="£"
                  />
                </div>

                <div className="lg:col-span-2">
                  <CostBreakdown
                    progressLogs={job.progressLogs}
                    totalCost={totalCost}
                    profit={profit}
                    currencySymbol="£"
                  />
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

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
      </div>
    </Layout>
  );
}
