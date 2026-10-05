export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { type Document, ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
import { buildCustomerJobsQuery } from "@/lib/job-folders";
import {
  assignedWorkerJobsQuery,
  idString,
  REPORT_FOLDER_ID_PATTERN,
  selectedClientScope,
} from "@/lib/job-report-access";
import clientPromise from "@/lib/mongodb";

const MAX_REPORT_JOBS = 5000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function jobDateKey(job: Document): string | null {
  const value = job.assignDate || job.startDate || job.createdAt;
  if (!value) return null;

  if (typeof value === "string") {
    const dateOnlyMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnlyMatch) return dateOnlyMatch[1];
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function calculateClientPrice(job: Document): number {
  return numberValue(
    job.clientPrice ??
      job.estimatedCost?.totalCost ??
      job.estimatedCosts?.totalCost ??
      job.jobEstimate?.estimatedCost?.totalCost ??
      job.jobEstimate?.estimatedCosts?.totalCost ??
      0
  );
}

function reportJob(
  job: Document,
  role: string,
  sessionUserId: string
): Document {
  const jobReference =
    job.jobReference || job.jobEstimate?.jobReference || idString(job._id);
  const managerName =
    job.managerName ||
    job.jobEstimate?.managerDetails?.fullName ||
    job.jobEstimate?.manager ||
    null;

  const workers = Array.isArray(job.workers)
    ? job.workers.map((worker: Document) => {
        const basicWorker = {
          userId: idString(worker.userId),
          workerName: worker.workerName || "Assigned worker",
        };

        if (role === "admin" || idString(worker.userId) === sessionUserId) {
          return {
            ...basicWorker,
            paymentRate: numberValue(worker.paymentRate),
            hourlyRate: numberValue(worker.hourlyRate),
          };
        }

        return basicWorker;
      })
    : [];

  const client = job.client
    ? {
        _id: idString(job.client._id),
        name: job.client.name || "",
        email: role === "employee" ? "" : job.client.email || "",
        phone: role === "employee" ? "" : job.client.phone || "",
        address: job.client.address || "",
      }
    : undefined;

  const safeJob: Document = {
    _id: idString(job._id),
    id: idString(job.id || job._id),
    jobName: job.jobName || job.title || "Untitled job",
    title: job.title || job.jobName || "Untitled job",
    jobReference,
    clientName: job.clientName || client?.name || "",
    clientCompany: job.clientCompany || "",
    clientId: idString(job.clientId),
    customer_account_id: idString(
      job.customer_account_id || job.customerAccountId
    ),
    managerId: idString(job.managerId) || null,
    managerName,
    workerName: job.workerName || "",
    workers,
    assignDate: job.assignDate || null,
    startDate: job.startDate || null,
    createdAt: job.createdAt || null,
    updatedAt: job.updatedAt || null,
    description: job.description || "",
    status: job.status || "pending",
    client,
  };

  if (role !== "employee") {
    safeJob.clientEmail = job.clientEmail || client?.email || "";
    safeJob.clientPhone = job.clientPhone || client?.phone || "";
    safeJob.clientPrice = calculateClientPrice(job);
  }

  if (role === "admin") {
    safeJob.progressLogs = Array.isArray(job.progressLogs)
      ? job.progressLogs
      : [];
    safeJob.workerPaymentRate = numberValue(job.workerPaymentRate);
    safeJob.workerHourlyRate = numberValue(job.workerHourlyRate);
  }

  if (role === "employee") {
    safeJob.userId = idString(job.userId);
    safeJob.workerPaymentRate =
      idString(job.userId) === sessionUserId
        ? numberValue(job.workerPaymentRate)
        : 0;
    safeJob.progressLogs = Array.isArray(job.progressLogs)
      ? job.progressLogs.filter(
          (log: Document) =>
            idString(log.updatedBy) === sessionUserId ||
            idString(log.overtimeWorkerId) === sessionUserId
        )
      : [];
  }

  return safeJob;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Please log in to generate a report." },
        { status: 401 }
      );
    }

    const role = String(session.user.role || "");
    if (!["admin", "customer", "employee"].includes(role)) {
      return NextResponse.json(
        { message: "Your account cannot generate job reports." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const selectedClientId = searchParams.get("clientId") || "";
    const selectedFolderId = searchParams.get("folderId") || "";

    if (Boolean(startDate) !== Boolean(endDate)) {
      return NextResponse.json(
        { message: "Both a start date and an end date are required." },
        { status: 400 }
      );
    }

    if (
      (startDate && !DATE_KEY_PATTERN.test(startDate)) ||
      (endDate && !DATE_KEY_PATTERN.test(endDate)) ||
      (startDate && endDate && startDate > endDate)
    ) {
      return NextResponse.json(
        { message: "The selected report date range is invalid." },
        { status: 400 }
      );
    }

    if (selectedClientId && role !== "admin") {
      return NextResponse.json(
        { message: "Only administrators can select another customer." },
        { status: 403 }
      );
    }

    if (selectedFolderId && !REPORT_FOLDER_ID_PATTERN.test(selectedFolderId)) {
      return NextResponse.json(
        { message: "Select a valid job folder." },
        { status: 400 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db();
    const conditions: Document[] = [];

    if (role === "customer") {
      if (!REPORT_FOLDER_ID_PATTERN.test(session.user.id)) {
        return NextResponse.json(
          { message: "Invalid customer account." },
          { status: 400 }
        );
      }
      conditions.push(
        await buildCustomerJobsQuery(db, new ObjectId(session.user.id))
      );
    } else if (role === "employee") {
      conditions.push(assignedWorkerJobsQuery(session.user.id));
    }

    let selectedClientAccountId: ObjectId | null = null;
    if (selectedClientId) {
      const selection = await selectedClientScope(db, selectedClientId);
      if (!selection) {
        return NextResponse.json(
          { message: "Customer not found." },
          { status: 404 }
        );
      }
      conditions.push(selection.jobsQuery);
      selectedClientAccountId = selection.customerAccountId;
    }

    let folder: Document | null = null;
    if (selectedFolderId) {
      folder = await db.collection("job_folders").findOne({
        _id: new ObjectId(selectedFolderId),
      });
      if (!folder) {
        return NextResponse.json(
          { message: "Job folder not found. Please refresh the folder list." },
          { status: 404 }
        );
      }

      if (
        (role === "customer" &&
          idString(folder.customerAccountId) !== session.user.id) ||
        (role === "admin" &&
          selectedClientId &&
          idString(folder.customerAccountId) !==
            idString(selectedClientAccountId))
      ) {
        return NextResponse.json(
          { message: "You cannot generate a report for this folder." },
          { status: 403 }
        );
      }

      const folderIds: Array<string | ObjectId> = [selectedFolderId];
      folderIds.push(new ObjectId(selectedFolderId));
      conditions.push({ folderId: { $in: folderIds } });

      if (role === "employee") {
        const assignedFolderJob = await db.collection("jobs").findOne(
          { $and: conditions },
          { projection: { _id: 1 } }
        );
        if (!assignedFolderJob) {
          return NextResponse.json(
            { message: "You are not assigned to any job in this folder." },
            { status: 403 }
          );
        }
      }
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};
    const jobs = await db
      .collection("jobs")
      .find(query)
      .limit(MAX_REPORT_JOBS + 1)
      .toArray();

    if (jobs.length > MAX_REPORT_JOBS) {
      return NextResponse.json(
        {
          message:
            "This report contains more than 5,000 jobs. Please select a smaller date range, customer or folder.",
        },
        { status: 413 }
      );
    }

    const filteredJobs = jobs
      .filter((job) => {
        if (!startDate || !endDate) return true;

        const key = jobDateKey(job);
        return Boolean(key && key >= startDate && key <= endDate);
      })
      .sort((a, b) => {
        const aKey = jobDateKey(a) || "9999-12-31";
        const bKey = jobDateKey(b) || "9999-12-31";
        return aKey.localeCompare(bKey) || idString(a._id).localeCompare(idString(b._id));
      })
      .map((job) => reportJob(job, role, session.user.id));

    return NextResponse.json(
      {
        jobs: filteredJobs,
        report: {
          count: filteredJobs.length,
          startDate: startDate || null,
          endDate: endDate || null,
          clientId: selectedClientId || null,
          folder: folder
            ? {
                _id: idString(folder._id),
                name: String(folder.name || "Untitled folder"),
              }
            : null,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error in GET /api/jobs/report:", error);
    return NextResponse.json(
      { message: "Unable to prepare the job report." },
      { status: 500 }
    );
  }
}
