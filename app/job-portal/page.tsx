"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
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
import { JobForm } from "@/components/job-portal/JobForm";
import { JobHeader } from "@/components/job-portal/JobHeader";
import { JobList } from "@/components/job-portal/JobList";
import { CalendarView } from "@/components/job-portal/CalendarView";
import { ViewToggle } from "@/components/job-portal/ViewToggle";
import { Layout } from "@/components/Layout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Job } from "@/types/job";

export default function JobPortalPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentJob, setCurrentJob] = useState<Partial<Job>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch data from API endpoints
      const [jobsRes, workersRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/admin/users"),
      ]);

      if (!jobsRes.ok || !workersRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const jobsData = await jobsRes.json();
      const workersData = await workersRes.json();

      // Filter approved workers
      const approvedWorkers = workersData.filter(
        (user: any) => user.isApproved
      );

      setJobs(jobsData);
      setWorkers(approvedWorkers);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch job data");

      // Fallback to mock data if API fails
      const mockJobs = [
        {
          _id: "1",
          jobName: "Website Redesign",
          assignDate: "2025-04-25",
          expireDate: "2025-05-25",
          clientId: "c1",
          clientName: "Acme Inc",
          userId: session?.user?.id || "u1",
          workerName: session?.user?.name || "John Doe",
          description: "Complete redesign of company website with new branding",
          clientPrice: 5000,
          status: "in-progress",
        },
        {
          _id: "2",
          jobName: "Mobile App Development",
          assignDate: "2025-04-20",
          expireDate: "2025-06-30",
          clientId: "c2",
          clientName: "TechCorp",
          userId:
            session?.user?.role === "admin" ? "u2" : session?.user?.id || "u1",
          workerName:
            session?.user?.role === "admin"
              ? "Jane Smith"
              : session?.user?.name || "John Doe",
          description: "Develop a new mobile app for iOS and Android",
          clientPrice: 8000,
          status: "pending",
        },
        {
          _id: "3",
          jobName: "SEO Optimization",
          assignDate: "2025-04-15",
          expireDate: "2025-05-15",
          clientId: "c3",
          clientName: "Global Solutions",
          userId:
            session?.user?.role === "admin" ? "u3" : session?.user?.id || "u1",
          workerName:
            session?.user?.role === "admin"
              ? "Mike Johnson"
              : session?.user?.name || "John Doe",
          description: "Improve search engine rankings for client website",
          clientPrice: 2000,
          status: "completed",
        },
      ];

      // If not admin, filter mock jobs to only show those assigned to current user
      const filteredMockJobs: any =
        session?.user?.role === "admin"
          ? mockJobs
          : mockJobs.filter((job) => job.userId === session?.user?.id);

      setJobs(filteredMockJobs);

      // Mock workers data using the provided user list
      const mockWorkers = [
        { _id: "w1", name: "Admin User", role: "admin" },
        { _id: "w2", name: "Aidan Wharton", role: "employee" },
        { _id: "w3", name: "Lee Adams", role: "employee" },
        { _id: "w4", name: "Ewan Fitzgerald", role: "employee" },
        { _id: "w5", name: "Connor Gray", role: "employee" },
      ];

      setWorkers(mockWorkers);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (direction: "prev" | "next") => {
    setCurrentDate(
      direction === "prev"
        ? subMonths(currentDate, 1)
        : addMonths(currentDate, 1)
    );
  };

  const handleNewJob = (date?: string) => {
    // For non-admin users, pre-fill their name as the worker
    const initialJobData: Partial<Job> = {
      assignDate: date || format(new Date(), "yyyy-MM-dd"),
      expireDate: format(
        addMonths(date ? parseISO(date) : new Date(), 1),
        "yyyy-MM-dd"
      ),
    };

    // If not admin, pre-assign the job to the current user
    if (session?.user?.role !== "admin" && session?.user?.name) {
      initialJobData.userId = session.user.id;
      initialJobData.workerName = session.user.name;
    }

    setCurrentJob(initialJobData);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = isEditMode ? `/api/jobs/${currentJob._id}` : "/api/jobs";
      const method = isEditMode ? "PUT" : "POST";

      const { _id, ...jobDataWithoutId } = currentJob as Job;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jobDataWithoutId),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save job");
      }

      const savedJob = await response.json();

      // Update local state to reflect changes
      if (isEditMode && currentJob._id) {
        setJobs(
          jobs.map((job) => (job._id === currentJob._id ? savedJob : job))
        );
      } else {
        setJobs([...jobs, savedJob]);
      }

      toast.success(
        isEditMode ? "Job updated successfully" : "Job created successfully"
      );
      setIsModalOpen(false);

      // If it's a new job, navigate to the job details page
      if (!isEditMode && savedJob._id) {
        router.push(`/job-portal/${savedJob._id}`);
      }
    } catch (error: any) {
      console.error("Error saving job:", error);
      toast.error(
        error.message ||
          (isEditMode ? "Failed to update job" : "Failed to create job")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteJob = async () => {
    setIsDeleting(true);
    try {
      const url = `/api/jobs/${currentJob._id}`;
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete job");
      }

      // Update local state to reflect changes
      setJobs(jobs.filter((job) => job._id !== currentJob._id));

      toast.success("Job deleted successfully");
      setIsModalOpen(false);
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting job:", error);
      toast.error(error.message || "Failed to delete job");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-10 px-2 sm:px-4">
        <div className="bg-gray-950 rounded-lg shadow-xl overflow-hidden">
          <JobHeader
            currentDate={currentDate}
            onNavigate={handleNavigate}
            onNewJob={() => handleNewJob()}
            jobs={jobs}
          >
            <ViewToggle view={viewMode} onChange={setViewMode} />
          </JobHeader>

          {viewMode === "list" ? (
            <JobList
              jobs={jobs}
              isLoading={isLoading}
              onDeleteJob={(job) => {
                setCurrentJob(job);
                setIsDeleteDialogOpen(true);
              }}
            />
          ) : (
            <CalendarView
              jobs={jobs}
              currentDate={currentDate}
              onViewDetails={(job) => router.push(`/job-portal/${job._id}`)}
              onNewJob={handleNewJob}
              onNavigate={handleNavigate}
              setCurrentDate={setCurrentDate}
            />
          )}
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>

            <DialogHeader>
              <DialogTitle>
                {isEditMode ? "Edit Job" : "Create New Job"}
              </DialogTitle>
            </DialogHeader>

            <JobForm
              currentJob={currentJob}
              workers={workers}
              isEditMode={isEditMode}
              onSubmit={handleSaveJob}
              onDelete={() => setIsDeleteDialogOpen(true)}
              isSaving={isSaving}
              setCurrentJob={setCurrentJob}
            />
          </DialogContent>
        </Dialog>

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
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
