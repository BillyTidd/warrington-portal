"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { startOfWeek, format, isAfter, isBefore } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Download, Calendar, ArrowUpDown } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { handleDownloadCSV } from "@/lib/excelGenerator";
import LoadingModal from "./LoadingModal";
import { toast } from "sonner";

export interface Entry {
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
  employeeName?: string;
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

interface DataTableProps {
  data: Entry[];
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
}

export function DataTable({ data, onEdit, onDelete }: DataTableProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState({
    employee: "",
    client: "",
    weekStart: null as Date | null,
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const entriesPerPage = 10;
  const tableTopRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentPage]);

  useEffect(() => {
    fetchClients();
    fetchEmployees();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get("/clients");
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to fetch clients");
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
      toast.error("Failed to fetch employees");
    }
  };

  const filteredData = data.filter((entry) => {
    if (!entry) return false;

    const clientMatch = filter.client
      ? entry.client?.toLowerCase().includes(filter.client.toLowerCase())
      : true;
    const employeeMatch = filter.employee
      ? entry.userName?.toLowerCase().includes(filter.employee.toLowerCase())
      : true;
    const dateMatch =
      session?.user?.role === "admin"
        ? filter.startDate && filter.endDate
          ? new Date(entry.date) >= filter.startDate &&
            new Date(entry.date) <= filter.endDate
          : true
        : filter.weekStart
        ? new Date(entry.date) >= filter.weekStart &&
          new Date(entry.date) <
            new Date(filter.weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        : true;

    return clientMatch && employeeMatch && dateMatch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!a || !b) return 0;
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
  });

  const totalPages = Math.ceil(sortedData.length / entriesPerPage);
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = sortedData.slice(indexOfFirstEntry, indexOfLastEntry);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    range.push(1);

    if (totalPages <= 1) return range;

    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i < totalPages && i > 1) {
        range.push(i);
      }
    }
    range.push(totalPages);

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const handleWeekSelect = (date: Date | undefined) => {
    if (date) {
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      setFilter((prev) => ({ ...prev, weekStart }));
    }
  };

  const handleDateChange = (
    type: "startDate" | "endDate",
    date: Date | null
  ) => {
    setFilter((prev) => {
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

  const clearDateSelection = () => {
    setFilter({
      employee: "",
      client: "",
      weekStart: null,
      startDate: null,
      endDate: null,
    });
    setCurrentPage(1);
  };

  const handleExcelDownload = async () => {
    try {
      setIsLoading(true);
      await handleDownloadCSV(
        {
          filteredData: sortedData,
          filter,
          session,
        },
        handleUploadToDrive
      );
    } catch (error) {
      console.error("Error downloading Excel:", error);
      toast.error("Failed to download Excel file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadToDrive = async (data: any) => {
    setIsLoading(true);
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

      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Error uploading to Drive:", error);
      toast.error("Error uploading file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <Card ref={tableTopRef}>
      <LoadingModal show={isLoading} />
      <CardHeader>
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center w-full">
          <CardTitle>Work Entries</CardTitle>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            {session?.user?.role === "admin" ? (
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <Input
                  type="date"
                  value={
                    filter.startDate
                      ? format(filter.startDate, "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) =>
                    handleDateChange("startDate", e.target.valueAsDate)
                  }
                  className="w-full sm:w-auto"
                />
                <Input
                  type="date"
                  value={
                    filter.endDate ? format(filter.endDate, "yyyy-MM-dd") : ""
                  }
                  onChange={(e) =>
                    handleDateChange("endDate", e.target.valueAsDate)
                  }
                  className="w-full sm:w-auto"
                  min={
                    filter.startDate
                      ? format(filter.startDate, "yyyy-MM-dd")
                      : undefined
                  }
                />
              </div>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto flex justify-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    {filter.weekStart
                      ? format(filter.weekStart, "PP")
                      : "Select Week"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={filter.weekStart || undefined}
                    onSelect={handleWeekSelect}
                    weekStartsOn={0}
                  />
                </PopoverContent>
              </Popover>
            )}
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button onClick={clearDateSelection} className="w-full sm:w-auto">
                Clear Filter
              </Button>
              <Button
                onClick={handleExcelDownload}
                className="w-full sm:w-auto flex justify-center items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download XLSX
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {session?.user?.role === "admin" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={filter.client}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, client: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client.name}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Select
                value={filter.employee}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, employee: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee._id} value={employee.name}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Mobile card list */}
        <div className="sm:hidden rounded-md border divide-y">
          {currentEntries.map((entry) => (
            <div key={entry._id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{entry.date}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {entry.client}
                  </div>
                  {session?.user?.role === "admin" && (
                    <div className="text-xs text-muted-foreground truncate">
                      {entry.userName}
                    </div>
                  )}
                </div>
                <div className="font-semibold shrink-0">
                  £{entry.totalAmount || 0}
                </div>
              </div>

              <div className="text-sm whitespace-pre-wrap break-words">
                {entry.description}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs bg-muted/30 rounded-md p-2">
                <div>
                  <div className="text-muted-foreground">Mileage</div>
                  <div className="font-medium">
                    {entry.mileage?.miles || 0} mi
                  </div>
                  <div className="text-muted-foreground">
                    £{entry.mileage?.amount || 0}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Expenses</div>
                  <div className="font-medium">
                    £{entry.expenses?.amount || 0}
                  </div>
                  {entry.expenses?.description && (
                    <div className="text-muted-foreground truncate">
                      {entry.expenses.description}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground">Overtime</div>
                  <div className="font-medium">
                    {entry.overtime?.hours || 0} hrs
                  </div>
                  <div className="text-muted-foreground">
                    £{entry.overtime?.amount || 0}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button onClick={() => onEdit(entry)} size="sm" variant="outline">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => onDelete(entry._id)}
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {currentEntries.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No entries found.
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto custom-scrollbar pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 min-w-[110px] max-w-[110px] bg-background border-r whitespace-nowrap px-3">
                  <Button
                    variant="ghost"
                    onClick={handleSort}
                    className="font-semibold flex items-center gap-1"
                  >
                    Date
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                {session?.user?.role === "admin" && (
                  <TableHead className="sticky left-[110px] z-20 min-w-[150px] max-w-[150px] bg-background border-r whitespace-nowrap px-3">
                    Employee
                  </TableHead>
                )}
                <TableHead
                  className={
                    (session?.user?.role === "admin"
                      ? "sticky left-[260px] z-20 bg-background border-r"
                      : "sticky left-[110px] z-20 bg-background border-r") +
                    " whitespace-nowrap px-3"
                  }
                >
                  Client
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 min-w-[280px]">Description</TableHead>
                <TableHead className="whitespace-nowrap px-3">Amount £</TableHead>
                <TableHead colSpan={2} className="whitespace-nowrap px-3">
                  Mileage
                </TableHead>
                <TableHead colSpan={2} className="whitespace-nowrap px-3">
                  Expenses
                </TableHead>
                <TableHead colSpan={2} className="whitespace-nowrap px-3">
                  Overtime
                </TableHead>
                <TableHead className="whitespace-nowrap px-3">Actions</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="sticky left-0 z-20 min-w-[110px] max-w-[110px] bg-background border-r" />
                {session?.user?.role === "admin" && (
                  <TableHead className="sticky left-[110px] z-20 min-w-[150px] max-w-[150px] bg-background border-r" />
                )}
                <TableHead
                  className={
                    session?.user?.role === "admin"
                      ? "sticky left-[260px] z-20 bg-background border-r"
                      : "sticky left-[110px] z-20 bg-background border-r"
                  }
                />
                <TableHead />
                <TableHead />
                <TableHead className="whitespace-nowrap px-3">Miles</TableHead>
                <TableHead className="whitespace-nowrap px-3">Amount £</TableHead>
                <TableHead className="whitespace-nowrap px-3">Description</TableHead>
                <TableHead className="whitespace-nowrap px-3">Amount £</TableHead>
                <TableHead className="whitespace-nowrap px-3">Hours</TableHead>
                <TableHead className="whitespace-nowrap px-3">Amount £</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEntries.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell className="sticky left-0 z-10 min-w-[110px] max-w-[110px] bg-background border-r">
                    {entry.date}
                  </TableCell>
                  {session?.user?.role === "admin" && (
                    <TableCell className="sticky left-[110px] z-10 min-w-[150px] max-w-[150px] bg-background border-r">
                      {entry.userName}
                    </TableCell>
                  )}
                  <TableCell
                    className={
                      session?.user?.role === "admin"
                        ? "sticky left-[260px] z-10 bg-background border-r"
                        : "sticky left-[110px] z-10 bg-background border-r"
                    }
                  >
                    {entry.client}
                  </TableCell>
                  <TableCell className="min-w-[280px] max-w-md whitespace-pre-wrap break-words">
                    {entry.description}
                  </TableCell>
                  <TableCell>£{entry.totalAmount || 0}</TableCell>
                  <TableCell>{entry.mileage?.miles || 0}</TableCell>
                  <TableCell>£{entry.mileage?.amount || 0}</TableCell>
                  <TableCell>{entry.expenses?.description || ""}</TableCell>
                  <TableCell>£{entry.expenses?.amount || 0}</TableCell>
                  <TableCell>{entry.overtime?.hours || 0}</TableCell>
                  <TableCell>£{entry.overtime?.amount || 0}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => onEdit(entry)}
                        size="sm"
                        variant="outline"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => onDelete(entry._id)}
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination with limited page numbers */}
        <div className="mt-4 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
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
                      Math.min(
                        prev + 1,
                        Math.ceil(sortedData.length / entriesPerPage)
                      )
                    )
                  }
                  className={
                    currentPage >= Math.ceil(sortedData.length / entriesPerPage)
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}
