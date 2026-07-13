"use client";

import type React from "react";
import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import type { Job, Worker } from "@/types/job";
import { JobFormFields } from "@/components/job-portal/JobFormFields";

export default function NewJobPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <div className="container mx-auto py-8 px-4">
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>
          </div>
        </Layout>
      }
    >
      <NewJobPageContent />
    </Suspense>
  );
}

function NewJobPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Get date from URL params if available, otherwise use today's date
  const dateParam = searchParams.get("date");
  const defaultDate = dateParam || format(new Date(), "yyyy-MM-dd");

  const [job, setJob] = useState<Partial<any>>({
    jobName: "",
    assignDate: defaultDate,
    expireDate: format(
      new Date(new Date().setMonth(new Date().getMonth() + 1)),
      "yyyy-MM-dd"
    ),
    status: "pending",
    workers: [],
    description: "",
  });
  const [workers, setWorkers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  // Update assignDate when URL date param is available
  useEffect(() => {
    if (dateParam) {
      setJob((prev) => ({
        ...prev,
        assignDate: dateParam,
      }));
    }
  }, [dateParam]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch workers and clients data in parallel
      const [workersRes, clientsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/clients"),
      ]);

      if (!workersRes.ok) {
        throw new Error("Failed to fetch workers");
      }

      if (!clientsRes.ok) {
        throw new Error("Failed to fetch clients");
      }

      const workersData = await workersRes.json();
      const clientsData = await clientsRes.json();

      // Filter approved workers
      const approvedWorkers = workersData.filter(
        (user: any) => user.isApproved
      );

      setWorkers(approvedWorkers);
      setClients(clientsData);

      // If not admin, pre-assign the job to the current user
      if (
        session?.user?.role !== "admin" &&
        session?.user?.id &&
        session?.user?.name
      ) {
        setJob((prev) => ({
          ...prev,
          workers: [
            {
              userId: session.user.id!,
              workerName: session.user.name!,
            },
          ],
        }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch required data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!job.jobName?.trim()) {
      toast.error("Job name is required");
      return;
    }

    if (!job.clientName && !job.clientId) {
      toast.error("Client is required");
      return;
    }

    if (job.workers?.length === 0) {
      toast.error("At least one worker must be assigned");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(job),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create job");
      }

      const savedJob = await response.json();
      toast.success("Job created successfully");

      // Navigate to the job details page
      router.push(`/job-portal/${savedJob._id}`);
    } catch (error: any) {
      console.error("Error creating job:", error);
      toast.error(error.message || "Failed to create job");
    } finally {
      setIsSaving(false);
    }
  };

  const handleWorkerSelect = (workerId: string) => {
    const worker = workers.find((w) => w._id === workerId);
    if (!worker) return;

    // Check if worker is already selected
    if (job.workers?.some((w: any) => w.userId === workerId)) {
      // Remove worker
      setJob((prev) => ({
        ...prev,
        workers: prev.workers?.filter((w: any) => w.userId !== workerId) || [],
      }));
    } else {
      // Add worker
      const newWorker: Worker = {
        userId: workerId,
        workerName: worker.name,
      };

      setJob((prev) => ({
        ...prev,
        workers: [...(prev.workers || []), newWorker],
      }));
    }
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c._id === clientId);
    if (!client) return;

    setJob((prev) => ({
      ...prev,
      clientId: clientId,
      clientName: client.name,
    }));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-start sm:flex-row sm:items-center gap-2 sm:gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/job-portal")}
            className="-ml-4 sm:ml-0 sm:mr-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Portal
          </Button>
          <h1 className="text-3xl font-bold">Create New Job</h1>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40">
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <NewJobForm
                job={job}
                setJob={setJob}
                workers={workers}
                clients={clients}
                isAdmin={isAdmin}
                handleWorkerSelect={handleWorkerSelect}
                handleClientSelect={handleClientSelect}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/job-portal")}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Job
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

interface NewJobFormProps {
  job: Partial<Job>;
  setJob: React.Dispatch<React.SetStateAction<Partial<Job>>>;
  workers: any[];
  clients: any[];
  isAdmin: boolean;
  handleWorkerSelect: (workerId: string) => void;
  handleClientSelect: (clientId: string) => void;
}

function NewJobForm({
  job,
  setJob,
  workers,
  clients,
  isAdmin,
  handleWorkerSelect,
  handleClientSelect,
}: NewJobFormProps) {
  const { data: session } = useSession();

  return (
    <JobFormFields
      job={job}
      setJob={setJob}
      workers={workers}
      clients={clients}
      isAdmin={isAdmin}
      handleWorkerSelect={handleWorkerSelect}
      handleClientSelect={handleClientSelect}
      session={session}
    />
  );
}
