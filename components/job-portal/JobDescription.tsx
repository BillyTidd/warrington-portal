"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface JobDescriptionProps {
  description: string | undefined;
}

export function JobDescription({ description }: JobDescriptionProps) {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
        <CardTitle>Job Description</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="prose dark:prose-invert max-w-none">
          {description ? (
            <p className="whitespace-pre-line">{description}</p>
          ) : (
            <p className="text-muted-foreground italic">
              No description provided.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
