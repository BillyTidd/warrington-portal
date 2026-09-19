import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import twilio from "twilio";

type AssignmentSmsResult = {
  workerId: string;
  workerName?: string;
  success: boolean;
  error?: string;
  messageSid?: string;
};

type SendAssignmentSmsOptions = {
  db: Db;
  job: any;
  workerIds: string[];
  sentBy: string;
  sentByName?: string | null;
};

let indexesEnsured = false;

async function ensureAssignmentNotificationIndexes(db: Db) {
  if (indexesEnsured) return;

  await db
    .collection("worker-assignment-notifications")
    .createIndex({ jobId: 1, workerId: 1, sentAt: -1 });

  indexesEnsured = true;
}

function getApplicationBaseUrl() {
  const configuredUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return (configuredUrl || "http://localhost:3000").replace(/\/$/, "");
}

function normaliseUkPhoneNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return null;
  if (hasLeadingPlus) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("44")) return `+${digits}`;
  if (digits.startsWith("0")) return `+44${digits.slice(1)}`;

  return `+${digits}`;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatJobDate(job: any): string {
  const rawDate = job.assignDate || job.jobEstimate?.jobDate || job.startDate;
  if (!rawDate) return "TBC";

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "TBC";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getJobLocation(job: any): string {
  const directLocation = [
    job.jobEstimate?.londonStartingPoint,
    job.jobEstimate?.siteAddress,
    job.jobEstimate?.jobLocation,
    job.siteAddress,
    job.jobLocation,
    job.address,
  ]
    .map(getString)
    .find(Boolean);

  if (directLocation) return directLocation;

  const postcodes = [
    ...(Array.isArray(job.jobEstimate?.postcodes)
      ? job.jobEstimate.postcodes
      : []),
    ...(Array.isArray(job.postcodes) ? job.postcodes : []),
    job.postcode,
  ]
    .map(getString)
    .filter(Boolean);

  return postcodes.length > 0 ? Array.from(new Set(postcodes)).join(", ") : "TBC";
}

function getJobDuration(job: any): string {
  const rawHours =
    job.estimatedHours ?? job.jobEstimate?.numberOfHours ?? job.hours;
  const hours = Number(rawHours);

  if (!Number.isFinite(hours) || hours <= 0) return "TBC";
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function buildWorkerAssignmentMessage(
  workerName: string,
  job: any
): string {
  const jobId = job._id?.toString?.() || String(job._id || "");
  const jobReference =
    getString(job.jobReference) ||
    getString(job.jobEstimate?.jobReference) ||
    jobId;
  const jobName = getString(job.jobName) || "Assigned job";
  const jobType =
    getString(job.jobType) || getString(job.jobEstimate?.jobType) || "General";
  const description = (
    getString(job.description) || getString(job.jobEstimate?.jobDescription)
  ).slice(0, 320);
  const jobUrl = `${getApplicationBaseUrl()}/job-portal/${jobId}`;

  const lines = [
    `Hi ${workerName}, you have been assigned the following job.`,
    "",
    `Job number: ${jobReference}`,
    `Job: ${jobName}`,
    `Type: ${jobType}`,
    `Date: ${formatJobDate(job)}`,
    `Duration: ${getJobDuration(job)}`,
    `Location: ${getJobLocation(job)}`,
  ];

  if (description) lines.push(`Details: ${description}`);

  lines.push(
    "",
    "Open the job for full details and to upload expenses:",
    jobUrl
  );

  return lines.join("\n");
}

export async function sendWorkerAssignmentSms({
  db,
  job,
  workerIds,
  sentBy,
  sentByName,
}: SendAssignmentSmsOptions): Promise<AssignmentSmsResult[]> {
  const uniqueWorkerIds = Array.from(
    new Set(workerIds.map(String).filter(Boolean))
  );

  if (uniqueWorkerIds.length === 0) return [];

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    const error = "Twilio SMS environment variables are not configured";
    console.error(error);
    return uniqueWorkerIds.map((workerId) => ({
      workerId,
      success: false,
      error,
    }));
  }

  try {
    await ensureAssignmentNotificationIndexes(db);
  } catch (error) {
    // Index creation is useful for the audit screen, but should never prevent
    // an otherwise valid job assignment or SMS attempt.
    console.error("Unable to ensure assignment notification indexes:", error);
  }

  const objectIds = uniqueWorkerIds
    .filter((workerId) => ObjectId.isValid(workerId))
    .map((workerId) => new ObjectId(workerId));

  const workers = await db
    .collection("users")
    .find({
      _id: { $in: objectIds },
      role: "employee",
    })
    .toArray();

  const workersById = new Map(
    workers.map((worker) => [worker._id.toString(), worker])
  );
  const assignedWorkersById = new Map(
    (Array.isArray(job.workers) ? job.workers : []).map((worker: any) => [
      worker.userId?.toString(),
      worker,
    ])
  );
  const twilioClient = twilio(accountSid, authToken);

  return Promise.all(
    uniqueWorkerIds.map(async (workerId): Promise<AssignmentSmsResult> => {
      const worker = workersById.get(workerId);
      const assignedWorker: any = assignedWorkersById.get(workerId);
      const workerName =
        getString(worker?.name) ||
        getString(assignedWorker?.workerName) ||
        "Worker";
      const to = normaliseUkPhoneNumber(worker?.phone);

      let result: AssignmentSmsResult;

      if (!worker) {
        result = {
          workerId,
          workerName,
          success: false,
          error: "Assigned worker account was not found",
        };
      } else if (!to) {
        result = {
          workerId,
          workerName,
          success: false,
          error: "Assigned worker does not have a valid SMS phone number",
        };
      } else {
        try {
          const message = await twilioClient.messages.create({
            body: buildWorkerAssignmentMessage(workerName, job),
            from: fromNumber,
            to,
          });

          result = {
            workerId,
            workerName,
            success: true,
            messageSid: message.sid,
          };
        } catch (error: any) {
          console.error(`Unable to send assignment SMS to ${workerId}:`, error);
          result = {
            workerId,
            workerName,
            success: false,
            error: error?.message || "Twilio could not send the SMS",
          };
        }
      }

      try {
        await db.collection("worker-assignment-notifications").insertOne({
          jobId: job._id,
          workerId,
          workerName,
          phone: to,
          channel: "sms",
          status: result.success ? "sent" : "failed",
          messageSid: result.messageSid || null,
          error: result.error || null,
          sentAt: new Date(),
          sentBy,
          sentByName: sentByName || null,
        });
      } catch (error) {
        console.error("Unable to save assignment SMS audit record:", error);
      }

      return result;
    })
  );
}
