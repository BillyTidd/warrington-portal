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
  originalCost?: number; // Cost as originally submitted — never changed by later admin edits
  statusChange?: boolean;
  newStatus?: string | null;
  vehicleUsage?: any;
  jobStatus?: string;
  workType?: string; // Added for job status tracking
}

export interface Job {
  _id: string;
  id: string;

  clientName: string;
  userId: string;
  jobName?: any;
  hours?: any;
  clientId?: any;
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
}
