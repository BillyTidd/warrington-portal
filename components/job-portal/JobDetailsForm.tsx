"use client";

import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Job } from "@/types/job";

interface JobDetailsFormProps {
  editedJob: Partial<Job>;
  setEditedJob: (job: Partial<Job>) => void;
  isAdmin: boolean;
  workers: any[];
}

export function JobDetailsForm({
  editedJob,
  setEditedJob,
  isAdmin,
  workers,
}: JobDetailsFormProps) {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
        <CardTitle>Edit Job Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div>
          <Label htmlFor="clientName">Client</Label>
          <Input
            id="clientName"
            value={editedJob.clientName || ""}
            onChange={(e) =>
              setEditedJob({ ...editedJob, clientName: e.target.value })
            }
            required
            className="mt-1"
          />
        </div>

        {isAdmin && (
          <div>
            <Label htmlFor="userId">Assign To</Label>
            <Select
              value={editedJob.userId || ""}
              onValueChange={(value) => {
                const selectedWorker = workers.find(
                  (worker) => worker._id === value
                );
                setEditedJob({
                  ...editedJob,
                  userId: value,
                  workerName: selectedWorker?.name || "",
                });
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((worker) => (
                  <SelectItem key={worker._id} value={worker._id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="assignDate">Start Date</Label>
            <Input
              id="assignDate"
              type="date"
              value={
                editedJob.assignDate
                  ? format(
                      typeof editedJob.assignDate === "string"
                        ? parseISO(editedJob.assignDate)
                        : editedJob.assignDate,
                      "yyyy-MM-dd"
                    )
                  : ""
              }
              onChange={(e) =>
                setEditedJob({ ...editedJob, assignDate: e.target.value })
              }
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="expireDate">Due Date</Label>
            <Input
              id="expireDate"
              type="date"
              value={
                editedJob.expireDate
                  ? format(
                      typeof editedJob.expireDate === "string"
                        ? parseISO(editedJob.expireDate)
                        : editedJob.expireDate,
                      "yyyy-MM-dd"
                    )
                  : ""
              }
              onChange={(e) =>
                setEditedJob({ ...editedJob, expireDate: e.target.value })
              }
              required
              className="mt-1"
            />
          </div>
        </div>

        {isAdmin && (
          <div>
            <Label htmlFor="clientPrice">Client Price ($)</Label>
            <Input
              id="clientPrice"
              type="number"
              value={editedJob.clientPrice || ""}
              onChange={(e) =>
                setEditedJob({
                  ...editedJob,
                  clientPrice: e.target.value
                    ? Number.parseFloat(e.target.value)
                    : undefined,
                })
              }
              className="mt-1"
            />
          </div>
        )}

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={editedJob.description || ""}
            onChange={(e) =>
              setEditedJob({ ...editedJob, description: e.target.value })
            }
            rows={6}
            className="mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
