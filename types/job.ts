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
  overtimeHours?: number;
  overtimeCost?: number;
  statusChange?: boolean;
  newStatus?: string | null;
}

export interface Job {
  _id: string;
  clientName: string;
  userId: string;
  jobName?: any;
  workerName: string;
  assignDate: Date | string;
  expireDate: any | string;
  description: string;
  status: string;
  clientPrice?: number;
  workerPaymentRate?: number; // For backward compatibility
  workerHourlyRate?: number; // For backward compatibility
  workers?: Worker[]; // New field for multiple workers
  progressLogs?: JobProgressLog[];
  createdAt: Date | string;
  updatedAt: Date | string;
}
