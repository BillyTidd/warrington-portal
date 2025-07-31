import type { VehicleUsage } from "./vehicle";

export interface Job {
  _id: string;
  jobId: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "cancelled" | "on-hold";
  priority: "low" | "medium" | "high" | "urgent";
  startDate: Date;
  endDate: Date;
  client: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  workers: Array<{
    userId: string;
    name: string;
    role: string;
    hourlyRate?: number;
  }>;
  progress: Array<{
    description: string;
    amount: number;
    status: string;
    workType: "regular" | "extra" | "vehicle"; // Added vehicle type
    overtimeHours?: number;
    vehicleUsage?: VehicleUsage; // Added vehicle usage details
    timestamp: Date;
    recordedBy: {
      userId: string;
      name: string;
      role: string;
    };
  }>;
  financialSummary: {
    estimatedCost: number;
    actualCost: number;
    totalPaid: number;
    balanceDue: number;
  };
  attachments: Array<{
    filename: string;
    url: string;
    uploadedAt: Date;
  }>;
  notes: Array<{
    content: string;
    createdAt: Date;
    createdBy: {
      userId: string;
      name: string;
      role: string;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
  jobType: string;
  postcode: string;
  estimatedDurationHours: number;
  estimatedWorkers: number;
  vehicleType: string;
  bookingRequestId?: string;
}
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
  statusChange?: boolean;
  newStatus?: string | null;
}
