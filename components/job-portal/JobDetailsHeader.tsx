"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  ChevronRight,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  X,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { generateJobPDF } from "@/lib/excelGenerator";
import type { Job } from "@/types/job";

interface JobDetailsHeaderProps {
  job: Job;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  editedJob: Partial<Job>;
  setEditedJob: (value: Partial<Job>) => void;
  handleSaveJob: () => Promise<void>;
  isSaving: boolean;
  setIsDeleteDialogOpen: (value: boolean) => void;
  setShowProgressForm: (value: boolean) => void;
  isAdmin: boolean;
  canUpdateJob: boolean;
  canEditJob: boolean;
  daysRemaining: number;
  isOverdue: boolean;
  progressPercentage: number;
  isAssignedToMe: boolean;
}

export function JobDetailsHeader({
  job,
  isEditing,
  setIsEditing,
  editedJob,
  setEditedJob,
  handleSaveJob,
  isSaving,
  setIsDeleteDialogOpen,
  setShowProgressForm,
  isAdmin,
  canUpdateJob,
  canEditJob,
  daysRemaining,
  isOverdue,
  progressPercentage,
  isAssignedToMe,
}: JobDetailsHeaderProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Find the current worker's payment information
  const currentWorker = job.workers?.find(
    (worker) => worker.userId === session?.user?.id
  );
  const paymentRate = currentWorker?.paymentRate || job.workerPaymentRate;
  const hourlyRate = currentWorker?.hourlyRate || job.workerHourlyRate;

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = await generateJobPDF(job, session);
      doc.save(`WARRINGTONS-INSTALLS-job-${job._id}.pdf`);
      toast.success("PDF generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Get worker count for display
  const workerCount = job.workers ? job.workers.length : job.userId ? 1 : 0;

  return (
    <div className="mb-8">
      <div className="flex flex-col items-start sm:flex-row sm:items-center gap-2 sm:gap-0 mb-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/job-portal")}
          className="-ml-4 sm:ml-0 sm:mr-2 hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Separator orientation="vertical" className="hidden sm:block h-6 mx-2" />
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

              {/* Show payment badge if assigned to me */}
              {isAssignedToMe && paymentRate && (
                <Badge className="bg-emerald-500 hover:bg-emerald-600">
                  <DollarSign className="h-3 w-3 mr-1" />$
                  {paymentRate.toFixed(2)}
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
                    <DropdownMenuItem onClick={() => setShowProgressForm(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Expenses/Progress
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {isGeneratingPDF
                      ? "Generating PDF..."
                      : "Download PDF Report"}
                  </DropdownMenuItem>
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
              <div className="font-medium mt-1">{job.clientName}</div>
            </div>
            <div className="text-white/80">
              <div className="text-xs uppercase">Assigned To</div>
              <div className="font-medium mt-1 flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {workerCount} {workerCount === 1 ? "Worker" : "Workers"}
              </div>
            </div>
            <div className="text-white/80">
              <div className="text-xs uppercase">Due Date</div>
              <div className="font-medium mt-1">
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
    </div>
  );
}
