"use client";

import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, User, DollarSign, Trash2, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import type { JobProgressLog } from "@/types/job";
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

interface ProgressTimelineProps {
  progressLogs?: JobProgressLog[];
  canUpdateJob?: boolean;
  handleDeleteProgress?: (logId: string) => Promise<void>;
  setShowProgressForm?: (show: boolean) => void;
  currencySymbol?: string;
  jobId?: string;
}

export function ProgressTimeline({
  progressLogs,
  canUpdateJob,
  handleDeleteProgress,
  setShowProgressForm,
  currencySymbol = "£",
  jobId,
}: ProgressTimelineProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id;
  const [logToDelete, setLogToDelete] = useState<JobProgressLog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [localLogs, setLocalLogs] = useState<JobProgressLog[] | undefined>(
    progressLogs
  );

  // Sort logs by timestamp, newest first
  const sortedLogs = [...(localLogs || [])].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Function to handle log deletion with confirmation
  const confirmDelete = async () => {
    if (!logToDelete) {
      return;
    }

    // Optimistically update UI
    setLocalLogs((prev) =>
      prev?.filter((log) =>
        // Filter by _id if available
        log._id && logToDelete._id
          ? log._id !== logToDelete._id
          : // Otherwise filter by timestamp and details
            !(
              log.timestamp.toString() === logToDelete.timestamp.toString() &&
              log.details === logToDelete.details
            )
      )
    );

    setIsDeleting(true);
    try {
      // Get the identifier to use for deletion
      const identifier = logToDelete._id || logToDelete.timestamp.toString();

      if (handleDeleteProgress) {
        await handleDeleteProgress(identifier);
        toast.success("Progress log deleted successfully");
      } else if (jobId) {
        // Direct API call if no handler provided but jobId is available
        const response = await fetch(
          `/api/jobs/${jobId}/progress?logId=${encodeURIComponent(identifier)}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to delete progress log");
        }

        toast.success("Progress log deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting log:", error);
      toast.error("Failed to delete progress log");

      // Restore the logs if deletion failed
      setLocalLogs(progressLogs);
    } finally {
      setIsDeleting(false);
      setLogToDelete(null);
      setIsAlertOpen(false);
    }
  };

  // Function to open the delete dialog
  const openDeleteDialog = (log: JobProgressLog) => {
    setLogToDelete(log);
    setIsAlertOpen(true);
  };

  // Function to render cost badge consistently
  const renderCostBadge = (cost: number | undefined) => {
    if (cost === undefined || cost <= 0) return null;

    return (
      <Badge
        variant="outline"
        className="border-violet-500 text-violet-500 flex items-center"
      >
        <DollarSign className="h-3 w-3 mr-1" />
        Cost: {currencySymbol}
        {cost.toFixed(2)}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-violet-500" />
            Progress Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-0">
              {sortedLogs.map((log, index) => (
                <div
                  key={log._id || `${log.timestamp}-${index}`}
                  className="relative border-l border-dashed border-gray-200 pl-4 dark:border-gray-700"
                >
                  <div className="absolute -left-1.5 top-3 h-3 w-3 rounded-full bg-violet-500" />
                  <div className="px-4 py-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">
                        {format(
                          parseISO(log.timestamp.toString()),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {log.updatedByName}
                          </p>
                        </div>

                        {/* Delete button - only visible for admins or the user who created the entry */}
                        {(isAdmin || log.updatedBy === currentUserId) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                            onClick={() => openDeleteDialog(log)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete entry</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="mb-2 whitespace-pre-wrap">{log.details}</p>

                    {/* Overtime details section */}
                    {log.overtimeHours && (
                      <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                        <div className="flex items-center text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                          {isAdmin
                            ? "Extra Hours Details"
                            : log.updatedBy === currentUserId
                            ? "Your Extra Hours"
                            : "Extra Hours"}
                        </div>

                        {/* Show detailed breakdown for admins and the user who logged the hours */}
                        {(isAdmin || log.updatedBy === currentUserId) && (
                          <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                            <span>Hours: {log.overtimeHours}</span>
                            <span>
                              Rate: {currencySymbol}
                              {log.overtimeCost && log.overtimeHours
                                ? (
                                    log.overtimeCost / log.overtimeHours
                                  ).toFixed(2)
                                : "0.00"}
                              /hr
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between text-sm font-medium mt-1">
                          <span>Total:</span>
                          <span>
                            {currencySymbol}
                            {log.overtimeCost?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">
                      {log.statusChange && (
                        <Badge
                          variant="outline"
                          className="border-amber-500 text-amber-500"
                        >
                          Status changed to: {log.newStatus}
                        </Badge>
                      )}

                      {/* Render cost badge for regular costs */}
                      {!log.overtimeHours && renderCostBadge(log.cost)}

                      {/* Render cost badge for overtime costs */}
                      {log.overtimeHours && renderCostBadge(log.overtimeCost)}
                    </div>
                  </div>
                </div>
              ))}

              {sortedLogs.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  No progress updates yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Separate AlertDialog outside the main component */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Progress Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this progress entry? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
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
    </>
  );
}
