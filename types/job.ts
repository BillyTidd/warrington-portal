import type { JobDocument } from "@/types/job-document";

export interface Worker {
  userId: string;
  workerName: string;
  paymentRate?: number;
  hourlyRate?: number;
}

export interface JobProgressLog {
  _id?: string;
  timestamp: string | Date;
  updatedBy: string;
  updatedByName: string;
  details: string;
  cost?: number;
  hours?: number;
  overtimeHours?: number;
  overtimeCost?: number;
  overtimeWorkerId?: string | null;
  overtimeWorkerName?: string | null;
  overtimeHourlyRate?: number | null;
  originalCost?: number; // Cost as originally submitted — never changed by later admin edits
  statusChange?: boolean;
  newStatus?: string | null;
  vehicleUsage?: any;
  jobStatus?: string;
  workType?: string; // Added for job status tracking
  costTreatment?: "billable" | "absorbed" | null;
}

export interface Job {
  _id: string;
  id: string;

  clientName: string;
  userId: string;
  jobName?: any;
  hours?: any;
  clientId?: any;
  customer_account_id?: string;
  clientEmail?: string;
  clientPhone?: string | null;
  clientCompany?: string | null;
  workerName: string;
  assignDate: Date | any;
  expireDate: any | string;
  description: string;
  status: string;
  clientPrice?: number;
  workerPaymentRate?: number; // For backward compatibility
  workerHourlyRate?: number; // For backward compatibility
  workers?: Worker[]; // New field for multiple workers
  progressLogs?: JobProgressLog[];
  documents?: JobDocument[];
  createdAt: Date | string;
  updatedAt: Date | string;
  title: string;
  client: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  priority: "low" | "medium" | "high";
  startDate: string;
  updatedBy: string;
  updatedByName: string;
  bookingRequestId?: string;
  postcode?: string;
  managerId?: string | null;
  managerName?: string | null;
  managerEmail?: string | null;
  managerPhone?: string | null;
  folderId?: string | null;
  folderName?: string | null;
  folderAssignment?: "automatic" | "manual" | null;
}

export type JobSortField =
  | "jobName"
  | "managerName"
  | "clientName"
  | "workers"
  | "assignDate"
  | "status"
  | "clientPrice";

export type JobSortDirection = "asc" | "desc";
