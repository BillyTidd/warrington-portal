export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
import {
  ensureJobFolderIndexes,
  normalizeFolderName,
} from "@/lib/job-folders";
import clientPromise from "@/lib/mongodb";

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "admin") {
    return {
      session: null,
      response: NextResponse.json(
        { message: "Only administrators can manage job folders." },
        { status: session?.user ? 403 : 401 }
      ),
    };
  }

  return { session, response: null };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = await requireAdmin();

    if (authorization.response) {
      return authorization.response;
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Invalid folder ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const name = String(body.name || "").trim().replace(/\s+/g, " ");

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { message: "Folder names must contain between 2 and 80 characters." },
        { status: 400 }
      );
    }

    const folderId = new ObjectId(params.id);
    const normalizedName = normalizeFolderName(name);

    if (!normalizedName) {
      return NextResponse.json(
        { message: "Folder names must contain letters or numbers." },
        { status: 400 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    await ensureJobFolderIndexes(db);

    const folder = await db.collection("job_folders").findOne({
      _id: folderId,
    });

    if (!folder) {
      return NextResponse.json(
        { message: "Job folder not found." },
        { status: 404 }
      );
    }

    const duplicateFolder = await db
      .collection("job_folders")
      .findOne({
        _id: { $ne: folderId },
        customerAccountId: folder.customerAccountId,
        normalizedName,
      });

    if (duplicateFolder) {
      return NextResponse.json(
        { message: "A folder with this name already exists for the customer." },
        { status: 409 }
      );
    }

    const now = new Date();

    await Promise.all([
      db.collection("job_folders").updateOne(
        { _id: folderId },
        {
          $set: {
            name,
            normalizedName,
            assignmentMode: "manual",
            updatedAt: now,
            updatedBy: authorization.session!.user.id,
            updatedByName: authorization.session!.user.name,
          },
        }
      ),
      db.collection("jobs").updateMany(
        { folderId },
        {
          $set: {
            folderName: name,
            folderAssignment: "manual",
            folderUpdatedAt: now,
          },
        }
      ),
    ]);

    return NextResponse.json({
      _id: folderId.toString(),
      name,
      assignmentMode: "manual",
      updatedAt: now,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "A folder with this name already exists for the customer." },
        { status: 409 }
      );
    }

    console.error("Error renaming job folder:", error);

    return NextResponse.json(
      { message: "Failed to rename the job folder." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = await requireAdmin();

    if (authorization.response) {
      return authorization.response;
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Invalid folder ID." },
        { status: 400 }
      );
    }

    const folderId = new ObjectId(params.id);
    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const folder = await db.collection("job_folders").findOne({
      _id: folderId,
    });

    if (!folder) {
      return NextResponse.json(
        { message: "Job folder not found." },
        { status: 404 }
      );
    }

    const now = new Date();

    await db.collection("jobs").updateMany(
      { folderId },
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

    await db.collection("job_folders").deleteOne({
      _id: folderId,
    });

    return NextResponse.json({
      message: "Job folder deleted. Its jobs are now unfiled.",
    });
  } catch (error) {
    console.error("Error deleting job folder:", error);

    return NextResponse.json(
      { message: "Failed to delete the job folder." },
      { status: 500 }
    );
  }
}
