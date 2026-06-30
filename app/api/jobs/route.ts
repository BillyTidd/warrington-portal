export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { startOfMonth, endOfMonth } from "date-fns";
import { ObjectId } from "mongodb";

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

    console.log("API Query Parameters:", {
      page,
      limit,
      startDate,
      endDate,
      clientId,
      status,
      searchTerm,
      viewMode,
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
      // Customer sees only jobs created from their booking requests
      query.clientId = session.user.id;
      console.log("Customer user - filtering by clientId:", session.user.id);
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
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray()
        : await db
            .collection("jobs")
            .find(query)
            .sort({ createdAt: -1 })
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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const jobData = await req.json();
    const client = await clientPromise;
    const db = client.db();

    // Handle backward compatibility - convert single userId/workerName to workers array
    if (!jobData.workers && jobData.userId) {
      jobData.workers = [
        {
          userId: jobData.userId,
          workerName: jobData.workerName || "Unknown Worker",
        },
      ];
      // Remove old fields to avoid confusion
      delete jobData.userId;
      delete jobData.workerName;
    }

    // If no workers are assigned, initialize empty array
    if (!jobData.workers) {
      jobData.workers = [];
    }

    // Add created by info and timestamps
    const jobToInsert = {
      ...jobData,
      createdBy: session.user.id,
      createdByName: session.user.name,
      createdAt: new Date(),
      updatedAt: new Date(),
      progressLogs: [], // Initialize empty progress logs array
    };

    const result = await db.collection("jobs").insertOne(jobToInsert);

    const newJob = await db
      .collection("jobs")
      .findOne({ _id: result.insertedId });

    return NextResponse.json(newJob, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/jobs:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the job" },
      { status: 500 }
    );
  }
}
