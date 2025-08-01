"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import { Layout } from "@/components/Layout";
import { JobRequestDetailsModal } from "./JobRequestDetailsModal";
import { JobRequestTable } from "./JobRequestTable";
import { JobRequestFilters } from "./JobRequestFilters";

import { BookingRequest, EstimatedCost } from "@/types/booking";

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function JobRequestsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [searchInputValue, setSearchInputValue] = useState("");
  const debouncedSearchTerm = useDebounce(searchInputValue, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const isAdmin = session?.user?.role === "admin";
  const isCustomer = session?.user?.role === "customer";

  // Update active filters when filter values change
  useEffect(() => {
    const newActiveFilters: string[] = [];
    if (debouncedSearchTerm) {
      newActiveFilters.push(`Search: ${debouncedSearchTerm}`);
    }
    if (statusFilter && statusFilter !== "all") {
      newActiveFilters.push(`Status: ${statusFilter}`);
    }
    if (startDate) {
      newActiveFilters.push(`From: ${format(startDate, "MMM dd, yyyy")}`);
    }
    if (endDate) {
      newActiveFilters.push(`To: ${format(endDate, "MMM dd, yyyy")}`);
    }
    setActiveFilters(newActiveFilters);
  }, [debouncedSearchTerm, statusFilter, startDate, endDate]);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: entriesPerPage.toString(),
        status: statusFilter,
        sortBy,
        sortOrder,
      });
      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      }
      if (startDate) {
        params.append("startDate", startDate.toISOString());
      }
      if (endDate) {
        params.append("endDate", endDate.toISOString());
      }
      // For customers, filter by their user ID
      if (isCustomer) {
        params.append("customerId", session?.user?.id || "");
      }

      const response = await fetch(`/api/booking-request?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch requests");
      const data = await response.json();
      setRequests(data.bookingRequests);
      setTotalPages(data.totalPages);
      setTotalItems(data.pagination?.total || data.bookingRequests.length);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load booking requests");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    entriesPerPage,
    statusFilter,
    debouncedSearchTerm,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    isCustomer,
    session?.user?.id,
  ]);

  useEffect(() => {
    if (session?.user) {
      fetchRequests();
    }
  }, [session, fetchRequests]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearchTerm, startDate, endDate, entriesPerPage]); // Also reset on entriesPerPage change

  const handleViewRequest = (request: BookingRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  const handleUpdateStatus = async (
    status: "approved" | "rejected",
    requestId: string,
    adminNotes: string,
    estimatedCost?: EstimatedCost
  ) => {
    if (!isAdmin) return;

    setIsUpdating(true);
    try {
      const requestBody: any = {
        status,
        adminNotes,
        reviewedBy: session?.user?.id,
        reviewedByName: session?.user?.name,
      };

      // Only include estimatedCost if it was provided (prices were changed)
      if (estimatedCost) {
        requestBody.estimatedCost = estimatedCost;
      }

      const response = await fetch(`/api/booking-request/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update request status");
      }

      const result = await response.json();

      if (result.jobCreated && result.jobId) {
        toast.success(
          `Request ${status} and job created successfully! Job ID: ${result.jobId}`
        );
      } else {
        toast.success(`Request ${status} successfully`);
      }

      setIsDialogOpen(false);
      fetchRequests(); // Re-fetch data to reflect changes
    } catch (error: any) {
      console.error("Error updating request status:", error);
      toast.error(error.message || "Failed to update request status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateDetails = async (
    requestId: string,
    updates: { adminNotes?: string; estimatedCost?: EstimatedCost }
  ) => {
    if (!isAdmin) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/booking-request/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update request details"
        );
      }

      toast.success("Request details updated successfully!");
      fetchRequests(); // Re-fetch data to reflect changes
    } catch (error: any) {
      console.error("Error updating request details:", error);
      toast.error(error.message || "Failed to update request details");
    } finally {
      setIsUpdating(false);
    }
  };

  const clearFilters = () => {
    setSearchInputValue("");
    setStatusFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
    // setActiveFilters will update via useEffect
  };

  const removeFilter = (filter: string) => {
    if (filter.startsWith("Search:")) {
      setSearchInputValue("");
    } else if (filter.startsWith("Status:")) {
      setStatusFilter("all");
    } else if (filter.startsWith("From:")) {
      setStartDate(undefined);
    } else if (filter.startsWith("To:")) {
      setEndDate(undefined);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc"); // Default to descending for new sort field
    }
  };

  const pageTitle = isCustomer ? "My Job Requests" : "Job Requests";
  const pageDescription = isCustomer
    ? "Track the status of your job requests"
    : "Manage customer job requests and approvals";

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageDescription}</p>
          </div>
          {/* Summary stats for admin */}
          {isAdmin && (
            <div className="flex gap-4 text-sm mt-4 sm:mt-0">
              <div className="text-center">
                <div className="font-bold text-yellow-600">
                  {requests.filter((r) => r.status === "pending").length}
                </div>
                <div className="text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-green-600">
                  {
                    requests.filter(
                      (r) => r.status === "approved" || r.status === "converted"
                    ).length
                  }
                </div>
                <div className="text-muted-foreground">Approved</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-red-600">
                  {requests.filter((r) => r.status === "rejected").length}
                </div>
                <div className="text-muted-foreground">Rejected</div>
              </div>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <JobRequestFilters
          searchInputValue={searchInputValue}
          setSearchInputValue={setSearchInputValue}
          debouncedSearchTerm={debouncedSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          entriesPerPage={entriesPerPage}
          setEntriesPerPage={setEntriesPerPage}
          activeFilters={activeFilters}
          clearFilters={clearFilters}
          removeFilter={removeFilter}
        />

        {/* Table View */}
        <JobRequestTable
          requests={requests}
          isLoading={isLoading}
          isAdmin={isAdmin}
          isCustomer={isCustomer}
          totalItems={totalItems}
          totalPages={totalPages}
          currentPage={currentPage}
          entriesPerPage={entriesPerPage}
          onPageChange={setCurrentPage}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onViewRequest={handleViewRequest}
          activeFilters={activeFilters}
          clearFilters={clearFilters}
          routerPushEstimate={() => router.push("/estimate")}
        />

        {/* Request Details Dialog */}
        <JobRequestDetailsModal
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          request={selectedRequest}
          isAdmin={isAdmin}
          session={session}
          onUpdateStatus={handleUpdateStatus}
          // onUpdateDetails={handleUpdateDetails}
          isUpdating={isUpdating}
        />
      </div>
    </Layout>
  );
}
