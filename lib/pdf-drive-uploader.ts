import { google } from "googleapis";
import type { jsPDF } from "jspdf";
import { format } from "date-fns";
import serviceAccount from "@/config/service-account.json";

// Initialize Google Drive API client
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

export interface UploadPDFResult {
  fileId: string;
  fileUrl: string;
  fileName: string;
  reportNumber: string;
}

export const uploadPDFToDrive = async (
  doc: jsPDF,
  job: any,
  session: any
): Promise<UploadPDFResult> => {
  try {
    // Generate a unique report number
    const reportNumber = String(Math.floor(Math.random() * 9999)).padStart(
      4,
      "0"
    );

    // Create a descriptive filename with job info and timestamp
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
    const fileName = `Job_Report_${reportNumber}_${job._id}_${timestamp}.pdf`;

    // Convert the jsPDF document to a blob
    const pdfBlob = doc.output("blob");

    // Convert blob to buffer for Google Drive API
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload the file to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: "application/pdf",
      },
      media: {
        mimeType: "application/pdf",
        body: buffer,
      },
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

    // Get the file's web view link
    const fileData = await drive.files.get({
      fileId: response.data.id,
      fields: "webViewLink",
    });

    return {
      fileId: response.data.id,
      fileUrl: fileData.data.webViewLink || "",
      fileName: fileName,
      reportNumber: reportNumber,
    };
  } catch (error) {
    console.error("Error uploading PDF to Google Drive:", error);
    throw error;
  }
};
