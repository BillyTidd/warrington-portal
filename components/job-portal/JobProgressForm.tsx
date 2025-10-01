"use client";

import type React from "react";

import { useState, useEffect } from "react";
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

interface JobProgressFormProps {
  isSubmitting: boolean;
  onSubmit: (progressData: Partial<any>) => Promise<void>;
  onCancel: () => void;
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
  const [overtimeHours, setOvertimeHours] = useState<number | undefined>(
    undefined
  );

  // Vehicle-related state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [calculationMethod, setCalculationMethod] = useState<
    "miles" | "postcode"
  >("miles");
  const [manualMiles, setManualMiles] = useState<string>("");
  const [toPostcode, setToPostcode] = useState(""); // Only "to" postcode from user
  const [vehicleUsage, setVehicleUsage] = useState<VehicleUsage | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  // Determine hourly rate - use prop if provided, otherwise try to get from job data
  let hourlyRate = workerHourlyRate || 0;

  if (!hourlyRate && job && currentUserId) {
    const currentWorker = job.workers?.find(
      (worker: any) => worker.userId === currentUserId
    );
    hourlyRate = currentWorker?.hourlyRate || 0;
  }

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
    setSelectedVehicle(null); // Reset selected vehicle
    setCalculationMethod("miles"); // Reset to default calculation method
    setManualMiles(""); // Reset manual miles
    setToPostcode(""); // Reset postcode
    setVehicleUsage(null); // Reset vehicle usage details
  }, [workType, setProgressAmount]);

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
    } else if (workType === "extra" && overtimeHours === undefined) {
      setProgressAmount(""); // Clear amount if hours are cleared
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
        // Call the distance API for postcode calculation
        const response = await fetch("/api/distance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            calculationMethod: "postcode",
            fromPostcode: toPostcode,
            toPostcode: job.estimatedCosts.postCode,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          distance = data.distance || 0;
          fromLocation = job.estimatedCosts.postCode;
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

    // If extra hours are selected but no hourly rate is set
    if (workType === "extra" && !hourlyRate) {
      toast.error("Cannot calculate extra hours cost. No hourly rate is set.");
      return;
    }

    // If extra hours are selected but no hours are entered
    if (workType === "extra" && !overtimeHours) {
      toast.error("Please enter the number of extra hours");
      return;
    }

    // If vehicle usage is selected but no vehicle or calculation is done
    if (workType === "vehicle" && (!selectedVehicle || !vehicleUsage)) {
      toast.error("Please select a vehicle and calculate the cost.");
      return;
    }

    let description = progressDescription?.trim();
    if (!description) {
      if (workType === "extra") {
        description = `Extra work of ${overtimeHours} hour(s)`;
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
      amount: progressAmount ? Number.parseFloat(progressAmount) : 0,
      status,
      workType,
      overtimeHours: workType === "extra" ? overtimeHours : undefined,
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
    setOvertimeHours(undefined);
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

          {workType === "extra" && (
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
              {hourlyRate === 0 && (
                <p className="text-sm text-yellow-500 mt-1">
                  No hourly rate set. Please contact admin.
                </p>
              )}
              {hourlyRate > 0 && overtimeHours !== undefined && (
                <p className="text-sm text-muted-foreground mt-1">
                  Cost: {currencySymbol}
                  {(overtimeHours * hourlyRate).toFixed(2)} ({overtimeHours}{" "}
                  hours × {currencySymbol}
                  {hourlyRate.toFixed(2)}/hour)
                </p>
              )}
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
                          From (Job Location)
                        </Label>
                        <div className="relative mt-1">
                          <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            id="fromPostcode"
                            value={toPostcode}
                            onChange={(e) =>
                              setToPostcode(e.target.value.toUpperCase())
                            }
                            placeholder="e.g., M1 1AA"
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="toPostcode">To (Destination)</Label>
                        <div className="relative mt-1">
                          <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            id="toPostcode"
                            value={job.estimatedCosts?.postCode}
                            placeholder="e.g., M1 1AA"
                            className="pl-8"
                            disabled
                          />
                        </div>
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
            <Label htmlFor="cost">Total Cost</Label>
            <div className="relative mt-1">
              <PoundSterling className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={progressAmount}
                onChange={(e) => setProgressAmount(e.target.value)}
                placeholder={`Enter cost in ${currencySymbol}`}
                className="pl-8"
                disabled={
                  (workType === "extra" && hourlyRate > 0) ||
                  workType === "vehicle"
                }
              />
            </div>
            {workType === "extra" && hourlyRate > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Cost is automatically calculated from extra hours
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
        <CardFooter className="flex justify-between space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Updating..." : "Update Progress"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
