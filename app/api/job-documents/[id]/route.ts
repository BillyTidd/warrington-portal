export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { getObjectStorage } from "@/lib/object-storage";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to remove this document" },
        { status: 401 },
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        {
          message: "Only administrators can remove uploaded documents",
        },
        { status: 403 },
      );
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Invalid document ID" },
        { status: 400 },
      );
    }

    const documentId = new ObjectId(params.id);
    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const document = await db
      .collection("job_documents")
      .findOne({ _id: documentId });

    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 },
      );
    }

    if (!document.objectKey) {
      return NextResponse.json(
        {
          message:
            "This document has no storage object and cannot be removed automatically",
        },
        { status: 409 },
      );
    }

    const { client: storageClient, bucket } = getObjectStorage();

    await storageClient.send(
      new DeleteObjectCommand({
        Bucket: document.bucket || bucket,
        Key: document.objectKey,
      }),
    );

    const deleteResult = await db.collection("job_documents").deleteOne({
      _id: documentId,
      objectKey: document.objectKey,
    });

    if (deleteResult.deletedCount !== 1) {
      return NextResponse.json(
        {
          message:
            "The stored file was removed, but the document record could not be cleared. Please try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        deletedDocumentId: params.id,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Unable to remove job document:", error);

    return NextResponse.json(
      { message: "Unable to remove this document" },
      { status: 500 },
    );
  }
}
