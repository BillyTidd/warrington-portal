"use client";

import { format, parseISO, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Calendar, User } from "lucide-react";
import type { Job } from "@/types/job";

interface JobTimelineProps {
  job: Job;
}

export function JobTimeline({ job }: JobTimelineProps) {
  return (
    <Card className="border-none shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 pb-3">
        <CardTitle className="text-lg">Job Timeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full mr-3">
                <Calendar className="h-4 w-4 text-amber-500" />
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
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full mr-3">
                <User className="h-4 w-4 text-amber-500" />
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
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full mr-3">
                <Briefcase className="h-4 w-4 text-amber-500" />
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
