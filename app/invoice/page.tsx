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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Loader2, MoreHorizontal, Pen, Trash, Eye } from "lucide-react";
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

  useEffect(() => {
    if (session?.user.role === "admin") {
      fetchInvoices();
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

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="rounded-md border">
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
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            invoice.paymentStatus
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {invoice.paymentStatus ? "Paid" : "Pending"}
                        </span>
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <div className="col-span-3">{editingInvoice?.name}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fileName" className="text-right">
                  File Name
                </Label>
                <div className="col-span-3">{editingInvoice?.fileName}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="generatedBy" className="text-right">
                  Generated By
                </Label>
                <div className="col-span-3">
                  {editingInvoice?.role === "admin" ? "Admin" : "Employee"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="createdAt" className="text-right">
                  Created At
                </Label>
                <div className="col-span-3">
                  {editingInvoice &&
                    new Date(editingInvoice.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
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
