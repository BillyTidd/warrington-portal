import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

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
    // Admins see all jobs, regular users only see jobs assigned to them
    let query = {};
    if (session.user.role !== "admin") {
      query = { userId: session.user.id }; // Use userId instead of workerName
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

    // If userId is provided, look up the user to get their name
    if (jobData.userId) {
      try {
        const user = await db
          .collection("users")
          .findOne({ _id: new ObjectId(jobData.userId) });
        if (user) {
          jobData.workerName = user.name;
        }
      } catch (error) {
        console.error("Error looking up user:", error);
      }
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
