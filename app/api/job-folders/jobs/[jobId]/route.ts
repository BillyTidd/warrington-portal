export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
import {
  resolveJobCustomerAccountId,
} from "@/lib/job-folders";
import clientPromise from "@/lib/mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Only administrators can move jobs between folders." },
        { status: session?.user ? 403 : 401 }
      );
    }

    if (!ObjectId.isValid(params.jobId)) {
      return NextResponse.json(
        { message: "Invalid job ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const requestedFolderId = body.folderId
      ? String(body.folderId)
      : null;

    if (
      requestedFolderId &&
      !ObjectId.isValid(requestedFolderId)
    ) {
      return NextResponse.json(
        { message: "Invalid folder ID." },
        { status: 400 }
      );
    }

    const jobId = new ObjectId(params.jobId);
    const mongoClient = await clientPromise;
    const db = mongoClient.db();
    const job = await db.collection("jobs").findOne({
      _id: jobId,
    });

    if (!job) {
      return NextResponse.json(
        { message: "Job not found." },
        { status: 404 }
      );
    }

    const customerAccountId = await resolveJobCustomerAccountId(
      db,
      job
    );

    if (!customerAccountId) {
      return NextResponse.json(
        {
          message:
            "This job is not linked to a customer account, so it cannot be filed yet.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    if (!requestedFolderId) {
      await db.collection("jobs").updateOne(
        { _id: jobId },
        {
          $unset: {
            folderId: "",
            folderName: "",
          },
          $set: {
            folderAssignment: "manual",
            folderUpdatedAt: now,
          },
        }
      );

      return NextResponse.json({
        message: "Job moved to Unfiled Jobs.",
        folderId: null,
        folderName: null,
      });
    }

    const folderId = new ObjectId(requestedFolderId);
    const folder = await db.collection("job_folders").findOne({
      _id: folderId,
      customerAccountId,
    });

    if (!folder) {
      return NextResponse.json(
        {
          message:
            "The selected folder does not belong to this job's customer.",
        },
        { status: 400 }
      );
    }

    // A scalar folderId replaces the previous value, so the job can never
    // belong to more than one folder at the same time.
    await db.collection("jobs").updateOne(
      { _id: jobId },
      {
        $set: {
          folderId,
          folderName: folder.name,
          folderAssignment: "manual",
          folderUpdatedAt: now,
        },
      }
    );

    return NextResponse.json({
      message: `Job moved to ${folder.name}.`,
      folderId: folderId.toString(),
      folderName: folder.name,
    });
  } catch (error) {
    console.error("Error moving job between folders:", error);

    return NextResponse.json(
      { message: "Failed to move the job." },
      { status: 500 }
    );
  }
}
