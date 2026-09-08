"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Pencil,
  UserCheck,
  UserPlus,
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

export default function CustomerManagersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [managers, setManagers] = useState<
    CustomerSiteManager[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [changingStatusId, setChangingStatusId] =
    useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] =
    useState(false);

  const [editingManager, setEditingManager] =
    useState<CustomerSiteManager | null>(null);

  const [formData, setFormData] =
    useState<ManagerFormData>(emptyForm);

  const loadManagers = useCallback(async () => {
    if (!session?.user?.id) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/v1/customers/${session.user.id}/managers?includeInactive=true`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load managers"
        );
      }

      setManagers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unable to load managers:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load managers"
      );
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?type=customer");
      return;
    }

    if (
      status === "authenticated" &&
      session.user.role !== "customer"
    ) {
      router.replace("/job-portal");
      return;
    }

    if (
      status === "authenticated" &&
      session.user.role === "customer"
    ) {
      loadManagers();
    }
  }, [
    status,
    session?.user?.role,
    router,
    loadManagers,
  ]);

  const openCreateDialog = () => {
    setEditingManager(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (
    manager: CustomerSiteManager
  ) => {
    setEditingManager(manager);

    setFormData({
      firstName: manager.firstName,
      lastName: manager.lastName,
      email: manager.email || "",
      phone: manager.phone || "",
    });

    setIsDialogOpen(true);
  };

  const handleSaveManager = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim()
    ) {
      toast.error(
        "First name and last name are required"
      );
      return;
    }

    if (!session?.user?.id) {
      toast.error("Your session has expired");
      return;
    }

    setIsSaving(true);

    try {
      const baseUrl =
        `/api/v1/customers/${session.user.id}/managers`;

      const url = editingManager
        ? `${baseUrl}/${editingManager._id}`
        : baseUrl;

      const response = await fetch(url, {
        method: editingManager ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to save manager"
        );
      }

      toast.success(
        editingManager
          ? "Manager updated successfully"
          : "Manager created successfully"
      );

      setIsDialogOpen(false);
      setEditingManager(null);
      setFormData(emptyForm);

      await loadManagers();
    } catch (error) {
      console.error("Unable to save manager:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save manager"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const changeManagerStatus = async (
    manager: CustomerSiteManager
  ) => {
    if (!session?.user?.id) {
      return;
    }

    const newStatus =
      manager.status === "active"
        ? "inactive"
        : "active";

    setChangingStatusId(manager._id);

    try {
      const response = await fetch(
        `/api/v1/customers/${session.user.id}/managers/${manager._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update manager status"
        );
      }

      toast.success(
        newStatus === "active"
          ? "Manager reactivated successfully"
          : "Manager deactivated successfully"
      );

      await loadManagers();
    } catch (error) {
      console.error(
        "Unable to change manager status:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to change manager status"
      );
    } finally {
      setChangingStatusId(null);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (
    status !== "authenticated" ||
    session?.user?.role !== "customer"
  ) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto space-y-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Managers
            </h1>

            <p className="text-muted-foreground">
              Create and manage the contacts available
              in your job estimation form.
            </p>
          </div>

          <Button onClick={openCreateDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Manager
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Site Managers</CardTitle>

            <CardDescription>
              Active managers appear in the New Estimate
              manager dropdown. Inactive managers remain
              linked to historical estimates and jobs.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {managers.length === 0 ? (
              <div className="py-12 text-center">
                <UserPlus className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

                <p className="font-medium">
                  No managers have been created
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first manager to make them
                  available in the estimate form.
                </p>

                <Button
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
                      <TableHead className="text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {managers.map((manager) => (
                      <TableRow key={manager._id}>
                        <TableCell className="font-medium">
                          {manager.firstName}
                        </TableCell>

                        <TableCell>
                          {manager.lastName}
                        </TableCell>

                        <TableCell>
                          {manager.email || "—"}
                        </TableCell>

                        <TableCell>
                          {manager.phone || "—"}
                        </TableCell>

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
                              onClick={() =>
                                openEditDialog(manager)
                              }
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
                              disabled={
                                changingStatusId ===
                                manager._id
                              }
                              onClick={() =>
                                changeManagerStatus(manager)
                              }
                            >
                              {changingStatusId ===
                              manager._id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : manager.status ===
                                "active" ? (
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
                {editingManager
                  ? "Edit Manager"
                  : "Add Manager"}
              </DialogTitle>

              <DialogDescription>
                First name and last name are required.
                Email and phone are optional.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveManager}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="manager-first-name">
                    First Name *
                  </Label>

                  <Input
                    id="manager-first-name"
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
                  <Label htmlFor="manager-last-name">
                    Last Name *
                  </Label>

                  <Input
                    id="manager-last-name"
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
                  <Label htmlFor="manager-email">
                    Email
                  </Label>

                  <Input
                    id="manager-email"
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
                  <Label htmlFor="manager-phone">
                    Phone
                  </Label>

                  <Input
                    id="manager-phone"
                    type="tel"
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
                  onClick={() =>
                    setIsDialogOpen(false)
                  }
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {editingManager
                    ? "Save Changes"
                    : "Create Manager"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}