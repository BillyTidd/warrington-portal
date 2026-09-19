import type { ObjectId } from "mongodb";
import type { ManagerSnapshot } from "@/types/customer-site-manager";
import type { JobDocument } from "@/types/job-document";

export type WorkerType = "team-leader" | "general-fitter" | "labourer";

export interface JobEstimate {
  numberOfWorkers: number;
  numberOfHours: number;
  jobDate: string; // ISO date string
  jobLocation: string;
  postcode?: string; // Optional postcode
  jobType?: string; // e.g., "Installation", "Repair", "Maintenance"
  jobDescription?: string;
  jobReference?: string;
  postcodes?: string[];
  workerTypes?: WorkerType[]; // Specific types of workers requested
  vehicleType?: string; // e.g., "small-van", "large-van", "truck"
  team?: "default" | "london" | string;
  manager_id?: string;
  manager?: string;
  managerDetails?: ManagerSnapshot;
}

export interface LaborBreakdown {
  type: WorkerType;
  dayRate: number;
  overtimeHours: number;
  overtimeRate: number;
  cost: number;
}

export interface TravelBreakdown {
  distance: number;
  rate: number;
  vehicleType: string;
  fromAddress: string;
  toAddress: string;
}

export interface EstimatedCost {
  laborCost: number;
  materialCost?: number; // Optional, as some jobs might not have materials
  travelCost: number;
  totalCost: number;
  breakdown?: {
    labor?: LaborBreakdown[];
    travel?: TravelBreakdown;
    jobType?: string; // The job type that was used for multiplier
    jobTypeMultiplier?: number; // The multiplier applied
    toAddress?: string; // The address for travel cost calculation
  };
}

export interface BookingRequest {
  _id?: ObjectId; // MongoDB ObjectId
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany?: string;
  jobEstimate: JobEstimate;
  estimatedCost: EstimatedCost;
  status: "pending" | "approved" | "rejected" | "converted";
  adminNotes?: string;
  reviewedBy?: string; // User ID of the admin who reviewed it
  reviewedByName?: string; // Name of the admin who reviewed it
  convertedToJobId?: string; // ID of the job created from this request
  documents?: JobDocument[];
  convertedAt?: Date; // Timestamp when it was converted
  createdAt: Date;
  updatedAt: Date;
}
