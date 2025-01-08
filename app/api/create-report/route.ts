import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { google } from "googleapis";
import { generateGoogleSheet } from "@/lib/generate-spreadsheet";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import serviceAccount from "@/config/service-account.json";

// Initialize Google Sheets API client
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ],
});

const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    const { currentDate, currentView, tasks, userId } = await request.json();

    // Generate Google Sheet directly
    const spreadsheet = await generateGoogleSheet({
      sheets,
      filteredData: tasks,
      filter: {
        startDate: new Date(currentDate),
        endDate: new Date(currentDate),
      },
      session,
      currentView,
      userId,
    });

    // Make the spreadsheet publicly accessible
    await drive.permissions.create({
      fileId: spreadsheet.spreadsheetId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Save report details to the database
    const reportRecord = await saveReportToDatabase(
      spreadsheet.spreadsheetUrl,
      spreadsheet.fileName, // Use the generated file name
      spreadsheet.reportNumber, // Use the generated report number
      userId,
      currentView,
      currentDate,
      session.user
    );

    return NextResponse.json({
      message: "Report generated and uploaded successfully",
      sheetUrl: spreadsheet.spreadsheetUrl,
      fileName: spreadsheet.fileName, // Include the file name
      reportNumber: spreadsheet.reportNumber, // Include the report number
      reportId: reportRecord.insertedId,
    });
  } catch (error) {
    console.error("Error in POST /api/create-report:", error);
    return NextResponse.json(
      { message: "An error occurred while generating the report" },
      { status: 500 }
    );
  }
}

async function saveReportToDatabase(
  sheetUrl: string,
  fileName: string,
  reportNumber: string,
  userId: string,
  currentView: string,
  currentDate: string,
  user: any
) {
  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection("reports").insertOne({
    sheetUrl,
    fileName,
    reportNumber, // Save the report number
    userId,
    userName: user.name,
    viewType: currentView,
    reportDate: new Date(currentDate),
    createdAt: new Date(),
  });

  return result;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const reports = await db
      .collection("reports")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Error in GET /api/invoice:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching reports" },
      { status: 500 }
    );
  }
}
