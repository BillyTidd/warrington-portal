"use client";

import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus, Trash2, User, ClipboardList } from "lucide-react";
import type { JobProgressLog } from "@/types/job";

interface ProgressTimelineProps {
  progressLogs: JobProgressLog[] | undefined;
  canUpdateJob: boolean;
  handleDeleteProgress: (logId: string) => Promise<void>;
  setShowProgressForm: (show: boolean) => void;
}

export function ProgressTimeline({
  progressLogs,
  canUpdateJob,
  handleDeleteProgress,
  setShowProgressForm,
}: ProgressTimelineProps) {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
        <CardTitle>Progress Timeline</CardTitle>
        <CardDescription>
          {progressLogs && progressLogs.length > 0
            ? `${progressLogs.length} updates recorded`
            : "No progress updates yet"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ScrollArea className="h-[600px] pr-4">
          {progressLogs && progressLogs.length > 0 ? (
            <div className="space-y-6">
              {progressLogs
                .sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                )
                .map((log) => (
                  <div
                    key={log._id}
                    className="relative pl-6 border-l-2 border-muted pb-6"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary"></div>

                    <Card className="border-none shadow-md">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              {format(
                                new Date(log.timestamp),
                                "MMM d, yyyy h:mm a"
                              )}
                            </div>
                            <div className="text-sm font-medium mt-1 flex items-center">
                              <User className="h-3 w-3 mr-1 text-muted-foreground" />
                              Updated by: {log.updatedByName || "Unknown"}
                            </div>
                          </div>

                          {canUpdateJob && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/20"
                              onClick={() => handleDeleteProgress(log._id!)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete log</span>
                            </Button>
                          )}
                        </div>

                        {log.statusChange && (
                          <Badge
                            className={`mt-2 ${
                              log.newStatus === "completed"
                                ? "bg-green-500"
                                : log.newStatus === "in-progress"
                                ? "bg-blue-500"
                                : "bg-yellow-500"
                            }`}
                          >
                            Status changed to {log.newStatus}
                          </Badge>
                        )}

                        <p className="mt-3 whitespace-pre-line">
                          {log.details}
                        </p>

                        {log.cost !== undefined && (
                          <div className="mt-3 text-sm bg-muted/30 p-2 rounded-md inline-block">
                            <span className="font-medium flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Amount: ${log.cost?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-muted/30 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Progress Logs Yet</h3>
              <p className="text-muted-foreground mb-4">
                No progress has been logged for this job yet.
              </p>
              {canUpdateJob && (
                <Button onClick={() => setShowProgressForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Update
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
