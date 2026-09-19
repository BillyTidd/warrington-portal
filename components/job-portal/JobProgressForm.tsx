"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Car, Clock, PoundSterling, Route } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { VehicleUsage } from "@/types/vehicle";

const MILEAGE_RATE = 0.45;

const toPositiveNumber = (value: unknown) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
};

const calculateMileageCost = (miles: number) =>
  Math.round(miles * 45) / 100;

interface JobProgressFormProps {
  isSubmitting: boolean;
  onSubmit: (progressData: Partial<any>) => Promise<void>;
  onCancel: () => void;
  isAdmin?: boolean;
  progressDescription?: string;
  setProgressDescription?: (value: string) => void;
  progressAmount?: string;
  setProgressAmount?: (value: string) => void;
  currencySymbol?: string;
  job?: any;
  currentUserId?: string;
  workerHourlyRate?: number;
}

export function JobProgressForm({
  isSubmitting,
  onSubmit,
  onCancel,
  isAdmin = false,
  progressDescription: externalProgressDescription,
  setProgressDescription: externalSetProgressDescription,
  progressAmount: externalProgressAmount,
  setProgressAmount: externalSetProgressAmount,
  currencySymbol = "£",
  job,
  currentUserId,
  workerHourlyRate,
}: JobProgressFormProps) {
  const [internalProgressDescription, setInternalProgressDescription] =
    useState("");
  const [internalProgressAmount, setInternalProgressAmount] = useState("");

  const progressDescription =
    externalProgressDescription !== undefined
      ? externalProgressDescription
      : internalProgressDescription;
  const setProgressDescription =
    externalSetProgressDescription || setInternalProgressDescription;
  const progressAmount =
    externalProgressAmount !== undefined
      ? externalProgressAmount
      : internalProgressAmount;
  const setProgressAmount =
    externalSetProgressAmount || setInternalProgressAmount;

  const [workType, setWorkType] = useState<"regular" | "extra" | "vehicle">(
    "regular"
  );
  const [costTreatment, setCostTreatment] = useState<
    "billable" | "absorbed" | undefined
  >(undefined);
  const [overtimeHours, setOvertimeHours] = useState<number | undefined>();
  const [selectedOvertimeWorkerId, setSelectedOvertimeWorkerId] = useState("");
  const [manualHourlyRate, setManualHourlyRate] = useState("");
  const [milesDriven, setMilesDriven] = useState("");
  const [vehicleUsage, setVehicleUsage] = useState<VehicleUsage | null>(null);

  const assignedWorkers = useMemo(() => {
    if (Array.isArray(job?.workers) && job.workers.length > 0) {
      return job.workers
        .filter((worker: any) => worker?.userId)
        .map((worker: any) => ({
          userId: worker.userId.toString(),
          workerName: worker.workerName || "Assigned Worker",
          hourlyRate: toPositiveNumber(worker.hourlyRate),
        }));
    }

    const legacyWorkerId = job?.userId || job?.workerId;
    if (!legacyWorkerId) return [];

    return [
      {
        userId: legacyWorkerId.toString(),
        workerName: job?.workerName || "Assigned Worker",
        hourlyRate: toPositiveNumber(job?.workerHourlyRate),
      },
    ];
  }, [job]);

  const currentWorker = currentUserId
    ? assignedWorkers.find(
        (worker: any) => worker.userId === currentUserId.toString()
      )
    : undefined;
  const selectedOvertimeWorker = isAdmin
    ? assignedWorkers.find(
        (worker: any) => worker.userId === selectedOvertimeWorkerId
      )
    : currentWorker;
  const savedHourlyRate = isAdmin
    ? toPositiveNumber(selectedOvertimeWorker?.hourlyRate)
    : toPositiveNumber(
        workerHourlyRate || currentWorker?.hourlyRate || job?.workerHourlyRate
      );
  const enteredHourlyRate = toPositiveNumber(manualHourlyRate);
  const hourlyRate = savedHourlyRate || (isAdmin ? enteredHourlyRate : 0);
  const needsManualHourlyRate =
    isAdmin &&
    workType === "extra" &&
    (assignedWorkers.length === 0 ||
      (!!selectedOvertimeWorker && savedHourlyRate === 0));

  useEffect(() => {
    setProgressAmount("");
    setOvertimeHours(undefined);
    setSelectedOvertimeWorkerId("");
    setManualHourlyRate("");
    setMilesDriven("");
    setVehicleUsage(null);
  }, [workType, setProgressAmount]);

  useEffect(() => {
    if (!isAdmin || workType !== "extra") return;

    if (assignedWorkers.length === 1 && !selectedOvertimeWorkerId) {
      setSelectedOvertimeWorkerId(assignedWorkers[0].userId);
      return;
    }

    if (
      selectedOvertimeWorkerId &&
      !assignedWorkers.some(
        (worker: any) => worker.userId === selectedOvertimeWorkerId
      )
    ) {
      setSelectedOvertimeWorkerId("");
    }
  }, [assignedWorkers, isAdmin, selectedOvertimeWorkerId, workType]);

  useEffect(() => {
    if (workType !== "extra") return;

    if (overtimeHours !== undefined && overtimeHours > 0 && hourlyRate > 0) {
      setProgressAmount((overtimeHours * hourlyRate).toFixed(2));
    } else {
      setProgressAmount("");
    }
  }, [hourlyRate, overtimeHours, setProgressAmount, workType]);

  useEffect(() => {
    if (workType !== "vehicle") return;

    const numericMiles = Number(milesDriven);
    if (!Number.isFinite(numericMiles) || numericMiles <= 0) {
      setVehicleUsage(null);
      setProgressAmount("");
      return;
    }

    const roundedMiles = Math.round(numericMiles * 100) / 100;
    const totalCost = calculateMileageCost(roundedMiles);

    setVehicleUsage({
      vehicleId: "mileage",
      vehicleName: "Mileage",
      vehicleType: "Mileage",
      pricePerMile: MILEAGE_RATE,
      fromPostcode: "",
      toPostcode: "",
      distance: roundedMiles,
      totalCost,
    });
    setProgressAmount(totalCost.toFixed(2));
  }, [milesDriven, setProgressAmount, workType]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (workType === "extra") {
      if (isAdmin && assignedWorkers.length > 0 && !selectedOvertimeWorker) {
        toast.error("Please select an assigned worker");
        return;
      }

      if (
        overtimeHours === undefined ||
        !Number.isFinite(overtimeHours) ||
        overtimeHours <= 0
      ) {
        toast.error("Please enter the number of extra hours");
        return;
      }

      if (hourlyRate <= 0) {
        toast.error(
          isAdmin
            ? "Please enter an hourly rate for this overtime"
            : "Cannot calculate extra hours cost. No hourly rate is set."
        );
        return;
      }
    }

    if (workType === "vehicle" && !vehicleUsage) {
      toast.error("Please enter a valid number of miles");
      return;
    }

    const numericAmount =
      workType === "extra" && overtimeHours
        ? Number((overtimeHours * hourlyRate).toFixed(2))
        : workType === "vehicle"
          ? vehicleUsage?.totalCost || 0
          : Number.parseFloat(progressAmount || "0");

    if (isAdmin && numericAmount > 0 && !costTreatment) {
      toast.error("Please select Billable Cost or Absorbed Cost");
      return;
    }

    let description = progressDescription.trim();
    if (!description) {
      if (workType === "extra") {
        description = selectedOvertimeWorker?.workerName
          ? `Overtime for ${selectedOvertimeWorker.workerName}: ${overtimeHours} hour(s)`
          : `Overtime: ${overtimeHours} hour(s)`;
      } else if (workType === "vehicle") {
        description = `Mileage - ${vehicleUsage?.distance} miles`;
      } else {
        description = "Expenses";
      }
    }

    await onSubmit({
      description,
      amount: Number.isFinite(numericAmount) ? numericAmount : 0,
      status: "In Progress",
      workType,
      costTreatment: isAdmin ? costTreatment : undefined,
      overtimeHours: workType === "extra" ? overtimeHours : undefined,
      overtimeWorkerId:
        workType === "extra" ? selectedOvertimeWorker?.userId : undefined,
      overtimeWorkerName:
        workType === "extra" ? selectedOvertimeWorker?.workerName : undefined,
      overtimeHourlyRate: workType === "extra" ? hourlyRate : undefined,
      vehicleUsage: workType === "vehicle" ? vehicleUsage : undefined,
    });

    if (externalProgressDescription === undefined) {
      setInternalProgressDescription("");
    }
    if (externalProgressAmount === undefined) {
      setInternalProgressAmount("");
    }

    setWorkType("regular");
    setCostTreatment(undefined);
    setOvertimeHours(undefined);
    setSelectedOvertimeWorkerId("");
    setManualHourlyRate("");
    setMilesDriven("");
    setVehicleUsage(null);
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
              onChange={(event) => setProgressDescription(event.target.value)}
              placeholder="Describe the progress made..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="workType">Work Type</Label>
            <Select
              value={workType}
              onValueChange={(value: "regular" | "extra" | "vehicle") =>
                setWorkType(value)
              }
            >
              <SelectTrigger id="workType" className="mt-1">
                <SelectValue placeholder="Select work type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Expenses</SelectItem>
                <SelectItem value="extra">Overtime</SelectItem>
                <SelectItem value="vehicle">Mileage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isAdmin && (
            <div>
              <Label htmlFor="costTreatment">Cost Treatment</Label>
              <Select
                value={costTreatment}
                onValueChange={(value: "billable" | "absorbed") =>
                  setCostTreatment(value)
                }
              >
                <SelectTrigger id="costTreatment" className="mt-1">
                  <SelectValue placeholder="Select cost treatment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="billable">
                    Billable Cost — add to client price
                  </SelectItem>
                  <SelectItem value="absorbed">
                    Absorbed Cost — reduce profit
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {workType === "extra" && (
            <div className="space-y-4 rounded-lg border p-4">
              {isAdmin &&
                (assignedWorkers.length > 0 ? (
                  <div>
                    <Label htmlFor="overtimeWorker">Assigned Worker</Label>
                    <Select
                      value={selectedOvertimeWorkerId}
                      onValueChange={(workerId) => {
                        setSelectedOvertimeWorkerId(workerId);
                        setManualHourlyRate("");
                      }}
                    >
                      <SelectTrigger id="overtimeWorker" className="mt-1">
                        <SelectValue placeholder="Select an assigned worker" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignedWorkers.map((worker: any) => (
                          <SelectItem key={worker.userId} value={worker.userId}>
                            {worker.workerName}
                            {worker.hourlyRate > 0
                              ? ` — ${currencySymbol}${worker.hourlyRate.toFixed(2)}/hour`
                              : " — hourly rate not set"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedOvertimeWorker && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Only workers assigned to this job are available.
                      </p>
                    )}
                    {selectedOvertimeWorker && savedHourlyRate > 0 && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Using {selectedOvertimeWorker.workerName}&apos;s saved
                        rate of {currencySymbol}{savedHourlyRate.toFixed(2)} per
                        hour.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    No worker has been assigned to this job. Enter the hourly
                    rate below to calculate the overtime cost.
                  </div>
                ))}

              {needsManualHourlyRate && (
                <div>
                  <Label htmlFor="manualHourlyRate">
                    {selectedOvertimeWorker
                      ? `Hourly Rate for ${selectedOvertimeWorker.workerName}`
                      : "Hourly Rate"}
                  </Label>
                  <div className="relative mt-1">
                    <PoundSterling className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="manualHourlyRate"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={manualHourlyRate}
                      onChange={(event) =>
                        setManualHourlyRate(event.target.value)
                      }
                      placeholder="Enter hourly rate"
                      className="pl-8"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="overtimeHours">Extra Hours</Label>
                <div className="relative mt-1">
                  <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="overtimeHours"
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={overtimeHours || ""}
                    onChange={(event) =>
                      setOvertimeHours(
                        event.target.value
                          ? Number.parseFloat(event.target.value)
                          : undefined
                      )
                    }
                    placeholder="Enter extra hours"
                    className="pl-8"
                  />
                </div>
                {hourlyRate === 0 && !isAdmin && (
                  <p className="mt-1 text-sm text-yellow-600">
                    No hourly rate set. Please contact admin.
                  </p>
                )}
                {hourlyRate > 0 && overtimeHours && overtimeHours > 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cost: {currencySymbol}
                    {(overtimeHours * hourlyRate).toFixed(2)} ({overtimeHours}{" "}
                    hours × {currencySymbol}{hourlyRate.toFixed(2)}/hour)
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {workType === "vehicle" && (
            <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
              <h4 className="flex items-center gap-2 font-medium">
                <Car className="h-4 w-4" />
                Mileage
              </h4>
              <div>
                <Label htmlFor="milesDriven">Miles Driven</Label>
                <div className="relative mt-1">
                  <Route className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="milesDriven"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={milesDriven}
                    onChange={(event) => setMilesDriven(event.target.value)}
                    placeholder="Enter total miles driven"
                    className="pl-8"
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fixed mileage rate: {currencySymbol}0.45 per mile
                </p>
              </div>

              {vehicleUsage && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
                  <div className="flex justify-between gap-4">
                    <span>{vehicleUsage.distance} miles × {currencySymbol}0.45</span>
                    <strong>
                      {currencySymbol}{vehicleUsage.totalCost.toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="cost">
              {workType === "extra"
                ? "Total Overtime Cost"
                : workType === "vehicle"
                  ? "Total Mileage Cost"
                  : "Total Cost"}
            </Label>
            <div className="relative mt-1">
              <PoundSterling className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={progressAmount}
                onChange={(event) => setProgressAmount(event.target.value)}
                placeholder={
                  workType === "regular"
                    ? `Enter cost in ${currencySymbol}`
                    : "Calculated automatically"
                }
                className="pl-8"
                disabled={workType === "extra" || workType === "vehicle"}
              />
            </div>
            {workType !== "regular" && (
              <p className="mt-1 text-xs text-muted-foreground">
                This cost is calculated automatically.
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
        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="min-h-11 w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full sm:w-auto"
          >
            {isSubmitting ? "Updating..." : "Update Progress"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
