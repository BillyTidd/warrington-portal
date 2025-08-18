export interface Worker {
  userId: string;
  workerName: string;
  paymentRate?: number;
  hourlyRate?: number;
}
export interface Vehicle {
  _id: string;
  name: string;
  type: string;
  pricePerMile: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface VehicleUsage {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  pricePerMile: number;
  fromPostcode: string; // This will be the company address
  toPostcode: string;
  distance: number;
  totalCost: number;
}

export interface JobProgressLog {
  _id?: string;
  timestamp: Date | string;
  updatedBy: string;
  updatedByName: string;
  details: string;
  workType?: "regular" | "extra" | "vehicle";
  cost?: number;
  overtimeHours?: number;
  overtimeCost?: number;
  vehicleUsage?: VehicleUsage;
  statusChange?: boolean;
  newStatus?: string;
  jobStatus?: "pending" | "approved" | "rejected"; // New field for approval status
}

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
  progressLogs: JobProgressLog[];
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
  clientPrice?: number;
  workerPaymentRate?: number;
  workerHourlyRate?: number;
}
