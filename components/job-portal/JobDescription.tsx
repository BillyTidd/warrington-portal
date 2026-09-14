"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface JobDescriptionProps {
  job: any;
  isCustomer?: boolean;
}

function formatDisplayDate(value: unknown) {
  if (!value) return "Not scheduled";

  const date = new Date(value as string | Date);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function JobDescription({
  job,
  isCustomer = false,
}: JobDescriptionProps) {
  const managerName =
    job.managerName ||
    job.jobEstimate?.managerDetails?.fullName ||
    job.jobEstimate?.manager ||
    job.clientName ||
    "Not assigned";

  const jobReference =
    job.jobEstimate?.jobReference || job.jobReference || job._id;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40">
        <CardTitle>Job Description</CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="prose max-w-none dark:prose-invert">
          {job.description ? (
            <p className="whitespace-pre-line">{job.description}</p>
          ) : (
            <p className="italic text-muted-foreground">
              No description provided.
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Job Reference</p>
            <p className="break-all font-medium">{jobReference}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Start Date</p>
            <p className="font-medium">
              {formatDisplayDate(job.assignDate || job.startDate)}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Manager</p>
            <p className="font-medium">{managerName}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium capitalize">
              {String(job.status || "pending").replace(/-/g, " ")}
            </p>
          </div>

          {isCustomer && (
            <div>
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="font-semibold">
                £{Number(job.clientPrice ?? 0).toFixed(2)}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground">Documents</p>
            <p className="font-medium">
              {Array.isArray(job.documents) ? job.documents.length : 0}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
