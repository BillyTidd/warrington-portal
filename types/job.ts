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

export interface Job {
  _id?: string;
  jobName: string;
  assignDate: string;
  expireDate: string;
  clientName: string;
  userId: string; // Store user ID instead of just name
  workerName: string; // Keep for display purposes
  description?: string;
  clientPrice?: number;
  status?: "pending" | "in-progress" | "completed";
  progressLogs?: JobProgressLog[]; // Add progress logs
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
