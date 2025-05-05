import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { google } from "googleapis";
import serviceAccount from "@/config/service-account.json";
import { format } from "date-fns";
import { Readable } from "stream";

// Initialize Google Drive API client
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

// Create a folder for job reports if it doesn't exist
let reportsFolderId: string | null = null;

async function getOrCreateReportsFolder() {
  if (reportsFolderId) return reportsFolderId;

  try {
    // Check if folder already exists
    const response = await drive.files.list({
      q: "name='JobReports' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: "files(id, name)",
    });

    if (response.data.files && response.data.files.length > 0) {
      reportsFolderId = response.data.files[0].id!;
      return reportsFolderId;
    }

    // Create folder if it doesn't exist
    const folderResponse = await drive.files.create({
      requestBody: {
        name: "JobReports",
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });

    reportsFolderId = folderResponse.data.id!;
    return reportsFolderId;
  } catch (error) {
    console.error("Error creating reports folder:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get the PDF data and job info from the request
    const formData = await request.formData();
    const pdfBlob = formData.get("pdf") as Blob;
    const jobId = formData.get("jobId") as string;
    const jobName = formData.get("jobName") as string;

    if (!pdfBlob || !jobId || !jobName) {
      return NextResponse.json(
        { message: "Missing required data" },
        { status: 400 }
      );
    }

    // Generate a unique report number
    const reportNumber = String(Math.floor(Math.random() * 9999)).padStart(
      4,
      "0"
    );

    // Create a descriptive filename with job info and timestamp
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
    const fileName = `Job_Report_${reportNumber}_${jobId}_${timestamp}.pdf`;

    // Get or create the reports folder
    const folderId = await getOrCreateReportsFolder();

    // Convert blob to buffer for Google Drive API
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a readable stream from the buffer
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null); // Signal the end of the stream

    // Upload the file to Google Drive in the reports folder
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: "application/pdf",
        parents: [folderId],
      },
      media: {
        mimeType: "application/pdf",
        body: readable,
      },
      fields: "id,webViewLink",
    });

    if (!response.data.id) {
      throw new Error("Failed to upload PDF to Google Drive");
    }

    // Make the file publicly accessible with a link
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Save report details to the database
    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("job-reports").insertOne({
      fileId: response.data.id,
      fileUrl: response.data.webViewLink || "",
      fileName: fileName,
      reportNumber: reportNumber,
      jobId: jobId,
      jobName: jobName,
      createdBy: session.user.id,
      creatorName: session.user.name,
      creatorRole: session.user.role,
      createdAt: new Date(),
      duration: "N/A", // You can calculate this based on job data if needed
    });

    return NextResponse.json({
      success: true,
      fileId: response.data.id,
      fileUrl: response.data.webViewLink || "",
      fileName: fileName,
      reportNumber: reportNumber,
      reportId: result.insertedId,
    });
  } catch (error) {
    console.error("Error uploading PDF to Google Drive:", error);
    return NextResponse.json(
      {
        message: "Failed to upload PDF to Google Drive",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
