import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Get pagination parameters
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Get sorting parameters
    const sortField = searchParams.get("sortField") || "createdAt";
    const sortDirection = searchParams.get("sortDirection") || "desc";
    const sortOrder = sortDirection === "desc" ? -1 : 1;

    // Get filter parameters
    const jobId = searchParams.get("jobId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const creator = searchParams.get("creator");
    const reportType = searchParams.get("reportType");

    const client = await clientPromise;
    const db = client.db();

    // Build query object
    const query: any = {};

    // If jobId is provided, filter by job
    if (jobId) {
      query.jobId = jobId;
    }

    // If not admin, only show reports created by the user
    if (session.user.role !== "admin") {
      query.createdBy = session.user.id;
    }

    // Filter by report type if specified
    if (reportType === "single") {
      query.$or = [
        { reportType: "single" },
        { reportType: { $exists: false }, jobId: { $exists: true } },
      ];
    } else if (reportType === "bulk") {
      query.$or = [{ reportType: "bulk" }, { jobCount: { $exists: true } }];
    }

    // Add search filter
    if (search) {
      // If we already have $or from report type, we need to use $and
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          {
            $or: [
              { jobName: { $regex: search, $options: "i" } },
              { reportName: { $regex: search, $options: "i" } },
              { reportNumber: { $regex: search, $options: "i" } },
              { creatorName: { $regex: search, $options: "i" } },
            ],
          },
        ];
        // Remove the original $or after moving it to $and
        delete query.$or;
      } else {
        query.$or = [
          { jobName: { $regex: search, $options: "i" } },
          { reportName: { $regex: search, $options: "i" } },
          { reportNumber: { $regex: search, $options: "i" } },
          { creatorName: { $regex: search, $options: "i" } },
        ];
      }
    }

    // Add date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Add one day to include the end date fully
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        query.createdAt.$lte = endDateObj;
      }
    }

    // Add creator filter
    if (creator) {
      query.creatorName = { $regex: creator, $options: "i" };
    }

    console.log("Query:", JSON.stringify(query, null, 2));

    // Get total count for pagination
    const total = await db.collection("job-reports").countDocuments(query);

    // Get paginated reports
    const reports = await db
      .collection("job-reports")
      .find(query)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      reports,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error in GET /api/job-reports:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching job reports" },
      { status: 500 }
    );
  }
}
