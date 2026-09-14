export interface PendingJobDocument {
  objectKey: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface JobDocument extends PendingJobDocument {
  _id: string;
  bookingRequestId?: string | null;
  jobId?: string | null;
  uploadedBy: string;
  uploadedByRole?: "admin" | "customer";
  downloadPath: string;
  createdAt: string | Date;
}
