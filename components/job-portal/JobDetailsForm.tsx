"use client";

import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerAccountOption } from "@/types/customer-account";
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
import type { CustomerSiteManager } from "@/types/customer-site-manager";
import { useEffect, useState } from "react";

interface JobDetailsFormProps {
  editedJob: Partial<Job>;
  setEditedJob: (job: Partial<Job>) => void;
  isAdmin: boolean;
  workers: any[];
  clients: CustomerAccountOption[];
  confirmations?: any[];
}

export function JobDetailsForm({
  editedJob,
  setEditedJob,
  isAdmin,
  workers,
  clients,
  confirmations = [],
}: JobDetailsFormProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [customerManagers, setCustomerManagers] = useState<
    CustomerSiteManager[]
  >([]);
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);

  useEffect(() => {
    const loadManagers = async () => {
      if (!isAdmin || !editedJob.customer_account_id) {
        setCustomerManagers([]);
        return;
      }

      setIsLoadingManagers(true);

      try {
        const response = await fetch(
          `/api/v1/customers/${editedJob.customer_account_id}/managers`,
          { cache: "no-store" }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load customer managers"
          );
        }

        setCustomerManagers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Unable to load customer managers:", error);
        setCustomerManagers([]);
      } finally {
        setIsLoadingManagers(false);
      }
    };

    loadManagers();
  }, [editedJob.customer_account_id, isAdmin]);

  useEffect(() => {
    if (editedJob.workers) {
      return;
    }

    if (editedJob.userId) {
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
      return;
    }

    setEditedJob({
      ...editedJob,
      workers: [],
    });
  }, [editedJob, setEditedJob]);

  const handleCustomerChange = (
  customerAccountId: string
) => {
  const selectedCustomer = clients.find(
    (customer) =>
      customer.customerAccountId === customerAccountId
  );

  if (!selectedCustomer) {
    return;
  }

  setEditedJob({
    ...editedJob,
    customer_account_id:
      selectedCustomer.customerAccountId,
    clientId: selectedCustomer.clientId || undefined,
    clientName: selectedCustomer.displayName,
    clientEmail: selectedCustomer.email,
    clientPhone: selectedCustomer.phone || null,
    clientCompany: selectedCustomer.company || null,
    managerId: null,
    managerName: null,
    managerEmail: null,
    managerPhone: null,
  });
};

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

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40">
        <CardTitle>Edit Job Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div>
  <Label htmlFor="customerAccount">
    Customer Account
  </Label>

  {isAdmin ? (
    <Select
      value={editedJob.customer_account_id || ""}
      onValueChange={handleCustomerChange}
    >
      <SelectTrigger
        id="customerAccount"
        className="mt-1"
      >
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
  ) : (
    <Input
      id="customerAccount"
      value={editedJob.clientName || ""}
      disabled
      className="mt-1"
    />
  )}
</div>

        {isAdmin && editedJob.customer_account_id && (
          <div>
            <Label htmlFor="editCustomerManager">Customer Manager</Label>
            <Select
              value={editedJob.managerId || "none"}
              onValueChange={(managerId) => {
                if (managerId === "none") {
                  setEditedJob({
                    ...editedJob,
                    managerId: null,
                    managerName: null,
                    managerEmail: null,
                    managerPhone: null,
                  });
                  return;
                }

                const selectedManager = customerManagers.find(
                  (manager) => manager._id === managerId
                );

                if (!selectedManager) return;

                setEditedJob({
                  ...editedJob,
                  managerId: selectedManager._id,
                  managerName: selectedManager.fullName,
                  managerEmail: selectedManager.email || null,
                  managerPhone: selectedManager.phone || null,
                });
              }}
              disabled={isLoadingManagers}
            >
              <SelectTrigger id="editCustomerManager" className="mt-1">
                <SelectValue
                  placeholder={
                    isLoadingManagers
                      ? "Loading managers..."
                      : "Select a manager"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager</SelectItem>
                {customerManagers.map((manager) => (
                  <SelectItem key={manager._id} value={manager._id}>
                    {manager.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {customerManagers.length === 0 && !isLoadingManagers && (
              <p className="mt-1 text-sm text-muted-foreground">
                This customer has no active managers.
              </p>
            )}
          </div>
        )}

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
                <Label htmlFor="addWorker">Add Worker</Label>
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
            onChange={(event) => {
              const selectedDate = event.target.value;
              setEditedJob({
                ...editedJob,
                assignDate: selectedDate,
                expireDate: selectedDate,
              });
            }}
            required
            className="mt-1"
          />
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
