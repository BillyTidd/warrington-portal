import { google } from "googleapis";
import { NextResponse } from "next/server";
import serviceAccount from "@/config/service-account.json";
import { Readable } from "stream";

// Initialize the Google Drive API client
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

// Define the ID for the root "invoice" folder
const invoiceFolderId = "1v4R12k0AW68-3oVdrWd2nMPvgHZODyCD"; // Replace with your "invoice" folder ID

export async function POST(request: Request) {
  try {
    const { folderPath, fileName, fileData, mimeType, userRole } =
      await request.json();

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
        // Folder already exists; use its ID as the parent for the next iteration
        parentId = folderResponse.data.files[0].id!;
      } else {
        // Folder doesn't exist; create it
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

    // Convert base64 file data to a buffer, then to a readable stream
    const fileBuffer = Buffer.from(fileData, "base64");
    const fileStream = new Readable();
    fileStream.push(fileBuffer);
    fileStream.push(null);

    // Upload the file to the final folder
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

    // Set file permissions to anyone with the link can view
    await drive.permissions.create({
      fileId: file.data.id!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return NextResponse.json({
      message: "File uploaded successfully",
      fullPath: `${fullPath}/${fileName}`,
      fileName: `${fileName}`,
      fileId: file.data.id,
      webViewLink: file.data.webViewLink,
      userRole: userRole,
      fileType: mimeType.includes("sheet") ? "Excel" : "PDF",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { message: "Error uploading file", error: String(error) },
      { status: 500 }
    );
  }
}
