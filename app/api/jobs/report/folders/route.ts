export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
import {
  assignedWorkerJobsQuery,
  idString,
  REPORT_FOLDER_ID_PATTERN,
  selectedClientScope,
} from "@/lib/job-report-access";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Please log in." }, { status: 401 });
    }

    const role = String(session.user.role || "");
    if (!["admin", "customer", "employee"].includes(role)) {
      return NextResponse.json(
        { message: "You cannot view job report folders." },
        { status: 403 }
      );
    }

    const clientId = request.nextUrl.searchParams.get("clientId") || "";
    if (clientId && role !== "admin") {
      return NextResponse.json(
        { message: "Only administrators can select another customer." },
        { status: 403 }
      );
    }

    if (clientId && !REPORT_FOLDER_ID_PATTERN.test(clientId)) {
      return NextResponse.json(
        { message: "Select a valid customer." },
        { status: 400 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db();
    let folderQuery: Record<string, unknown> = {};

    if (role === "customer") {
      if (!REPORT_FOLDER_ID_PATTERN.test(session.user.id)) {
        return NextResponse.json(
          { message: "Invalid customer account." },
          { status: 400 }
        );
      }
      folderQuery = { customerAccountId: new ObjectId(session.user.id) };
    } else if (role === "employee") {
      const assignedFolderIds = await db
        .collection("jobs")
        .distinct("folderId", assignedWorkerJobsQuery(session.user.id));
      const folderIds = assignedFolderIds
        .map(idString)
        .filter((id) => REPORT_FOLDER_ID_PATTERN.test(id))
        .map((id) => new ObjectId(id));
      folderQuery = { _id: { $in: folderIds } };
    } else if (clientId) {
      const selection = await selectedClientScope(db, clientId);
      if (!selection) {
        return NextResponse.json(
          { message: "Customer not found." },
          { status: 404 }
        );
      }
      folderQuery = selection.customerAccountId
        ? { customerAccountId: selection.customerAccountId }
        : { _id: { $in: [] } };
    }

    const folders = await db
      .collection("job_folders")
      .find(folderQuery, {
        projection: { _id: 1, name: 1, customerAccountId: 1 },
      })
      .sort({ name: 1, _id: 1 })
      .toArray();

    const accountIds = Array.from(
      new Set(folders.map((folder) => idString(folder.customerAccountId)))
    )
      .filter((id) => REPORT_FOLDER_ID_PATTERN.test(id))
      .map((id) => new ObjectId(id));
    const accounts = await db
      .collection("users")
      .find(
        { _id: { $in: accountIds } },
        { projection: { _id: 1, name: 1, company: 1 } }
      )
      .toArray();
    const accountNames = new Map(
      accounts.map((account) => [
        account._id.toString(),
        String(account.company || account.name || "Customer"),
      ])
    );

    return NextResponse.json(
      {
        folders: folders.map((folder) => ({
          _id: folder._id.toString(),
          name: String(folder.name || "Untitled folder"),
          customerAccountId: idString(folder.customerAccountId),
          customerName:
            accountNames.get(idString(folder.customerAccountId)) ||
            "Customer",
        })),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Error loading report folders:", error);
    return NextResponse.json(
      { message: "Unable to load job report folders." },
      { status: 500 }
    );
  }
}
