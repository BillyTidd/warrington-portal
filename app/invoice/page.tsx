"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { isAfter, isBefore } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Pen, Trash, Eye, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import api from "@/lib/api";
import { redirect } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { handleDownloadCSV } from "@/lib/excelGenerator";

interface Invoice {
  _id: string;
  fileName: string;
  name: string;
  role: string;
  paymentStatus: boolean;
  createdAt: string;
  fileType: string;
  webViewLink: string;
  invoiceNumber: string;
}

interface Entry {
  _id: string;
  date: string;
  client: string;
  description: string;
  mileage: { miles: number; amount: number };
  expenses: { description: string; amount: number };
  overtime: { hours: number; amount: number };
  sustenance: { description: string; amount: number };
  totalAmount: number;
  userId: string;
  userName?: string;
}

interface Client {
  _id: string;
  name: string;
}

interface Employee {
  _id: string;
  name: string;
}

export default function InvoicesPage() {
  const { data: session } = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [paymentStatus, setPaymentStatus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;

  // Generate Invoice state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [genFilter, setGenFilter] = useState({
    client: "",
    employee: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (session?.user.role === "admin") {
      fetchInvoices();
      fetchEntries();
      fetchClients();
      fetchEmployees();
    } else {
      redirect("/dashboard");
    }
  }, [session]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/create-invoice");
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEntries = async () => {
    try {
      const response = await fetch("/api/entries");
      if (response.ok) {
        setEntries(await response.json());
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get("/clients");
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/admin/users");
      setEmployees(
        response.data.map((user: any) => ({
          _id: user._id,
          name: user.name || user.userName,
        }))
      );
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleGenDateChange = (
    type: "startDate" | "endDate",
    date: Date | null
  ) => {
    setGenFilter((prev) => {
      if (type === "startDate") {
        if (date && prev.endDate && isAfter(date, prev.endDate)) {
          return { ...prev, startDate: date, endDate: null };
        }
        return { ...prev, startDate: date };
      } else {
        if (date && prev.startDate && isBefore(date, prev.startDate)) {
          return prev;
        }
        return { ...prev, endDate: date };
      }
    });
  };

  const handleUploadToDrive = async (data: any) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/uploadToDrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload file");
      }

      const result = await response.json();

      try {
        await fetch("/api/create-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        });
      } catch (error) {
        console.error("Error creating invoice:", error);
      }

      toast.success("Invoice generated successfully");
      await fetchInvoices();
    } catch (error) {
      console.error("Error uploading to Drive:", error);
      toast.error("Error generating invoice");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateInvoice = async () => {
    const filteredData = entries.filter((entry) => {
      const clientMatch = genFilter.client
        ? entry.client === genFilter.client
        : true;
      const employeeMatch = genFilter.employee
        ? entry.userName === genFilter.employee
        : true;
      const dateMatch =
        genFilter.startDate && genFilter.endDate
          ? new Date(entry.date) >= genFilter.startDate &&
            new Date(entry.date) <= genFilter.endDate
          : true;
      return clientMatch && employeeMatch && dateMatch;
    });

    if (filteredData.length === 0) {
      toast.error("No entries match the selected filters");
      return;
    }

    setIsGenerating(true);
    try {
      await handleDownloadCSV(
        {
          filteredData,
          filter: {
            startDate: genFilter.startDate,
            endDate: genFilter.endDate,
            weekStart: null,
            client: genFilter.client,
          },
          session,
        },
        handleUploadToDrive
      );
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
      setIsGenerating(false);
    }
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return;
    setIsSubmitting(true);

    try {
      const response = await api.put(`/create-invoice/${editingInvoice._id}`, {
        paymentStatus,
      });

      if (response.status === 200) {
        setInvoices((prevInvoices) =>
          prevInvoices.map((invoice) =>
            invoice._id === editingInvoice._id
              ? { ...invoice, paymentStatus }
              : invoice
          )
        );
        setIsDialogOpen(false);
        setEditingInvoice(null);
        toast.success("Invoice updated successfully");
      } else {
        toast.error("Failed to update invoice");
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("An error occurred while updating the invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deletingInvoice) return;
    setIsSubmitting(true);

    try {
      const response = await api.delete(
        `/create-invoice/${deletingInvoice._id}`
      );

      if (response.status === 200) {
        setInvoices((prevInvoices) =>
          prevInvoices.filter((invoice) => invoice._id !== deletingInvoice._id)
        );
        toast.success("Invoice deleted successfully");
      } else {
        toast.error("Failed to delete invoice");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("An error occurred while deleting the invoice");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingInvoice(null);
      setIsSubmitting(false);
    }
  };

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = invoices.slice(indexOfFirstEntry, indexOfLastEntry);

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Invoices</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Generate Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-56 space-y-1">
                <Label>Client (optional)</Label>
                <Select
                  value={genFilter.client || "all"}
                  onValueChange={(value) =>
                    setGenFilter((prev) => ({
                      ...prev,
                      client: value === "all" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client._id} value={client.name}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-56 space-y-1">
                <Label>Employee (optional)</Label>
                <Select
                  value={genFilter.employee || "all"}
                  onValueChange={(value) =>
                    setGenFilter((prev) => ({
                      ...prev,
                      employee: value === "all" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee._id} value={employee.name}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto space-y-1">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={
                    genFilter.startDate
                      ? genFilter.startDate.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    handleGenDateChange("startDate", e.target.valueAsDate)
                  }
                />
              </div>
              <div className="w-full sm:w-auto space-y-1">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={
                    genFilter.endDate
                      ? genFilter.endDate.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    handleGenDateChange("endDate", e.target.valueAsDate)
                  }
                  min={
                    genFilter.startDate
                      ? genFilter.startDate.toISOString().split("T")[0]
                      : undefined
                  }
                />
              </div>
              <Button
                onClick={handleGenerateInvoice}
                disabled={isGenerating}
                className="w-full sm:w-auto"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Generate Invoice
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Generated By</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentEntries.map((invoice) => (
                    <TableRow key={invoice._id}>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.name}</TableCell>
                      <TableCell>{invoice.fileName}</TableCell>
                      <TableCell>
                        {invoice.role === "admin" ? "Admin" : "Employee"}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={invoice.paymentStatus ? "approved" : "pending"}
                          label={invoice.paymentStatus ? "Paid" : "Pending"}
                        />
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
                              onClick={() => {
                                setEditingInvoice(invoice);
                                setPaymentStatus(invoice.paymentStatus);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Pen className="mr-2 h-4 w-4" />
                              Edit Payment Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(invoice.webViewLink, "_blank")
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setDeletingInvoice(invoice);
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
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={
                        currentPage > 1
                          ? () => setCurrentPage((prev) => prev - 1)
                          : undefined
                      }
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                  {Array.from({
                    length: Math.ceil(invoices.length / entriesPerPage),
                  }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setCurrentPage(i + 1)}
                        isActive={currentPage === i + 1}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={
                        currentPage <
                        Math.ceil(invoices.length / entriesPerPage)
                          ? () => setCurrentPage((prev) => prev + 1)
                          : undefined
                      }
                      className={
                        currentPage >=
                        Math.ceil(invoices.length / entriesPerPage)
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Invoice Payment Status</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <div className="col-span-3">{editingInvoice?.name}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="fileName" className="text-right">
                  File Name
                </Label>
                <div className="col-span-3">{editingInvoice?.fileName}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="generatedBy" className="text-right">
                  Generated By
                </Label>
                <div className="col-span-3">
                  {editingInvoice?.role === "admin" ? "Admin" : "Employee"}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="createdAt" className="text-right">
                  Created At
                </Label>
                <div className="col-span-3">
                  {editingInvoice &&
                    new Date(editingInvoice.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentStatus" className="text-right">
                  Payment Status
                </Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="paymentStatus"
                    checked={paymentStatus}
                    onCheckedChange={setPaymentStatus}
                  />
                  <Label htmlFor="paymentStatus">
                    {paymentStatus ? "Paid" : "Pending"}
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateInvoice} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}{" "}
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the invoice for "
                {deletingInvoice?.name}"? This action cannot be undone.
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
                onClick={handleDeleteInvoice}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}{" "}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
