export interface Worker {
  userId: string;
  workerName: string;
  paymentRate?: number; // Total payment for the job
  hourlyRate?: number; // Hourly rate for overtime calculations
}

export interface JobProgressLog {
  _id?: string;
  timestamp: string | Date;
  updatedBy: string;
  updatedByName: string;
  details: string;
  cost?: number;
  overtimeHours?: number;
  overtimeCost?: number;
  statusChange?: boolean;
  newStatus?: string | null;
}

export interface Job {
  _id: string;
  jobName: string;
  clientName: string;
  clientId?: string;
  description: string;
  assignDate: string;
  expireDate: string;
  status?: "pending" | "in-progress" | "completed";
  clientPrice?: number;

  // New format - array of workers
  workers?: Worker[];

  // Old format - single worker (for backward compatibility)
  userId?: string;
  workerName?: string;
  workerPaymentRate?: number; // For backward compatibility
  workerHourlyRate?: number; // For backward compatibility

  progressLogs?: JobProgressLog[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
}
