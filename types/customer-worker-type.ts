export interface CustomerWorkerType {
  _id: string;
  customer_account_id: string;
  source_worker_type_id?: string | null;
  name: string;
  value: string;
  dayRate: number;
  overtimeRate: number;
  icon?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}
