"use client";
import { format, parseISO, isPast } from "date-fns";
import type { Job } from "@/types/job";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JobListProps {
  jobs: Job[];
  isLoading: boolean;
  onDeleteJob: (job: Job) => void;
}

export function JobList({ jobs, isLoading, onDeleteJob }: JobListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";

  const getStatusBadge = (status: string, expireDate: string) => {
    if (status === "completed") {
      return (
        <Badge className="bg-green-500/90 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          <span>Completed</span>
        </Badge>
      );
    }

    if (isPast(parseISO(expireDate)) && status !== "completed") {
      return (
        <Badge className="bg-red-500/90 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>Overdue</span>
        </Badge>
      );
    }

    if (status === "in-progress") {
      return (
        <Badge className="bg-blue-500/90 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>In Progress</span>
        </Badge>
      );
    }

    return (
      <Badge className="bg-amber-500/90 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        <span>Pending</span>
      </Badge>
    );
  };

  const getWorkerDisplay = (job: Job) => {
    // Handle both new format (workers array) and old format (workerName)
    if (job.workers && job.workers.length > 0) {
      if (job.workers.length === 1) {
        return job.workers[0].workerName;
      } else {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{job.workers.length} workers</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <ul className="list-disc pl-4">
                  {job.workers.map((worker) => (
                    <li key={worker.userId}>{worker.workerName}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
    }

    // Fallback for old job format
    return job.workerName || "Unassigned";
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-950 rounded-lg shadow-sm border dark:border-gray-800">
        <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading jobs...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-950 rounded-lg shadow-sm border dark:border-gray-800">
        <p className="text-muted-foreground">
          No jobs found. Create a new job to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-gray-900">
          <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-900 border-b dark:border-gray-800">
            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
              Job Name
            </TableHead>
            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
              Client
            </TableHead>
            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
              Workers
            </TableHead>
            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
              Start Date
            </TableHead>
            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
              Due Date
            </TableHead>
            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
              Status
            </TableHead>
            <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow
              key={job._id}
              onClick={() => router.push(`/job-portal/${job._id}`)}
              className={cn(
                "hover:bg-gray-50 dark:hover:bg-gray-900/50 border-b dark:border-gray-800 cursor-pointer transition-colors",
                job.status === "completed" &&
                  "bg-green-50/30 dark:bg-green-900/10",
                isPast(parseISO(job.expireDate)) &&
                  job.status !== "completed" &&
                  "bg-red-50/30 dark:bg-red-900/10"
              )}
            >
              <TableCell className="font-medium text-gray-900 dark:text-gray-100">{job.jobName}</TableCell>
              <TableCell className="text-gray-700 dark:text-gray-300">{job.clientName}</TableCell>
              <TableCell className="text-gray-700 dark:text-gray-300">{getWorkerDisplay(job)}</TableCell>
              <TableCell className="text-gray-700 dark:text-gray-300">
                {format(parseISO(job.assignDate), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-gray-700 dark:text-gray-300">
                {format(parseISO(job.expireDate), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                {getStatusBadge(job.status || "pending", job.expireDate)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/job-portal/${job._id}`);
                    }}
                    title="View Details"
                    className="hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/job-portal/${job._id}`);
                        }}
                        title="Edit Job"
                        className="hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteJob(job);
                        }}
                        title="Delete Job"
                        className="hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-500 text-gray-700 dark:text-gray-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
