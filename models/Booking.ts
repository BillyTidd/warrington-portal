import type { ObjectId } from "mongodb"

export interface JobEstimate {
  numberOfWorkers: number
  numberOfHours: number
  jobDate: Date
  jobLocation: string
  jobType: string
  jobDescription: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerCompany?: string
}

export interface BookingRequest {
  _id: ObjectId
  customerId: ObjectId
  customerName: string
  customerEmail: string
  customerPhone: string
  customerCompany?: string
  jobEstimate: JobEstimate
  estimatedCost: {
    laborCost: number
    materialCost: number
    travelCost: number
    totalCost: number
  }
  status: "pending" | "approved" | "rejected" | "converted"
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
  reviewedBy?: ObjectId
  reviewedByName?: string
  convertedJobId?: ObjectId
}
