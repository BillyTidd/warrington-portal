export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getObjectStorage } from "@/lib/object-storage";
import { validateJobDocument } from "@/lib/job-document-validation";

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      !["admin", "customer", "employee"].includes(session.user.role || "")
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { fileName, mimeType, size, jobId } = await request.json();
    if (session.user.role === "employee") {
      if (typeof jobId !== "string" || !ObjectId.isValid(jobId)) {
        return NextResponse.json({ message: "Select a valid assigned job" }, { status: 400 });
      }
      const mongoClient = await clientPromise;
      const job = await mongoClient.db().collection("jobs").findOne({ _id: new ObjectId(jobId) });
      if (!job || !Array.isArray(job.workers) || !job.workers.some(
        (worker: { userId?: unknown }) => String(worker.userId || "") === session.user.id
      )) {
        return NextResponse.json({ message: "You can upload only to jobs assigned to you" }, { status: 403 });
      }
    }
    const validationError = validateJobDocument(fileName, mimeType, size);

    if (validationError) {
      return NextResponse.json(
        { message: validationError },
        { status: 400 }
      );
    }

    const uploadContext =
      session.user.role === "admin"
        ? "admin-job-documents"
        : session.user.role === "employee"
          ? "worker-job-documents"
          : "customer-job-documents";

    const objectKey =
      `${uploadContext}/${session.user.id}/` +
      (session.user.role === "employee" ? `${jobId}/` : "") +
      `${randomUUID()}-${safeFilename(fileName)}`;

    const { client, bucket } = getObjectStorage();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: 600,
    });

    return NextResponse.json({
      uploadUrl,
      objectKey,
      originalName: fileName,
      mimeType,
      size,
    });
  } catch (error) {
    console.error("Unable to create upload URL:", error);

    return NextResponse.json(
      { message: "Unable to prepare file upload" },
      { status: 500 }
    );
  }
}
