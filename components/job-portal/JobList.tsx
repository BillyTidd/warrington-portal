"use client";
import { format, parseISO, isPast } from "date-fns";
import type { Job } from "@/types/job";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
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
      return <Badge className="bg-green-500">Completed</Badge>;
    }

    if (isPast(parseISO(expireDate)) && status !== "completed") {
      return <Badge className="bg-red-500">Overdue</Badge>;
    }

    if (status === "in-progress") {
      return <Badge className="bg-blue-500">In Progress</Badge>;
    }

    return <Badge className="bg-yellow-500">Pending</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading jobs...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">
          No jobs found. Create a new job to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job Name</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Worker</TableHead>
            <TableHead>Assign Date</TableHead>
            <TableHead>Expire Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job._id} className="hover:bg-muted/50">
              <TableCell className="font-medium">{job.jobName}</TableCell>
              <TableCell>{job.clientName}</TableCell>
              <TableCell>{job.workerName}</TableCell>
              <TableCell>
                {format(parseISO(job.assignDate), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                {format(parseISO(job.expireDate), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                {getStatusBadge(job.status || "pending", job.expireDate)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/job-portal/${job._id}`)}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/job-portal/${job._id}`)}
                    title="Edit Job"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteJob(job)}
                      title="Delete Job"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
