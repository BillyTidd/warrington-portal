export interface JobProgressLog {
  _id?: string;
  timestamp: Date | string;
  updatedBy: string;
  updatedByName?: string;
  details: string;
  cost?: number;
  statusChange?: boolean;
  newStatus?: string;
}

export interface Worker {
  userId: string;
  workerName: string;
}

export interface Job {
  _id?: string;
  jobName: string;
  assignDate: string;
  expireDate: string;
  clientName: string;
  workers: Worker[]; // Array of workers instead of single userId/workerName
  description?: string;
  clientPrice?: number;
  status?: "pending" | "in-progress" | "completed";
  progressLogs?: JobProgressLog[];
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
