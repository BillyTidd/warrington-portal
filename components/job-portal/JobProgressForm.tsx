"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Clock, PoundSterling } from "lucide-react";
import { toast } from "sonner";

interface JobProgressFormProps {
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  progressDescription: string;
  setProgressDescription: (value: string) => void;
  progressAmount: string;
  setProgressAmount: (value: string) => void;
  onCancel: () => void;
  currencySymbol?: string;
  job: any;
  currentUserId: string;
  workerHourlyRate?: any;
}

export function JobProgressForm({
  isSubmitting,
  onSubmit,
  progressDescription,
  setProgressDescription,
  progressAmount,
  setProgressAmount,
  onCancel,
  currencySymbol = "£",
  job,
  currentUserId,
  workerHourlyRate,
}: JobProgressFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState("In Progress");
  const [workType, setWorkType] = useState("regular");
  const [overtimeHours, setOvertimeHours] = useState<number | undefined>(
    undefined
  );

  // Find the current worker's hourly rate from the job data
  const currentWorker = job?.workers?.find(
    (worker: any) => worker.userId === currentUserId
  );
  const hourlyRate = currentWorker?.hourlyRate || 0;

  // Update calculated amount whenever overtime hours change
  useEffect(() => {
    if (workType === "extra" && overtimeHours && hourlyRate) {
      const cost = overtimeHours * hourlyRate;
      setProgressAmount(cost.toFixed(2));
    } else if (workType === "regular") {
      // Reset overtime hours when switching to regular work
      setOvertimeHours(undefined);
    }
  }, [workType, overtimeHours, hourlyRate, setProgressAmount]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!progressDescription.trim()) {
      toast.error("Please provide a description of the progress");
      return;
    }

    // If extra hours are selected but no hourly rate is set
    if (workType === "extra" && !hourlyRate) {
      toast.error("Cannot calculate extra hours cost. No hourly rate is set.");
      return;
    }

    // If extra hours are selected but no hours are entered
    if (workType === "extra" && !overtimeHours) {
      toast.error("Please enter the number of extra hours");
      return;
    }

    // Call the parent's onSubmit function
    await onSubmit(e);

    // Reset form fields
    setWorkType("regular");
    setOvertimeHours(undefined);
    setStatus("In Progress");
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Update Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={progressDescription}
              onChange={(e) => setProgressDescription(e.target.value)}
              placeholder="Describe the progress made..."
              rows={4}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="workType">Work Type</Label>
            <Select value={workType} onValueChange={setWorkType}>
              <SelectTrigger id="workType" className="mt-1">
                <SelectValue placeholder="Select work type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular Work</SelectItem>
                <SelectItem value="extra">Extra Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {workType === "extra" && (
            <div>
              <Label htmlFor="overtimeHours">Extra Hours</Label>
              <div className="relative mt-1">
                <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="overtimeHours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={overtimeHours || ""}
                  onChange={(e) => {
                    const value = e.target.value
                      ? Number.parseFloat(e.target.value)
                      : undefined;
                    setOvertimeHours(value);
                  }}
                  placeholder="Enter extra hours"
                  className="pl-8"
                />
              </div>
              {hourlyRate === 0 && (
                <p className="text-sm text-yellow-500 mt-1">
                  No hourly rate set. Please contact admin.
                </p>
              )}
              {hourlyRate > 0 && overtimeHours && (
                <p className="text-sm text-muted-foreground mt-1">
                  Cost: {currencySymbol}
                  {(overtimeHours * hourlyRate).toFixed(2)} ({overtimeHours}{" "}
                  hours × {currencySymbol}
                  {hourlyRate.toFixed(2)}/hour)
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="cost">Cost</Label>
            <div className="relative mt-1">
              <PoundSterling className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={progressAmount}
                onChange={(e) => setProgressAmount(e.target.value)}
                placeholder={`Enter cost in ${currencySymbol}`}
                className="pl-8"
                disabled={workType === "extra" && hourlyRate > 0}
              />
            </div>
            {workType === "extra" && hourlyRate > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Cost is automatically calculated from extra hours
              </p>
            )}
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="text"
              value={format(new Date(), "PPP")}
              disabled
              className="mt-1 bg-muted"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Updating..." : "Update Progress"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
