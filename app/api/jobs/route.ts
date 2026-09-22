export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { startOfMonth, endOfMonth } from "date-fns";
import { ObjectId } from "mongodb";
import { sendWorkerAssignmentSms } from "@/lib/worker-assignment-sms";
import { syncAutomaticJobFolders } from "@/lib/job-folders";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = Number.parseInt(url.searchParams.get("page") || "1");
    const limit = Number.parseInt(url.searchParams.get("limit") || "10");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const clientId = url.searchParams.get("clientId");
    const status = url.searchParams.get("status");
    const searchTerm = url.searchParams.get("search");
    const viewMode = url.searchParams.get("viewMode") || "list";
    const requestedSortBy = url.searchParams.get("sortBy") || "assignDate";
    const sortDirection =
      url.searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const allowedSortFields: Record<string, string> = {
      jobName: "jobName",
      managerName: "managerName",
      clientName: "clientName",
      workers: "workers.workerName",
      assignDate: "assignDate",
      status: "status",
      clientPrice: "clientPrice",
    };

    const sortField =
      allowedSortFields[requestedSortBy] || "assignDate";
    const sortObject: Record<string, 1 | -1> = {
      [sortField]: sortDirection,
      _id: sortDirection,
    };

    console.log("API Query Parameters:", {
      page,
      limit,
      startDate,
      endDate,
      clientId,
      status,
      searchTerm,
      viewMode,
      sortBy: requestedSortBy,
      sortOrder: sortDirection === 1 ? "asc" : "desc",
    });

    const client = await clientPromise;
    const db = client.db();

    // Build query based on parameters
    const query: any = {};

    // Filter by user role
    if (session.user.role === "admin") {
      // Admin sees all jobs
      console.log("Admin user - showing all jobs");
    } else if (session.user.role === "customer") {
  if (!ObjectId.isValid(session.user.id)) {
    return NextResponse.json(
      { message: "Invalid customer account" },
      { status: 401 }
    );
  }

  query.$and = [
    {
      $or: [
        {
          customer_account_id: new ObjectId(
            session.user.id
          ),
        },
        {
          customer_account_id: session.user.id,
        },

        // Temporary fallback until migration is finished
        {
          clientId: session.user.id,
        },
      ],
    },
  ];
} else {
      // Employee sees jobs they're assigned to work on
      query["workers.userId"] = session.user.id;
      console.log(
        "Employee user - filtering by workers.userId:",
        session.user.id
      );
    }

    // Filter by date range - handle both field naming conventions
    if (startDate && endDate) {
      // Create a date range query that works with both naming conventions
      query.$or = [
        // For assignDate/expireDate fields
        {
          $and: [
            {
              assignDate: {
                $lte: new Date(endDate).toISOString().split("T")[0],
              },
            },
            {
              expireDate: {
                $gte: new Date(startDate).toISOString().split("T")[0],
              },
            },
          ],
        },
        // For startDate/dueDate fields (if they exist)
        {
          $and: [
            { startDate: { $lte: new Date(endDate) } },
            { dueDate: { $gte: new Date(startDate) } },
          ],
        },
      ];
    } else if (viewMode === "calendar") {
      // For calendar view, default to current month if no dates provided
      const currentDate = new Date();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Format dates for string comparison with assignDate/expireDate
      const monthStartStr = monthStart.toISOString().split("T")[0];
      const monthEndStr = monthEnd.toISOString().split("T")[0];

      query.$or = [
        // For assignDate/expireDate fields (string format YYYY-MM-DD)
        {
          $and: [
            { assignDate: { $lte: monthEndStr } },
            { expireDate: { $gte: monthStartStr } },
          ],
        },
        // For startDate/dueDate fields (if they exist - Date objects)
        {
          $and: [
            { startDate: { $lte: monthEnd } },
            { dueDate: { $gte: monthStart } },
          ],
        },
      ];
    }

    // Filter by client
    if (clientId && clientId !== "all") {
      query.clientId = clientId;
    }

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Search by job name or description
    if (searchTerm) {
      query.$or = [
        { jobName: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { "client.name": { $regex: searchTerm, $options: "i" } },
        { clientName: { $regex: searchTerm, $options: "i" } },
      ];
    }

    console.log("MongoDB Query:", JSON.stringify(query, null, 2));

    // Get total count for pagination
    const totalJobs = await db.collection("jobs").countDocuments(query);

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch jobs with pagination for list view or all for calendar view
    const jobs =
      viewMode === "list"
        ? await db
            .collection("jobs")
            .find(query)
            .sort(sortObject)
            .skip(skip)
            .limit(limit)
            .toArray()
        : await db
            .collection("jobs")
            .find(query)
            .sort(sortObject)
            .toArray();

    // Fetch client details for each job if needed
    const jobsWithClientDetails = await Promise.all(
      jobs.map(async (job) => {
        if (job.clientId) {
          try {
            const clientData = await db
              .collection("clients")
              .findOne({ _id: new ObjectId(job.clientId) });

            return {
              ...job,
              client: clientData || {
                name: job.clientName || "Unknown Client",
              },
            };
          } catch (error) {
            console.error("Error fetching client data:", error);
            return job;
          }
        }
        return job;
      })
    );

    return NextResponse.json({
      jobs: jobsWithClientDetails,
      pagination: {
        total: totalJobs,
        page,
        limit,
        totalPages: Math.ceil(totalJobs / limit),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/jobs:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        {
          message:
            "Only administrators can create manual jobs",
        },
        { status: 403 }
      );
    }

    const jobData = await req.json();

    if (!jobData.jobName?.trim()) {
      return NextResponse.json(
        { message: "Job name is required" },
        { status: 400 }
      );
    }

    if (!jobData.assignDate) {
      return NextResponse.json(
        {
          message: "The job start date is required",
        },
        { status: 400 }
      );
    }

    // Keep the legacy field aligned with Start Date so existing calendar and
    // report code continues to work without showing a separate Due Date.
    jobData.expireDate = jobData.assignDate;

    const requestedCustomerAccountId = String(
      jobData.customer_account_id || ""
    );

    if (
      !requestedCustomerAccountId ||
      !ObjectId.isValid(requestedCustomerAccountId)
    ) {
      return NextResponse.json(
        {
          message:
            "A valid customer account must be selected",
        },
        { status: 400 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const customerAccountObjectId = new ObjectId(
      requestedCustomerAccountId
    );

    const customerAccount = await db
      .collection("users")
      .findOne({
        _id: customerAccountObjectId,
        role: "customer",
        isApproved: true,
      });

    if (!customerAccount) {
      return NextResponse.json(
        {
          message:
            "The selected customer account was not found or is inactive",
        },
        { status: 400 }
      );
    }

    let selectedManager: any = null;

    if (jobData.managerId) {
      if (!ObjectId.isValid(String(jobData.managerId))) {
        return NextResponse.json(
          { message: "Invalid customer manager" },
          { status: 400 }
        );
      }

      selectedManager = await db
        .collection("customer_site_managers")
        .findOne({
          _id: new ObjectId(String(jobData.managerId)),
          customer_account_id: customerAccountObjectId,
          status: "active",
        });

      if (!selectedManager) {
        return NextResponse.json(
          {
            message:
              "The selected manager does not belong to this customer or is inactive",
          },
          { status: 400 }
        );
      }
    }

    let linkedClient = await db
      .collection("clients")
      .findOne({
        $or: [
          {
            customerAccountId: customerAccountObjectId,
          },
          {
            customerAccountId:
              requestedCustomerAccountId,
          },
          {
            customer_account_id:
              customerAccountObjectId,
          },
          {
            customer_account_id:
              requestedCustomerAccountId,
          },
        ],
      });

    if (!linkedClient) {
      const clientInsertResult = await db
        .collection("clients")
        .insertOne({
          name:
            customerAccount.company ||
            customerAccount.name ||
            customerAccount.email,
          description: "Customer Portal account",
          customerAccountId: customerAccountObjectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      linkedClient = await db
        .collection("clients")
        .findOne({
          _id: clientInsertResult.insertedId,
        });
    }

    if (!linkedClient) {
      return NextResponse.json(
        {
          message:
            "Unable to create or resolve the client record",
        },
        { status: 500 }
      );
    }

    let workers = Array.isArray(jobData.workers)
      ? jobData.workers
      : [];

    if (workers.length === 0 && jobData.userId) {
      workers = [
        {
          userId: jobData.userId,
          workerName:
            jobData.workerName || "Unknown Worker",
        },
      ];
    }

    const {
      _id,
      customer_account_id,
      customerAccountId,
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      clientCompany,
      managerId,
      managerName,
      managerEmail,
      managerPhone,
      createdAt,
      updatedAt,
      createdBy,
      createdByName,
      progressLogs,
      documents,
      userId,
      workerName,
      folderId,
      folderName,
      folderAssignment,
      ...allowedJobData
    } = jobData;

    const now = new Date();

    const jobToInsert = {
      ...allowedJobData,

      workers,

      // Canonical customer credential link
      customer_account_id: customerAccountObjectId,

      // Existing Admin Client record link
      clientId: linkedClient._id.toString(),

      // Customer information snapshots
      clientName:
        linkedClient.name ||
        customerAccount.company ||
        customerAccount.name,
      clientEmail: customerAccount.email,
      clientPhone: customerAccount.phone || null,
      clientCompany: customerAccount.company || null,

      managerId: selectedManager?._id?.toString() || null,
      managerName:
        selectedManager?.fullName ||
        (selectedManager
          ? `${selectedManager.firstName || ""} ${
              selectedManager.lastName || ""
            }`.trim()
          : null),
      managerEmail: selectedManager?.email || null,
      managerPhone: selectedManager?.phone || null,

      createdBy: session.user.id,
      createdByName: session.user.name,
      createdAt: now,
      updatedAt: now,
      progressLogs: [],
    };

    const result = await db
      .collection("jobs")
      .insertOne(jobToInsert);

    try {
      await syncAutomaticJobFolders(db, customerAccountObjectId);
    } catch (folderError) {
      // The job is still valid if folder synchronization is temporarily
      // unavailable. Opening Job Folders safely retries the synchronization.
      console.error("Unable to synchronize automatic job folders:", folderError);
    }

    const newJob = await db
      .collection("jobs")
      .findOne({
        _id: result.insertedId,
      });

    if (newJob && workers.length > 0) {
      try {
        await sendWorkerAssignmentSms({
          db,
          job: newJob,
          workerIds: workers
            .map((worker: any) => worker?.userId?.toString())
            .filter(Boolean),
          sentBy: session.user.id,
          sentByName: session.user.name,
        });
      } catch (error) {
        // The saved job remains valid if Twilio is temporarily unavailable.
        console.error("Unable to send new-job assignment SMS:", error);
      }
    }

    return NextResponse.json(newJob, {
      status: 201,
    });
  } catch (error) {
    console.error("Error in POST /api/jobs:", error);

    return NextResponse.json(
      {
        message:
          "An error occurred while creating the job",
      },
      { status: 500 }
    );
  }
}
