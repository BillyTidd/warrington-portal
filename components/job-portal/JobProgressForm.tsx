"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clock, PoundSterling, Car, MapPin, Route } from "lucide-react";
import { toast } from "sonner";
import type { Vehicle, VehicleUsage } from "@/types/vehicle";

// Fixed company address - used as the default "from" location for vehicle usage
const COMPANY_ADDRESS =
  "Unit 7, Matts Lodge Farm, Grooms Lane, Northampton, NN6 8NN";

const toPositiveNumber = (value: unknown) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
};

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
  const router = useRouter();
  // Internal state for when external state is not provided
  const [internalProgressDescription, setInternalProgressDescription] =
    useState("");
  const [internalProgressAmount, setInternalProgressAmount] = useState("");

  // Use either external or internal state
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

  const [status, setStatus] = useState("In Progress");
  const [workType, setWorkType] = useState<"regular" | "extra" | "vehicle">(
    "regular"
  );
  const [costTreatment, setCostTreatment] = useState<
  "billable" | "absorbed" | undefined
>(undefined);
  const [overtimeHours, setOvertimeHours] = useState<number | undefined>(
    undefined
  );
  const [selectedOvertimeWorkerId, setSelectedOvertimeWorkerId] =
    useState("");
  const [manualHourlyRate, setManualHourlyRate] = useState("");

  // Vehicle-related state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [calculationMethod, setCalculationMethod] = useState<
    "miles" | "postcode"
  >("miles");
  const [manualMiles, setManualMiles] = useState<string>("");
  const [fromPostcode, setFromPostcode] = useState(""); // "from" postcode - user enters where they're starting from
  const [toPostcode, setToPostcode] = useState(""); // "to" postcode - selected from job postcodes
  const [vehicleUsage, setVehicleUsage] = useState<VehicleUsage | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  // The job's worker list is the source of truth for Admin-entered overtime.
  // Legacy single-worker jobs are also supported.
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

    if (legacyWorkerId) {
      return [
        {
          userId: legacyWorkerId.toString(),
          workerName: job?.workerName || "Assigned Worker",
          hourlyRate: toPositiveNumber(job?.workerHourlyRate),
        },
      ];
    }

    return [];
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

  // Fetch vehicles on component mount
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch("/api/vehicles");
        if (response.ok) {
          const data = await response.json();
          setVehicles(data);
        }
      } catch (error) {
        console.error("Error fetching vehicles:", error);
      }
    };

    fetchVehicles();
  }, []);

  // Reset progressAmount and related states when workType changes
  useEffect(() => {
    setProgressAmount(""); // Always reset amount when work type changes
    setOvertimeHours(undefined); // Reset overtime hours
    setSelectedOvertimeWorkerId(""); // Reset the Admin's overtime worker
    setManualHourlyRate(""); // Reset any manually entered hourly rate
    setSelectedVehicle(null); // Reset selected vehicle
    setCalculationMethod("miles"); // Reset to default calculation method
    setManualMiles(""); // Reset manual miles
    setToPostcode(""); // Reset postcode
    setVehicleUsage(null); // Reset vehicle usage details
  }, [workType, setProgressAmount]);

  // When there is only one assigned worker, preselect that worker for the
  // Admin while still showing the worker selector in the form.
  useEffect(() => {
    if (!isAdmin || workType !== "extra") {
      return;
    }

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
  }, [
    assignedWorkers,
    isAdmin,
    selectedOvertimeWorkerId,
    workType,
  ]);

  // Reset vehicle-related fields when vehicle changes
  useEffect(() => {
    setVehicleUsage(null); // Reset usage when vehicle changes
    setProgressAmount(""); // Clear amount when vehicle changes
    setManualMiles(""); // Reset manual miles
    setToPostcode(""); // Reset postcode
  }, [selectedVehicle, setProgressAmount]);

  // Reset fields when calculation method changes
  useEffect(() => {
    setVehicleUsage(null);
    setProgressAmount("");
    setManualMiles("");
    setToPostcode("");
  }, [calculationMethod, setProgressAmount]);

  // Update calculated amount whenever overtime hours change (only for 'extra' workType)
  useEffect(() => {
    if (workType === "extra" && overtimeHours !== undefined && hourlyRate > 0) {
      const cost = overtimeHours * hourlyRate;
      setProgressAmount(cost.toFixed(2));
    } else if (workType === "extra") {
      setProgressAmount("");
    }
  }, [workType, overtimeHours, hourlyRate, setProgressAmount]);

  // Calculate vehicle cost based on selected method
  const calculateVehicleCost = async () => {
    if (!selectedVehicle) {
      toast.error("Please select a vehicle");
      return;
    }

    if (calculationMethod === "miles" && !manualMiles) {
      toast.error("Please enter the number of miles");
      return;
    }

    if (calculationMethod === "postcode" && !toPostcode) {
      toast.error("Please enter the destination postcode");
      return;
    }

    setIsCalculatingDistance(true);

    try {
      let distance = 0;
      let fromLocation = "";
      let toLocation = "";

      if (calculationMethod === "miles") {
        // Use manual miles directly
        distance = Number.parseFloat(manualMiles) * 2;
        setManualMiles(distance.toString()); // Update to show round trip miles
        fromLocation = "Manual Entry";
        toLocation = "Manual Entry";
      } else {
        // Validate that both from and to postcodes are entered
        if (!fromPostcode) {
          toast.error("Please enter your starting location");
          setIsCalculatingDistance(false);
          return;
        }

        // Call the distance API for postcode calculation
        const response = await fetch("/api/distance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            calculationMethod: "postcode",
            fromPostcode: fromPostcode,
            toPostcode: toPostcode,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          distance = data.distance || 0;
          fromLocation = fromPostcode;
          toLocation = toPostcode;
        } else {
          const error = await response.json();
          toast.error(error.message || "Failed to calculate distance");
          setProgressAmount("");
          return;
        }
      }

      const vehicleCost = distance * selectedVehicle.pricePerMile;

      const usage: VehicleUsage = {
        vehicleId: selectedVehicle._id,
        vehicleName: selectedVehicle.name,
        vehicleType: selectedVehicle.type,
        pricePerMile: selectedVehicle.pricePerMile,
        fromPostcode: fromLocation,
        toPostcode: toLocation,
        distance,
        totalCost: vehicleCost,
      };

      setVehicleUsage(usage);
      setProgressAmount(vehicleCost.toFixed(2));

      toast.success(
        `Distance: ${distance} miles, Cost: £${vehicleCost.toFixed(2)}`
      );
    } catch (error) {
      console.error("Error calculating vehicle cost:", error);
      toast.error("Failed to calculate vehicle cost");
      setProgressAmount("");
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (workType === "extra") {
      if (
        isAdmin &&
        assignedWorkers.length > 0 &&
        !selectedOvertimeWorker
      ) {
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

    // If vehicle usage is selected but no vehicle or calculation is done
    if (workType === "vehicle" && (!selectedVehicle || !vehicleUsage)) {
      toast.error("Please select a vehicle and calculate the cost.");
      return;
    }

    const numericAmount =
      workType === "extra" && overtimeHours
        ? Number((overtimeHours * hourlyRate).toFixed(2))
        : Number.parseFloat(progressAmount || "0");

    if (isAdmin && numericAmount > 0 && !costTreatment) {
      toast.error("Please select Billable Cost or Absorbed Cost");
      return;
    }

    let description = progressDescription?.trim();
    if (!description) {
      if (workType === "extra") {
        description = selectedOvertimeWorker?.workerName
          ? `Overtime for ${selectedOvertimeWorker.workerName}: ${overtimeHours} hour(s)`
          : `Overtime: ${overtimeHours} hour(s)`;
      } else if (workType === "vehicle") {
        if (calculationMethod === "miles") {
          description = `Vehicle usage - ${manualMiles} miles`;
        } else {
          description = `Vehicle usage to ${toPostcode}`;
        }
      } else {
        description = "Regular work";
      }
    }

    // Prepare data to submit
    const progressData = {
      description: description,
      amount: Number.isFinite(numericAmount) ? numericAmount : 0,
      status,
      workType,
      costTreatment: isAdmin ? costTreatment : undefined,
      overtimeHours: workType === "extra" ? overtimeHours : undefined,
      overtimeWorkerId:
        workType === "extra" ? selectedOvertimeWorker?.userId : undefined,
      overtimeWorkerName:
        workType === "extra" ? selectedOvertimeWorker?.workerName : undefined,
      overtimeHourlyRate:
        workType === "extra" ? hourlyRate : undefined,
      vehicleUsage: workType === "vehicle" ? vehicleUsage : undefined,
    };

    // Call the parent's onSubmit function with the data
    await onSubmit(progressData);

    // Reset form fields if using internal state
    if (!externalProgressDescription) {
      setInternalProgressDescription("");
    }
    if (!externalProgressAmount) {
      setInternalProgressAmount("");
    }

    setWorkType("regular");
    setCostTreatment(undefined);
    setOvertimeHours(undefined);
    setSelectedOvertimeWorkerId("");
    setManualHourlyRate("");
    setStatus("In Progress");
    setSelectedVehicle(null);
    setCalculationMethod("miles");
    setManualMiles("");
    setToPostcode("");
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
              onChange={(e) => setProgressDescription(e.target.value)}
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
            <div className="space-y-4">
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
                              ? ` — ${currencySymbol}${worker.hourlyRate.toFixed(
                                  2
                                )}/hour`
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
                        rate of {currencySymbol}
                        {savedHourlyRate.toFixed(2)} per hour.
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
                      min="0"
                      step="0.01"
                      value={manualHourlyRate}
                      onChange={(event) =>
                        setManualHourlyRate(event.target.value)
                      }
                      placeholder="Enter hourly rate"
                      className="pl-8"
                    />
                  </div>
                  {selectedOvertimeWorker && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      This worker does not have an hourly rate saved on this
                      job, so a rate is required for this overtime entry.
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="overtimeHours">Extra Hours</Label>
                <div className="relative mt-1">
                  <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="overtimeHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={overtimeHours || ""}
                    onChange={(e) => {
                      const value = e.target.value
                        ? Number.parseFloat(e.target.value)
                        : undefined;
                      setOvertimeHours(value);
                    }}
                    placeholder="Enter extra hours"
                    className="pl-8"
                  />
                </div>
                {hourlyRate === 0 && !isAdmin && (
                  <p className="mt-1 text-sm text-yellow-500">
                    No hourly rate set. Please contact admin.
                  </p>
                )}
                {hourlyRate > 0 &&
                  overtimeHours !== undefined &&
                  overtimeHours > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Cost: {currencySymbol}
                      {(overtimeHours * hourlyRate).toFixed(2)} ({overtimeHours}{" "}
                      hours × {currencySymbol}
                      {hourlyRate.toFixed(2)}/hour)
                    </p>
                  )}
              </div>
            </div>
          )}

          {workType === "vehicle" && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle Usage
              </h4>

              <div>
                <Label htmlFor="vehicle">Select Vehicle</Label>
                <Select
                  value={selectedVehicle?._id || ""}
                  onValueChange={(value) => {
                    const vehicle = vehicles.find((v) => v._id === value);
                    setSelectedVehicle(vehicle || null);
                  }}
                >
                  <SelectTrigger id="vehicle" className="mt-1">
                    <SelectValue placeholder="Choose a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle._id} value={vehicle._id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{vehicle.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            £{vehicle.pricePerMile.toFixed(2)}/mile
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVehicle && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedVehicle.type} • £
                    {selectedVehicle.pricePerMile.toFixed(2)} per mile
                  </p>
                )}
              </div>

              {selectedVehicle && (
                <>
                  <div>
                    <Label>Calculation Method</Label>
                    <RadioGroup
                      value={calculationMethod}
                      onValueChange={(value: "miles" | "postcode") =>
                        setCalculationMethod(value)
                      }
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="miles" id="miles" />
                        <Label
                          htmlFor="miles"
                          className="flex items-center gap-2"
                        >
                          <Route className="h-4 w-4" />
                          Miles
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="postcode" id="postcode" />
                        <Label
                          htmlFor="postcode"
                          className="flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4" />
                          Postal Code
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {calculationMethod === "miles" && (
                    <div>
                      <Label htmlFor="manualMiles">Enter Miles</Label>
                      <div className="relative mt-1">
                        <Route className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          id="manualMiles"
                          type="number"
                          min="0"
                          step="0.1"
                          value={manualMiles}
                          onChange={(e) => setManualMiles(e.target.value)}
                          placeholder="Enter miles traveled"
                          className="pl-8"
                        />
                      </div>
                    </div>
                  )}

                  {calculationMethod === "postcode" && (
                    <>
                      <div>
                        <Label htmlFor="fromPostcode">
                          From (Starting Location)
                        </Label>
                        <div className="relative mt-1">
                          <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            id="fromPostcode"
                            value={fromPostcode}
                            onChange={(e) =>
                              setFromPostcode(e.target.value.toUpperCase())
                            }
                            placeholder="e.g., NN1 1AB (your starting location)"
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="toPostcode">To (Job Postcode)</Label>
                        {job?.jobEstimate?.postcodes &&
                        job.jobEstimate.postcodes.filter((pc: string) =>
                          pc?.trim()
                        ).length > 0 ? (
                          <Select
                            value={
                              toPostcode || job.estimatedCosts?.postCode || ""
                            }
                            onValueChange={(value) => {
                              setToPostcode(value);
                            }}
                          >
                            <SelectTrigger id="toPostcode" className="mt-1">
                              <SelectValue placeholder="Select job postcode" />
                            </SelectTrigger>
                            <SelectContent>
                              {job.jobEstimate.postcodes
                                .filter((pc: string) => pc?.trim())
                                .map((postcode: string, index: number) => (
                                  <SelectItem key={index} value={postcode}>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-3 w-3" />
                                      Stop {index + 1}: {postcode}
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="relative mt-1">
                            <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                              id="toPostcode"
                              value={job.estimatedCosts?.postCode || ""}
                              placeholder="e.g., M1 1AA"
                              className="pl-8"
                              disabled
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={calculateVehicleCost}
                    disabled={
                      (calculationMethod === "miles" && !manualMiles) ||
                      (calculationMethod === "postcode" && !toPostcode) ||
                      isCalculatingDistance
                    }
                    className="w-full bg-transparent"
                  >
                    {isCalculatingDistance
                      ? "Calculating..."
                      : "Calculate Cost"}
                  </Button>

                  {vehicleUsage && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h5 className="font-medium text-green-800 mb-2">
                        Trip Details
                      </h5>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>
                          <strong>Distance:</strong> {vehicleUsage.distance}{" "}
                          miles
                        </p>
                        <p>
                          <strong>Rate:</strong> £
                          {vehicleUsage.pricePerMile.toFixed(2)} per mile
                        </p>
                        <p>
                          <strong>Total Cost:</strong> £
                          {vehicleUsage.totalCost.toFixed(2)}
                        </p>
                        {calculationMethod === "postcode" && (
                          <p>
                            <strong>Route:</strong> {vehicleUsage.fromPostcode}{" "}
                            → {vehicleUsage.toPostcode}
                          </p>
                        )}
                        {calculationMethod === "miles" && (
                          <p>
                            <strong>Method:</strong> Manual Miles Entry
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="cost">
              {workType === "extra"
                ? "Total Overtime Cost"
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
                onChange={(e) => setProgressAmount(e.target.value)}
                placeholder={
                  workType === "extra"
                    ? "Calculated from hours and hourly rate"
                    : `Enter cost in ${currencySymbol}`
                }
                className="pl-8"
                disabled={workType === "extra" || workType === "vehicle"}
              />
            </div>
            {workType === "extra" && (
              <p className="text-xs text-muted-foreground mt-1">
                Cost is automatically calculated from extra hours and the
                hourly rate
              </p>
            )}
            {workType === "vehicle" && (
              <p className="text-xs text-muted-foreground mt-1">
                Cost is automatically calculated from vehicle usage
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
        <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? "Updating..." : "Update Progress"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
