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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, MoreHorizontal, Pen, Trash } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface ClientManager {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  status: "active" | "inactive";
}

interface Client {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  customerAccountId?: string | null;
  customerLogin?: string | null;
  managers?: ClientManager[];
}

export default function ClientsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [clientData, setClientData] = useState<Partial<Client>>({
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (
      status === "authenticated" &&
      session?.user?.role === "admin"
    ) {
      fetchClients();
      return;
    }

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    router.replace("/dashboard");
  }, [status, session?.user?.role, router]);

  useEffect(() => {
    if (editingClient) {
      setClientData({
        name: editingClient.name,
        description: editingClient.description,
      });
    } else {
      setClientData({
        name: "",
        description: "",
      });
    }
  }, [editingClient]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/clients");
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
    // try {
    //   const response = await fetch("/api/clients");
    //   if (response.ok) {
    //     const data = await response.json();
    //     setClients(data);
    //   } else {
    //     toast.error("Failed to fetch clients");
    //   }
    // } catch (error) {
    //   console.error("Error fetching clients:", error);
    //   toast.error("An error occurred while fetching clients");
    // } finally {
    //   setIsLoading(false);
    // }
  };

  const handleCreateOrUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const url = editingClient
      ? `/api/clients/${editingClient._id}`
      : "/api/clients";
    const method = editingClient ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });

      if (response.ok) {
        const updatedClient = await response.json();
        setClients((prevClients) => {
          if (editingClient) {
            return prevClients.map((client) =>
              client._id === updatedClient._id ? updatedClient : client
            );
          } else {
            return [...prevClients, updatedClient];
          }
        });
        setIsDialogOpen(false);
        setEditingClient(null);
        fetchClients();
        toast.success(
          editingClient
            ? "Client updated successfully"
            : "Client created successfully"
        );
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to save client");
      }
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("An error occurred while saving the client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/clients/${deletingClient._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setClients((prevClients) =>
          prevClients.filter((client) => client._id !== deletingClient._id)
        );
        toast.success("Client deleted successfully");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete client");
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("An error occurred while deleting the client");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingClient(null);
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h1 className="text-3xl font-bold">Clients</h1>
          <Button
            onClick={() => {
              setEditingClient(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Client
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Customer Login</TableHead>
                  <TableHead>Managers</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client._id}>
                    
                    



                    <TableCell>{client.name}</TableCell>

                    <TableCell>{client.description}</TableCell>

                    <TableCell>
                      {client.customerLogin ? (
                        <div>
                          <p className="font-medium">
                            {client.customerLogin}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Linked customer credentials
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Not linked
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="min-w-[240px]">
                      {client.managers?.length ? (
                        <div className="space-y-2">
                          {client.managers.map((manager) => (
                            <div
                              key={manager._id}
                              className="rounded-md border p-2"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">
                                  {manager.fullName}
                                </span>

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
                              </div>

                              {manager.email && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {manager.email}
                                </p>
                              )}

                              {manager.phone && (
                                <p className="text-xs text-muted-foreground">
                                  {manager.phone}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          No managers
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {new Date(client.createdAt).toLocaleString()}
                    </TableCell>




                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              navigator.clipboard.writeText(client.name)
                            }
                          >
                            Copy client Name
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingClient(client);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pen className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDeletingClient(client);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Edit Client" : "Add New Client"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOrUpdateClient}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={clientData.name}
                    onChange={(e) =>
                      setClientData({ ...clientData, name: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={clientData.description}
                    onChange={(e) =>
                      setClientData({
                        ...clientData,
                        description: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editingClient ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the client "
                {deletingClient?.name}
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
                onClick={handleDeleteClient}
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
    </Layout>
  );
}
