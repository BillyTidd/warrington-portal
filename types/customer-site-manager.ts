export type CustomerSiteManagerStatus = "active" | "inactive";

export interface CustomerSiteManager {
  _id: string;
  customer_account_id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  status: CustomerSiteManagerStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
  deactivatedAt?: string | Date | null;
}

export interface ManagerSnapshot {
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
}