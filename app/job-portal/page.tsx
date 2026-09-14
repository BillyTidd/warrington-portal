"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
import { Loader2, Plus, Search, Filter, X } from "lucide-react";
import { toast } from "sonner";
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
import { JobHeader } from "@/components/job-portal/JobHeader";
import { JobList } from "@/components/job-portal/JobList";
import { CalendarView } from "@/components/job-portal/CalendarView";
import { ViewToggle } from "@/components/job-portal/ViewToggle";
import { Layout } from "@/components/Layout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Job } from "@/types/job";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Interface for Client
interface Client {
  _id: string;
  name: string;
}

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

export default function JobPortalPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const initialRenderRef = useRef(true);
  const previousViewModeRef = useRef<"list" | "calendar">("list");
  const backgroundRefreshRef = useRef(false);
  const backgroundErrorShownRef = useRef(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentJob, setCurrentJob] = useState<Partial<Job>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // JobFilters state
  const [searchInputValue, setSearchInputValue] = useState(""); // Immediate input value
  const debouncedSearchTerm = useDebounce(searchInputValue, 500); // Debounced search term
  const [searchTerm, setSearchTerm] = useState(""); // Actual search term used for filtering
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [clients, setClients] = useState<Client[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // State to track when to fetch data
  const [shouldFetch, setShouldFetch] = useState(true);

  // Update searchTerm when debounced value changes
  useEffect(() => {
    setSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // Fetch clients for the dropdown (for admin users)
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/clients");
        if (response.ok) {
          const data = await response.json();
          setClients(data);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };

    if (session?.user?.role === "admin") {
      fetchClients();
    }
  }, [session?.user?.role]);

  // Update filters when any filter value changes
  useEffect(() => {
    const newFilters: any = {};
    const newActiveFilters: string[] = [];

    if (searchTerm) {
      newFilters.search = searchTerm;
      newActiveFilters.push(`Search: ${searchTerm}`);
    }

    if (clientId && clientId !== "all") {
      newFilters.clientId = clientId;
      const clientName =
        clients.find((c) => c._id === clientId)?.name || "Unknown";
      newActiveFilters.push(`Client: ${clientName}`);
    }

    if (status && status !== "all") {
      newFilters.status = status;
      newActiveFilters.push(`Status: ${status}`);
    }

    if (startDate) {
      newFilters.startDate = startDate.toISOString();
      newActiveFilters.push(`From: ${format(startDate, "MMM dd, yyyy")}`);
    }

    if (endDate) {
      newFilters.endDate = endDate.toISOString();
      newActiveFilters.push(`To: ${format(endDate, "MMM dd, yyyy")}`);
    }

    setActiveFilters(newActiveFilters);
    setFilters(newFilters);
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [searchTerm, clientId, status, startDate, endDate, clients]);

  // Memoize the fetchJobs function to prevent recreating it on every render
  const fetchJobs = useCallback(async () => {
    if (!shouldFetch) return;

    const isBackgroundRefresh = backgroundRefreshRef.current;

    if (!isBackgroundRefresh) {
      setIsLoading(true);
    }

    try {
      // Build query parameters
      const params = new URLSearchParams();

      // Add pagination params for list view
      if (viewMode === "list") {
        params.append("page", currentPage.toString());
        params.append("limit", entriesPerPage.toString());
      }

      // Add date range for calendar view
      if (viewMode === "calendar") {
        // Always use the current month for calendar view
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        params.append("startDate", monthStart.toISOString());
        params.append("endDate", monthEnd.toISOString());
      }

      // Add view mode
      params.append("viewMode", viewMode);

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });

      console.log(
        "Fetching jobs with params:",
        Object.fromEntries(params.entries())
      );

      const jobsApi =
  session?.user?.role === "customer"
    ? "/api/v1/customer/jobs"
    : "/api/jobs";

const response = await fetch(
  `${jobsApi}?${params.toString()}`,
  {
    cache: "no-store",
  }
);
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data = await response.json();
      setJobs(data.jobs);
      backgroundErrorShownRef.current = false;

      // Update pagination info if available
      if (data.pagination) {
        setTotalItems(data.pagination.total);
        setTotalPages(data.pagination.totalPages);

        // Reset to page 1 if current page is beyond total pages
        if (
          currentPage > data.pagination.totalPages &&
          data.pagination.totalPages > 0
        ) {
          setCurrentPage(1);
        }
      }

      // Reset the fetch flag
      setShouldFetch(false);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      if (
        !isBackgroundRefresh ||
        !backgroundErrorShownRef.current
      ) {
        toast.error("Failed to fetch job data");
        backgroundErrorShownRef.current = true;
      }
      // Reset the fetch flag even on error
      setShouldFetch(false);
    } finally {
      if (!isBackgroundRefresh) {
        setIsLoading(false);
      }
      backgroundRefreshRef.current = false;
    }
  }, [
    currentDate,
    viewMode,
    currentPage,
    entriesPerPage,
    filters,
    shouldFetch,
    session?.user?.role,
  ]);

  // Only run the effect when shouldFetch is true
  useEffect(() => {
    if (shouldFetch) {
      fetchJobs();
    }
  }, [fetchJobs, shouldFetch]);

  // Handle view mode changes properly
  useEffect(() => {
    // Skip the first render
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      previousViewModeRef.current = viewMode;
      return;
    }

    // Only trigger a fetch if the view mode actually changed
    if (previousViewModeRef.current !== viewMode) {
      previousViewModeRef.current = viewMode;
      setShouldFetch(true);
    }
  }, [viewMode]);

  // Set shouldFetch to true when these dependencies change
  useEffect(() => {
    if (!initialRenderRef.current) {
      setShouldFetch(true);
    }
  }, [currentDate, currentPage, entriesPerPage, filters]);

  // Initial data fetch
  useEffect(() => {
    setShouldFetch(true);
  }, []);


  // Refresh the Customer Portal job list every 10 seconds.
useEffect(() => {
  if (session?.user?.role !== "customer") {
    return;
  }

  const refreshInterval = window.setInterval(() => {
    backgroundRefreshRef.current = true;
    setShouldFetch(true);
  }, 10000);

  return () => {
    window.clearInterval(refreshInterval);
  };
}, [session?.user?.role]);



  const handleNavigate = (direction: "prev" | "next") => {
    const newDate =
      direction === "prev"
        ? subMonths(currentDate, 1)
        : addMonths(currentDate, 1);
    setCurrentDate(newDate);
    // Data will be fetched due to the currentDate dependency
  };

  const handleNewJob = () => {
    router.push("/job-portal/new");
  };

  const handleDeleteJob = async () => {
    setIsDeleting(true);
    try {
      const url = `/api/jobs/${currentJob._id}`;
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete job");
      }

      // Trigger a refetch after deletion
      setShouldFetch(true);
      toast.success("Job deleted successfully");
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting job:", error);
      toast.error(error.message || "Failed to delete job");
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to clear all filters
  const clearFilters = () => {
    setSearchInputValue("");
    setSearchTerm("");
    setClientId("");
    setStatus("");
    setStartDate(undefined);
    setEndDate(undefined);
    setActiveFilters([]);
    setFilters({});
  };

  // Function to remove a specific filter
  const removeFilter = (filter: string) => {
    if (filter.startsWith("Search:")) {
      setSearchInputValue("");
      setSearchTerm("");
    } else if (filter.startsWith("Client:")) {
      setClientId("");
    } else if (filter.startsWith("Status:")) {
      setStatus("");
    } else if (filter.startsWith("From:")) {
      setStartDate(undefined);
    } else if (filter.startsWith("To:")) {
      setEndDate(undefined);
    }
  };

  // Function to generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];

    if (totalPages <= 7) {
      // If we have 7 or fewer pages, show all page numbers
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      // If current page is among the first 3 pages
      if (currentPage <= 3) {
        pageNumbers.push(2, 3, 4, "...", totalPages);
      }
      // If current page is among the last 3 pages
      else if (currentPage >= totalPages - 2) {
        pageNumbers.push(
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      }
      // If current page is somewhere in the middle
      else {
        pageNumbers.push(
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
      }
    }

    return pageNumbers;
  };

  // Manual refresh function
  const handleRefresh = () => {
    backgroundRefreshRef.current = false;
    setShouldFetch(true);
  };

  // Handle view mode change
  const handleViewModeChange = (newView: "list" | "calendar") => {
    // Only update if the view actually changed
    if (newView !== viewMode) {
      setViewMode(newView);
      // Reset page when switching views
      setCurrentPage(1);
    }
  };

  // Render the JobFilters component
  const renderJobFilters = () => {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search input with debounce */}
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search jobs..."
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              className="pl-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
            {searchInputValue !== searchTerm && (
              <div className="absolute right-2.5 top-2.5">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-600 text-xs text-white dark:text-gray-200">
                  <span className="animate-pulse">⋯</span>
                </span>
              </div>
            )}
          </div>

          {/* Filter button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Filter Jobs</h4>
                  <PopoverClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mr-1"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </PopoverClose>
                </div>

                {/* Status filter */}
                <div className="space-y-2">
                  <label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Client filter (admin only) */}
                {session?.user?.role === "admin" && (
                  <div className="space-y-2">
                    <label htmlFor="client" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Client
                    </label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client._id} value={client._id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date range filters */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          {startDate ? format(startDate, "PPP") : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          {endDate ? format(endDate, "PPP") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Clear filters button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearFilters}
                  disabled={activeFilters.length === 0}
                >
                  Clear Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1"
              >
                {filter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter(filter)}
                />
              </Badge>
            ))}
            {activeFilters.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={clearFilters}
              >
                Clear All
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="rounded-full bg-gray-800 dark:bg-gray-700 p-3 mb-4">
          <Search className="h-6 w-6 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No jobs found</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
          {viewMode === "calendar"
            ? `No jobs found for ${format(
                currentDate,
                "MMMM yyyy"
              )}. Try another month or create a new job.`
            : "No jobs match your current filters. Try adjusting your search criteria or create a new job."}
        </p>
        <div className="flex gap-3">
          {activeFilters.length > 0 && (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
          {session?.user?.role === "admin" && (
  <Button onClick={handleNewJob}>
    <Plus className="h-4 w-4 mr-2" />
    Create New Job
  </Button>
)}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-10 px-2 sm:px-4">
        <div className="dark:bg-gray-950 rounded-lg shadow-xl overflow-x-auto">
          <JobHeader
            currentDate={currentDate}
            onNavigate={handleNavigate}
            onNewJob={handleNewJob}
            canCreateJob={session?.user?.role === "admin"}
            jobs={jobs}
            onRefresh={handleRefresh}
          >
            <ViewToggle view={viewMode} onChange={handleViewModeChange} />
          </JobHeader>

          {/* Filters section (only for list view) */}
          {viewMode === "list" && (
            <div className="p-4 dark:bg-gray-900 border-b border-gray-800">
              {renderJobFilters()}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading jobs...</span>
            </div>
          ) : jobs.length === 0 ? (
            renderEmptyState()
          ) : viewMode === "list" ? (
            <>
              <JobList
                jobs={jobs}
                isLoading={isLoading}
                onDeleteJob={(job) => {
                  setCurrentJob(job);
                  setIsDeleteDialogOpen(true);
                }}
              />

              {/* Pagination controls */}
              <div className="mt-4 flex justify-center p-4 dark:bg-gray-900 border-t border-gray-800">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>

                    {getPageNumbers().map((pageNum, i) => (
                      <PaginationItem key={i}>
                        {pageNum === "..." ? (
                          <span className="px-4 py-2">...</span>
                        ) : (
                          <PaginationLink
                            onClick={() => setCurrentPage(Number(pageNum))}
                            isActive={currentPage === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        className={
                          currentPage >= totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>

              {/* Pagination info */}
              <div className="text-center text-sm text-gray-600 dark:text-gray-400 pb-4 dark:bg-gray-900">
                Showing{" "}
                {Math.min((currentPage - 1) * entriesPerPage + 1, totalItems)}{" "}
                to {Math.min(currentPage * entriesPerPage, totalItems)} of{" "}
                {totalItems} entries
              </div>
            </>
          ) : (
            <CalendarView
              jobs={jobs}
              currentDate={currentDate}
              onViewDetails={(job) => router.push(`/job-portal/${job._id}`)}
              onNewJob={(date) =>
                router.push(`/job-portal/new?date=${date || ""}`)
              }
              onNavigate={handleNavigate}
              setCurrentDate={setCurrentDate}
            />
          )}
        </div>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this job?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                job and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteJob}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
