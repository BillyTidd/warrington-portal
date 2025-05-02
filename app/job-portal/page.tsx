"use client";
import { useEffect, useState } from "react";
import { addMonths, subMonths } from "date-fns";
import { Loader2, Plus } from "lucide-react";
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
import { JobHeader } from "@/components/job-portal/JobHeader";
import { JobList } from "@/components/job-portal/JobList";
import { CalendarView } from "@/components/job-portal/CalendarView";
import { ViewToggle } from "@/components/job-portal/ViewToggle";
import { Layout } from "@/components/Layout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Job } from "@/types/job";
import { Button } from "@/components/ui/button";

export default function JobPortalPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentJob, setCurrentJob] = useState<Partial<Job>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/jobs");
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      const jobsData = await response.json();
      setJobs(jobsData);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to fetch job data");
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

  const handleNewJob = () => {
    router.push("/job-portal/new");
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
            onNewJob={handleNewJob}
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
              onNewJob={(date) =>
                router.push(`/job-portal/new?date=${date || ""}`)
              }
              onNavigate={handleNavigate}
              setCurrentDate={setCurrentDate}
            />
          )}
        </div>

        {/* Floating action button for mobile */}
        <div className="fixed bottom-6 right-6 md:hidden">
          <Button
            onClick={handleNewJob}
            size="lg"
            className="rounded-full h-14 w-14 shadow-lg"
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">New Job</span>
          </Button>
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
