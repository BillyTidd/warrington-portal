"use client";

import type React from "react";
import { useState } from "react";
import { X, DollarSign, Clock } from "lucide-react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import type { Job, Worker } from "@/types/job";
import type { CustomerAccountOption } from "@/types/customer-account";
import type { Session } from "next-auth";

interface JobFormFieldsProps {
  job: Partial<Job>;
  setJob: React.Dispatch<React.SetStateAction<Partial<Job>>>;
  workers: any[];
  clients: CustomerAccountOption[];
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
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const removeWorker = (workerId: string) => {
    setJob((prev) => ({
      ...prev,
      workers: prev.workers?.filter((w) => w.userId !== workerId) || [],
    }));
  };

  const updateWorkerRate = (
    workerId: string,
    field: "paymentRate" | "hourlyRate",
    value: number | undefined
  ) => {
    setJob((prev) => ({
      ...prev,
      workers:
        prev.workers?.map((worker) =>
          worker.userId === workerId ? { ...worker, [field]: value } : worker
        ) || [],
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
  <Label htmlFor="customerAccount" className="text-base">
    Customer Account
  </Label>

  <Select
    value={job.customer_account_id || ""}
    onValueChange={handleClientSelect}
  >
    <SelectTrigger id="customerAccount" className="mt-1.5">
      <SelectValue placeholder="Select a customer account" />
    </SelectTrigger>

    <SelectContent>
      {clients.map((customer) => (
        <SelectItem
          key={customer.customerAccountId}
          value={customer.customerAccountId}
        >
          <div className="flex flex-col">
            <span>{customer.displayName}</span>

            <span className="text-xs text-muted-foreground">
              {customer.email}
            </span>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  {clients.length === 0 && (
    <p className="mt-1 text-sm text-red-500">
      No approved customer accounts are available.
    </p>
  )}
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
            <Select
              value={selectedWorkerId || ""}
              onValueChange={(value) => {
                setSelectedWorkerId(value);
                handleWorkerSelect(value);
              }}
            >
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

            {/* Display selected workers with payment rates */}
            {job.workers && job.workers.length > 0 ? (
              <Card>
                <CardContent className="p-4">
                  <Accordion type="single" collapsible className="w-full">
                    {job.workers.map((worker: Worker) => (
                      <AccordionItem key={worker.userId} value={worker.userId}>
                        <AccordionTrigger className="py-2">
                          <div className="flex items-center">
                            <span>{worker.workerName}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 ml-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeWorker(worker.userId);
                              }}
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 py-2">
                            <div>
                              <Label
                                htmlFor={`payment-rate-${worker.userId}`}
                                className="flex items-center text-sm"
                              >
                                <DollarSign className="h-3.5 w-3.5 mr-1" />
                                Payment Rate (Total)
                              </Label>
                              <Input
                                id={`payment-rate-${worker.userId}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={worker.paymentRate || ""}
                                onChange={(e) =>
                                  updateWorkerRate(
                                    worker.userId,
                                    "paymentRate",
                                    e.target.value
                                      ? Number.parseFloat(e.target.value)
                                      : undefined
                                  )
                                }
                                placeholder="0.00"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label
                                htmlFor={`hourly-rate-${worker.userId}`}
                                className="flex items-center text-sm"
                              >
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                Hourly Rate (Overtime)
                              </Label>
                              <Input
                                id={`hourly-rate-${worker.userId}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={worker.hourlyRate || ""}
                                onChange={(e) =>
                                  updateWorkerRate(
                                    worker.userId,
                                    "hourlyRate",
                                    e.target.value
                                      ? Number.parseFloat(e.target.value)
                                      : undefined
                                  )
                                }
                                placeholder="0.00"
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
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
