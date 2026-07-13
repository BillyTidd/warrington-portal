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
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PoundSterling, Clock, Plus, Trash2, User } from "lucide-react";
import type { Job } from "@/types/job";
import { useState } from "react";

interface JobDetailsFormProps {
  editedJob: Partial<Job>;
  setEditedJob: (job: Partial<Job>) => void;
  isAdmin: boolean;
  workers: any[];
  confirmations?: any[];
}

export function JobDetailsForm({
  editedJob,
  setEditedJob,
  isAdmin,
  workers,
  confirmations = [],
}: JobDetailsFormProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");

  // Build a map: workerId -> best confirmation status for this job
  // If a worker has multiple confirmations (SMS + WhatsApp), prefer confirmed > declined > pending
  const confirmationMap = new Map<string, { response: 'yes' | 'no' | null; status: string }>();
  confirmations.forEach((c) => {
    const existing = confirmationMap.get(c.workerId);
    const priority = (r: string | null) => r === 'yes' ? 2 : r === 'no' ? 1 : 0;
    if (!existing || priority(c.workerResponse) > priority(existing.response)) {
      confirmationMap.set(c.workerId, { response: c.workerResponse, status: c.status });
    }
  });

  const hasConfirmations = confirmationMap.size > 0;

  // Function to add a worker to the job
  const addWorker = () => {
    if (!selectedWorkerId || !editedJob.workers) return;

    // Check if worker is already assigned
    const isAlreadyAssigned = editedJob.workers.some(
      (worker) => worker.userId === selectedWorkerId
    );
    if (isAlreadyAssigned) return;

    const selectedWorker = workers.find(
      (worker) => worker._id === selectedWorkerId
    );
    if (!selectedWorker) return;

    const newWorker = {
      userId: selectedWorkerId,
      workerName: selectedWorker.name,
      paymentRate: 0,
      hourlyRate: 0,
    };

    setEditedJob({
      ...editedJob,
      workers: [...editedJob.workers, newWorker],
    });

    setSelectedWorkerId("");
  };

  // Function to remove a worker from the job
  const removeWorker = (userId: string) => {
    if (!editedJob.workers) return;

    setEditedJob({
      ...editedJob,
      workers: editedJob.workers.filter((worker) => worker.userId !== userId),
    });
  };

  // Function to update a worker's payment rates
  const updateWorkerRates = (
    index: number,
    field: "paymentRate" | "hourlyRate",
    value: number
  ) => {
    if (!editedJob.workers) return;

    const updatedWorkers = [...editedJob.workers];
    updatedWorkers[index] = {
      ...updatedWorkers[index],
      [field]: value,
    };

    setEditedJob({
      ...editedJob,
      workers: updatedWorkers,
    });
  };

  // Initialize workers array if it doesn't exist
  if (!editedJob.workers && editedJob.userId) {
    // Convert old format to new format
    setEditedJob({
      ...editedJob,
      workers: [
        {
          userId: editedJob.userId,
          workerName: editedJob.workerName || "",
          paymentRate: editedJob.workerPaymentRate || 0,
          hourlyRate: editedJob.workerHourlyRate || 0,
        },
      ],
    });
  } else if (!editedJob.workers) {
    setEditedJob({
      ...editedJob,
      workers: [],
    });
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40">
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
          <div className="space-y-4">
            <div>
              <Label>Assigned Workers</Label>
              <div className="mt-2 space-y-4">
                {editedJob.workers && editedJob.workers.length > 0 ? (
                  editedJob.workers.map((worker, index) => {
                    const conf = confirmationMap.get(worker.userId);
                    return (
                    <div key={worker.userId} className="rounded-md border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{worker.workerName}</span>
                          {conf && (
                            <StatusBadge
                              status={
                                conf.response === 'yes'
                                  ? 'confirmed'
                                  : conf.response === 'no'
                                  ? 'declined'
                                  : 'pending'
                              }
                              label={
                                conf.response === 'yes'
                                  ? 'Available'
                                  : conf.response === 'no'
                                  ? 'Not Available'
                                  : 'Pending'
                              }
                              showIcon={false}
                            />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWorker(worker.userId)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`paymentRate-${index}`}>
                            Fixed Payment Rate (£)
                          </Label>
                          <div className="relative mt-1">
                            <PoundSterling className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                              id={`paymentRate-${index}`}
                              type="number"
                              value={worker.paymentRate || ""}
                              onChange={(e) =>
                                updateWorkerRates(
                                  index,
                                  "paymentRate",
                                  e.target.value
                                    ? Number.parseFloat(e.target.value)
                                    : 0
                                )
                              }
                              className="pl-8"
                              placeholder="Total payment for this job"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`hourlyRate-${index}`}>
                            Hourly Rate (£)
                          </Label>
                          <div className="relative mt-1">
                            <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                              id={`hourlyRate-${index}`}
                              type="number"
                              value={worker.hourlyRate || ""}
                              onChange={(e) =>
                                updateWorkerRates(
                                  index,
                                  "hourlyRate",
                                  e.target.value
                                    ? Number.parseFloat(e.target.value)
                                    : 0
                                )
                              }
                              className="pl-8"
                              placeholder="Hourly rate for overtime"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )})
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No workers assigned yet
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="addWorker">
                  Add Worker
                  {hasConfirmations && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      (showing workers who received confirmations)
                    </span>
                  )}
                </Label>
                <Select
                  value={selectedWorkerId}
                  onValueChange={setSelectedWorkerId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers
                      .filter((worker) =>
                        !editedJob.workers?.some((w) => w.userId === worker._id)
                      )
                      .filter((worker) =>
                        !hasConfirmations || confirmationMap.has(worker._id)
                      )
                      .map((worker) => {
                        const conf = confirmationMap.get(worker._id);
                        return (
                          <SelectItem key={worker._id} value={worker._id}>
                            <div className="flex items-center gap-2">
                              <span>{worker.name}</span>
                              {conf && (
                                <span
                                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                    conf.response === 'yes'
                                      ? 'text-green-600 dark:text-green-400'
                                      : conf.response === 'no'
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {conf.response === 'yes' ? 'Available' : conf.response === 'no' ? 'Not Available' : 'Pending'}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={addWorker}
                disabled={!selectedWorkerId}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Label htmlFor="clientPrice">Client Price (£)</Label>
            <div className="relative mt-1">
              <PoundSterling className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
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
                className="pl-8"
              />
            </div>
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
