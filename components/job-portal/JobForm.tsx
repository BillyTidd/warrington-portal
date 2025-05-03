"use client";

import React from "react";
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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Initialize workers array if it doesn't exist
  React.useEffect(() => {
    if (!currentJob.workers) {
      // If editing an old job that uses the old format with userId/workerName
      if (currentJob.userId && currentJob.workerName) {
        setCurrentJob({
          ...currentJob,
          workers: [
            { userId: currentJob.userId, workerName: currentJob.workerName },
          ],
        });
      } else if (!isAdmin) {
        // For non-admin users, automatically assign themselves
        setCurrentJob({
          ...currentJob,
          workers: [{ userId: currentUserId, workerName: currentUserName }],
        });
      } else {
        // Initialize empty array for admins
        setCurrentJob({
          ...currentJob,
          workers: [],
        });
      }
    }
  }, [
    currentJob.workers,
    currentUserId,
    currentUserName,
    isAdmin,
    currentJob.userId,
    currentJob.workerName,
    setCurrentJob,
  ]);

  const handleAddWorker = (workerId: string) => {
    const selectedWorker = workers.find((worker) => worker._id === workerId);
    if (!selectedWorker) return;

    // Check if worker is already assigned
    const isAlreadyAssigned = currentJob.workers?.some(
      (worker) => worker.userId === workerId
    );
    if (isAlreadyAssigned) return;

    setCurrentJob({
      ...currentJob,
      workers: [
        ...(currentJob.workers || []),
        { userId: workerId, workerName: selectedWorker.name },
      ],
    });
  };

  const handleRemoveWorker = (workerId: string) => {
    setCurrentJob({
      ...currentJob,
      workers:
        currentJob.workers?.filter((worker) => worker.userId !== workerId) ||
        [],
    });
  };

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
          <Label>Assigned Workers</Label>
          {isAdmin ? (
            <>
              <Select onValueChange={handleAddWorker}>
                <SelectTrigger>
                  <SelectValue placeholder="Add worker" />
                </SelectTrigger>
                <SelectContent>
                  {workers
                    .filter(
                      (worker) =>
                        !currentJob.workers?.some(
                          (assigned) => assigned.userId === worker._id
                        )
                    )
                    .map((worker) => (
                      <SelectItem key={worker._id} value={worker._id}>
                        {worker.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="mt-2">
                {currentJob.workers && currentJob.workers.length > 0 ? (
                  <ScrollArea className="max-h-32">
                    <div className="flex flex-wrap gap-2 p-1">
                      {currentJob.workers.map((worker) => (
                        <Badge
                          key={worker.userId}
                          variant="secondary"
                          className="px-2 py-1"
                        >
                          {worker.workerName}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                            onClick={() => handleRemoveWorker(worker.userId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No workers assigned
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="px-2 py-1">
                  {currentUserName}
                </Badge>
              </div>
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
            <Label htmlFor="clientPrice">Client Price (£)</Label>
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
