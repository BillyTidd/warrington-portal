"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PoundSterling } from "lucide-react";
import { toast } from "sonner";
import type { JobProgressLog } from "@/types/job";

interface ProgressEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  progressLog: JobProgressLog | null;
  onUpdate: (
    logId: string,
    updates: { cost?: number; jobStatus: string }
  ) => Promise<void>;
  currencySymbol?: string;
}

export function ProgressEditModal({
  isOpen,
  onClose,
  progressLog,
  onUpdate,
  currencySymbol = "£",
}: ProgressEditModalProps) {
  const [cost, setCost] = useState<string>("");
  const [jobStatus, setJobStatus] = useState<string>("pending");
  const [isUpdating, setIsUpdating] = useState(false);

  // Update local state when progressLog changes or modal opens
  useEffect(() => {
    if (progressLog && isOpen) {
      const logCost =
        progressLog.overtimeCost ||
        progressLog.vehicleUsage?.totalCost ||
        progressLog.cost ||
        0;
      setCost(logCost.toString());
      setJobStatus(progressLog.jobStatus || "pending");
    }
  }, [progressLog, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressLog) return;

    setIsUpdating(true);
    try {
      const updates = {
        cost: Number.parseFloat(cost) || 0,
        jobStatus,
      };

      await onUpdate(
        progressLog._id || progressLog.timestamp.toString(),
        updates
      );
      toast.success("Progress updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!progressLog) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Progress Entry</DialogTitle>
          <DialogDescription>
            Update the cost and approval status for this progress entry.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              {progressLog.details}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Amount</Label>
            <div className="relative">
              <PoundSterling className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="pl-8"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={jobStatus} onValueChange={setJobStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
