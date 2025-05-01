"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, parseISO } from "date-fns";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import type { Job } from "@/types/job";

export default function JobProgressPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progressDescription, setProgressDescription] = useState("");
  const [progressAmount, setProgressAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusUpdateMode, setStatusUpdateMode] = useState(false);
  const [newStatus, setNewStatus] = useState<
    "pending" | "in-progress" | "completed"
  >("pending");

  const isAdmin = session?.user?.role === "admin";
  const isAssignedToMe = job?.userId === session?.user?.id;
  const canUpdateJob = isAdmin || isAssignedToMe;

  useEffect(() => {
    fetchJobDetails();
  }, [params.id]);

  const fetchJobDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/jobs/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job details");
      }
      const data = await response.json();
      setJob(data);
      setNewStatus(data.status || "pending");
    } catch (error) {
      console.error("Error fetching job:", error);
      toast.error("Failed to load job details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressDescription.trim()) {
      toast.error("Please enter a progress description");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/jobs/${params.id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          details: progressDescription,
          cost: progressAmount ? Number.parseFloat(progressAmount) : undefined,
          // No status or hours in this simplified version
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
      toast.success("Progress added successfully");
    } catch (error: any) {
      console.error("Error adding progress:", error);
      toast.error(error.message || "Failed to add progress");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // First update the job status
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

      // Then add a progress log for the status change
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
      setStatusUpdateMode(false);
      toast.success("Status updated successfully");
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsSubmitting(false);
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

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Job not found</h2>
            <p className="mt-2 text-muted-foreground">
              The job you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <Button className="mt-4" onClick={() => router.push("/job-portal")}>
              Back to Job Portal
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/job-portal")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Portal
          </Button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{job.jobName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  className={
                    job.status === "completed"
                      ? "bg-green-500"
                      : job.status === "in-progress"
                      ? "bg-blue-500"
                      : "bg-yellow-500"
                  }
                >
                  {job.status === "completed"
                    ? "Completed"
                    : job.status === "in-progress"
                    ? "In Progress"
                    : "Pending"}
                </Badge>
              </div>
            </div>

            {canUpdateJob && !statusUpdateMode && (
              <Button onClick={() => setStatusUpdateMode(true)}>
                Update Status
              </Button>
            )}

            {statusUpdateMode && (
              <form
                onSubmit={handleStatusUpdate}
                className="flex items-center gap-2"
              >
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newStatus === "pending" ? "default" : "outline"}
                    onClick={() => setNewStatus("pending")}
                    className="h-9"
                  >
                    Pending
                  </Button>
                  <Button
                    type="button"
                    variant={
                      newStatus === "in-progress" ? "default" : "outline"
                    }
                    onClick={() => setNewStatus("in-progress")}
                    className="h-9"
                  >
                    In Progress
                  </Button>
                  <Button
                    type="button"
                    variant={newStatus === "completed" ? "default" : "outline"}
                    onClick={() => setNewStatus("completed")}
                    className="h-9"
                  >
                    Completed
                  </Button>
                </div>
                <Button type="submit" disabled={isSubmitting} className="h-9">
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStatusUpdateMode(false)}
                  className="h-9"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Job details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Assigned to:</span>{" "}
                  {job.workerName}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Due date:</span>{" "}
                  {format(parseISO(job.expireDate), "MMM d, yyyy")}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Start date:</span>{" "}
                  {format(parseISO(job.assignDate), "MMM d, yyyy")}
                </div>
                {isAdmin && job.clientPrice && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Client price:</span> $
                    {job.clientPrice.toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>

            {canUpdateJob && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddProgress} className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={progressDescription}
                        onChange={(e) => setProgressDescription(e.target.value)}
                        placeholder="Describe what you've done..."
                        rows={3}
                        required
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
                        onChange={(e) => setProgressAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
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
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column - Progress timeline */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Progress Timeline</CardTitle>
              </CardHeader>
              <CardContent>
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

                          <div className="bg-muted/30 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-sm text-muted-foreground">
                                  {format(
                                    new Date(log.timestamp),
                                    "MMM d, yyyy h:mm a"
                                  )}
                                </div>
                                <div className="text-sm font-medium mt-1">
                                  Updated by: {log.updatedByName || "Unknown"}
                                </div>
                              </div>

                              {(isAdmin || isAssignedToMe) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDeleteProgress(log._id!)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete log</span>
                                </Button>
                              )}
                            </div>

                            {log.statusChange && (
                              <Badge className="mt-2">
                                Status changed to {log.newStatus}
                              </Badge>
                            )}

                            <p className="mt-2 whitespace-pre-line">
                              {log.details}
                            </p>

                            {log.cost !== undefined && (
                              <div className="mt-2 text-sm">
                                <span className="font-medium">Amount:</span> $
                                {log.cost.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No progress has been logged for this job yet.</p>
                    {canUpdateJob && (
                      <p className="mt-2">
                        Add your first progress update to get started!
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
