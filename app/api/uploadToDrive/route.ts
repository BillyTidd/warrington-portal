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
    "https://www.googleapis.com/auth/drive", // Added full drive scope
  ],
});

const drive = google.drive({ version: "v3", auth });
const sheets = google.sheets({ version: "v4", auth });

// Define the ID for the root "invoice" folder
const invoiceFolderId = "1OqueH2fhqzWhRQ-J2-QOeA0OnB-JfEVf";

// Function to transfer ownership to service account
async function transferOwnership(fileId: string) {
  try {
    const serviceAccountEmail = serviceAccount.client_email;

    // Create a new permission for the service account
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "owner",
        type: "user",
        emailAddress: serviceAccountEmail,
      },
      transferOwnership: true,
      fields: "id",
    });

    console.log(
      `Ownership transferred to service account: ${serviceAccountEmail}`
    );
  } catch (error) {
    console.error("Error transferring ownership:", error);
  }
}

// Function to share the spreadsheet with the user
async function shareSpreadsheet(fileId: string, userEmail: string) {
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        type: "user",
        role: "writer",
        emailAddress: "billwtidd@gmail.com",
      },
      supportsAllDrives: true,
    });
    console.log(`Spreadsheet shared with ${"billwtidd@gmail.com"}`);
  } catch (error) {
    console.error("Error sharing spreadsheet:", error);
  }
}

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
        supportsAllDrives: true,
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
          supportsAllDrives: true,
        });
        parentId = newFolder.data.id!;

        // Transfer folder ownership to service account
        await transferOwnership(newFolder.data.id!);
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
        supportsAllDrives: true,
      });

      fileId = file.data.id!;
      webViewLink = file.data.webViewLink!;

      // Transfer PDF ownership to service account
      await transferOwnership(fileId);
    } else {
      // Generate Google Sheet
      const spreadsheet = await generateInvoiceGoogleSheet({
        sheets,
        filteredData,
        filter,
        session,
        currentView: "monthly",
        userId: session.user.id,
        invoiceNumber,
      });

      // Move the spreadsheet to the correct folder
      await drive.files.update({
        fileId: spreadsheet.spreadsheetId,
        addParents: parentId,
        removeParents: "root",
        fields: "id, parents",
        supportsAllDrives: true,
      });

      fileId = spreadsheet.spreadsheetId;
      webViewLink = spreadsheet.spreadsheetUrl;

      // Transfer spreadsheet ownership to service account
      await transferOwnership(fileId);

      // Then share with the user
      await shareSpreadsheet(fileId, session.user.email!);
    }

    // Set file permissions for link sharing
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
      supportsAllDrives: true,
    });

    return NextResponse.json({
      message: "File uploaded successfully",
      fullPath: `${fullPath}/${fileName}`,
      fileName: fileName,
      fileId: fileId,
      webViewLink: webViewLink,
      userRole: session.user.role,
      fileType: mimeType === "application/pdf" ? "PDF" : "Sheet",
      invoiceNumber,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { message: "Error uploading file", error: String(error) },
      { status: 500 }
    );
  }
}
