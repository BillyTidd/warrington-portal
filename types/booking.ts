import type { ObjectId } from "mongodb";

export type WorkerType = "team-leader" | "general-fitter" | "labourer";

export interface JobEstimate {
  numberOfWorkers: number;
  numberOfHours: number;
  jobDate: string; // ISO date string
  jobLocation: string;
  postcode?: string; // Optional postcode
  jobType?: string; // e.g., "Installation", "Repair", "Maintenance"
  jobDescription?: string;
  workerTypes?: WorkerType[]; // Specific types of workers requested
  vehicleType?: string; // e.g., "small-van", "large-van", "truck"
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
  convertedAt?: Date; // Timestamp when it was converted
  createdAt: Date;
  updatedAt: Date;
}
