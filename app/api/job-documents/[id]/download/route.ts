export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { getObjectStorage } from "@/lib/object-storage";

function asObjectId(value: unknown) {
  const stringValue = value?.toString();

  return stringValue && ObjectId.isValid(stringValue)
    ? new ObjectId(stringValue)
    : null;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to access this document" },
        { status: 401 }
      );
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Invalid document ID" },
        { status: 400 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const document = await db
      .collection("job_documents")
      .findOne({ _id: new ObjectId(params.id) });

    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    let hasAccess = session.user.role === "admin";

    if (
      !hasAccess &&
      session.user.role === "customer" &&
      document.bookingRequestId
    ) {
      const bookingRequestObjectId = asObjectId(
        document.bookingRequestId
      );

      if (bookingRequestObjectId) {
        const ownedBookingRequest = await db
          .collection("booking-requests")
          .findOne({
            _id: bookingRequestObjectId,
            customerId: session.user.id,
          });

        hasAccess = Boolean(ownedBookingRequest);
      }
    }

    if (
      !hasAccess &&
      session.user.role === "customer" &&
      document.jobId
    ) {
      const jobObjectId = asObjectId(document.jobId);
      const customerAccountObjectId = asObjectId(
        session.user.id
      );

      if (jobObjectId && customerAccountObjectId) {
        const ownedJob = await db.collection("jobs").findOne({
          _id: jobObjectId,
          $or: [
            { customer_account_id: customerAccountObjectId },
            { customer_account_id: session.user.id },
            { customerAccountId: customerAccountObjectId },
            { customerAccountId: session.user.id },
            // Temporary compatibility for legacy jobs.
            { clientId: session.user.id },
          ],
        });

        hasAccess = Boolean(ownedJob);
      }
    }

    if (
      !hasAccess &&
      session.user.role === "employee" &&
      document.jobId
    ) {
      const jobObjectId = asObjectId(document.jobId);

      if (jobObjectId) {
        const assignedJob = await db.collection("jobs").findOne({
          _id: jobObjectId,
          $or: [
            { "workers.userId": session.user.id },
            { userId: session.user.id },
          ],
        });

        hasAccess = Boolean(assignedJob);
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to access this document",
        },
        { status: 403 }
      );
    }

    const { client: storageClient, bucket } =
      getObjectStorage();

    const originalName = String(
      document.originalName || "document"
    ).replace(/[\r\n"]/g, "_");

    const shouldOpenInline =
      document.mimeType === "application/pdf" ||
      document.mimeType?.startsWith("image/");

    const command = new GetObjectCommand({
      Bucket: document.bucket || bucket,
      Key: document.objectKey,
      ResponseContentType:
        document.mimeType || "application/octet-stream",
      ResponseContentDisposition: `${
        shouldOpenInline ? "inline" : "attachment"
      }; filename*=UTF-8''${encodeURIComponent(originalName)}`,
    });

    const secureDownloadUrl = await getSignedUrl(
      storageClient,
      command,
      { expiresIn: 300 }
    );

    const response = NextResponse.redirect(
      secureDownloadUrl,
      307
    );

    response.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0"
    );

    return response;
  } catch (error) {
    console.error("Document download failed:", error);

    return NextResponse.json(
      { message: "Unable to open the requested document" },
      { status: 500 }
    );
  }
}
