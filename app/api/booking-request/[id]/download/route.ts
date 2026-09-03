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

export async function GET(
  request: Request,
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

    const client = await clientPromise;
    const db = client.db();

    const document = await db
      .collection("job_documents")
      .findOne({
        _id: new ObjectId(params.id),
      });

    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    let hasAccess = false;

    if (session.user.role === "admin") {
      hasAccess = true;
    }

    if (
      !hasAccess &&
      session.user.role === "customer" &&
      document.bookingRequestId
    ) {
      const ownedBookingRequest = await db
        .collection("booking-requests")
        .findOne({
          _id: document.bookingRequestId,
          customerId: session.user.id,
        });

      hasAccess = Boolean(ownedBookingRequest);
    }

    if (
      !hasAccess &&
      session.user.role === "employee" &&
      document.jobId
    ) {
      const assignedJob = await db
        .collection("jobs")
        .findOne({
          _id: document.jobId,
          $or: [
            {
              "workers.userId": session.user.id,
            },
            {
              userId: session.user.id,
            },
          ],
        });

      hasAccess = Boolean(assignedJob);
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

    const dispositionType = shouldOpenInline
      ? "inline"
      : "attachment";

    const command = new GetObjectCommand({
      Bucket: document.bucket || bucket,
      Key: document.objectKey,
      ResponseContentType:
        document.mimeType || "application/octet-stream",
      ResponseContentDisposition:
        `${dispositionType}; filename*=UTF-8''${encodeURIComponent(
          originalName
        )}`,
    });

    const secureDownloadUrl = await getSignedUrl(
      storageClient,
      command,
      {
        expiresIn: 300,
      }
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