"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  BadgePoundSterling,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Layout } from "@/components/Layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CustomerWorkerType } from "@/types/customer-worker-type";

interface CustomerAccount {
  customerAccountId: string;
  displayName: string;
  email: string;
}

interface WorkerTypeForm {
  name: string;
  value: string;
  dayRate: string;
  overtimeRate: string;
}

const emptyForm: WorkerTypeForm = {
  name: "",
  value: "",
  dayRate: "",
  overtimeRate: "",
};

export default function AdminCustomerWorkerTypesPage({
  params,
}: {
  params: { customerAccountId: string };
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [customer, setCustomer] = useState<CustomerAccount | null>(null);
  const [workerTypes, setWorkerTypes] = useState<
    CustomerWorkerType[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkerType, setEditingWorkerType] =
    useState<CustomerWorkerType | null>(null);
  const [deletingWorkerType, setDeletingWorkerType] =
    useState<CustomerWorkerType | null>(null);
  const [form, setForm] = useState<WorkerTypeForm>(emptyForm);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (
      status === "authenticated" &&
      session.user.role !== "admin"
    ) {
      router.replace("/job-portal");
    }
  }, [router, session?.user?.role, status]);

  const loadData = useCallback(async () => {
    if (session?.user?.role !== "admin") return;

    setIsLoading(true);

    try {
      const [workerTypesResponse, customersResponse] = await Promise.all([
        fetch(
          `/api/v1/customers/${params.customerAccountId}/worker-types`,
          { cache: "no-store" }
        ),
        fetch("/api/v1/admin/customer-accounts", {
          cache: "no-store",
        }),
      ]);

      const workerTypesData = await workerTypesResponse.json();
      const customersData = await customersResponse.json();

      if (!workerTypesResponse.ok) {
        throw new Error(
          workerTypesData.message || "Unable to load worker types"
        );
      }

      if (!customersResponse.ok) {
        throw new Error(
          customersData.message || "Unable to load customer account"
        );
      }

      setWorkerTypes(
        Array.isArray(workerTypesData) ? workerTypesData : []
      );
      setCustomer(
        (customersData.customers || []).find(
          (item: CustomerAccount) =>
            item.customerAccountId === params.customerAccountId
        ) || null
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load worker types"
      );
    } finally {
      setIsLoading(false);
    }
  }, [params.customerAccountId, session?.user?.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditingWorkerType(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (workerType: CustomerWorkerType) => {
    setEditingWorkerType(workerType);
    setForm({
      name: workerType.name,
      value: workerType.value,
      dayRate: String(workerType.dayRate),
      overtimeRate: String(workerType.overtimeRate),
    });
    setIsDialogOpen(true);
  };

  const saveWorkerType = async (event: React.FormEvent) => {
    event.preventDefault();

    const dayRate = Number(form.dayRate);
    const overtimeRate = Number(form.overtimeRate);

    if (
      !form.name.trim() ||
      (!editingWorkerType && !form.value.trim()) ||
      !Number.isFinite(dayRate) ||
      !Number.isFinite(overtimeRate) ||
      dayRate < 0 ||
      overtimeRate < 0
    ) {
      toast.error("Enter a name and valid non-negative rates");
      return;
    }

    setIsSaving(true);

    try {
      const url = editingWorkerType
        ? `/api/v1/customers/${params.customerAccountId}/worker-types/${editingWorkerType._id}`
        : `/api/v1/customers/${params.customerAccountId}/worker-types`;
      const response = await fetch(url, {
        method: editingWorkerType ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          value: form.value.trim(),
          dayRate,
          overtimeRate,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save worker type");
      }

      toast.success(
        editingWorkerType
          ? "Worker type updated"
          : "Worker type added"
      );
      setIsDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save worker type"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWorkerType = async () => {
    if (!deletingWorkerType) return;

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/v1/customers/${params.customerAccountId}/worker-types/${deletingWorkerType._id}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to remove worker type");
      }

      toast.success("Worker type removed");
      setDeletingWorkerType(null);
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to remove worker type"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <Layout>
      <div className="container mx-auto space-y-6 py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Button
              variant="ghost"
              className="-ml-4 mb-2"
              onClick={() => router.push("/clients")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Button>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <BadgePoundSterling className="h-7 w-7 text-amber-600" />
              Worker Types &amp; Rates
            </h1>
            <p className="mt-1 text-muted-foreground">
              {customer
                ? `${customer.displayName} — ${customer.email}`
                : "Customer-specific rates"}
            </p>
          </div>

          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Worker Type
          </Button>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Available Worker Types</CardTitle>
            <CardDescription>
              Changes on this page affect only this customer account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Day Rate</TableHead>
                    <TableHead className="text-right">
                      Overtime Rate
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workerTypes.length > 0 ? (
                    workerTypes.map((workerType) => (
                      <TableRow key={workerType._id}>
                        <TableCell>
                          <p className="font-medium">{workerType.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {workerType.value}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {workerType.source_worker_type_id
                              ? "Default"
                              : "Custom"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          £{Number(workerType.dayRate).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          £{Number(workerType.overtimeRate).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit worker type"
                              onClick={() => openEditDialog(workerType)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Remove worker type"
                              className="hover:text-red-600"
                              onClick={() =>
                                setDeletingWorkerType(workerType)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        No worker types are available for this customer.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingWorkerType ? "Edit Worker Type" : "Add Worker Type"}
              </DialogTitle>
              <DialogDescription>
                This rate applies only to {customer?.displayName || "this customer"}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={saveWorkerType} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workerTypeName">Name</Label>
                <Input
                  id="workerTypeName"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Installer"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workerTypeValue">Code</Label>
                <Input
                  id="workerTypeValue"
                  value={form.value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                  placeholder="installer"
                  disabled={Boolean(editingWorkerType)}
                  required={!editingWorkerType}
                />
                <p className="text-xs text-muted-foreground">
                  The code is created once and cannot be changed later.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workerTypeDayRate">Day Rate (£)</Label>
                  <Input
                    id="workerTypeDayRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.dayRate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        dayRate: event.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workerTypeOvertimeRate">
                    Overtime Rate (£)
                  </Label>
                  <Input
                    id="workerTypeOvertimeRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.overtimeRate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        overtimeRate: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingWorkerType ? "Save Changes" : "Add Worker Type"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={Boolean(deletingWorkerType)}
          onOpenChange={(open) => {
            if (!open) setDeletingWorkerType(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove worker type?</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingWorkerType?.name} will no longer be available to this
                customer. Other customers are not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  deleteWorkerType();
                }}
                disabled={isSaving}
              >
                {isSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
