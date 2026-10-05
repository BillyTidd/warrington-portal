import { type Db, type Document, ObjectId } from "mongodb";

export const REPORT_FOLDER_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export function idString(value: unknown): string {
  return value == null ? "" : String(value);
}

function pushIdVariants(
  alternatives: Document[],
  field: string,
  value: unknown
): void {
  const id = idString(value);
  if (!id) return;

  alternatives.push({ [field]: id });
  if (REPORT_FOLDER_ID_PATTERN.test(id)) {
    alternatives.push({ [field]: new ObjectId(id) });
  }
}

export function assignedWorkerJobsQuery(userId: string): Document {
  const alternatives: Document[] = [];
  pushIdVariants(alternatives, "workers.userId", userId);
  return { $or: alternatives };
}

export async function selectedClientScope(
  db: Db,
  clientId: string
): Promise<{
  jobsQuery: Document;
  customerAccountId: ObjectId | null;
} | null> {
  if (!REPORT_FOLDER_ID_PATTERN.test(clientId)) return null;

  const objectId = new ObjectId(clientId);
  const client = await db.collection("clients").findOne({ _id: objectId });
  if (!client) return null;

  const accountId = idString(
    client.customer_account_id || client.customerAccountId
  );
  const customerAccountId = REPORT_FOLDER_ID_PATTERN.test(accountId)
    ? new ObjectId(accountId)
    : null;

  const alternatives: Document[] = [];
  pushIdVariants(alternatives, "clientId", clientId);

  if (customerAccountId) {
    for (const field of ["customer_account_id", "customerAccountId"]) {
      pushIdVariants(alternatives, field, accountId);
    }
  }

  return { jobsQuery: { $or: alternatives }, customerAccountId };
}
