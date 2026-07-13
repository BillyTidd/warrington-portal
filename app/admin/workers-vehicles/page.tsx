"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Trash2,
  Car,
  Truck,
  Bike,
  Users,
  Crown,
  Wrench,
  HardHat,
} from "lucide-react";
import { toast } from "sonner";
import type { Vehicle } from "@/types/vehicle";
import type { WorkerType } from "@/types/worker";
import { Layout } from "@/components/Layout";

const vehicleTypes = [
  { value: "car", label: "Car", icon: Car },
  { value: "van", label: "Van", icon: Truck },
  { value: "truck", label: "Truck", icon: Truck },
  { value: "motorcycle", label: "Motorcycle", icon: Bike },
];

const workerIcons = [
  { value: "Crown", label: "Crown (Leader)", icon: Crown },
  { value: "Wrench", label: "Wrench (Fitter)", icon: Wrench },
  { value: "HardHat", label: "Hard Hat (Labourer)", icon: HardHat },
  { value: "Users", label: "Users (General)", icon: Users },
];

export default function WorkersVehiclesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isVehicleSubmitting, setIsVehicleSubmitting] = useState(false);

  // Worker Types state
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([]);
  const [workerTypesLoading, setWorkerTypesLoading] = useState(true);
  const [isWorkerDialogOpen, setIsWorkerDialogOpen] = useState(false);
  const [editingWorkerType, setEditingWorkerType] = useState<WorkerType | null>(
    null
  );
  const [isWorkerSubmitting, setIsWorkerSubmitting] = useState(false);

  // Vehicle form state
  const [vehicleFormData, setVehicleFormData] = useState({
    name: "",
    type: "",
    pricePerMile: "",
  });

  // Worker Type form state
  const [workerFormData, setWorkerFormData] = useState({
    name: "",
    value: "",
    dayRate: "",
    overtimeRate: "",
    icon: "HardHat",
  });

  // Redirect if not admin
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch vehicles
  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles");
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      } else {
        toast.error("Failed to fetch vehicles");
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to fetch vehicles");
    } finally {
      setVehiclesLoading(false);
    }
  };

  // Fetch worker types
  const fetchWorkerTypes = async () => {
    try {
      const response = await fetch("/api/worker-types");
      if (response.ok) {
        const data = await response.json();
        setWorkerTypes(data);
      } else {
        toast.error("Failed to fetch worker types");
      }
    } catch (error) {
      console.error("Error fetching worker types:", error);
      toast.error("Failed to fetch worker types");
    } finally {
      setWorkerTypesLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user.role === "admin") {
      fetchVehicles();
      fetchWorkerTypes();
    }
  }, [session]);

  // Reset vehicle form
  const resetVehicleForm = () => {
    setVehicleFormData({
      name: "",
      type: "",
      pricePerMile: "",
    });
    setEditingVehicle(null);
  };

  // Reset worker form
  const resetWorkerForm = () => {
    setWorkerFormData({
      name: "",
      value: "",
      dayRate: "",
      overtimeRate: "",
      icon: "HardHat",
    });
    setEditingWorkerType(null);
  };

  // Handle vehicle form submission
  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVehicleSubmitting(true);

    try {
      const url = editingVehicle
        ? `/api/vehicles/${editingVehicle._id}`
        : "/api/vehicles";
      const method = editingVehicle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vehicleFormData),
      });

      if (response.ok) {
        toast.success(
          editingVehicle
            ? "Vehicle updated successfully"
            : "Vehicle created successfully"
        );
        setIsVehicleDialogOpen(false);
        resetVehicleForm();
        fetchVehicles();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save vehicle");
      }
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast.error("Failed to save vehicle");
    } finally {
      setIsVehicleSubmitting(false);
    }
  };

  // Handle worker type form submission
  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsWorkerSubmitting(true);

    try {
      const url = editingWorkerType
        ? `/api/worker-types/${editingWorkerType._id}`
        : "/api/worker-types";
      const method = editingWorkerType ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workerFormData),
      });

      if (response.ok) {
        toast.success(
          editingWorkerType
            ? "Worker type updated successfully"
            : "Worker type created successfully"
        );
        setIsWorkerDialogOpen(false);
        resetWorkerForm();
        fetchWorkerTypes();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save worker type");
      }
    } catch (error) {
      console.error("Error saving worker type:", error);
      toast.error("Failed to save worker type");
    } finally {
      setIsWorkerSubmitting(false);
    }
  };

  // Handle edit vehicle
  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleFormData({
      name: vehicle.name,
      type: vehicle.type,
      pricePerMile: vehicle.pricePerMile.toString(),
    });
    setIsVehicleDialogOpen(true);
  };

  // Handle edit worker type
  const handleEditWorkerType = (workerType: WorkerType) => {
    setEditingWorkerType(workerType);
    setWorkerFormData({
      name: workerType.name,
      value: workerType.value,
      dayRate: workerType.dayRate.toString(),
      overtimeRate: workerType.overtimeRate.toString(),
      icon: workerType.icon || "HardHat",
    });
    setIsWorkerDialogOpen(true);
  };

  // Handle delete vehicle
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Vehicle deleted successfully");
        fetchVehicles();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete vehicle");
      }
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("Failed to delete vehicle");
    }
  };

  // Handle delete worker type
  const handleDeleteWorkerType = async (workerTypeId: string) => {
    if (!confirm("Are you sure you want to delete this worker type?")) return;

    try {
      const response = await fetch(`/api/worker-types/${workerTypeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Worker type deleted successfully");
        fetchWorkerTypes();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete worker type");
      }
    } catch (error) {
      console.error("Error deleting worker type:", error);
      toast.error("Failed to delete worker type");
    }
  };

  // Get vehicle type icon
  const getVehicleIcon = (type: string) => {
    const vehicleType = vehicleTypes.find((vt) => vt.value === type);
    const IconComponent = vehicleType?.icon || Car;
    return <IconComponent className="h-4 w-4" />;
  };

  // Get worker icon
  const getWorkerIcon = (iconName: string) => {
    const workerIcon = workerIcons.find((wi) => wi.value === iconName);
    const IconComponent = workerIcon?.icon || HardHat;
    return <IconComponent className="h-4 w-4" />;
  };

  if (status === "loading" || vehiclesLoading || workerTypesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Workers & Vehicles Management</h1>
          <p className="text-muted-foreground">
            Manage worker types and vehicles with their pricing
          </p>
        </div>

        <Tabs defaultValue="workers" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="workers">
              <Users className="h-4 w-4 mr-2" />
              Worker Types
            </TabsTrigger>
            <TabsTrigger value="vehicles">
              <Car className="h-4 w-4 mr-2" />
              Vehicles
            </TabsTrigger>
          </TabsList>

          {/* Worker Types Tab */}
          <TabsContent value="workers" className="mt-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Worker Types</h2>
                <p className="text-muted-foreground">
                  Manage worker types and their rates
                </p>
              </div>
              <Dialog
                open={isWorkerDialogOpen}
                onOpenChange={setIsWorkerDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button onClick={resetWorkerForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Worker Type
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingWorkerType
                        ? "Edit Worker Type"
                        : "Add New Worker Type"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleWorkerSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="workerName">Worker Type Name</Label>
                      <Input
                        id="workerName"
                        value={workerFormData.name}
                        onChange={(e) =>
                          setWorkerFormData({
                            ...workerFormData,
                            name: e.target.value,
                          })
                        }
                        placeholder="e.g., Team Leader"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="workerValue">
                        Unique Value (lowercase with dashes)
                      </Label>
                      <Input
                        id="workerValue"
                        value={workerFormData.value}
                        onChange={(e) =>
                          setWorkerFormData({
                            ...workerFormData,
                            value: e.target.value.toLowerCase(),
                          })
                        }
                        placeholder="e.g., team-leader"
                        required
                        disabled={!!editingWorkerType}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dayRate">Day Rate (£)</Label>
                      <Input
                        id="dayRate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={workerFormData.dayRate}
                        onChange={(e) =>
                          setWorkerFormData({
                            ...workerFormData,
                            dayRate: e.target.value,
                          })
                        }
                        placeholder="e.g., 200.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="overtimeRate">
                        Overtime Rate (£/hour)
                      </Label>
                      <Input
                        id="overtimeRate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={workerFormData.overtimeRate}
                        onChange={(e) =>
                          setWorkerFormData({
                            ...workerFormData,
                            overtimeRate: e.target.value,
                          })
                        }
                        placeholder="e.g., 25.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="icon">Icon</Label>
                      <Select
                        value={workerFormData.icon}
                        onValueChange={(value) =>
                          setWorkerFormData({ ...workerFormData, icon: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                        <SelectContent>
                          {workerIcons.map((icon) => (
                            <SelectItem key={icon.value} value={icon.value}>
                              <div className="flex items-center gap-2">
                                <icon.icon className="h-4 w-4" />
                                {icon.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsWorkerDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isWorkerSubmitting}>
                        {isWorkerSubmitting
                          ? "Saving..."
                          : editingWorkerType
                          ? "Update"
                          : "Create"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Worker Types ({workerTypes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {workerTypes.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No worker types found. Add your first worker type to get
                      started.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Day Rate</TableHead>
                        <TableHead>Overtime Rate</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workerTypes.map((workerType) => (
                        <TableRow key={workerType._id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {getWorkerIcon(workerType.icon || "HardHat")}
                              {workerType.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {workerType.value}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            £{workerType.dayRate.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            £{workerType.overtimeRate.toFixed(2)}/hr
                          </TableCell>
                          <TableCell>
                            {new Date(
                              workerType.createdAt
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditWorkerType(workerType)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeleteWorkerType(workerType._id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vehicles Tab */}
          <TabsContent value="vehicles" className="mt-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Vehicles</h2>
                <p className="text-muted-foreground">
                  Manage company vehicles and their pricing
                </p>
              </div>
              <Dialog
                open={isVehicleDialogOpen}
                onOpenChange={setIsVehicleDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button onClick={resetVehicleForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleVehicleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Vehicle Name</Label>
                      <Input
                        id="name"
                        value={vehicleFormData.name}
                        onChange={(e) =>
                          setVehicleFormData({
                            ...vehicleFormData,
                            name: e.target.value,
                          })
                        }
                        placeholder="e.g., Ford Transit Van"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Vehicle Type</Label>
                      <Select
                        value={vehicleFormData.type}
                        onValueChange={(value) =>
                          setVehicleFormData({
                            ...vehicleFormData,
                            type: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="pricePerMile">Price per Mile (£)</Label>
                      <Input
                        id="pricePerMile"
                        type="number"
                        step="0.01"
                        min="0"
                        value={vehicleFormData.pricePerMile}
                        onChange={(e) =>
                          setVehicleFormData({
                            ...vehicleFormData,
                            pricePerMile: e.target.value,
                          })
                        }
                        placeholder="e.g., 0.45"
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsVehicleDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isVehicleSubmitting}>
                        {isVehicleSubmitting
                          ? "Saving..."
                          : editingVehicle
                          ? "Update"
                          : "Create"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Vehicles ({vehicles.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {vehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No vehicles found. Add your first vehicle to get started.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Price per Mile</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((vehicle) => (
                        <TableRow key={vehicle._id}>
                          <TableCell className="font-medium">
                            {vehicle.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getVehicleIcon(vehicle.type)}
                              <Badge variant="secondary" className="capitalize">
                                {vehicle.type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            £{vehicle.pricePerMile.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {new Date(vehicle.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditVehicle(vehicle)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteVehicle(vehicle._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
