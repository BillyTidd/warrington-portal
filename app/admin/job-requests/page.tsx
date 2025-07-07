"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
    Clock,
    Users,
    MapPin,
    Phone,
    Mail,
    Building,
    FileText,
    CheckCircle,
    XCircle,
    Eye,
    Loader2,
    ExternalLink,
    Search,
    Filter,
    X,
    Calendar,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Navigation,
    Truck,
    Crown,
    Wrench,
    HardHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BookingRequest {
    _id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCompany?: string;
    customerId?: string;
    jobEstimate: {
        numberOfWorkers: number;
        numberOfHours: number;
        jobDate: string;
        jobLocation: string;
        jobType: string;
        jobDescription: string;
        workerTypes?: string[];
        vehicleType?: string;
        postcode?: string;
    };
    estimatedCost: {
        laborCost: number;
        materialCost?: number;
        travelCost: number;
        totalCost: number;
        breakdown?: {
            labor: Array<{
                type: string;
                hours: number;
                dayRate: number;
                overtimeHours: number;
                overtimeRate: number;
                cost: number;
            }>;
            travel: {
                distance: number;
                vehicleType: string;
                rate: number;
                cost: number;
                fromAddress: string;
                toAddress: string;
            };
            jobTypeMultiplier: number;
            jobType: string;
        };
    };
    status: "pending" | "approved" | "rejected" | "converted";
    adminNotes?: string;
    createdAt: string;
    updatedAt: string;
    reviewedBy?: string;
    reviewedByName?: string;
    convertedToJobId?: string;
    convertedAt?: string;
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

const getWorkerIcon = (workerType: string) => {
    switch (workerType) {
        case "team-leader":
            return Crown;
        case "general-fitter":
            return Wrench;
        case "labourer":
            return HardHat;
        default:
            return Users;
    }
};

const getWorkerLabel = (workerType: string) => {
    switch (workerType) {
        case "team-leader":
            return "Team Leader";
        case "general-fitter":
            return "General Fitter";
        case "labourer":
            return "Labourer/Assistant";
        default:
            return workerType;
    }
};

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
    const [adminNotes, setAdminNotes] = useState("");

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
    }, [statusFilter, debouncedSearchTerm, startDate, endDate]);

    const handleViewRequest = (request: BookingRequest) => {
        setSelectedRequest(request);
        setAdminNotes(request.adminNotes || "");
        setIsDialogOpen(true);
    };

    const handleUpdateStatus = async (status: "approved" | "rejected") => {
        if (!selectedRequest || !isAdmin) return;

        setIsUpdating(true);
        try {
            const response = await fetch(
                `/api/booking-request/${selectedRequest._id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        status,
                        adminNotes,
                        reviewedBy: session?.user?.id,
                        reviewedByName: session?.user?.name,
                    }),
                }
            );

            if (!response.ok) throw new Error("Failed to update request");

            const result = await response.json();
            if (result.jobCreated && result.jobId) {
                toast.success(
                    `Request ${status} and job created successfully! Job ID: ${result.jobId}`
                );
            } else {
                toast.success(`Request ${status} successfully`);
            }

            setIsDialogOpen(false);
            fetchRequests();
        } catch (error) {
            console.error("Error updating request:", error);
            toast.error("Failed to update request");
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return (
                    <Badge
                        variant="outline"
                        className="text-yellow-600 border-yellow-600"
                    >
                        Pending
                    </Badge>
                );
            case "approved":
                return (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                        Approved
                    </Badge>
                );
            case "rejected":
                return (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                        Rejected
                    </Badge>
                );
            case "converted":
                return (
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                        Converted to Job
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const clearFilters = () => {
        setSearchInputValue("");
        setStatusFilter("all");
        setStartDate(undefined);
        setEndDate(undefined);
        setActiveFilters([]);
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
            setSortOrder("desc");
        }
    };

    const getSortIcon = (field: string) => {
        if (sortBy !== field) return <ArrowUpDown className="h-4 w-4" />;
        return sortOrder === "asc" ? (
            <ArrowUp className="h-4 w-4" />
        ) : (
            <ArrowDown className="h-4 w-4" />
        );
    };

    const getPageNumbers = () => {
        const pageNumbers = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            pageNumbers.push(1);
            if (currentPage <= 3) {
                pageNumbers.push(2, 3, 4, "...", totalPages);
            } else if (currentPage >= totalPages - 2) {
                pageNumbers.push(
                    "...",
                    totalPages - 3,
                    totalPages - 2,
                    totalPages - 1,
                    totalPages
                );
            } else {
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
                        <div className="flex gap-4 text-sm">
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
                <div className="mb-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Search input */}
                        <div className="relative flex-grow">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search by customer name, email, or job type..."
                                value={searchInputValue}
                                onChange={(e) => setSearchInputValue(e.target.value)}
                                className="pl-9"
                            />
                            {searchInputValue !== debouncedSearchTerm && (
                                <div className="absolute right-2.5 top-2.5">
                                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-700 text-xs text-white">
                                        <span className="animate-pulse">⋯</span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Filter popover */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="gap-2 bg-transparent">
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
                                    <h4 className="font-medium">Filter Requests</h4>

                                    {/* Status filter */}
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select
                                            value={statusFilter}
                                            onValueChange={setStatusFilter}
                                        >
                                            <SelectTrigger id="status">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="approved">Approved</SelectItem>
                                                <SelectItem value="rejected">Rejected</SelectItem>
                                                <SelectItem value="converted">Converted</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Date range filters */}
                                    <div className="space-y-2">
                                        <Label>Date Range</Label>
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
                                                        <Calendar className="mr-2 h-4 w-4" />
                                                        {startDate ? format(startDate, "MMM dd") : "Start"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <CalendarComponent
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
                                                        <Calendar className="mr-2 h-4 w-4" />
                                                        {endDate ? format(endDate, "MMM dd") : "End"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <CalendarComponent
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
                                        className="w-full bg-transparent"
                                        onClick={clearFilters}
                                        disabled={activeFilters.length === 0}
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Sort options */}
                        <Select
                            value={`${sortBy}-${sortOrder}`}
                            onValueChange={(value) => {
                                const [field, order] = value.split("-");
                                setSortBy(field);
                                setSortOrder(order as "asc" | "desc");
                            }}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                                <SelectItem value="customerName-asc">Customer A-Z</SelectItem>
                                <SelectItem value="customerName-desc">Customer Z-A</SelectItem>
                                <SelectItem value="totalCost-desc">Highest Value</SelectItem>
                                <SelectItem value="totalCost-asc">Lowest Value</SelectItem>
                                <SelectItem value="jobDate-desc">Latest Job Date</SelectItem>
                                <SelectItem value="jobDate-asc">Earliest Job Date</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Entries per page */}
                        <Select
                            value={entriesPerPage.toString()}
                            onValueChange={(value) => {
                                setEntriesPerPage(Number(value));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
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

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : requests.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-xl font-medium mb-2">
                                {activeFilters.length > 0
                                    ? "No Matching Requests"
                                    : isCustomer
                                        ? "No Job Requests Yet"
                                        : "No Job Requests"}
                            </h3>
                            <p className="text-muted-foreground text-center">
                                {activeFilters.length > 0
                                    ? "No job requests match your current filters. Try adjusting your search criteria."
                                    : isCustomer
                                        ? "You haven't submitted any job requests yet. Create your first estimate to get started!"
                                        : "No job requests found."}
                            </p>
                            {activeFilters.length > 0 ? (
                                <Button className="mt-4" onClick={clearFilters}>
                                    Clear Filters
                                </Button>
                            ) : isCustomer ? (
                                <Button
                                    className="mt-4"
                                    onClick={() => router.push("/estimate")}
                                >
                                    Create New Estimate
                                </Button>
                            ) : null}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table View */}
                        <Card className="shadow-sm">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[200px]">
                                                <Button
                                                    variant="ghost"
                                                    className="h-auto p-0 font-semibold"
                                                    onClick={() => handleSort("customerName")}
                                                >
                                                    Customer
                                                    {getSortIcon("customerName")}
                                                </Button>
                                            </TableHead>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    className="h-auto p-0 font-semibold"
                                                    onClick={() => handleSort("jobDate")}
                                                >
                                                    Job Details
                                                    {getSortIcon("jobDate")}
                                                </Button>
                                            </TableHead>
                                            <TableHead>Workers & Vehicle</TableHead>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    className="h-auto p-0 font-semibold"
                                                    onClick={() => handleSort("totalCost")}
                                                >
                                                    Estimate
                                                    {getSortIcon("totalCost")}
                                                </Button>
                                            </TableHead>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    className="h-auto p-0 font-semibold"
                                                    onClick={() => handleSort("status")}
                                                >
                                                    Status
                                                    {getSortIcon("status")}
                                                </Button>
                                            </TableHead>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    className="h-auto p-0 font-semibold"
                                                    onClick={() => handleSort("createdAt")}
                                                >
                                                    Submitted
                                                    {getSortIcon("createdAt")}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {requests.map((request) => (
                                            <TableRow key={request._id} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium">
                                                            {isCustomer
                                                                ? request.jobEstimate.jobType || "Job Request"
                                                                : request.customerName}
                                                        </div>
                                                        {!isCustomer && (
                                                            <>
                                                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                                    <Mail className="h-3 w-3" />
                                                                    {request.customerEmail}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                                    <Phone className="h-3 w-3" />
                                                                    {request.customerPhone}
                                                                </div>
                                                                {request.customerCompany && (
                                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                                        <Building className="h-3 w-3" />
                                                                        {request.customerCompany}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <Clock className="h-3 w-3" />
                                                            {format(
                                                                new Date(request.jobEstimate.jobDate),
                                                                "MMM d, yyyy"
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            <MapPin className="h-3 w-3" />
                                                            {request.jobEstimate.jobLocation}
                                                        </div>
                                                        {request.jobEstimate.postcode && (
                                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                <Navigation className="h-3 w-3" />
                                                                {request.jobEstimate.postcode}
                                                            </div>
                                                        )}
                                                        {request.jobEstimate.jobType && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {request.jobEstimate.jobType}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-2">
                                                        <div className="text-sm">
                                                            {request.jobEstimate.numberOfWorkers} workers ×{" "}
                                                            {request.jobEstimate.numberOfHours} hours
                                                        </div>
                                                        {request.jobEstimate.workerTypes && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {request.jobEstimate.workerTypes.map(
                                                                    (type, index) => {
                                                                        const IconComponent = getWorkerIcon(type);
                                                                        return (
                                                                            <Badge
                                                                                key={index}
                                                                                variant="secondary"
                                                                                className="text-xs flex items-center gap-1"
                                                                            >
                                                                                <IconComponent className="h-3 w-3" />
                                                                                {getWorkerLabel(type)}
                                                                            </Badge>
                                                                        );
                                                                    }
                                                                )}
                                                            </div>
                                                        )}
                                                        {request.jobEstimate.vehicleType && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Truck className="h-3 w-3" />
                                                                {request.jobEstimate.vehicleType
                                                                    .replace("-", " ")
                                                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                                            </div>
                                                        )}
                                                        {request.estimatedCost.breakdown?.travel && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {
                                                                    request.estimatedCost.breakdown.travel
                                                                        .distance
                                                                }{" "}
                                                                miles
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-bold text-lg text-green-600">
                                                            £{request.estimatedCost.totalCost.toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground space-y-0.5">
                                                            <div>
                                                                Labor: £
                                                                {request.estimatedCost.laborCost.toFixed(2)}
                                                            </div>
                                                            <div>
                                                                Travel: £
                                                                {request.estimatedCost.travelCost.toFixed(2)}
                                                            </div>
                                                            {request.estimatedCost.materialCost && (
                                                                <div>
                                                                    Materials: £
                                                                    {request.estimatedCost.materialCost.toFixed(
                                                                        2
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-2">
                                                        {getStatusBadge(request.status)}
                                                        {request.status === "converted" &&
                                                            request.convertedToJobId && (
                                                                <Link
                                                                    href={`/job-portal/${request.convertedToJobId}`}
                                                                >
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="w-full bg-transparent"
                                                                    >
                                                                        <ExternalLink className="h-3 w-3 mr-1" />
                                                                        View Job
                                                                    </Button>
                                                                </Link>
                                                            )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="text-sm">
                                                        {format(new Date(request.createdAt), "MMM d, yyyy")}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(new Date(request.createdAt), "h:mm a")}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewRequest(request)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex justify-center">
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
                                                        : "cursor-pointer"
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
                                                        className="cursor-pointer"
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
                                                        : "cursor-pointer"
                                                }
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}

                        {/* Pagination info */}
                        <div className="text-center text-sm text-muted-foreground mt-4">
                            Showing{" "}
                            {Math.min((currentPage - 1) * entriesPerPage + 1, totalItems)} to{" "}
                            {Math.min(currentPage * entriesPerPage, totalItems)} of{" "}
                            {totalItems} requests
                        </div>
                    </>
                )}

                {/* Request Details Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Job Request Details</DialogTitle>
                            <DialogDescription>
                                {isAdmin
                                    ? "Review and manage this job request"
                                    : "View your job request details"}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedRequest && (
                            <div className="space-y-6">
                                {/* Customer Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg">
                                                {isCustomer
                                                    ? "Your Information"
                                                    : "Customer Information"}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">
                                                    {selectedRequest.customerName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span>{selectedRequest.customerEmail}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span>{selectedRequest.customerPhone}</span>
                                            </div>
                                            {selectedRequest.customerCompany && (
                                                <div className="flex items-center gap-2">
                                                    <Building className="h-4 w-4 text-muted-foreground" />
                                                    <span>{selectedRequest.customerCompany}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg">Job Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <Label className="text-sm font-medium">
                                                    Workers & Hours
                                                </Label>
                                                <p>
                                                    {selectedRequest.jobEstimate.numberOfWorkers} workers
                                                    × {selectedRequest.jobEstimate.numberOfHours} hours
                                                </p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Date</Label>
                                                <p>
                                                    {format(
                                                        new Date(selectedRequest.jobEstimate.jobDate),
                                                        "EEEE, MMMM d, yyyy"
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">Location</Label>
                                                <p>{selectedRequest.jobEstimate.jobLocation}</p>
                                            </div>
                                            {selectedRequest.jobEstimate.postcode && (
                                                <div>
                                                    <Label className="text-sm font-medium">
                                                        Postcode
                                                    </Label>
                                                    <p>{selectedRequest.jobEstimate.postcode}</p>
                                                </div>
                                            )}
                                            <div>
                                                <Label className="text-sm font-medium">Job Type</Label>
                                                <p>
                                                    {selectedRequest.jobEstimate.jobType ||
                                                        "Not specified"}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Worker Configuration */}
                                {selectedRequest.jobEstimate.workerTypes && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg">
                                                Worker Configuration
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {selectedRequest.jobEstimate.workerTypes.map(
                                                    (type, index) => {
                                                        const IconComponent = getWorkerIcon(type);
                                                        return (
                                                            <div
                                                                key={index}
                                                                className="flex items-center gap-2 p-2 border rounded-lg"
                                                            >
                                                                <IconComponent className="h-5 w-5 text-blue-600" />
                                                                <span className="font-medium">
                                                                    {getWorkerLabel(type)}
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Vehicle and Travel Info */}
                                {(selectedRequest.jobEstimate.vehicleType ||
                                    selectedRequest.estimatedCost.breakdown?.travel) && (
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg">
                                                    Travel Information
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {selectedRequest.jobEstimate.vehicleType && (
                                                    <div>
                                                        <Label className="text-sm font-medium">
                                                            Vehicle Type
                                                        </Label>
                                                        <p className="flex items-center gap-2">
                                                            <Truck className="h-4 w-4" />
                                                            {selectedRequest.jobEstimate.vehicleType
                                                                .replace("-", " ")
                                                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                                                        </p>
                                                    </div>
                                                )}
                                                {selectedRequest.estimatedCost.breakdown?.travel && (
                                                    <>
                                                        <div>
                                                            <Label className="text-sm font-medium">
                                                                Distance
                                                            </Label>
                                                            <p>
                                                                {
                                                                    selectedRequest.estimatedCost.breakdown.travel
                                                                        .distance
                                                                }{" "}
                                                                miles
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <Label className="text-sm font-medium">From</Label>
                                                            <p>
                                                                {
                                                                    selectedRequest.estimatedCost.breakdown.travel
                                                                        .fromAddress
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <Label className="text-sm font-medium">To</Label>
                                                            <p>
                                                                {
                                                                    selectedRequest.estimatedCost.breakdown.travel
                                                                        .toAddress
                                                                }
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                {/* Job Description */}
                                {selectedRequest.jobEstimate.jobDescription && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg">Job Description</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="whitespace-pre-wrap">
                                                {selectedRequest.jobEstimate.jobDescription}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Enhanced Cost Breakdown */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg">Cost Breakdown</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedRequest.estimatedCost.breakdown?.labor ? (
                                            <div className="space-y-4">
                                                {/* Labor Breakdown */}
                                                <div>
                                                    <h4 className="font-medium mb-2">Labor Costs</h4>
                                                    <div className="space-y-2">
                                                        {selectedRequest.estimatedCost.breakdown.labor.map(
                                                            (worker, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="flex justify-between items-center p-2 border rounded"
                                                                >
                                                                    <div>
                                                                        <span className="font-medium">
                                                                            {worker.type}
                                                                        </span>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            Day rate: £{worker.dayRate}
                                                                            {worker.overtimeHours > 0 &&
                                                                                ` + ${worker.overtimeHours}h overtime @ £${worker.overtimeRate}/h`}
                                                                        </div>
                                                                    </div>
                                                                    <span className="font-bold">
                                                                        £{worker.cost.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Travel Costs */}
                                                <div>
                                                    <h4 className="font-medium mb-2">Travel Costs</h4>
                                                    <div className="flex justify-between items-center p-2 border rounded">
                                                        <div>
                                                            <span>
                                                                {
                                                                    selectedRequest.estimatedCost.breakdown.travel
                                                                        .distance
                                                                }{" "}
                                                                miles @ £
                                                                {
                                                                    selectedRequest.estimatedCost.breakdown.travel
                                                                        .rate
                                                                }
                                                                /mile
                                                            </span>
                                                            <div className="text-xs text-muted-foreground">
                                                                {selectedRequest.estimatedCost.breakdown.travel.vehicleType
                                                                    .replace("-", " ")
                                                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                                            </div>
                                                        </div>
                                                        <span className="font-bold">
                                                            £
                                                            {selectedRequest.estimatedCost.travelCost.toFixed(
                                                                2
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Job Type Multiplier */}
                                                {selectedRequest.estimatedCost.breakdown
                                                    .jobTypeMultiplier !== 1 && (
                                                        <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                                                            <span className="text-sm">
                                                                Job type multiplier (
                                                                {selectedRequest.estimatedCost.breakdown.jobType}
                                                                ):{" "}
                                                                {
                                                                    selectedRequest.estimatedCost.breakdown
                                                                        .jobTypeMultiplier
                                                                }
                                                                x
                                                            </span>
                                                        </div>
                                                    )}
                                            </div>
                                        ) : (
                                            // Fallback for older requests without detailed breakdown
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span>Labor Cost:</span>
                                                    <span>
                                                        £
                                                        {selectedRequest.estimatedCost.laborCost.toFixed(2)}
                                                    </span>
                                                </div>
                                                {selectedRequest.estimatedCost.materialCost && (
                                                    <div className="flex justify-between">
                                                        <span>Material Cost:</span>
                                                        <span>
                                                            £
                                                            {selectedRequest.estimatedCost.materialCost.toFixed(
                                                                2
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between">
                                                    <span>Travel Cost:</span>
                                                    <span>
                                                        £
                                                        {selectedRequest.estimatedCost.travelCost.toFixed(
                                                            2
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="border-t pt-2 mt-4">
                                            <div className="flex justify-between font-bold text-lg">
                                                <span>Total:</span>
                                                <span className="text-green-600">
                                                    £{selectedRequest.estimatedCost.totalCost.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Conversion Info */}
                                {selectedRequest.status === "converted" &&
                                    selectedRequest.convertedToJobId && (
                                        <Card className="border-blue-200 bg-blue-50">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg text-blue-800">
                                                    Job Created
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-blue-700 mb-3">
                                                    This request has been converted to a job on{" "}
                                                    {selectedRequest.convertedAt &&
                                                        format(
                                                            new Date(selectedRequest.convertedAt),
                                                            "MMMM d, yyyy 'at' h:mm a"
                                                        )}
                                                </p>
                                                <Link
                                                    href={`/job-portal/${selectedRequest.convertedToJobId}`}
                                                >
                                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        View Job in Portal
                                                    </Button>
                                                </Link>
                                            </CardContent>
                                        </Card>
                                    )}

                                {/* Admin Notes - Only show for admin or if there are notes */}
                                {(isAdmin || selectedRequest.adminNotes) && (
                                    <div className="space-y-2">
                                        <Label htmlFor="adminNotes">
                                            {isAdmin ? "Admin Notes" : "Notes from Admin"}
                                        </Label>
                                        {isAdmin ? (
                                            <Textarea
                                                id="adminNotes"
                                                placeholder="Add notes about this request..."
                                                value={adminNotes}
                                                onChange={(e) => setAdminNotes(e.target.value)}
                                                rows={3}
                                            />
                                        ) : (
                                            <div className="p-3 bg-muted rounded-md">
                                                <p>
                                                    {selectedRequest.adminNotes ||
                                                        "No notes from admin yet."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Status and Actions */}
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Current Status:</span>
                                        {getStatusBadge(selectedRequest.status)}
                                    </div>

                                    {isAdmin && selectedRequest.status === "pending" && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => handleUpdateStatus("rejected")}
                                                disabled={isUpdating}
                                                className="text-red-600 border-red-600 hover:bg-red-50"
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Reject
                                            </Button>
                                            <Button
                                                onClick={() => handleUpdateStatus("approved")}
                                                disabled={isUpdating}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                {isUpdating
                                                    ? "Creating Job..."
                                                    : "Approve & Create Job"}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
