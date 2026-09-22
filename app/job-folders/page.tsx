"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, parseISO } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BriefcaseBusiness,
  Eye,
  Folder,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Layout } from "@/components/Layout";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type FolderJob = {
  _id: string;
  jobName: string;
  jobReference?: string | null;
  assignDate?: string | null;
  status: string;
  clientPrice: number;
  clientName?: string | null;
  managerName?: string | null;
  folderId?: string | null;
  folderName?: string | null;
  folderAssignment?: "automatic" | "manual" | null;
};

type JobFolder = {
  _id: string;
  name: string;
  assignmentMode: "automatic" | "manual";
  jobCount: number;
  jobs: FolderJob[];
};

type FolderResponse = {
  customer: {
    customerAccountId: string;
    displayName: string;
    email: string;
  };
  folders: JobFolder[];
  unfiledJobs: FolderJob[];
  summary: {
    totalFolders: number;
    totalJobs: number;
    filedJobs: number;
    unfiledJobs: number;
  };
};

type CustomerAccount = {
  customerAccountId: string;
  displayName: string;
  email: string;
};

type FolderSortField =
  | "jobName"
  | "assignDate"
  | "status"
  | "managerName"
  | "clientPrice";

type SortDirection = "asc" | "desc";

function formatJobDate(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return "Not scheduled";
  }
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data.message || fallback;
  } catch {
    return fallback;
  }
}

export default function JobFoldersPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const isCustomer = session?.user?.role === "customer";

  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>(
    []
  );
  const [selectedCustomerAccountId, setSelectedCustomerAccountId] =
    useState("");
  const [folderData, setFolderData] = useState<FolderResponse | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<JobFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<JobFolder | null>(null);

  const [sortBy, setSortBy] = useState<FolderSortField>("jobName");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace("/login?returnUrl=/job-folders");
      return;
    }

    if (
      sessionStatus === "authenticated" &&
      !["admin", "customer"].includes(session?.user?.role || "")
    ) {
      router.replace("/job-portal");
    }
  }, [router, session?.user?.role, sessionStatus]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let cancelled = false;

    async function loadCustomerAccounts() {
      try {
        const response = await fetch(
          "/api/v1/admin/customer-accounts",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(
            await readApiError(response, "Failed to load customer accounts.")
          );
        }

        const data = await response.json();
        const customers = Array.isArray(data.customers)
          ? data.customers
          : [];

        if (!cancelled) {
          setCustomerAccounts(customers);
          setSelectedCustomerAccountId((current) =>
            current || customers[0]?.customerAccountId || ""
          );
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error.message || "Failed to load customer accounts.");
          setIsLoading(false);
        }
      }
    }

    loadCustomerAccounts();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const loadFolders = useCallback(async () => {
    if (!isAdmin && !isCustomer) {
      return;
    }

    if (isAdmin && !selectedCustomerAccountId) {
      setFolderData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const query = isAdmin
        ? `?customerAccountId=${encodeURIComponent(
            selectedCustomerAccountId
          )}`
        : "";
      const response = await fetch(`/api/job-folders${query}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to load job folders.")
        );
      }

      const data: FolderResponse = await response.json();
      setFolderData(data);

      setSelectedFolderId((current) => {
        const currentStillExists =
          current === "unfiled"
            ? data.unfiledJobs.length > 0
            : data.folders.some((folder) => folder._id === current);

        if (current && currentStillExists) {
          return current;
        }

        return data.folders[0]?._id ||
          (data.unfiledJobs.length > 0 ? "unfiled" : null);
      });
    } catch (error: any) {
      setFolderData(null);
      toast.error(error.message || "Failed to load job folders.");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isCustomer, selectedCustomerAccountId]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      loadFolders();
    }
  }, [loadFolders, sessionStatus]);

  const selectedFolder = useMemo(() => {
    if (!folderData || !selectedFolderId) {
      return null;
    }

    if (selectedFolderId === "unfiled") {
      return {
        _id: "unfiled",
        name: "Unfiled Jobs",
        assignmentMode: "manual" as const,
        jobCount: folderData.unfiledJobs.length,
        jobs: folderData.unfiledJobs,
      };
    }

    return (
      folderData.folders.find(
        (folder) => folder._id === selectedFolderId
      ) || null
    );
  }, [folderData, selectedFolderId]);

  const sortedJobs = useMemo(() => {
    const jobs = [...(selectedFolder?.jobs || [])];
    const direction = sortDirection === "asc" ? 1 : -1;

    return jobs.sort((left, right) => {
      if (sortBy === "clientPrice") {
        return (left.clientPrice - right.clientPrice) * direction;
      }

      if (sortBy === "assignDate") {
        const leftDate = left.assignDate
          ? new Date(left.assignDate).getTime()
          : 0;
        const rightDate = right.assignDate
          ? new Date(right.assignDate).getTime()
          : 0;
        return (leftDate - rightDate) * direction;
      }

      const leftValue = String(left[sortBy] || "");
      const rightValue = String(right[sortBy] || "");

      return (
        leftValue.localeCompare(rightValue, "en-GB", {
          numeric: true,
          sensitivity: "base",
        }) * direction
      );
    });
  }, [selectedFolder?.jobs, sortBy, sortDirection]);

  const changeSort = (field: FolderSortField) => {
    if (sortBy === field) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
      return;
    }

    setSortBy(field);
    setSortDirection("asc");
  };

  const openCreateFolderDialog = () => {
    setEditingFolder(null);
    setFolderName("");
    setFolderDialogOpen(true);
  };

  const openRenameFolderDialog = (folder: JobFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDialogOpen(true);
  };

  const saveFolder = async () => {
    const cleanName = folderName.trim().replace(/\s+/g, " ");

    if (cleanName.length < 2) {
      toast.error("Enter a folder name containing at least two characters.");
      return;
    }

    if (!selectedCustomerAccountId && isAdmin) {
      toast.error("Select a customer first.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        editingFolder
          ? `/api/job-folders/${editingFolder._id}`
          : "/api/job-folders",
        {
          method: editingFolder ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingFolder
              ? { name: cleanName }
              : {
                  name: cleanName,
                  customerAccountId: selectedCustomerAccountId,
                }
          ),
        }
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to save the folder.")
        );
      }

      const savedFolder = await response.json();
      toast.success(
        editingFolder
          ? "Folder renamed successfully."
          : "Folder created successfully."
      );
      setFolderDialogOpen(false);
      setSelectedFolderId(savedFolder._id);
      await loadFolders();
    } catch (error: any) {
      toast.error(error.message || "Failed to save the folder.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFolder = async () => {
    if (!folderToDelete) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/job-folders/${folderToDelete._id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to delete the folder.")
        );
      }

      toast.success(
        "Folder deleted. Its jobs have been moved to Unfiled Jobs."
      );
      setFolderToDelete(null);
      setSelectedFolderId("unfiled");
      await loadFolders();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete the folder.");
    } finally {
      setIsSaving(false);
    }
  };

  const moveJob = async (jobId: string, folderId: string) => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/job-folders/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: folderId === "unfiled" ? null : folderId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Failed to move the job.")
        );
      }

      const data = await response.json();
      toast.success(data.message || "Job moved successfully.");
      await loadFolders();
    } catch (error: any) {
      toast.error(error.message || "Failed to move the job.");
    } finally {
      setIsSaving(false);
    }
  };

  const SortIcon = ({ field }: { field: FolderSortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  const SortHeader = ({
    field,
    children,
    align = "left",
  }: {
    field: FolderSortField;
    children: React.ReactNode;
    align?: "left" | "right";
  }) => (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 rounded px-1 py-1 font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
          align === "right" && "ml-auto"
        )}
        onClick={() => changeSort(field)}
      >
        {children}
        <SortIcon field={field} />
      </button>
    </TableHead>
  );

  if (
    sessionStatus === "loading" ||
    (sessionStatus === "authenticated" && !isAdmin && !isCustomer)
  ) {
    return null;
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Job Folders
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">
              Jobs with the same whole-word base name are grouped together.
              For example, Ali Asgar 1 and Ali Asgar 2 appear in the Ali Asgar
              folder.
            </p>
          </div>

          {isAdmin && (
            <Button
              onClick={openCreateFolderDialog}
              disabled={!selectedCustomerAccountId}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Folder
            </Button>
          )}
        </div>

        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer account</CardTitle>
              <CardDescription>
                Choose the customer whose folders you want to manage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedCustomerAccountId}
                onValueChange={(value) => {
                  setSelectedCustomerAccountId(value);
                  setSelectedFolderId(null);
                }}
              >
                <SelectTrigger className="w-full sm:max-w-md">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customerAccounts.map((customer) => (
                    <SelectItem
                      key={customer.customerAccountId}
                      value={customer.customerAccountId}
                    >
                      {customer.displayName} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="flex min-h-64 items-center justify-center">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Loading job folders...
            </CardContent>
          </Card>
        ) : !folderData ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              {isAdmin && customerAccounts.length === 0
                ? "No active customer accounts are available."
                : "Select a customer to view job folders."}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Folder className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {folderData.summary.totalFolders}
                    </p>
                    <p className="text-xs text-muted-foreground">Folders</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <BriefcaseBusiness className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {folderData.summary.totalJobs}
                    </p>
                    <p className="text-xs text-muted-foreground">All jobs</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <FolderOpen className="h-8 w-8 text-emerald-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {folderData.summary.filedJobs}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Filed jobs
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Folder className="h-8 w-8 text-slate-400" />
                  <div>
                    <p className="text-2xl font-bold">
                      {folderData.summary.unfiledJobs}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Unfiled jobs
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {folderData.customer.displayName}
                  </CardTitle>
                  <CardDescription>
                    Select a folder to open it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {folderData.folders.map((folder) => (
                    <div
                      key={folder._id}
                      className={cn(
                        "rounded-lg border transition-colors",
                        selectedFolderId === folder._id
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 p-3 text-left"
                        onClick={() => setSelectedFolderId(folder._id)}
                      >
                        {selectedFolderId === folder._id ? (
                          <FolderOpen className="h-5 w-5 shrink-0 text-amber-600" />
                        ) : (
                          <Folder className="h-5 w-5 shrink-0 text-amber-500" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {folder.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {folder.jobCount} {folder.jobCount === 1 ? "job" : "jobs"}
                          </span>
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {folder.assignmentMode === "automatic"
                            ? "Auto"
                            : "Custom"}
                        </Badge>
                      </button>

                      {isAdmin && (
                        <div className="flex justify-end gap-1 border-t px-2 py-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRenameFolderDialog(folder)}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Rename
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setFolderToDelete(folder)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      selectedFolderId === "unfiled"
                        ? "border-slate-500 bg-slate-100 dark:bg-slate-900"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedFolderId("unfiled")}
                  >
                    <Folder className="h-5 w-5 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">Unfiled Jobs</span>
                      <span className="text-xs text-muted-foreground">
                        {folderData.unfiledJobs.length}{" "}
                        {folderData.unfiledJobs.length === 1 ? "job" : "jobs"}
                      </span>
                    </span>
                  </button>
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-amber-500" />
                      {selectedFolder?.name || "Select a folder"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {selectedFolder
                        ? `${selectedFolder.jobCount} ${
                            selectedFolder.jobCount === 1 ? "job" : "jobs"
                          }`
                        : "Choose a folder from the list."}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent>
                  {!selectedFolder ? (
                    <div className="py-16 text-center text-muted-foreground">
                      Select a folder to see its jobs.
                    </div>
                  ) : selectedFolder.jobs.length === 0 ? (
                    <div className="py-16 text-center">
                      <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="mt-3 font-medium">This folder is empty.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isAdmin
                          ? "Move a job here using the folder selector on another job."
                          : "Jobs will appear here when they are assigned to this folder."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row md:hidden">
                        <Select
                          value={sortBy}
                          onValueChange={(value) =>
                            setSortBy(value as FolderSortField)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sort jobs" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="jobName">Job name</SelectItem>
                            <SelectItem value="assignDate">Start date</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="managerName">Manager</SelectItem>
                            <SelectItem value="clientPrice">Price</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setSortDirection((current) =>
                              current === "asc" ? "desc" : "asc"
                            )
                          }
                        >
                          {sortDirection === "asc" ? (
                            <ArrowUp className="mr-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="mr-2 h-4 w-4" />
                          )}
                          {sortDirection === "asc" ? "Ascending" : "Descending"}
                        </Button>
                      </div>

                      <div className="space-y-3 md:hidden">
                        {sortedJobs.map((job) => (
                          <article
                            key={job._id}
                            className="rounded-xl border p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate font-semibold">
                                  {job.jobName}
                                </h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {job.jobReference
                                    ? `Job #${job.jobReference}`
                                    : formatJobDate(job.assignDate)}
                                </p>
                              </div>
                              <StatusBadge status={job.status} />
                            </div>

                            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <dt className="text-muted-foreground">
                                  Start date
                                </dt>
                                <dd className="font-medium">
                                  {formatJobDate(job.assignDate)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground">
                                  Manager
                                </dt>
                                <dd className="font-medium">
                                  {job.managerName || job.clientName || "Not assigned"}
                                </dd>
                              </div>
                              <div className="col-span-2">
                                <dt className="text-muted-foreground">Price</dt>
                                <dd className="font-semibold">
                                  £{Number(job.clientPrice || 0).toFixed(2)}
                                </dd>
                              </div>
                            </dl>

                            {isAdmin && (
                              <div className="mt-4">
                                <Label className="text-xs text-muted-foreground">
                                  Move to folder
                                </Label>
                                <Select
                                  value={job.folderId || "unfiled"}
                                  onValueChange={(value) => moveJob(job._id, value)}
                                  disabled={isSaving}
                                >
                                  <SelectTrigger className="mt-1 min-h-11">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unfiled">
                                      Unfiled Jobs
                                    </SelectItem>
                                    {folderData.folders.map((folder) => (
                                      <SelectItem
                                        key={folder._id}
                                        value={folder._id}
                                      >
                                        {folder.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <Button asChild className="mt-3 min-h-11 w-full">
                              <Link href={`/job-portal/${job._id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Job
                              </Link>
                            </Button>
                          </article>
                        ))}
                      </div>

                      <div className="hidden overflow-x-auto md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <SortHeader field="jobName">Job Name</SortHeader>
                              <SortHeader field="assignDate">
                                Start Date
                              </SortHeader>
                              <SortHeader field="status">Status</SortHeader>
                              <SortHeader field="managerName">
                                Manager
                              </SortHeader>
                              <SortHeader field="clientPrice" align="right">
                                Price
                              </SortHeader>
                              {isAdmin && <TableHead>Folder</TableHead>}
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedJobs.map((job) => (
                              <TableRow key={job._id}>
                                <TableCell>
                                  <p className="font-medium">{job.jobName}</p>
                                  {job.jobReference && (
                                    <p className="text-xs text-muted-foreground">
                                      #{job.jobReference}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {formatJobDate(job.assignDate)}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={job.status} />
                                </TableCell>
                                <TableCell>
                                  {job.managerName ||
                                    job.clientName ||
                                    "Not assigned"}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  £{Number(job.clientPrice || 0).toFixed(2)}
                                </TableCell>
                                {isAdmin && (
                                  <TableCell className="min-w-52">
                                    <Select
                                      value={job.folderId || "unfiled"}
                                      onValueChange={(value) =>
                                        moveJob(job._id, value)
                                      }
                                      disabled={isSaving}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unfiled">
                                          Unfiled Jobs
                                        </SelectItem>
                                        {folderData.folders.map((folder) => (
                                          <SelectItem
                                            key={folder._id}
                                            value={folder._id}
                                          >
                                            {folder.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                )}
                                <TableCell className="text-right">
                                  <Button asChild variant="ghost" size="icon">
                                    <Link href={`/job-portal/${job._id}`}>
                                      <Eye className="h-4 w-4" />
                                      <span className="sr-only">View job</span>
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFolder ? "Rename folder" : "Create job folder"}
            </DialogTitle>
            <DialogDescription>
              {editingFolder
                ? "Changing this name will update it on every job currently in the folder."
                : "The folder will belong only to the selected customer account."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="folderName">Folder name</Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="e.g. Ali Asgar"
              maxLength={80}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveFolder();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFolderDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={saveFolder} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingFolder ? "Save Name" : "Create Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(folderToDelete)}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job folder?</AlertDialogTitle>
            <AlertDialogDescription>
              The folder will be deleted, but its {folderToDelete?.jobCount || 0}{" "}
              jobs will not be deleted. They will be moved to Unfiled Jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteFolder}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
