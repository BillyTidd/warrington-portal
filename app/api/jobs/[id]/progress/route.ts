export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";



type CostTreatment = "billable" | "absorbed";

const isValidCostTreatment = (
  value: unknown
): value is CostTreatment => {
  return value === "billable" || value === "absorbed";
};

const getProgressCost = (log: any): number => {
  const rawCost =
    log.overtimeCost ??
    log.vehicleUsage?.totalCost ??
    log.cost ??
    0;

  const numericCost = Number(rawCost);

  return Number.isFinite(numericCost) ? numericCost : 0;
};

const getAccountingTreatment = (
  log: any
): CostTreatment | null => {
  if (isValidCostTreatment(log.costTreatment)) {
    return log.costTreatment;
  }

  // Backward compatibility for historical approved entries
  if (log.jobStatus === "approved") {
    return log.workType === "regular"
      ? "billable"
      : "absorbed";
  }

  return null;
};

const toPositiveNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : 0;
};

const getAssignedWorkers = (job: any) => {
  if (Array.isArray(job.workers) && job.workers.length > 0) {
    return job.workers
      .filter((worker: any) => worker?.userId)
      .map((worker: any) => ({
        userId: worker.userId.toString(),
        workerName: worker.workerName || "Assigned Worker",
        hourlyRate: toPositiveNumber(worker.hourlyRate),
      }));
  }

  const legacyWorkerId = job.userId || job.workerId;

  if (!legacyWorkerId) {
    return [];
  }

  return [
    {
      userId: legacyWorkerId.toString(),
      workerName: job.workerName || "Assigned Worker",
      hourlyRate: toPositiveNumber(job.workerHourlyRate),
    },
  ];
};


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate the user
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Validate the job ID
    const jobId = params.id;

    if (!jobId || !ObjectId.isValid(jobId)) {
      return NextResponse.json(
        { message: "Invalid job ID" },
        { status: 400 }
      );
    }

    // 3. Read the submitted progress information
    const {
      details,
      workType,
      cost,
      overtimeHours,
      overtimeCost,
      vehicleUsage,
      statusChange,
      newStatus,
      costTreatment,
      overtimeWorkerId,
      overtimeHourlyRate,
    } = await request.json();

    // 4. Connect to MongoDB and load the job
    const client = await clientPromise;
    const db = client.db();

    const job = await db.collection("jobs").findOne({
      _id: new ObjectId(jobId),
    });

    if (!job) {
      return NextResponse.json(
        { message: "Job not found" },
        { status: 404 }
      );
    }

    // 5. Check whether this is an Admin
    const isAdmin = session.user.role === "admin";

    // 6. Check whether this worker is assigned to the job
    const isAssignedWorker =
      job.workers?.some(
        (worker: any) =>
          worker.userId?.toString() ===
          session.user.id?.toString()
      ) ||
      job.workerId?.toString() ===
        session.user.id?.toString();

    // Only Admins and assigned workers can create progress entries
    if (!isAdmin && !isAssignedWorker) {
      return NextResponse.json(
        {
          message:
            "You are not authorized to update this job",
        },
        { status: 403 }
      );
    }

    let resolvedCost = cost;
    let resolvedOvertimeHours = overtimeHours;
    let resolvedOvertimeCost = overtimeCost;
    let resolvedOvertimeWorkerId: string | null = null;
    let resolvedOvertimeWorkerName: string | null = null;
    let resolvedOvertimeHourlyRate: number | null = null;

    // 7. Overtime is always calculated from hours and an hourly rate.
    // Admins must select one of the workers assigned to this job. If no worker
    // is assigned, or the selected worker has no saved rate, the Admin may
    // provide the hourly rate for this overtime entry.
    if (!statusChange && workType === "extra") {
      const numericHours = Number(overtimeHours);

      if (!Number.isFinite(numericHours) || numericHours <= 0) {
        return NextResponse.json(
          { message: "Enter a valid number of extra hours" },
          { status: 400 }
        );
      }

      const assignedWorkers = getAssignedWorkers(job);
      let selectedWorker: any = null;
      let effectiveHourlyRate = 0;

      if (isAdmin) {
        if (assignedWorkers.length > 0) {
          const requestedWorkerId = overtimeWorkerId?.toString() || "";

          selectedWorker = assignedWorkers.find(
            (worker: any) => worker.userId === requestedWorkerId
          );

          if (!selectedWorker) {
            return NextResponse.json(
              {
                message:
                  "Select a worker who is assigned to this job for the overtime entry",
              },
              { status: 400 }
            );
          }

          effectiveHourlyRate =
            selectedWorker.hourlyRate ||
            toPositiveNumber(overtimeHourlyRate);
        } else {
          effectiveHourlyRate = toPositiveNumber(overtimeHourlyRate);
        }
      } else {
        selectedWorker = assignedWorkers.find(
          (worker: any) =>
            worker.userId === session.user.id?.toString()
        );
        effectiveHourlyRate = toPositiveNumber(selectedWorker?.hourlyRate);
      }

      if (effectiveHourlyRate <= 0) {
        return NextResponse.json(
          {
            message: isAdmin
              ? "Enter a valid hourly rate for this overtime entry"
              : "No hourly rate is set. Please contact an administrator.",
          },
          { status: 400 }
        );
      }

      const calculatedOvertimeCost = Number(
        (numericHours * effectiveHourlyRate).toFixed(2)
      );

      resolvedCost = calculatedOvertimeCost;
      resolvedOvertimeHours = numericHours;
      resolvedOvertimeCost = calculatedOvertimeCost;
      resolvedOvertimeWorkerId = selectedWorker?.userId || null;
      resolvedOvertimeWorkerName = selectedWorker?.workerName || null;
      resolvedOvertimeHourlyRate = effectiveHourlyRate;
    }

    // 8. Calculate the actual cost without double-counting
    const originalCost = getProgressCost({
      cost: resolvedCost,
      overtimeCost: resolvedOvertimeCost,
      vehicleUsage,
    });

    // 9. When an Admin adds a cost, the Admin must select its treatment
    if (
      !statusChange &&
      isAdmin &&
      originalCost > 0 &&
      !isValidCostTreatment(costTreatment)
    ) {
      return NextResponse.json(
        {
          message:
            "Select Billable Cost or Absorbed Cost before adding this cost",
        },
        { status: 400 }
      );
    }

    // 10. Build the new progress entry
    const progressLog = {
      _id: new ObjectId().toString(),
      timestamp: new Date(),
      updatedBy: session.user.id,
      updatedByName: session.user.name,
      details,
      workType,
      cost: resolvedCost,
      overtimeHours: resolvedOvertimeHours,
      overtimeCost: resolvedOvertimeCost,
      overtimeWorkerId: resolvedOvertimeWorkerId,
      overtimeWorkerName: resolvedOvertimeWorkerName,
      overtimeHourlyRate: resolvedOvertimeHourlyRate,
      vehicleUsage,
      originalCost,
      statusChange,
      newStatus: statusChange ? newStatus : null,

      // Every new cost starts as pending
      jobStatus: statusChange ? null : "pending",

      // A worker cannot select Billable or Absorbed.
      // Only an Admin-submitted cost can initially have a treatment.
      costTreatment:
        statusChange || originalCost <= 0
          ? null
          : isAdmin
            ? costTreatment
            : null,
    };

    // 11. Add the entry to the job
    const result = await db.collection("jobs").updateOne(
      {
        _id: new ObjectId(jobId),
      },
      {
        $push: {
          progressLogs: progressLog,
        } as any,
        $set: {
          updatedBy: session.user.id,
          updatedByName: session.user.name,
          updatedAt: new Date(),
          ...(statusChange
            ? { status: newStatus }
            : {}),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Failed to update job progress" },
        { status: 400 }
      );
    }

    // 12. Return the updated job
    const updatedJob = await db
      .collection("jobs")
      .findOne({
        _id: new ObjectId(jobId),
      });

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
    // 1. Authenticate the user
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Only Admins can approve, reject or edit costs
    if (session.user.role !== "admin") {
      return NextResponse.json(
        {
          message:
            "Only admins can edit progress entries",
        },
        { status: 403 }
      );
    }

    // 3. Validate the job ID
    const jobId = params.id;

    if (!jobId || !ObjectId.isValid(jobId)) {
      return NextResponse.json(
        { message: "Invalid job ID" },
        { status: 400 }
      );
    }

    // 4. Read the submitted changes
    const {
      logId,
      cost,
      jobStatus,
      details,
      workType,
      overtimeHours,
      overtimeCost,
      vehicleUsage,
      costTreatment,
    } = await request.json();

    if (!logId) {
      return NextResponse.json(
        { message: "Log ID is required" },
        { status: 400 }
      );
    }

    // 5. Validate the selected treatment
    if (
      costTreatment !== undefined &&
      !isValidCostTreatment(costTreatment)
    ) {
      return NextResponse.json(
        { message: "Invalid cost treatment" },
        { status: 400 }
      );
    }

    // 6. Validate the approval status
    if (
      jobStatus !== undefined &&
      !["pending", "approved", "rejected"].includes(
        jobStatus
      )
    ) {
      return NextResponse.json(
        { message: "Invalid approval status" },
        { status: 400 }
      );
    }

    // 7. Load the existing job
    const client = await clientPromise;
    const db = client.db();

    const job = await db.collection("jobs").findOne({
      _id: new ObjectId(jobId),
    });

    if (!job) {
      return NextResponse.json(
        { message: "Job not found" },
        { status: 404 }
      );
    }

    // 8. Find the existing progress entry
    const existingLog = job.progressLogs?.find(
      (log: any) => log._id === logId
    );

    if (!existingLog) {
      return NextResponse.json(
        { message: "Progress log not found" },
        { status: 404 }
      );
    }

    // 9. Create a temporary version containing the proposed changes
    // This is used to calculate the accounting difference safely.
    const proposedLog = {
      ...existingLog,
      ...(cost !== undefined ? { cost } : {}),
      ...(jobStatus !== undefined
        ? { jobStatus }
        : {}),
      ...(details !== undefined ? { details } : {}),
      ...(workType !== undefined
        ? { workType }
        : {}),
      ...(overtimeHours !== undefined
        ? { overtimeHours }
        : {}),
      ...(overtimeCost !== undefined
        ? { overtimeCost }
        : {}),
      ...(vehicleUsage !== undefined
        ? { vehicleUsage }
        : {}),
      ...(costTreatment !== undefined
        ? { costTreatment }
        : {}),
    };

    // 10. Calculate the previous and proposed amounts
    const previousCost =
      getProgressCost(existingLog);

    const newCost =
      getProgressCost(proposedLog);

    const previousStatus =
      existingLog.jobStatus;

    const newStatus =
      proposedLog.jobStatus;

    // 11. Require an Admin selection when approving a new cost
    if (
      newStatus === "approved" &&
      previousStatus !== "approved" &&
      newCost > 0 &&
      !isValidCostTreatment(
        proposedLog.costTreatment
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Select Billable Cost or Absorbed Cost before approving this entry",
        },
        { status: 400 }
      );
    }

    // 12. Determine the accounting treatment
    const previousTreatment =
      getAccountingTreatment(existingLog);

    const newTreatment =
      getAccountingTreatment(proposedLog);

    // 13. Work out how much of the old entry was added
    // to the client price.
    const previousBillableContribution =
      previousStatus === "approved" &&
      previousTreatment === "billable"
        ? previousCost
        : 0;

    // 14. Work out how much of the new entry should
    // be added to the client price.
    const newBillableContribution =
      newStatus === "approved" &&
      newTreatment === "billable"
        ? newCost
        : 0;

    // 15. Calculate only the required price adjustment
    const clientPriceDelta =
      newBillableContribution -
      previousBillableContribution;

    // 16. Build the MongoDB update fields
    const updateFields: any = {
      updatedBy: session.user.id,
      updatedByName: session.user.name,
      updatedAt: new Date(),
    };

    if (cost !== undefined) {
      updateFields["progressLogs.$.cost"] = cost;
    }

    if (jobStatus !== undefined) {
      updateFields["progressLogs.$.jobStatus"] =
        jobStatus;
    }

    if (details !== undefined) {
      updateFields["progressLogs.$.details"] =
        details;
    }

    if (workType !== undefined) {
      updateFields["progressLogs.$.workType"] =
        workType;
    }

    if (overtimeHours !== undefined) {
      updateFields[
        "progressLogs.$.overtimeHours"
      ] = overtimeHours;
    }

    if (overtimeCost !== undefined) {
      updateFields[
        "progressLogs.$.overtimeCost"
      ] = overtimeCost;
    }

    if (vehicleUsage !== undefined) {
      updateFields[
        "progressLogs.$.vehicleUsage"
      ] = vehicleUsage;
    }

    if (costTreatment !== undefined) {
      updateFields[
        "progressLogs.$.costTreatment"
      ] = costTreatment;
    }

    // 17. Build the final MongoDB operation
    const mongoUpdate: any = {
      $set: updateFields,
    };

    // Change clientPrice only when necessary
    if (clientPriceDelta !== 0) {
      mongoUpdate.$inc = {
        clientPrice: clientPriceDelta,
      };
    }

    // 18. Update the progress entry
    const result = await db.collection("jobs").updateOne(
      {
        _id: new ObjectId(jobId),
        "progressLogs._id": logId,
      },
      mongoUpdate
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          message:
            "Progress log not found or failed to update",
        },
        { status: 404 }
      );
    }

    // 19. Return the updated job
    const updatedJob = await db
      .collection("jobs")
      .findOne({
        _id: new ObjectId(jobId),
      });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error(
      "Error updating progress log:",
      error
    );

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

if (
  !isAdmin &&
  (!isCreator ||
    logToDelete.jobStatus !== "pending")
) {
  return NextResponse.json(
    {
      message:
        "You can only delete your own pending entries",
    },
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
    const deleteUpdate: any = {
      $pull: { progressLogs: pullCriteria },
      $set: {
        updatedBy: session.user.id,
        updatedByName: session.user.name,
        updatedAt: new Date(),
      },
    };

    // If the entry being removed was an approved Expenses entry, its cost was
    // already added to clientPrice — reverse that so the total stays accurate.
const deletedTreatment =
  getAccountingTreatment(logToDelete);

if (
  logToDelete.jobStatus === "approved" &&
  deletedTreatment === "billable"
) {
  deleteUpdate.$inc = {
    clientPrice: -getProgressCost(
      logToDelete
    ),
  };
}

    const result = await db.collection("jobs").updateOne(
      { _id: new ObjectId(jobId) },
      deleteUpdate
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
