export interface PendingJobDocument {
  objectKey: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface JobDocument extends PendingJobDocument {
  _id: string;
  bookingRequestId: string;
  jobId?: string | null;
  uploadedBy: string;
  downloadPath: string;
  createdAt: string | Date;
}