"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  format,
  parseISO,
  differenceInDays,
  formatDistanceToNow,
} from "date-fns";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  User,
  Calendar,
  Edit,
  Save,
  X,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
  BarChart3,
  FileText,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Job } from "@/types/job";

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedJob, setEditedJob] = useState<Partial<Job>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [progressDescription, setProgressDescription] = useState("");
  const [progressAmount, setProgressAmount] = useState("");
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  const [showProgressForm, setShowProgressForm] = useState(false);

  const isAdmin = session?.user?.role === "admin";
  const isAssignedToMe = job?.userId === session?.user?.id;
  const canUpdateJob = isAdmin || isAssignedToMe;
  const canEditJob = isAdmin;

  useEffect(() => {
    fetchJobDetails();
    if (isAdmin) {
      fetchWorkers();
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

  const fetchWorkers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch workers");
      }
      const data = await response.json();
      // Filter approved workers
      const approvedWorkers = data.filter((user: any) => user.isApproved);
      setWorkers(approvedWorkers);
    } catch (error) {
      console.error("Error fetching workers:", error);
      // Fallback to mock data
      const mockWorkers = [
        { _id: "w1", name: "Admin User", role: "admin" },
        { _id: "w2", name: "Aidan Wharton", role: "employee" },
        { _id: "w3", name: "Lee Adams", role: "employee" },
        { _id: "w4", name: "Ewan Fitzgerald", role: "employee" },
        { _id: "w5", name: "Connor Gray", role: "employee" },
      ];
      setWorkers(mockWorkers);
    }
  };

  const handleSaveJob = async () => {
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

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressDescription.trim()) {
      toast.error("Please enter a progress description");
      return;
    }

    setIsSubmittingProgress(true);
    try {
      const response = await fetch(`/api/jobs/${params.id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          details: progressDescription,
          cost: progressAmount ? Number.parseFloat(progressAmount) : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add progress");
      }

      const updatedJob = await response.json();
      setJob(updatedJob);
      setProgressDescription("");
      setProgressAmount("");
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
    job.progressLogs?.reduce((sum, log) => sum + (log.cost || 0), 0) || 0;
  const profit = (job.clientPrice || 0) - totalCost;

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/job-portal")}
              className="mr-2 hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6 mx-2" />
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Job Portal</span>
              <ChevronRight className="inline h-3 w-3 mx-1" />
              <span>Job Details</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg p-6 shadow-lg mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                {isEditing ? (
                  <Input
                    value={editedJob.jobName || ""}
                    onChange={(e) =>
                      setEditedJob({ ...editedJob, jobName: e.target.value })
                    }
                    className="text-2xl font-bold h-12 bg-white/20 text-white border-white/30 placeholder-white/70"
                    placeholder="Job Name"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-white">
                    {job.jobName}
                  </h1>
                )}
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      job.status === "completed"
                        ? "bg-green-500 hover:bg-green-600"
                        : job.status === "in-progress"
                        ? "bg-blue-500 hover:bg-blue-600"
                        : "bg-yellow-500 hover:bg-yellow-600"
                    }
                  >
                    {job.status === "completed" ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : job.status === "in-progress" ? (
                      <Clock className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 mr-1" />
                    )}
                    {job.status === "completed"
                      ? "Completed"
                      : job.status === "in-progress"
                      ? "In Progress"
                      : "Pending"}
                  </Badge>
                  {isOverdue && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Overdue by {Math.abs(daysRemaining)} days
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {!isEditing && canEditJob && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Job
                  </Button>
                )}

                {isEditing && (
                  <>
                    <Button
                      onClick={handleSaveJob}
                      disabled={isSaving}
                      className="bg-white text-violet-600 hover:bg-white/90"
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                )}

                {!isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Job Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {canUpdateJob && (
                        <DropdownMenuItem
                          onClick={() => setShowProgressForm(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Progress
                        </DropdownMenuItem>
                      )}
                      {isAdmin && (
                        <DropdownMenuItem
                          onClick={() => setIsDeleteDialogOpen(true)}
                          className="text-red-500"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Job
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-white/80">
                  <div className="text-xs uppercase">Client</div>
                  <div className="font-medium mt-1 flex items-center">
                    <Briefcase className="h-4 w-4 mr-1 text-white/60" />
                    {job.clientName}
                  </div>
                </div>
                <div className="text-white/80">
                  <div className="text-xs uppercase">Assigned To</div>
                  <div className="font-medium mt-1 flex items-center">
                    <User className="h-4 w-4 mr-1 text-white/60" />
                    {job.workerName}
                  </div>
                </div>
                <div className="text-white/80">
                  <div className="text-xs uppercase">Due Date</div>
                  <div className="font-medium mt-1 flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-white/60" />
                    {format(parseISO(job.expireDate), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="text-white/80">
                  <div className="text-xs uppercase">Progress</div>
                  <div className="mt-1">
                    <Progress
                      value={progressPercentage}
                      className="h-2 bg-white/20"
                    />
                    <div className="text-xs mt-1 text-right">
                      {progressPercentage}% Complete
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Update Section */}
          {canUpdateJob && !isEditing && (
            <Card className="mb-6 border-none shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 pb-3">
                <CardTitle className="text-lg flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2 text-violet-500" />
                  Update Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={job.status === "pending" ? "default" : "outline"}
                    onClick={() => handleStatusChange("pending")}
                    disabled={isSaving || job.status === "pending"}
                    className="relative overflow-hidden group"
                  >
                    <span
                      className={`absolute inset-0 bg-yellow-100 dark:bg-yellow-900/20 ${
                        job.status === "pending"
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-10"
                      } transition-opacity`}
                    ></span>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Pending
                  </Button>
                  <Button
                    variant={
                      job.status === "in-progress" ? "default" : "outline"
                    }
                    onClick={() => handleStatusChange("in-progress")}
                    disabled={isSaving || job.status === "in-progress"}
                    className="relative overflow-hidden group"
                  >
                    <span
                      className={`absolute inset-0 bg-blue-100 dark:bg-blue-900/20 ${
                        job.status === "in-progress"
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-10"
                      } transition-opacity`}
                    ></span>
                    <Clock className="mr-2 h-4 w-4" />
                    In Progress
                  </Button>
                  <Button
                    variant={job.status === "completed" ? "default" : "outline"}
                    onClick={() => handleStatusChange("completed")}
                    disabled={isSaving || job.status === "completed"}
                    className="relative overflow-hidden group"
                  >
                    <span
                      className={`absolute inset-0 bg-green-100 dark:bg-green-900/20 ${
                        job.status === "completed"
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-10"
                      } transition-opacity`}
                    ></span>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Completed
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                className="data-[state=active]:bg-violet-100 dark:data-[state=active]:bg-violet-900/30"
              >
                <FileText className="h-4 w-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger
                value="progress"
                className="data-[state=active]:bg-violet-100 dark:data-[state=active]:bg-violet-900/30"
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Progress
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger
                  value="financials"
                  className="data-[state=active]:bg-violet-100 dark:data-[state=active]:bg-violet-900/30"
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
                    <Card className="border-none shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
                        <CardTitle>Edit Job Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-6">
                        <div>
                          <Label htmlFor="clientName">Client</Label>
                          <Input
                            id="clientName"
                            value={editedJob.clientName || ""}
                            onChange={(e) =>
                              setEditedJob({
                                ...editedJob,
                                clientName: e.target.value,
                              })
                            }
                            required
                            className="mt-1"
                          />
                        </div>

                        {isAdmin && (
                          <div>
                            <Label htmlFor="userId">Assign To</Label>
                            <Select
                              value={editedJob.userId || ""}
                              onValueChange={(value) => {
                                const selectedWorker = workers.find(
                                  (worker) => worker._id === value
                                );
                                setEditedJob({
                                  ...editedJob,
                                  userId: value,
                                  workerName: selectedWorker?.name || "",
                                });
                              }}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select worker" />
                              </SelectTrigger>
                              <SelectContent>
                                {workers.map((worker) => (
                                  <SelectItem
                                    key={worker._id}
                                    value={worker._id}
                                  >
                                    {worker.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="assignDate">Start Date</Label>
                            <Input
                              id="assignDate"
                              type="date"
                              value={
                                editedJob.assignDate
                                  ? format(
                                      typeof editedJob.assignDate === "string"
                                        ? parseISO(editedJob.assignDate)
                                        : editedJob.assignDate,
                                      "yyyy-MM-dd"
                                    )
                                  : ""
                              }
                              onChange={(e) =>
                                setEditedJob({
                                  ...editedJob,
                                  assignDate: e.target.value,
                                })
                              }
                              required
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="expireDate">Due Date</Label>
                            <Input
                              id="expireDate"
                              type="date"
                              value={
                                editedJob.expireDate
                                  ? format(
                                      typeof editedJob.expireDate === "string"
                                        ? parseISO(editedJob.expireDate)
                                        : editedJob.expireDate,
                                      "yyyy-MM-dd"
                                    )
                                  : ""
                              }
                              onChange={(e) =>
                                setEditedJob({
                                  ...editedJob,
                                  expireDate: e.target.value,
                                })
                              }
                              required
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {isAdmin && (
                          <div>
                            <Label htmlFor="clientPrice">
                              Client Price ($)
                            </Label>
                            <Input
                              id="clientPrice"
                              type="number"
                              value={editedJob.clientPrice || ""}
                              onChange={(e) =>
                                setEditedJob({
                                  ...editedJob,
                                  clientPrice: e.target.value
                                    ? Number.parseFloat(e.target.value)
                                    : undefined,
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                        )}

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={editedJob.description || ""}
                            onChange={(e) =>
                              setEditedJob({
                                ...editedJob,
                                description: e.target.value,
                              })
                            }
                            rows={6}
                            className="mt-1"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-none shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
                        <CardTitle>Job Description</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="prose dark:prose-invert max-w-none">
                          {job.description ? (
                            <p className="whitespace-pre-line">
                              {job.description}
                            </p>
                          ) : (
                            <p className="text-muted-foreground italic">
                              No description provided.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right column - Job stats */}
                <div className="lg:col-span-1 space-y-6">
                  <Card className="border-none shadow-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 pb-3">
                      <CardTitle className="text-lg">Job Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-full mr-3">
                              <Calendar className="h-4 w-4 text-violet-500" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                Start Date
                              </div>
                              <div className="text-muted-foreground">
                                {format(
                                  parseISO(job.assignDate),
                                  "MMM d, yyyy"
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(parseISO(job.assignDate), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>

                        <div className="w-px h-6 bg-muted mx-auto"></div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-full mr-3">
                              <Clock className="h-4 w-4 text-violet-500" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                Due Date
                              </div>
                              <div className="text-muted-foreground">
                                {format(
                                  parseISO(job.expireDate),
                                  "MMM d, yyyy"
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm">
                            {isOverdue ? (
                              <span className="text-red-500 font-medium">
                                Overdue by {Math.abs(daysRemaining)} days
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {daysRemaining} days remaining
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="w-px h-6 bg-muted mx-auto"></div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-full mr-3">
                              <User className="h-4 w-4 text-violet-500" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                Assigned To
                              </div>
                              <div className="text-muted-foreground">
                                {job.workerName}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="w-px h-6 bg-muted mx-auto"></div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-full mr-3">
                              <Briefcase className="h-4 w-4 text-violet-500" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">Client</div>
                              <div className="text-muted-foreground">
                                {job.clientName}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 pb-3">
                      <CardTitle className="text-lg">Job Status</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">
                              Progress
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {progressPercentage}%
                            </span>
                          </div>
                          <Progress
                            value={progressPercentage}
                            className="h-2"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div
                            className={`p-3 rounded-lg ${
                              job.status === "pending"
                                ? "bg-yellow-100 dark:bg-yellow-900/20"
                                : "bg-muted/30"
                            }`}
                          >
                            <AlertTriangle
                              className={`h-5 w-5 mx-auto mb-1 ${
                                job.status === "pending"
                                  ? "text-yellow-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <div
                              className={`text-xs font-medium ${
                                job.status === "pending"
                                  ? "text-yellow-700 dark:text-yellow-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Pending
                            </div>
                          </div>
                          <div
                            className={`p-3 rounded-lg ${
                              job.status === "in-progress"
                                ? "bg-blue-100 dark:bg-blue-900/20"
                                : "bg-muted/30"
                            }`}
                          >
                            <Clock
                              className={`h-5 w-5 mx-auto mb-1 ${
                                job.status === "in-progress"
                                  ? "text-blue-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <div
                              className={`text-xs font-medium ${
                                job.status === "in-progress"
                                  ? "text-blue-700 dark:text-blue-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              In Progress
                            </div>
                          </div>
                          <div
                            className={`p-3 rounded-lg ${
                              job.status === "completed"
                                ? "bg-green-100 dark:bg-green-900/20"
                                : "bg-muted/30"
                            }`}
                          >
                            <CheckCircle
                              className={`h-5 w-5 mx-auto mb-1 ${
                                job.status === "completed"
                                  ? "text-green-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <div
                              className={`text-xs font-medium ${
                                job.status === "completed"
                                  ? "text-green-700 dark:text-green-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Completed
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                        <div>
                          <Card className="border-none shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
                              <CardTitle>Add Progress</CardTitle>
                              <CardDescription>
                                Record your latest work on this job
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                              <form
                                onSubmit={handleAddProgress}
                                className="space-y-4"
                              >
                                <div>
                                  <Label htmlFor="description">
                                    Description
                                  </Label>
                                  <Textarea
                                    id="description"
                                    value={progressDescription}
                                    onChange={(e) =>
                                      setProgressDescription(e.target.value)
                                    }
                                    placeholder="Describe what you've done..."
                                    rows={4}
                                    required
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="amount">Amount ($)</Label>
                                  <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={progressAmount}
                                    onChange={(e) =>
                                      setProgressAmount(e.target.value)
                                    }
                                    placeholder="0.00"
                                    className="mt-1"
                                  />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowProgressForm(false)}
                                    disabled={isSubmittingProgress}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="submit"
                                    disabled={isSubmittingProgress}
                                  >
                                    {isSubmittingProgress ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Progress
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </form>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div>
                          <Card className="border-none shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
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
                                <Button
                                  onClick={() => setShowProgressForm(true)}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Progress Update
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      <Card className="border-none shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 pb-3">
                          <CardTitle className="text-lg">
                            Progress Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="space-y-4">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">
                                Total Updates
                              </div>
                              <div className="text-2xl font-bold">
                                {job.progressLogs?.length || 0}
                              </div>
                            </div>

                            <Separator />

                            <div>
                              <div className="text-sm text-muted-foreground mb-1">
                                Total Cost
                              </div>
                              <div className="text-2xl font-bold">
                                ${totalCost?.toFixed(2) || "0.00"}
                              </div>
                            </div>

                            <Separator />

                            <div>
                              <div className="text-sm text-muted-foreground mb-1">
                                Last Updated
                              </div>
                              <div className="text-lg">
                                {job.progressLogs && job.progressLogs.length > 0
                                  ? formatDistanceToNow(
                                      new Date(job.progressLogs[0].timestamp),
                                      { addSuffix: true }
                                    )
                                  : "Never"}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>

                {/* Right column - Progress timeline */}
                <div className="lg:col-span-2">
                  <Card className="border-none shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
                      <CardTitle>Progress Timeline</CardTitle>
                      <CardDescription>
                        {job.progressLogs && job.progressLogs.length > 0
                          ? `${job.progressLogs.length} updates recorded`
                          : "No progress updates yet"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <ScrollArea className="h-[600px] pr-4">
                        {job.progressLogs && job.progressLogs.length > 0 ? (
                          <div className="space-y-6">
                            {job.progressLogs
                              .sort(
                                (a, b) =>
                                  new Date(b.timestamp).getTime() -
                                  new Date(a.timestamp).getTime()
                              )
                              .map((log) => (
                                <div
                                  key={log._id}
                                  className="relative pl-6 border-l-2 border-muted pb-6"
                                >
                                  {/* Timeline dot */}
                                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary"></div>

                                  <Card className="border-none shadow-md">
                                    <CardContent className="p-4">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="text-sm text-muted-foreground">
                                            {format(
                                              new Date(log.timestamp),
                                              "MMM d, yyyy h:mm a"
                                            )}
                                          </div>
                                          <div className="text-sm font-medium mt-1 flex items-center">
                                            <User className="h-3 w-3 mr-1 text-muted-foreground" />
                                            Updated by:{" "}
                                            {log.updatedByName || "Unknown"}
                                          </div>
                                        </div>

                                        {(isAdmin || isAssignedToMe) && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/20"
                                            onClick={() =>
                                              handleDeleteProgress(log._id!)
                                            }
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">
                                              Delete log
                                            </span>
                                          </Button>
                                        )}
                                      </div>

                                      {log.statusChange && (
                                        <Badge
                                          className={`mt-2 ${
                                            log.newStatus === "completed"
                                              ? "bg-green-500"
                                              : log.newStatus === "in-progress"
                                              ? "bg-blue-500"
                                              : "bg-yellow-500"
                                          }`}
                                        >
                                          Status changed to {log.newStatus}
                                        </Badge>
                                      )}

                                      <p className="mt-3 whitespace-pre-line">
                                        {log.details}
                                      </p>

                                      {log.cost !== undefined && (
                                        <div className="mt-3 text-sm bg-muted/30 p-2 rounded-md inline-block">
                                          <span className="font-medium flex items-center">
                                            <DollarSign className="h-3 w-3 mr-1" />
                                            Amount: $
                                            {log.cost?.toFixed(2) || "0.00"}
                                          </span>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="bg-muted/30 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                              <ClipboardList className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">
                              No Progress Logs Yet
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              No progress has been logged for this job yet.
                            </p>
                            {canUpdateJob && (
                              <Button onClick={() => setShowProgressForm(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add First Update
                              </Button>
                            )}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="financials" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-6">
                    <Card className="border-none shadow-lg overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
                        <CardTitle>Financial Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="space-y-6">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Client Price
                            </div>
                            <div className="text-2xl font-bold">
                              ${(job.clientPrice || 0).toFixed(2)}
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Total Costs
                            </div>
                            <div className="text-2xl font-bold text-red-500">
                              -${totalCost?.toFixed(2) || "0.00"}
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Profit
                            </div>
                            <div
                              className={`text-2xl font-bold ${
                                profit >= 0 ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              ${profit?.toFixed(2) || "0.00"}
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <div className="text-sm text-muted-foreground mb-1">
                              Profit Margin
                            </div>
                            <div
                              className={`text-2xl font-bold ${
                                profit >= 0 ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              {job.clientPrice
                                ? Math.round((profit / job.clientPrice) * 100)
                                : 0}
                              %
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="lg:col-span-2">
                    <Card className="border-none shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
                        <CardTitle>Cost Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {job.progressLogs &&
                        job.progressLogs.filter((log) => log.cost).length >
                          0 ? (
                          <div className="space-y-4">
                            {job.progressLogs
                              .filter((log) => log.cost)
                              .sort(
                                (a, b) =>
                                  new Date(b.timestamp).getTime() -
                                  new Date(a.timestamp).getTime()
                              )
                              .map((log) => (
                                <div
                                  key={log._id}
                                  className="flex justify-between items-start p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                                >
                                  <div>
                                    <div className="font-medium">
                                      ${log.cost?.toFixed(2) || "0.00"}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {format(
                                        new Date(log.timestamp),
                                        "MMM d, yyyy"
                                      )}
                                    </div>
                                    <div className="text-sm mt-1 line-clamp-1">
                                      {log.details}
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {log.updatedByName}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="bg-muted/30 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                              <DollarSign className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">
                              No Cost Entries
                            </h3>
                            <p className="text-muted-foreground">
                              No costs have been recorded for this job yet.
                            </p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="border-t bg-muted/30 flex justify-between">
                        <div className="text-sm text-muted-foreground">
                          Total Costs:{" "}
                          <span className="font-medium">
                            ${totalCost?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Profit:{" "}
                          <span
                            className={`font-medium ${
                              profit >= 0 ? "text-green-500" : "text-red-500"
                            }`}
                          >
                            ${profit?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      </CardFooter>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

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
