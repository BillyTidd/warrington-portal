"use client";

import type React from "react";
import { Loader2 } from "lucide-react";
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
import { DialogFooter } from "@/components/ui/dialog";
import type { Job } from "@/types/job";
import { format, parseISO } from "date-fns";
import { useSession } from "next-auth/react";

interface JobFormProps {
  currentJob: Partial<Job>;
  workers: any[];
  isEditMode: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onDelete?: () => void;
  isSaving: boolean;
  setCurrentJob: React.Dispatch<React.SetStateAction<Partial<Job>>>;
}

export function JobForm({
  currentJob,
  workers,
  isEditMode,
  onSubmit,
  onDelete,
  isSaving,
  setCurrentJob,
}: JobFormProps) {
  const { data: session } = useSession();

  // Check if the current logged-in user is an admin
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";
  const currentUserName = session?.user?.name || "";

  // Only allow admins to see the delete button and client price
  const canDelete = isAdmin;
  const canSeeClientPrice = isAdmin;
  const canAssignWorker = isAdmin;

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="jobName">Job Name</Label>
          <Input
            id="jobName"
            value={currentJob.jobName || ""}
            onChange={(e) =>
              setCurrentJob({
                ...currentJob,
                jobName: e.target.value,
              })
            }
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="assignDate">Assign Date</Label>
            <Input
              id="assignDate"
              type="date"
              value={
                currentJob.assignDate
                  ? format(
                      typeof currentJob.assignDate === "string"
                        ? parseISO(currentJob.assignDate)
                        : currentJob.assignDate,
                      "yyyy-MM-dd"
                    )
                  : ""
              }
              onChange={(e) =>
                setCurrentJob({
                  ...currentJob,
                  assignDate: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expireDate">Expire Date</Label>
            <Input
              id="expireDate"
              type="date"
              value={
                currentJob.expireDate
                  ? format(
                      typeof currentJob.expireDate === "string"
                        ? parseISO(currentJob.expireDate)
                        : currentJob.expireDate,
                      "yyyy-MM-dd"
                    )
                  : ""
              }
              onChange={(e) =>
                setCurrentJob({
                  ...currentJob,
                  expireDate: e.target.value,
                })
              }
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="clientName">Client</Label>
          <Input
            id="clientName"
            value={currentJob.clientName || ""}
            onChange={(e) =>
              setCurrentJob({
                ...currentJob,
                clientName: e.target.value,
              })
            }
            placeholder="Enter client name"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="userId">Assign To</Label>
          {isAdmin ? (
            <Select
              value={currentJob.userId || ""}
              onValueChange={(value) => {
                const selectedWorker = workers.find(
                  (worker) => worker._id === value
                );
                setCurrentJob({
                  ...currentJob,
                  userId: value,
                  workerName: selectedWorker?.name || "",
                });
              }}
            >
              <SelectTrigger>
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
          ) : (
            <>
              <Input
                id="workerName"
                value={currentUserName}
                disabled
                className="bg-muted"
              />
              <input
                type="hidden"
                value={currentUserId}
                onChange={() => {}} // React requires onChange even for hidden inputs
              />
            </>
          )}
        </div>

        {canSeeClientPrice && (
          <div className="grid gap-2">
            <Label htmlFor="clientPrice">Client Price ($)</Label>
            <Input
              id="clientPrice"
              type="number"
              value={currentJob.clientPrice || ""}
              onChange={(e) =>
                setCurrentJob({
                  ...currentJob,
                  clientPrice: Number.parseFloat(e.target.value),
                })
              }
            />
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={currentJob.status || "pending"}
            onValueChange={(value: "pending" | "in-progress" | "completed") =>
              setCurrentJob({ ...currentJob, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={currentJob.description || ""}
            onChange={(e) =>
              setCurrentJob({
                ...currentJob,
                description: e.target.value,
              })
            }
            rows={4}
          />
        </div>
      </div>

      <DialogFooter>
        {/* Only show delete button if the user is an admin */}
        {isEditMode && canDelete && onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        )}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditMode ? "Updating..." : "Saving..."}
            </>
          ) : (
            <>{isEditMode ? "Update" : "Save"} Job</>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
