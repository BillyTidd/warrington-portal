export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
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
      !["admin", "customer"].includes(session.user.role || "")
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { fileName, mimeType, size } = await request.json();
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
        : "customer-job-documents";

    const objectKey =
      `${uploadContext}/${session.user.id}/` +
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
