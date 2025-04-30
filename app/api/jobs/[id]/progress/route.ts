import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import type { JobProgressLog } from "@/types/job";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid job ID" }, { status: 400 });
    }

    const progressData = await req.json();
    const client = await clientPromise;
    const db = client.db();

    // Check if user has permission to update this job
    const job = await db.collection("jobs").findOne({ _id: new ObjectId(id) });
    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    if (session.user.role !== "admin" && job.userId !== session.user.id) {
      return NextResponse.json(
        { message: "You don't have permission to update this job" },
        { status: 403 }
      );
    }

    // Create progress log entry
    const progressLog: JobProgressLog = {
      _id: new ObjectId().toString(),
      timestamp: new Date(),
      updatedBy: session.user.id,
      updatedByName: session.user.name,
      details: progressData.details,
      cost: progressData.cost,
      statusChange: progressData.statusChange || false,
      newStatus: progressData.newStatus,
    };

    // Update job status if this is a status change
    let statusUpdate = {};
    if (progressData.statusChange && progressData.newStatus) {
      statusUpdate = { status: progressData.newStatus };
    }

    // Add progress log to job
    const result = await db.collection("jobs").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { progressLogs: progressLog },
        $set: {
          ...statusUpdate,
          updatedAt: new Date(),
          updatedBy: session.user.id,
          updatedByName: session.user.name,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    const updatedJob = await db
      .collection("jobs")
      .findOne({ _id: new ObjectId(id) });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error(`Error in POST /api/jobs/${params.id}/progress:`, error);
    return NextResponse.json(
      { message: "An error occurred while updating job progress" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid job ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const logId = searchParams.get("logId");

    if (!logId) {
      return NextResponse.json(
        { message: "Log ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if user has permission to delete this log
    const job = await db.collection("jobs").findOne({ _id: new ObjectId(id) });
    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    if (session.user.role !== "admin" && job.userId !== session.user.id) {
      return NextResponse.json(
        { message: "You don't have permission to update this job" },
        { status: 403 }
      );
    }

    // Remove the progress log
    const result = await db.collection("jobs").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { progressLogs: { _id: logId } },
        $set: {
          updatedAt: new Date(),
          updatedBy: session.user.id,
          updatedByName: session.user.name,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    const updatedJob = await db
      .collection("jobs")
      .findOne({ _id: new ObjectId(id) });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error(`Error in DELETE /api/jobs/${params.id}/progress:`, error);
    return NextResponse.json(
      { message: "An error occurred while deleting job progress log" },
      { status: 500 }
    );
  }
}
