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
import { Plus, Edit, Trash2, Car, Truck, Bike } from "lucide-react";
import { toast } from "sonner";
import type { Vehicle } from "@/types/vehicle";
import { Layout } from "@/components/Layout";

const vehicleTypes = [
  { value: "car", label: "Car", icon: Car },
  { value: "van", label: "Van", icon: Truck },
  { value: "truck", label: "Truck", icon: Truck },
  { value: "motorcycle", label: "Motorcycle", icon: Bike },
];

export default function VehiclesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    pricePerMile: "",
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user.role === "admin") {
      fetchVehicles();
    }
  }, [session]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      pricePerMile: "",
    });
    setEditingVehicle(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingVehicle
            ? "Vehicle updated successfully"
            : "Vehicle created successfully"
        );
        setIsDialogOpen(false);
        resetForm();
        fetchVehicles();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save vehicle");
      }
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast.error("Failed to save vehicle");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      type: vehicle.type,
      pricePerMile: vehicle.pricePerMile.toString(),
    });
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (vehicleId: string) => {
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

  // Get vehicle type icon
  const getVehicleIcon = (type: string) => {
    const vehicleType = vehicleTypes.find((vt) => vt.value === type);
    const IconComponent = vehicleType?.icon || Car;
    return <IconComponent className="h-4 w-4" />;
  };

  if (status === "loading" || loading) {
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Vehicle Management</h1>
            <p className="text-muted-foreground">
              Manage company vehicles and their pricing
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Vehicle Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Ford Transit Van"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Vehicle Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
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
                    value={formData.pricePerMile}
                    onChange={(e) =>
                      setFormData({ ...formData, pricePerMile: e.target.value })
                    }
                    placeholder="e.g., 0.45"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
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
                      <TableCell>£{vehicle.pricePerMile.toFixed(2)}</TableCell>
                      <TableCell>
                        {new Date(vehicle.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(vehicle)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(vehicle._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
