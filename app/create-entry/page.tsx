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
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Layout } from "@/components/Layout";

interface Entry {
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

export default function Dashboard() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: Entry | Partial<Entry>) => {
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

  return (
    <Layout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">
          Welcome {session && session.user.name} !
        </h1>
        <DataEntryForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? "Edit Entry" : "Add New Entry"}
              </DialogTitle>
            </DialogHeader>
            <DataEntryForm
              onSubmit={handleSubmit}
              initialData={editingEntry}
              isSubmitting={isSubmitting}
              isModal
            />
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
