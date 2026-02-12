import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const client = await clientPromise;
    const db = client.db();

    // Build query
    const query: any = {};

    // Filter by status if provided
    if (status && status !== "all") {
      query.status = status;
    }

    // Filter by customer ID if provided (for customer users)
    if (customerId) {
      query.customerId = customerId;
    }

    // If user is customer, only show their requests
    if (session.user.role === "customer") {
      query.customerId = session.user.id;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerEmail: { $regex: search, $options: "i" } },
        { customerCompany: { $regex: search, $options: "i" } },
        { "jobEstimate.jobType": { $regex: search, $options: "i" } },
        { "jobEstimate.jobLocation": { $regex: search, $options: "i" } },
        { "jobEstimate.jobDescription": { $regex: search, $options: "i" } },
      ];
    }

    // Date range filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(endDate) };
    }

    const skip = (page - 1) * limit;

    // Build sort object
    const sortObject: any = {};
    if (sortBy === "totalCost") {
      sortObject["estimatedCost.totalCost"] = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "jobDate") {
      sortObject["jobEstimate.jobDate"] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortObject[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    // Get total count
    const total = await db.collection("booking-requests").countDocuments(query);

    // Get paginated results
    const bookingRequests = await db
      .collection("booking-requests")
      .find(query)
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      bookingRequests,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      totalPages, // Keep for backward compatibility
    });
  } catch (error) {
    console.error("Error fetching booking requests:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      jobEstimate,
      estimatedCost,
      pdfUrl,
      pdfFilename,
    } = body;

    // Validate required fields
    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !jobEstimate ||
      !estimatedCost
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const bookingRequest = {
      customerName,
      customerEmail,
      customerPhone,
      customerCompany: customerCompany || null,
      customerId: session.user.id, // Link to the user who created it
      jobEstimate,
      estimatedCost,
      pdfUrl: pdfUrl || null,
      pdfFilename: pdfFilename || null,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("booking-requests")
      .insertOne(bookingRequest);

    return NextResponse.json({
      success: true,
      bookingRequestId: result.insertedId,
      message: "Booking request submitted successfully",
    });
  } catch (error) {
    console.error("Error creating booking request:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
