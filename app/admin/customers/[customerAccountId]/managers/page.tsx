"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  UserCheck,
  UserPlus,
  UsersRound,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Layout } from "@/components/Layout";
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
import type { CustomerSiteManager } from "@/types/customer-site-manager";

interface CustomerAccount {
  customerAccountId: string;
  displayName: string;
  email: string;
  contactName?: string;
  phone?: string;
  company?: string;
}

interface ManagerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const emptyForm: ManagerFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

export default function AdminCustomerManagersPage({
  params,
}: {
  params: {
    customerAccountId: string;
  };
}) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [customer, setCustomer] = useState<CustomerAccount | null>(null);

  const [managers, setManagers] = useState<CustomerSiteManager[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [editingManager, setEditingManager] =
    useState<CustomerSiteManager | null>(null);

  const [formData, setFormData] = useState<ManagerFormData>(emptyForm);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && session.user.role !== "admin") {
      router.replace("/job-portal");
    }
  }, [router, session?.user?.role, status]);

  const loadData = useCallback(async () => {
    if (session?.user?.role !== "admin") {
      return;
    }

    setIsLoading(true);

    try {
      const [managersResponse, customersResponse] = await Promise.all([
        fetch(
          `/api/v1/customers/${params.customerAccountId}/managers?includeInactive=true`,
          {
            cache: "no-store",
          },
        ),
        fetch("/api/v1/admin/customer-accounts", {
          cache: "no-store",
        }),
      ]);

      const managersData = await managersResponse.json();
      const customersData = await customersResponse.json();

      if (!managersResponse.ok) {
        throw new Error(managersData.message || "Unable to load managers");
      }

      if (!customersResponse.ok) {
        throw new Error(
          customersData.message || "Unable to load the customer account",
        );
      }

      setManagers(Array.isArray(managersData) ? managersData : []);

      setCustomer(
        (customersData.customers || []).find(
          (item: CustomerAccount) =>
            item.customerAccountId === params.customerAccountId,
        ) || null,
      );
    } catch (error) {
      console.error("Unable to load customer managers:", error);

      toast.error(
        error instanceof Error ? error.message : "Unable to load managers",
      );
    } finally {
      setIsLoading(false);
    }
  }, [params.customerAccountId, session?.user?.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditingManager(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (manager: CustomerSiteManager) => {
    setEditingManager(manager);

    setFormData({
      firstName: manager.firstName,
      lastName: manager.lastName,
      email: manager.email || "",
      phone: manager.phone || "",
    });

    setIsDialogOpen(true);
  };

  const saveManager = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    setIsSaving(true);

    try {
      const baseUrl = `/api/v1/customers/${params.customerAccountId}/managers`;

      const url = editingManager ? `${baseUrl}/${editingManager._id}` : baseUrl;

      const response = await fetch(url, {
        method: editingManager ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save manager");
      }

      toast.success(
        editingManager
          ? "Manager updated successfully"
          : "Manager added successfully",
      );

      setIsDialogOpen(false);
      setEditingManager(null);
      setFormData(emptyForm);

      await loadData();
    } catch (error) {
      console.error("Unable to save manager:", error);

      toast.error(
        error instanceof Error ? error.message : "Unable to save manager",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const changeManagerStatus = async (manager: CustomerSiteManager) => {
    const newStatus = manager.status === "active" ? "inactive" : "active";

    setChangingStatusId(manager._id);

    try {
      const response = await fetch(
        `/api/v1/customers/${params.customerAccountId}/managers/${manager._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update manager status");
      }

      toast.success(
        newStatus === "active"
          ? "Manager reactivated successfully"
          : "Manager deactivated successfully",
      );

      await loadData();
    } catch (error) {
      console.error("Unable to change manager status:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update manager status",
      );
    } finally {
      setChangingStatusId(null);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (session?.user?.role !== "admin") {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto space-y-6 py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Button
              type="button"
              variant="ghost"
              className="-ml-4 mb-2"
              onClick={() => router.push("/clients")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Button>

            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <UsersRound className="h-7 w-7 text-primary" />
              Client Managers
            </h1>

            <p className="mt-1 text-muted-foreground">
              {customer
                ? `${customer.displayName} — ${customer.email}`
                : "Managers linked to this customer account"}
            </p>
          </div>

          <Button type="button" onClick={openCreateDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Manager
          </Button>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Site Managers</CardTitle>

            <CardDescription>
              Active managers immediately appear in this customer&apos;s
              estimate form and in the Admin job manager dropdown. Inactive
              managers stay attached to historical estimates and jobs.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {managers.length === 0 ? (
              <div className="py-12 text-center">
                <UserPlus className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

                <p className="font-medium">No managers have been created</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Add the first manager for this client.
                </p>

                <Button
                  type="button"
                  className="mt-4"
                  onClick={openCreateDialog}
                >
                  Add Manager
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {managers.map((manager) => (
                      <TableRow key={manager._id}>
                        <TableCell className="font-medium">
                          {manager.firstName}
                        </TableCell>

                        <TableCell>{manager.lastName}</TableCell>

                        <TableCell>{manager.email || "—"}</TableCell>

                        <TableCell>{manager.phone || "—"}</TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              manager.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {manager.status === "active"
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(manager)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant={
                                manager.status === "active"
                                  ? "destructive"
                                  : "outline"
                              }
                              disabled={changingStatusId === manager._id}
                              onClick={() => changeManagerStatus(manager)}
                            >
                              {changingStatusId === manager._id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : manager.status === "active" ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}

                              {manager.status === "active"
                                ? "Deactivate"
                                : "Reactivate"}
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

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);

            if (!open) {
              setEditingManager(null);
              setFormData(emptyForm);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingManager ? "Edit Manager" : "Add Manager"}
              </DialogTitle>

              <DialogDescription>
                This manager will be linked only to
                {customer?.displayName
                  ? ` ${customer.displayName}`
                  : " this customer account"}
                . First and last names are required.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={saveManager}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-manager-first-name">First Name *</Label>

                  <Input
                    id="admin-manager-first-name"
                    value={formData.firstName}
                    maxLength={100}
                    required
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-manager-last-name">Last Name *</Label>

                  <Input
                    id="admin-manager-last-name"
                    value={formData.lastName}
                    maxLength={100}
                    required
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-manager-email">Email</Label>

                  <Input
                    id="admin-manager-email"
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-manager-phone">Phone</Label>

                  <Input
                    id="admin-manager-phone"
                    type="tel"
                    maxLength={50}
                    value={formData.phone}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isSaving}>
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {editingManager ? "Save Changes" : "Add Manager"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
