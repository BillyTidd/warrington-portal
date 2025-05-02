"use client";

import type React from "react";
import { X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Job, Worker } from "@/types/job";
import type { Session } from "next-auth";

interface JobFormFieldsProps {
  job: Partial<Job>;
  setJob: React.Dispatch<React.SetStateAction<Partial<Job>>>;
  workers: any[];
  clients: any[];
  isAdmin: boolean;
  handleWorkerSelect: (workerId: string) => void;
  handleClientSelect: (clientId: string) => void;
  session: Session | null;
}

export function JobFormFields({
  job,
  setJob,
  workers,
  clients,
  isAdmin,
  handleWorkerSelect,
  handleClientSelect,
  session,
}: JobFormFieldsProps) {
  const currentUserId = session?.user?.id || "";
  const currentUserName = session?.user?.name || "";

  const removeWorker = (workerId: string) => {
    setJob((prev) => ({
      ...prev,
      workers: prev.workers?.filter((w) => w.userId !== workerId) || [],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="jobName" className="text-base">
          Job Name
        </Label>
        <Input
          id="jobName"
          value={job.jobName || ""}
          onChange={(e) => setJob({ ...job, jobName: e.target.value })}
          placeholder="Enter job name"
          className="mt-1.5"
          required
        />
      </div>

      <div>
        <Label htmlFor="client" className="text-base">
          Client
        </Label>
        <Select value={job.clientId || ""} onValueChange={handleClientSelect}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client._id} value={client._id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="assignDate" className="text-base">
            Start Date
          </Label>
          <Input
            id="assignDate"
            type="date"
            value={job.assignDate || ""}
            onChange={(e) => setJob({ ...job, assignDate: e.target.value })}
            className="mt-1.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="expireDate" className="text-base">
            Due Date
          </Label>
          <Input
            id="expireDate"
            type="date"
            value={job.expireDate || ""}
            onChange={(e) => setJob({ ...job, expireDate: e.target.value })}
            className="mt-1.5"
            required
          />
        </div>
      </div>

      <div>
        <Label className="text-base">Assign Workers</Label>
        {isAdmin ? (
          <div className="space-y-3 mt-1.5">
            <Select onValueChange={handleWorkerSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select workers" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((worker) => (
                  <SelectItem
                    key={worker._id}
                    value={worker._id}
                    disabled={job.workers?.some((w) => w.userId === worker._id)}
                  >
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Display selected workers */}
            {job.workers && job.workers.length > 0 ? (
              <ScrollArea className="h-24 border rounded-md p-2">
                <div className="flex flex-wrap gap-2">
                  {job.workers.map((worker: Worker) => (
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
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeWorker(worker.userId)}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-sm text-muted-foreground p-2">
                No workers assigned yet. Select workers from the dropdown above.
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                id="workerName"
                value={currentUserName}
                disabled
                className="bg-muted"
              />
              <Badge>You</Badge>
            </div>
            <input
              type="hidden"
              value={currentUserId}
              onChange={() => {}} // React requires onChange even for hidden inputs
            />
          </>
        )}
      </div>

      {isAdmin && (
        <div>
          <Label htmlFor="clientPrice" className="text-base">
            Client Price ($)
          </Label>
          <Input
            id="clientPrice"
            type="number"
            step="0.01"
            min="0"
            value={job.clientPrice || ""}
            onChange={(e) =>
              setJob({
                ...job,
                clientPrice: e.target.value
                  ? Number.parseFloat(e.target.value)
                  : undefined,
              })
            }
            placeholder="0.00"
            className="mt-1.5"
          />
        </div>
      )}

      <div>
        <Label htmlFor="status" className="text-base">
          Status
        </Label>
        <Select
          value={job.status || "pending"}
          onValueChange={(value: "pending" | "in-progress" | "completed") =>
            setJob({ ...job, status: value })
          }
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description" className="text-base">
          Description
        </Label>
        <Textarea
          id="description"
          value={job.description || ""}
          onChange={(e) => setJob({ ...job, description: e.target.value })}
          placeholder="Enter job description"
          rows={5}
          className="mt-1.5"
        />
      </div>
    </div>
  );
}
