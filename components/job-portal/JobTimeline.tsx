"use client";

import { format, parseISO, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Calendar, Clock, User } from "lucide-react";
import type { Job } from "@/types/job";

interface JobTimelineProps {
  job: Job;
  daysRemaining: number;
  isOverdue: boolean;
}

export function JobTimeline({
  job,
  daysRemaining,
  isOverdue,
}: JobTimelineProps) {
  return (
    <Card className="border-none shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 pb-3">
        <CardTitle className="text-lg">Job Timeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-full mr-3">
                <Calendar className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <div className="text-sm font-medium">Start Date</div>
                <div className="text-muted-foreground">
                  {format(parseISO(job.assignDate), "MMM d, yyyy")}
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDistanceToNow(parseISO(job.assignDate), {
                addSuffix: true,
              })}
            </div>
          </div>

          <div className="w-px h-6 bg-muted mx-auto"></div>

          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-full mr-3">
                <Clock className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <div className="text-sm font-medium">Due Date</div>
                <div className="text-muted-foreground">
                  {format(parseISO(job.expireDate), "MMM d, yyyy")}
                </div>
              </div>
            </div>
            <div className="text-sm">
              {isOverdue ? (
                <span className="text-red-500 font-medium">
                  Overdue by {Math.abs(daysRemaining)} days
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {daysRemaining} days remaining
                </span>
              )}
            </div>
          </div>

          <div className="w-px h-6 bg-muted mx-auto"></div>

          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-full mr-3">
                <User className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <div className="text-sm font-medium">Assigned To</div>
                <div className="text-muted-foreground">{job.workerName}</div>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-muted mx-auto"></div>

          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-full mr-3">
                <Briefcase className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <div className="text-sm font-medium">Client</div>
                <div className="text-muted-foreground">{job.clientName}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
