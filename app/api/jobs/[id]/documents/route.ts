export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { validateJobDocument } from "@/lib/job-document-validation";
import clientPromise from "@/lib/mongodb";
import { getObjectStorage } from "@/lib/object-storage";
import type { PendingJobDocument } from "@/types/job-document";

const MAX_DOCUMENTS_PER_UPLOAD = 10;

function normalizeMimeType(value: unknown) {
  return String(value || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function belongsToCustomerAccount(job: any, customerId: string) {
  const linkedCustomerId =
    job.customer_account_id ?? job.customerAccountId;

  if (
    linkedCustomerId &&
    linkedCustomerId.toString() === customerId
  ) {
    return true;
  }

  // Temporary compatibility for older jobs where clientId stored the
  // authenticated customer user's ID rather than a clients collection ID.
  return job.clientId?.toString() === customerId;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to upload documents" },
        { status: 401 }
      );
    }

    if (
      session.user.role !== "admin" &&
      session.user.role !== "customer"
    ) {
      return NextResponse.json(
        {
          message:
            "Only administrators and customers can upload job documents",
        },
        { status: 403 }
      );
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Invalid job ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const documents = body.documents as PendingJobDocument[];

    if (!Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { message: "Select at least one document" },
        { status: 400 }
      );
    }

    if (documents.length > MAX_DOCUMENTS_PER_UPLOAD) {
      return NextResponse.json(
        {
          message: `A maximum of ${MAX_DOCUMENTS_PER_UPLOAD} documents can be uploaded at once`,
        },
        { status: 400 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db();
    const jobObjectId = new ObjectId(params.id);

    const job = await db.collection("jobs").findOne({
      _id: jobObjectId,
    });

    if (!job) {
      return NextResponse.json(
        { message: "Job not found" },
        { status: 404 }
      );
    }

    if (
      session.user.role === "customer" &&
      !belongsToCustomerAccount(job, session.user.id)
    ) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to upload documents to this job",
        },
        { status: 403 }
      );
    }

    const objectKeys = documents.map((document) =>
      String(document?.objectKey || "")
    );

    if (new Set(objectKeys).size !== objectKeys.length) {
      return NextResponse.json(
        { message: "Duplicate document objects were submitted" },
        { status: 400 }
      );
    }

    const requiredObjectPrefix = `${
      session.user.role === "admin"
        ? "admin-job-documents"
        : "customer-job-documents"
    }/${session.user.id}/`;
    const { client: storageClient, bucket } =
      getObjectStorage();
    const verifiedDocuments: PendingJobDocument[] = [];

    for (const document of documents) {
      const objectKey = String(document?.objectKey || "");
      const originalName = String(document?.originalName || "");
      const mimeType = normalizeMimeType(document?.mimeType);
      const size = Number(document?.size);

      const validationError = validateJobDocument(
        originalName,
        mimeType,
        size
      );

      if (validationError) {
        return NextResponse.json(
          {
            message: `${originalName || "Document"}: ${validationError}`,
          },
          { status: 400 }
        );
      }

      if (
        !objectKey ||
        !objectKey.startsWith(requiredObjectPrefix)
      ) {
        return NextResponse.json(
          {
            message:
              "One of the uploaded documents does not belong to the signed-in user",
          },
          { status: 403 }
        );
      }

      const alreadyAttached = await db
        .collection("job_documents")
        .findOne({ objectKey });

      if (alreadyAttached) {
        return NextResponse.json(
          {
            message: `${originalName} has already been attached`,
          },
          { status: 409 }
        );
      }

      let storedObject;

      try {
        storedObject = await storageClient.send(
          new HeadObjectCommand({
            Bucket: bucket,
            Key: objectKey,
          })
        );
      } catch (storageError) {
        console.error(
          "Unable to verify uploaded R2 object:",
          storageError
        );

        return NextResponse.json(
          {
            message: `${originalName} could not be verified in storage`,
          },
          { status: 400 }
        );
      }

      const storedSize = Number(storedObject.ContentLength || 0);
      const storedMimeType = normalizeMimeType(
        storedObject.ContentType
      );

      if (storedSize !== size) {
        return NextResponse.json(
          {
            message: `${originalName} has an invalid stored size`,
          },
          { status: 400 }
        );
      }

      if (storedMimeType !== mimeType) {
        return NextResponse.json(
          {
            message: `${originalName} has an invalid stored content type`,
          },
          { status: 400 }
        );
      }

      verifiedDocuments.push({
        objectKey,
        originalName,
        mimeType,
        size,
      });
    }

    const now = new Date();
    const bookingRequestId =
      job.bookingRequestId &&
      ObjectId.isValid(job.bookingRequestId.toString())
        ? new ObjectId(job.bookingRequestId.toString())
        : null;

    const documentRecords = verifiedDocuments.map((document) => {
      const documentId = new ObjectId();

      return {
        _id: documentId,
        bookingRequestId,
        jobId: jobObjectId,
        uploadedBy: session.user.id,
        uploadedByRole: session.user.role,
        storageProvider: "r2",
        bucket,
        objectKey: document.objectKey,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        downloadPath: `/api/job-documents/${documentId.toString()}/download`,
        createdAt: now,
        updatedAt: now,
      };
    });

    await db
      .collection("job_documents")
      .insertMany(documentRecords);

    return NextResponse.json(
      {
        success: true,
        documents: documentRecords,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unable to attach job documents:", error);

    return NextResponse.json(
      { message: "Unable to attach documents to this job" },
      { status: 500 }
    );
  }
}
