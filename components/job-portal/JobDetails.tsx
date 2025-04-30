"use client";
import { format, parseISO, differenceInDays } from "date-fns";
import type { Job } from "@/types/job";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Trash2,
  Calendar,
  User,
  Briefcase,
  Clock,
  DollarSign,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface JobDetailsProps {
  job: Job;
  onEdit: () => void;
  onDelete: () => void;
}

export function JobDetails({ job, onEdit, onDelete }: JobDetailsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";

  const daysRemaining = differenceInDays(parseISO(job.expireDate), new Date());
  const isOverdue = daysRemaining < 0 && job.status !== "completed";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">{job.jobName}</h3>
          <div className="flex items-center gap-2 mt-1">
            {getStatusBadge(job.status || "pending")}
            {isOverdue && <Badge variant="destructive">Overdue</Badge>}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/job-portal/${job._id}/progress`)}
          >
            <History className="h-4 w-4 mr-2" />
            View Progress
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {isAdmin && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Briefcase className="h-4 w-4" />
              <span className="font-medium">Client</span>
            </div>
            <p>{job.clientName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              <span className="font-medium">Assigned Worker</span>
            </div>
            <p>{job.workerName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Timeline</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p>{format(parseISO(job.assignDate), "MMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p>{format(parseISO(job.expireDate), "MMM d, yyyy")}</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p>
                {differenceInDays(
                  parseISO(job.expireDate),
                  parseISO(job.assignDate)
                )}{" "}
                days
              </p>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">Financial Details</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Client Price</p>
                <p>${job.clientPrice?.toFixed(2) || "0.00"}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Status</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Current Status:</span>
              <span>{getStatusBadge(job.status || "pending")}</span>
            </div>
            <div className="flex justify-between">
              <span>Time Remaining:</span>
              <span>
                {job.status === "completed" ? (
                  "Completed"
                ) : isOverdue ? (
                  <span className="text-red-500">
                    Overdue by {Math.abs(daysRemaining)} days
                  </span>
                ) : (
                  <span>{daysRemaining} days remaining</span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <span className="font-medium">Description</span>
          </div>
          <p className="whitespace-pre-line">
            {job.description || "No description provided."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
