export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
import {
  buildCustomerJobsQuery,
  ensureJobFolderIndexes,
  normalizeFolderName,
  syncAutomaticJobFolders,
} from "@/lib/job-folders";
import clientPromise from "@/lib/mongodb";

function getClientPrice(job: Record<string, any>) {
  const rawPrice =
    job.clientPrice ??
    job.estimatedCost?.totalCost ??
    job.estimatedCosts?.totalCost ??
    job.jobEstimate?.estimatedCost?.totalCost ??
    job.jobEstimate?.estimatedCosts?.totalCost ??
    0;

  const parsedPrice = Number(rawPrice);
  return Number.isFinite(parsedPrice) ? parsedPrice : 0;
}

function serializeJob(job: Record<string, any>) {
  return {
    _id: job._id.toString(),
    jobName: job.jobName || "Untitled Job",
    jobReference:
      job.jobReference || job.jobEstimate?.jobReference || null,
    assignDate: job.assignDate || job.startDate || null,
    status: job.status || "pending",
    clientPrice: getClientPrice(job),
    clientName: job.clientName || null,
    managerName:
      job.managerName ||
      job.jobEstimate?.managerDetails?.fullName ||
      job.jobEstimate?.manager ||
      null,
    folderId: job.folderId?.toString() || null,
    folderName: job.folderName || null,
    folderAssignment: job.folderAssignment || null,
  };
}

async function getRequestedCustomerAccountId(
  request: NextRequest,
  session: any
) {
  if (session.user.role === "customer") {
    return session.user.id;
  }

  if (session.user.role === "admin") {
    return new URL(request.url).searchParams.get("customerAccountId");
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    if (!["admin", "customer"].includes(session.user.role || "")) {
      return NextResponse.json(
        { message: "You do not have permission to view job folders." },
        { status: 403 }
      );
    }

    const requestedAccountId =
      (await getRequestedCustomerAccountId(request, session)) || "";

    if (
      !requestedAccountId ||
      !ObjectId.isValid(requestedAccountId)
    ) {
      return NextResponse.json(
        {
          message:
            session.user.role === "admin"
              ? "Select a customer account to view its job folders."
              : "Invalid customer account.",
        },
        { status: 400 }
      );
    }

    const customerAccountId = new ObjectId(requestedAccountId);
    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const customerAccount = await db.collection("users").findOne({
      _id: customerAccountId,
      role: "customer",
    });

    if (!customerAccount) {
      return NextResponse.json(
        { message: "Customer account not found." },
        { status: 404 }
      );
    }

    await syncAutomaticJobFolders(db, customerAccountId);

    const customerJobsQuery = await buildCustomerJobsQuery(
      db,
      customerAccountId
    );

    const [folders, jobs] = await Promise.all([
      db
        .collection("job_folders")
        .find({ customerAccountId })
        .sort({ name: 1, createdAt: 1 })
        .toArray(),
      db
        .collection("jobs")
        .find(customerJobsQuery)
        .sort({ assignDate: -1, createdAt: -1 })
        .toArray(),
    ]);

    const jobsByFolder = new Map<string, Record<string, any>[]>();
    const validFolderIds = new Set(
      folders.map((folder) => folder._id.toString())
    );
    const unfiledJobs: Record<string, any>[] = [];

    jobs.forEach((job) => {
      const folderId = job.folderId?.toString();
      const serializedJob = serializeJob(job);

      if (!folderId || !validFolderIds.has(folderId)) {
        unfiledJobs.push(serializedJob);
        return;
      }

      const folderJobs = jobsByFolder.get(folderId) || [];
      folderJobs.push(serializedJob);
      jobsByFolder.set(folderId, folderJobs);
    });

    const serializedFolders = folders.map((folder) => ({
      _id: folder._id.toString(),
      name: folder.name,
      assignmentMode: folder.assignmentMode || "manual",
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      jobs: jobsByFolder.get(folder._id.toString()) || [],
      jobCount: (jobsByFolder.get(folder._id.toString()) || []).length,
    }));

    return NextResponse.json(
      {
        customer: {
          customerAccountId: customerAccountId.toString(),
          displayName:
            customerAccount.company ||
            customerAccount.name ||
            customerAccount.email,
          email: customerAccount.email || "",
        },
        folders: serializedFolders,
        unfiledJobs,
        summary: {
          totalFolders: serializedFolders.length,
          totalJobs: jobs.length,
          filedJobs: jobs.length - unfiledJobs.length,
          unfiledJobs: unfiledJobs.length,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error loading job folders:", error);

    return NextResponse.json(
      { message: "Failed to load job folders." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Only administrators can create job folders." },
        { status: session?.user ? 403 : 401 }
      );
    }

    const body = await request.json();
    const customerAccountIdValue = String(
      body.customerAccountId || ""
    );
    const name = String(body.name || "").trim().replace(/\s+/g, " ");

    if (!ObjectId.isValid(customerAccountIdValue)) {
      return NextResponse.json(
        { message: "Select a valid customer account." },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { message: "Folder names must contain between 2 and 80 characters." },
        { status: 400 }
      );
    }

    const normalizedName = normalizeFolderName(name);

    if (!normalizedName) {
      return NextResponse.json(
        { message: "Folder names must contain letters or numbers." },
        { status: 400 }
      );
    }

    const customerAccountId = new ObjectId(customerAccountIdValue);
    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const customerAccount = await db.collection("users").findOne({
      _id: customerAccountId,
      role: "customer",
      isApproved: true,
    });

    if (!customerAccount) {
      return NextResponse.json(
        { message: "The selected customer account is not active." },
        { status: 400 }
      );
    }

    await ensureJobFolderIndexes(db);

    const duplicateFolder = await db
      .collection("job_folders")
      .findOne({ customerAccountId, normalizedName });

    if (duplicateFolder) {
      return NextResponse.json(
        { message: "A folder with this name already exists for the customer." },
        { status: 409 }
      );
    }

    const now = new Date();
    const result = await db.collection("job_folders").insertOne({
      customerAccountId,
      name,
      normalizedName,
      assignmentMode: "manual",
      createdBy: session.user.id,
      createdByName: session.user.name,
      createdByRole: "admin",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        _id: result.insertedId.toString(),
        name,
        assignmentMode: "manual",
        jobs: [],
        jobCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "A folder with this name already exists for the customer." },
        { status: 409 }
      );
    }

    console.error("Error creating job folder:", error);

    return NextResponse.json(
      { message: "Failed to create the job folder." },
      { status: 500 }
    );
  }
}
