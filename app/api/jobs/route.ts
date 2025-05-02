import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Filter jobs based on user role
    let query = {};
    if (session.user.role !== "admin") {
      // For regular users, find jobs where they are in the workers array
      query = { "workers.userId": session.user.id };
    }

    const jobs = await db
      .collection("jobs")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(jobs);
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
