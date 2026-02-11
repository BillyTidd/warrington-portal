import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    // Convert blob to base64 data URI
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const mimeType = (file as File).type || "application/pdf";
    const dataUri = `data:${mimeType};base64,${base64}`;

    // Upload to Cloudinary using the same pattern as existing app
    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUri,
        {
          folder: "job-documents",
          resource_type: "auto",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });

    // Add fl_attachment flag so the URL triggers a download when opened
    const downloadUrl = result.secure_url.replace(
      "/upload/",
      "/upload/fl_attachment/"
    );

    return NextResponse.json({
      success: true,
      url: downloadUrl,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return NextResponse.json(
      {
        message: "Failed to upload file",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
