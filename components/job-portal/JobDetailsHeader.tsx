"use client";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  MoreHorizontal,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Briefcase,
  User,
  Calendar,
  Loader2,
  ChevronRight,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Job } from "@/types/job";
import { generateJobPDF } from "@/lib/excelGenerator";

interface JobDetailsHeaderProps {
  job: Job;
  isEditing: boolean;
  editedJob: Partial<Job>;
  isSaving: boolean;
  isAdmin: boolean;
  canEditJob: boolean;
  canUpdateJob: boolean;
  daysRemaining: number;
  isOverdue: boolean;
  progressPercentage: number;
  setEditedJob: (job: Partial<Job>) => void;
  setIsEditing: (isEditing: boolean) => void;
  handleSaveJob: () => Promise<void>;
  setShowProgressForm: (show: boolean) => void;
  setIsDeleteDialogOpen: (isOpen: boolean) => void;
}

export function JobDetailsHeader({
  job,
  isEditing,
  editedJob,
  isSaving,
  isAdmin,
  canEditJob,
  canUpdateJob,
  daysRemaining,
  isOverdue,
  progressPercentage,
  setEditedJob,
  setIsEditing,
  handleSaveJob,
  setShowProgressForm,
  setIsDeleteDialogOpen,
}: JobDetailsHeaderProps) {
  const router = useRouter();

  return (
    <>
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
              <h1 className="text-3xl font-bold text-white">{job.jobName}</h1>
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
    </>
  );
}
