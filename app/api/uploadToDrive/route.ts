import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import serviceAccount from "@/config/service-account.json";
import { generateInvoiceGoogleSheet } from "@/lib/generate-spreadsheet";
import { Readable } from "stream";

// Initialize the Google APIs
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

const drive = google.drive({ version: "v3", auth });
const sheets = google.sheets({ version: "v4", auth });

// Define the ID for the root "invoice" folder
const invoiceFolderId = "1v4R12k0AW68-3oVdrWd2nMPvgHZODyCD";

export async function POST(request: Request) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);

    // Check if the session exists and has a user
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { folderPath, fileName, fileData, mimeType, filteredData, filter } =
      await request.json();

    // Generate invoice number
    const invoiceNumber = String(Math.floor(Math.random() * 9999)).padStart(
      4,
      "0"
    );

    // Start at the "invoice" root folder
    const folders = folderPath.split("/").filter(Boolean);
    let parentId = invoiceFolderId;
    let fullPath = "/Invoice";

    // Navigate through the folder path, creating folders if necessary
    for (const folder of folders) {
      const folderResponse = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folder}' and '${parentId}' in parents and trashed=false`,
        fields: "files(id, name)",
      });

      if (folderResponse.data.files && folderResponse.data.files.length > 0) {
        parentId = folderResponse.data.files[0].id!;
      } else {
        const folderMetadata = {
          name: folder,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        };
        const newFolder = await drive.files.create({
          requestBody: folderMetadata,
          fields: "id",
        });
        parentId = newFolder.data.id!;
      }
      fullPath += `/${folder}`;
    }

    let fileId, webViewLink;

    if (mimeType === "application/pdf") {
      // Upload PDF to Google Drive
      const fileBuffer = Buffer.from(fileData, "base64");
      const fileStream = new Readable();
      fileStream.push(fileBuffer);
      fileStream.push(null);

      const fileMetadata = {
        name: fileName,
        parents: [parentId],
      };

      const media = {
        mimeType: mimeType,
        body: fileStream,
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink",
      });

      fileId = file.data.id!;
      webViewLink = file.data.webViewLink!;
    } else {
      // Generate Google Sheet
      const spreadsheet = await generateInvoiceGoogleSheet({
        sheets,
        filteredData,
        filter,
        session,
        currentView: "monthly",
        userId: session.user.id,
        invoiceNumber, // Pass the invoice number to the sheet generation function
      });

      await drive.files.update({
        fileId: spreadsheet.spreadsheetId,
        addParents: parentId,
        removeParents: "root",
        fields: "id, parents",
      });

      fileId = spreadsheet.spreadsheetId;
      webViewLink = spreadsheet.spreadsheetUrl;
    }

    // Set file permissions to anyone with the link can view
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return NextResponse.json({
      message: "File uploaded successfully",
      fullPath: `${fullPath}/${fileName}`,
      fileName: fileName,
      fileId: fileId,
      webViewLink: webViewLink,
      userRole: session.user.role,
      fileType: mimeType === "application/pdf" ? "PDF" : "Sheet",
      invoiceNumber, // Include the invoice number in the response
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { message: "Error uploading file", error: String(error) },
      { status: 500 }
    );
  }
}
