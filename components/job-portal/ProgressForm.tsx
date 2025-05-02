"use client";

import type React from "react";
import { Loader2, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ProgressFormProps {
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  progressDescription: string;
  setProgressDescription: (value: string) => void;
  progressAmount: string;
  setProgressAmount: (value: string) => void;
  onCancel: () => void;
}

export function ProgressForm({
  isSubmitting,
  onSubmit,
  progressDescription,
  setProgressDescription,
  progressAmount,
  setProgressAmount,
  onCancel,
}: ProgressFormProps) {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
        <CardTitle>Add Progress</CardTitle>
        <CardDescription>Record your latest work on this job</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={progressDescription}
              onChange={(e) => setProgressDescription(e.target.value)}
              placeholder="Describe what you've done..."
              rows={4}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="amount">Amount (£)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={progressAmount}
              onChange={(e) => setProgressAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Progress
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
