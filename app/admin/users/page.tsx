"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Loader2, Edit } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Layout } from "@/components/Layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "employee" | "admin";
  isApproved: boolean;
  createdAt: string;
  phone?: string;
  whatsappNumber?: string;
}

export default function AdminUsers() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'employee' | 'customer'>('all');

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetchUsers();
    }
  }, [status, session]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error("Invalid data format:", data);
        toast.error("Invalid data format received");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (
    userId: string,
    action: "approve" | "decline"
  ) => {
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/admin/approve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action === "approve" ? "approve" : "delete"} user`);
      }

      toast.success(
        action === "approve"
          ? "User approved successfully"
          : "User deleted successfully"
      );
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(
        `Failed to ${action === "approve" ? "approve" : "delete"} user`
      );
    } finally {
      setIsDeleteDialogOpen(false);
      setEditingClient(null);
      setIsSubmitting(false);
      fetchUsers();
    }
  };

  const validateUKPhone = (value: string): string => {
    if (!value) return '';
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    if (!/^(\+44\d{10}|0\d{10})$/.test(cleaned)) {
      return 'Enter a valid UK number (e.g. 07700 900000 or +44 7700 900000)';
    }
    return '';
  };

  const normalizeUKPhone = (value: string): string => {
    if (!value) return '';
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+44')) return cleaned;
    if (cleaned.startsWith('0')) return '+44' + cleaned.slice(1);
    return cleaned;
  };

  const formatUKPhone = (value: string): string => {
    if (!value) return '—';
    const match = value.match(/^\+44(\d{4})(\d{6})$/);
    if (match) return `+44 ${match[1]} ${match[2]}`;
    return value;
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const normalizedUser = {
        ...updatedUser,
        phone: normalizeUKPhone(updatedUser.phone || ''),
        whatsappNumber: normalizeUKPhone(updatedUser.whatsappNumber || ''),
      };
      const response = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedUser),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      toast.success("User updated successfully");
      fetchUsers();
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  // if (status === "loading" || loading) {
  //   return (
  //     <div className="flex justify-center items-center h-64">
  //       <Loader2 className="h-8 w-8 animate-spin" />
  //     </div>
  //   );
  // }

  if (session?.user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600">
            You must be an admin to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Manage Users</CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg">No users found in the system.</p>
                </div>
              ) : (
                <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium shrink-0">Filter by role</Label>
                  <Select
                    value={roleFilter}
                    onValueChange={(value) =>
                      setRoleFilter(value as typeof roleFilter)
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users
                        .filter((u) => roleFilter === 'all' || u.role === roleFilter)
                        .map((user) => (
                        <TableRow key={user._id}>
                          <TableCell className="font-medium">
                            {user.name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatUKPhone(user.phone || '')}
                          </TableCell>
                          <TableCell className="capitalize">
                            {user.role}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={user.isApproved ? "approved" : "pending"}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex items-center gap-1"
                                    onClick={() => {
                                      setEditingUser(user);
                                      setPhoneError('');
                                      setWhatsappError('');
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                  <DialogHeader>
                                    <DialogTitle>Edit User</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                      <Label
                                        htmlFor="name"
                                        className="text-right"
                                      >
                                        Name
                                      </Label>
                                      <Input
                                        id="name"
                                        value={editingUser?.name}
                                        onChange={(e) =>
                                          setEditingUser((prev) => ({
                                            ...prev!,
                                            name: e.target.value,
                                          }))
                                        }
                                        className="col-span-3"
                                      />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                      <Label
                                        htmlFor="email"
                                        className="text-right"
                                      >
                                        Email
                                      </Label>
                                      <Input
                                        id="email"
                                        value={editingUser?.email}
                                        onChange={(e) =>
                                          setEditingUser((prev) => ({
                                            ...prev!,
                                            email: e.target.value,
                                          }))
                                        }
                                        className="col-span-3"
                                      />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                      <Label
                                        htmlFor="role"
                                        className="text-right"
                                      >
                                        Role
                                      </Label>
                                      <Select
                                        value={editingUser?.role}
                                        onValueChange={(value) =>
                                          setEditingUser((prev) => ({
                                            ...prev!,
                                            role: value as "employee" | "admin",
                                          }))
                                        }
                                      >
                                        <SelectTrigger className="col-span-3">
                                          <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="customer">
                                            Customer
                                          </SelectItem>
                                          <SelectItem value="employee">
                                            Employee
                                          </SelectItem>
                                          <SelectItem value="admin">
                                            Admin
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                      <Label
                                        htmlFor="isApproved"
                                        className="text-right"
                                      >
                                        Status
                                      </Label>
                                      <Select
                                        value={
                                          editingUser?.isApproved
                                            ? "approved"
                                            : "pending"
                                        }
                                        onValueChange={(value) =>
                                          setEditingUser((prev) => ({
                                            ...prev!,
                                            isApproved: value === "approved",
                                          }))
                                        }
                                      >
                                        <SelectTrigger className="col-span-3">
                                          <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="approved">
                                            Approved
                                          </SelectItem>
                                          <SelectItem value="pending">
                                            Pending
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
                                      <Label
                                        htmlFor="phone"
                                        className="text-right pt-2"
                                      >
                                        Phone
                                      </Label>
                                      <div className="col-span-3 space-y-1">
                                        <Input
                                          id="phone"
                                          value={editingUser?.phone || ""}
                                          onChange={(e) => {
                                            setEditingUser((prev) => ({
                                              ...prev!,
                                              phone: e.target.value,
                                            }));
                                            setPhoneError(validateUKPhone(e.target.value));
                                          }}
                                          className={phoneError ? "border-red-500 focus-visible:ring-red-500" : ""}
                                          placeholder="+44 7700 900000"
                                        />
                                        {phoneError && (
                                          <p className="text-xs text-red-500">{phoneError}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
                                      <Label
                                        htmlFor="whatsappNumber"
                                        className="text-right pt-2"
                                      >
                                        WhatsApp
                                      </Label>
                                      <div className="col-span-3 space-y-1">
                                        <Input
                                          id="whatsappNumber"
                                          value={editingUser?.whatsappNumber || ""}
                                          onChange={(e) => {
                                            setEditingUser((prev) => ({
                                              ...prev!,
                                              whatsappNumber: e.target.value,
                                            }));
                                            setWhatsappError(validateUKPhone(e.target.value));
                                          }}
                                          className={whatsappError ? "border-red-500 focus-visible:ring-red-500" : ""}
                                          placeholder="+44 7700 900000"
                                        />
                                        {whatsappError ? (
                                          <p className="text-xs text-red-500">{whatsappError}</p>
                                        ) : (
                                          <p className="text-xs text-muted-foreground">
                                            Leave blank if same as phone number
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex justify-end">
                                    <Button
                                      onClick={() => {
                                        const phoneErr = validateUKPhone(editingUser?.phone || '');
                                        const whatsappErr = validateUKPhone(editingUser?.whatsappNumber || '');
                                        setPhoneError(phoneErr);
                                        setWhatsappError(whatsappErr);
                                        if (phoneErr || whatsappErr) return;
                                        handleUpdateUser(editingUser!);
                                      }}
                                    >
                                      Save changes
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex items-center gap-1"
                                // onClick={() =>
                                //   handleUserAction(user._id, "decline")
                                // }
                                onClick={() => {
                                  setEditingClient(user);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <X className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Dialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete the client "
                          {editingClient?.name}
                          "? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsDeleteDialogOpen(false)}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            handleUserAction(editingClient._id, "decline")
                          }
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}{" "}
      </div>
    </Layout>
  );
}
