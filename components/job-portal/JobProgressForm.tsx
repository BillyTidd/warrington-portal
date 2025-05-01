"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { JobProgressLog } from "@/types/job";

interface JobProgressFormProps {
  onSubmit: (data: Partial<JobProgressLog>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function JobProgressForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: JobProgressFormProps) {
  const [formData, setFormData] = useState<Partial<any>>({
    details: "",
    hoursSpent: undefined,
    cost: undefined,
    status: undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="status">Status Update</Label>
          <Select
            value={formData.status}
            onValueChange={(
              value: "started" | "in-progress" | "paused" | "completed"
            ) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="started">Started</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="details">Progress Details</Label>
          <Textarea
            id="details"
            value={formData.details}
            onChange={(e) =>
              setFormData({ ...formData, details: e.target.value })
            }
            placeholder="Describe what you've done, challenges faced, or next steps..."
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hoursSpent">Hours Spent</Label>
            <Input
              id="hoursSpent"
              type="number"
              step="0.25"
              min="0"
              value={formData.hoursSpent || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  hoursSpent: e.target.value
                    ? Number.parseFloat(e.target.value)
                    : undefined,
                })
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="cost">Cost ($)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cost: e.target.value
                    ? Number.parseFloat(e.target.value)
                    : undefined,
                })
              }
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
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
              "Save Progress"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
