"use client";

import { format } from "date-fns";
import {
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  Building,
  FileText,
  Eye,
  Loader2,
  ExternalLink,
  Navigation,
  Truck,
  Crown,
  Wrench,
  HardHat,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Link from "next/link";
import { BookingRequest, EstimatedCost } from "@/types/booking";

interface JobRequestTableProps {
  requests: BookingRequest[];
  isLoading: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  entriesPerPage: number;
  onPageChange: (page: number) => void;
  onSort: (field: string) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onViewRequest: (request: BookingRequest) => void;
  activeFilters: string[];
  clearFilters: () => void;
  routerPushEstimate: () => void;
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

const getStatusBadge = (status: string) => {
  if (status === "converted") {
    return <StatusBadge status={status} label="Converted to Job" />;
  }
  return <StatusBadge status={status} />;
};

const getSortIcon = (
  field: string,
  sortBy: string,
  sortOrder: "asc" | "desc"
) => {
  if (sortBy !== field) return <ArrowUpDown className="h-4 w-4" />;
  return sortOrder === "asc" ? (
    <ArrowUp className="h-4 w-4" />
  ) : (
    <ArrowDown className="h-4 w-4" />
  );
};

const getPageNumbers = (currentPage: number, totalPages: number) => {
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

export function JobRequestTable({
  requests,
  isLoading,
  isAdmin,
  isCustomer,
  totalItems,
  totalPages,
  currentPage,
  entriesPerPage,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
  onViewRequest,
  activeFilters,
  clearFilters,
  routerPushEstimate,
}: JobRequestTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
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
            <Button className="mt-4" onClick={routerPushEstimate}>
              Create New Estimate
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Table View */}
      <Card className="shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  {isCustomer ? (
                    <span className="font-semibold">Job Name</span>
                  ) : (
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold"
                      onClick={() => onSort("customerName")}
                    >
                      Customer{getSortIcon("customerName", sortBy, sortOrder)}
                    </Button>
                  )}
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold"
                    onClick={() => onSort("jobDate")}
                  >
                    Job Details{getSortIcon("jobDate", sortBy, sortOrder)}
                  </Button>
                </TableHead>
                <TableHead>Workers & Vehicle</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold"
                    onClick={() => onSort("totalCost")}
                  >
                    Estimate{getSortIcon("totalCost", sortBy, sortOrder)}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold"
                    onClick={() => onSort("status")}
                  >
                    Status{getSortIcon("status", sortBy, sortOrder)}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold"
                    onClick={() => onSort("createdAt")}
                  >
                    Submitted{getSortIcon("createdAt", sortBy, sortOrder)}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow className="hover:bg-muted/50">
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
                      {request.jobEstimate.team !== "london" &&
                        request.jobEstimate.vehicleType && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Truck className="h-3 w-3" />
                          {request.jobEstimate.vehicleType
                            .replace("-", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </div>
                      )}
                      {request.jobEstimate.team !== "london" &&
                        request.estimatedCost.breakdown?.travel && (
                        <div className="text-xs text-muted-foreground">
                          {request.estimatedCost.breakdown.travel.distance}{" "}
                          miles
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-bold text-lg text-green-600">
                        £
                        {(request.jobEstimate.team === "london"
                          ? request.estimatedCost.laborCost +
                            (request.estimatedCost.materialCost || 0)
                          : request.estimatedCost.totalCost
                        ).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>
                          Labor: £{request.estimatedCost.laborCost.toFixed(2)}
                        </div>
                        {request.jobEstimate.team !== "london" && (
                          <div>
                            Travel: £
                            {request.estimatedCost.travelCost.toFixed(2)}
                          </div>
                        )}
                        {request.estimatedCost.materialCost !== undefined && (
                          <div>
                            Materials: £
                            {request.estimatedCost.materialCost.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2.5">
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
                      onClick={() => onViewRequest(request)}
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
                  onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
              {getPageNumbers(currentPage, totalPages).map((pageNum, i) => (
                <PaginationItem key={i}>
                  {pageNum === "..." ? (
                    <span className="px-4 py-2">...</span>
                  ) : (
                    <PaginationLink
                      onClick={() => onPageChange(Number(pageNum))}
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
                    onPageChange(Math.min(currentPage + 1, totalPages))
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
        Showing {Math.min((currentPage - 1) * entriesPerPage + 1, totalItems)}{" "}
        to {Math.min(currentPage * entriesPerPage, totalItems)} of {totalItems}{" "}
        requests
      </div>
    </>
  );
}
