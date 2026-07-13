"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DataEntryForm } from "@/components/DataEntryForm";
import { DataTable } from "@/components/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Layout } from "@/components/Layout";

export interface Entry {
  _id: string;
  date: string;
  client: string;
  description: string;
  mileage: {
    miles: number;
    amount: number;
  };
  expenses: {
    description: string;
    amount: number;
  };
  overtime: {
    hours: number;
    amount: number;
  };
  sustenance: {
    description: string;
    amount: number;
  };
  totalAmount: number;
  userId: string;
  employeeName?: string;
}

export interface DataTableProps {
  data: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onDownload: (data: Entry[]) => void;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/entries");
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      } else {
        toast.error("Failed to fetch entries");
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast.error("An error occurred while fetching entries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData: Partial<Entry>) => {
    setIsSubmitting(true);
    const url = editingEntry
      ? `/api/entries/${editingEntry._id}`
      : "/api/entries";
    const method = editingEntry ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedEntry = await response.json();
        setEntries((prevEntries) => {
          if (editingEntry) {
            return prevEntries.map((entry) =>
              entry._id === updatedEntry._id ? updatedEntry : entry
            );
          } else {
            return [...prevEntries, updatedEntry];
          }
        });
        setEditingEntry(null);
        setIsEditModalOpen(false);
        toast.success(
          editingEntry
            ? "Entry updated successfully"
            : "Entry created successfully"
        );
      } else {
        toast.error("Failed to save entry");
      }
    } catch (error) {
      console.error("Error submitting entry:", error);
      toast.error("An error occurred while saving the entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/entries/${deletingEntry}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEntries((prevEntries) =>
          prevEntries.filter((entry) => entry._id !== deletingEntry)
        );
        setDeletingEntry(null);
        setIsDeleteModalOpen(false);
        toast.success("Entry deleted successfully");
      } else {
        toast.error("Failed to delete entry");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("An error occurred while deleting the entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = (data: Entry[]) => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Configure auto table with correct headers structure
    const tableHeaders = [
      [
        { content: "Date", rowSpan: 2 },
        { content: "Client", rowSpan: 2 },
        { content: "Description", rowSpan: 2 },
        { content: "Amount £", rowSpan: 2 },
        { content: "Mileage £", colSpan: 2 },
        { content: "Expenses £", colSpan: 2 },
        { content: "Overtime £", colSpan: 2 },
        { content: "Sustenance £", colSpan: 2 },
      ],
      [
        // Empty strings for rowSpan cells
        // "", "", "", "",
        // Subheaders for Mileage
        "Miles",
        "Amount £ (auto)",
        // Subheaders for Expenses
        "Description",
        "Amount £",
        // Subheaders for Overtime
        "Hours",
        "Amount £ (auto)",
        // Subheaders for Sustenance
        "Description",
        "Amount £",
      ],
    ];

    const tableData = data.map((entry) => [
      entry.date,
      entry.client,
      entry.description,
      `£${Number(entry.totalAmount).toFixed(2)}`,
      entry.mileage?.miles || "",
      `£${Number(entry.mileage?.amount || 0).toFixed(2)}`,
      entry.expenses?.description || "",
      `£${Number(entry.expenses?.amount || 0).toFixed(2)}`,
      entry.overtime?.hours || "",
      `£${Number(entry.overtime?.amount || 0).toFixed(2)}`,
      entry.sustenance?.description || "",
      `£${Number(entry.sustenance?.amount || 0).toFixed(2)}`,
    ]);

    (doc as any).autoTable({
      head: tableHeaders,
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 20 }, // Date
        1: { cellWidth: 25 }, // Client
        2: { cellWidth: 35 }, // Description
        3: { cellWidth: 20 }, // Amount
        4: { cellWidth: 15 }, // Mileage Miles
        5: { cellWidth: 20 }, // Mileage Amount
        6: { cellWidth: 25 }, // Expenses Description
        7: { cellWidth: 20 }, // Expenses Amount
        8: { cellWidth: 15 }, // Overtime Hours
        9: { cellWidth: 20 }, // Overtime Amount
        10: { cellWidth: 25 }, // Sustenance Description
        11: { cellWidth: 20 }, // Sustenance Amount
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 35 },
      didDrawPage: (data: any) => {
        // Header
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, doc.internal.pageSize.width, 30, "F");

        // Title
        doc.setTextColor(255);
        doc.setFontSize(20);
        doc.text(
          `Work Entries Report By ${session && session.user?.name}`,
          14,
          15
        );

        // Generation timestamp
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);

        // Page number at bottom
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10,
          { align: "right" }
        );
      },
      willDrawCell: (data: any) => {
        // Ensure numbers are right-aligned
        if (
          typeof data.cell.raw === "number" ||
          (typeof data.cell.raw === "string" && data.cell.raw.startsWith("£"))
        ) {
          data.cell.styles.halign = "right";
        }
      },
      didParseCell: (data: any) => {
        // Ensure description columns wrap text
        if (
          data.column.dataKey === 2 ||
          data.column.dataKey === 6 ||
          data.column.dataKey === 10
        ) {
          data.cell.styles.cellWidth = "wrap";
        }
      },
    });

    doc.save("work_entries.pdf");
  };
  return (
    <Layout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Work Entries</h1>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <DataTable
            data={entries}
            onEdit={handleEdit}
            onDelete={(id) => {
              setDeletingEntry(id);
              setIsDeleteModalOpen(true);
            }}
          />
        )}

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="h-[90vh] overflow-y-auto sm:h-auto max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? "Edit Entry" : "Add New Entry"}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto px-1">
              <DataEntryForm
                onSubmit={handleSubmit}
                initialData={editingEntry}
                isSubmitting={isSubmitting}
                isModal
              />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this entry? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
