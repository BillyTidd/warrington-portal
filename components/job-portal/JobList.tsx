"use client";

import { format, parseISO } from "date-fns";
import { Edit, Eye, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import type { Job } from "@/types/job";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function getJobPrice(job: any): number {
  const possiblePrice =
    job.clientPrice ??
    job.estimatedCost?.totalCost ??
    job.estimatedCosts?.totalCost ??
    job.jobEstimate?.estimatedCost?.totalCost ??
    0;

  const numericPrice = Number(possiblePrice);
  return Number.isFinite(numericPrice) ? numericPrice : 0;
}

function getManagerName(job: any): string {
  return (
    job.managerName ||
    job.jobEstimate?.managerDetails?.fullName ||
    job.jobEstimate?.manager ||
    job.clientName ||
    "Not assigned"
  );
}

function formatStartDate(value: unknown): string {
  if (!value) return "Not scheduled";

  try {
    return format(parseISO(String(value)), "MMM d, yyyy");
  } catch {
    return "Not scheduled";
  }
}

export function JobList({
  jobs,
  isLoading,
  onDeleteJob,
}: JobListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";
  const isCustomer = session?.user?.role === "customer";

  const pageTotal = jobs.reduce(
    (total, job) => total + getJobPrice(job),
    0
  );

  const getWorkerDisplay = (job: Job) => {
    if (job.workers && job.workers.length > 0) {
      if (job.workers.length === 1) {
        return job.workers[0].workerName;
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Users className="mr-1 h-4 w-4" />
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

    return job.workerName || "Unassigned";
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <p className="mt-4 text-muted-foreground">Loading jobs...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <p className="text-muted-foreground">No jobs found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-gray-900">
          <TableRow>
            <TableHead>Job Name</TableHead>
            <TableHead>{isCustomer ? "Manager" : "Client"}</TableHead>
            <TableHead>Workers</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>Status</TableHead>
            {isCustomer && <TableHead className="text-right">Price</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {jobs.map((job) => (
            <TableRow
              key={job._id}
              onClick={() => router.push(`/job-portal/${job._id}`)}
              className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50"
            >
              <TableCell className="font-medium">{job.jobName}</TableCell>
              <TableCell>
                {isCustomer ? getManagerName(job) : job.clientName}
              </TableCell>
              <TableCell>{getWorkerDisplay(job)}</TableCell>
              <TableCell>{formatStartDate(job.assignDate)}</TableCell>
              <TableCell>
                <StatusBadge status={job.status || "pending"} />
              </TableCell>

              {isCustomer && (
                <TableCell className="text-right font-semibold">
                  £{getJobPrice(job).toFixed(2)}
                </TableCell>
              )}

              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="View Details"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`/job-portal/${job._id}`);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit Job"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(`/job-portal/${job._id}`);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete Job"
                        className="hover:text-red-600"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteJob(job);
                        }}
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

        {isCustomer && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5} className="text-right font-semibold">
                Page Total
              </TableCell>
              <TableCell className="text-right text-base font-bold">
                £{pageTotal.toFixed(2)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
