import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const jobId = params.id;
    if (!jobId || !ObjectId.isValid(jobId)) {
      return NextResponse.json({ message: "Invalid job ID" }, { status: 400 });
    }

    const {
      details,
      workType,
      cost,
      overtimeHours,
      overtimeCost,
      vehicleUsage,
      statusChange,
      newStatus,
      jobStatus = "pending", // Default to pending for new progress entries
    } = await request.json();

    const progressLog = {
      _id: new ObjectId().toString(), // Add a unique ID for each progress log
      timestamp: new Date(),
      updatedBy: session.user.id,
      updatedByName: session.user.name,
      details,
      workType,
      cost,
      overtimeHours,
      overtimeCost,
      vehicleUsage, // Store vehicle usage data
      statusChange,
      newStatus: statusChange ? newStatus : null,
      jobStatus: statusChange ? null : jobStatus, // Don't set jobStatus for status change entries
    };

    const client = await clientPromise;
    const db = client.db();

    // Update the job with the new progress log
    const result = await db.collection("jobs").updateOne(
      { _id: new ObjectId(jobId) },
      {
        $push: { progressLogs: progressLog } as any,
        $set: {
          updatedBy: session.user.id,
          updatedByName: session.user.name,
          updatedAt: new Date(),
          ...(statusChange ? { status: newStatus } : {}),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { message: "Failed to update job progress" },
        { status: 400 }
      );
    }

    // Get the updated job
    const updatedJob = await db
      .collection("jobs")
      .findOne({ _id: new ObjectId(jobId) });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error("Error updating job progress:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only admins can edit progress
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Only admins can edit progress entries" },
        { status: 403 }
      );
    }

    const jobId = params.id;
    if (!jobId || !ObjectId.isValid(jobId)) {
      return NextResponse.json({ message: "Invalid job ID" }, { status: 400 });
    }

    const { logId, cost, jobStatus } = await request.json();

    if (!logId) {
      return NextResponse.json(
        { message: "Log ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Find and update the specific progress log
    const result = await db.collection("jobs").updateOne(
      {
        _id: new ObjectId(jobId),
        "progressLogs._id": logId,
      },
      {
        $set: {
          "progressLogs.$.cost": cost,
          "progressLogs.$.jobStatus": jobStatus,
          updatedBy: session.user.id,
          updatedByName: session.user.name,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { message: "Progress log not found or failed to update" },
        { status: 404 }
      );
    }

    // Get the updated job
    const updatedJob = await db
      .collection("jobs")
      .findOne({ _id: new ObjectId(jobId) });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error("Error updating progress log:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const jobId = params.id;
    if (!jobId || !ObjectId.isValid(jobId)) {
      return NextResponse.json({ message: "Invalid job ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get("logId");

    if (!logId) {
      return NextResponse.json(
        { message: "Log ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get the job
    const job = await db
      .collection("jobs")
      .findOne({ _id: new ObjectId(jobId) });

    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    // Check if the job has progress logs
    if (!job.progressLogs || job.progressLogs.length === 0) {
      return NextResponse.json(
        { message: "No progress logs found" },
        { status: 404 }
      );
    }

    // First, try to add _id to any logs that don't have one
    let migrationNeeded = false;
    const updatedLogs = job.progressLogs.map((log: any) => {
      if (!log._id) {
        migrationNeeded = true;
        return { ...log, _id: new ObjectId().toString() };
      }
      return log;
    });

    // If we needed to add IDs, update the job first
    if (migrationNeeded) {
      await db
        .collection("jobs")
        .updateOne(
          { _id: new ObjectId(jobId) },
          { $set: { progressLogs: updatedLogs } }
        );
    }

    // Determine if we're deleting by _id or by timestamp
    const isObjectId = ObjectId.isValid(logId);
    const isTimestamp = logId.includes("T") && logId.includes("Z");

    // Create the query to find the log to delete
    let deleteQuery: any = {};

    if (isObjectId) {
      // If it looks like an ObjectId, try to delete by _id
      deleteQuery = { "progressLogs._id": logId };
    } else if (isTimestamp) {
      // If it looks like a timestamp, try to delete by timestamp
      try {
        const timestamp = new Date(logId);
        deleteQuery = { "progressLogs.timestamp": timestamp };
      } catch (e) {
        // If parsing the timestamp fails, use the raw string
        deleteQuery = { "progressLogs.timestamp": logId };
      }
    } else {
      // If it's neither, try to match by string comparison with timestamp
      deleteQuery = {
        $or: [
          { "progressLogs._id": logId },
          { "progressLogs.timestamp": { $regex: logId, $options: "i" } },
        ],
      };
    }

    // Find the log to delete
    const jobWithLog = await db.collection("jobs").findOne({
      _id: new ObjectId(jobId),
      ...deleteQuery,
    });

    if (!jobWithLog) {
      return NextResponse.json(
        { message: "Progress log not found" },
        { status: 404 }
      );
    }

    // Find the specific log to check permissions
    const logToDelete = jobWithLog.progressLogs.find((log: any) => {
      if (isObjectId && log._id) {
        return log._id === logId;
      } else if (isTimestamp && log.timestamp) {
        const logTimestamp =
          typeof log.timestamp === "string"
            ? log.timestamp
            : log.timestamp.toISOString();
        return logTimestamp.includes(logId);
      }
      return false;
    });

    if (!logToDelete) {
      return NextResponse.json(
        { message: "Progress log not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = session.user.role === "admin";
    const isCreator = logToDelete.updatedBy === session.user.id;

    if (!isAdmin && !isCreator) {
      return NextResponse.json(
        { message: "You don't have permission to delete this log" },
        { status: 403 }
      );
    }

    // Create the pull query based on what we have
    let pullCriteria: any = {};

    if (logToDelete._id) {
      pullCriteria = { _id: logToDelete._id };
    } else {
      // If no _id, use timestamp and other fields to identify the log
      pullCriteria = {
        timestamp: logToDelete.timestamp,
        updatedBy: logToDelete.updatedBy,
        details: logToDelete.details,
      };

      // Add cost if it exists for more precise matching
      if (logToDelete.cost !== undefined) {
        pullCriteria.cost = logToDelete.cost;
      }
    }

    // Delete the log
    const result = await db.collection("jobs").updateOne(
      { _id: new ObjectId(jobId) },
      {
        $pull: { progressLogs: pullCriteria },
        $set: {
          updatedBy: session.user.id,
          updatedByName: session.user.name,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { message: "Failed to delete progress log" },
        { status: 400 }
      );
    }

    // Get the updated job
    const updatedJob = await db
      .collection("jobs")
      .findOne({ _id: new ObjectId(jobId) });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error("Error deleting progress log:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
