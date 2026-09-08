export const dynamic = "force-dynamic";

import {
  type NextRequest,
  NextResponse,
} from "next/server";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "customer"
    ) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!ObjectId.isValid(session.user.id)) {
      return NextResponse.json(
        { message: "Invalid customer account" },
        { status: 401 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const customerAccountObjectId = new ObjectId(
      session.user.id
    );

    const bookingRequests = await db
      .collection("booking-requests")
      .find({
        $or: [
          {
            customerId: session.user.id,
          },
          {
            customerId: customerAccountObjectId,
          },
          {
            customerEmail: session.user.email,
          },
        ],
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    const jobs = await db
      .collection("jobs")
      .find({
        $or: [
          {
            customer_account_id:
              customerAccountObjectId,
          },
          {
            customer_account_id: session.user.id,
          },

          // Temporary pre-migration fallback
          {
            clientId: session.user.id,
          },
        ],
      })
      .sort({
        assignDate: -1,
        createdAt: -1,
      })
      .toArray();

    const totalRequests = bookingRequests.length;

    const pendingRequests = bookingRequests.filter(
      (bookingRequest) =>
        bookingRequest.status === "pending"
    ).length;

    const approvedRequests = bookingRequests.filter(
      (bookingRequest) =>
        bookingRequest.status === "approved" ||
        bookingRequest.status === "converted"
    ).length;

    const activeJobs = jobs.filter((job) =>
      ["pending", "in-progress"].includes(job.status)
    ).length;

    const completedJobs = jobs.filter(
      (job) => job.status === "completed"
    ).length;

    const totalSpent = jobs
      .filter((job) => job.status === "completed")
      .reduce(
        (total, job) =>
          total + Number(job.clientPrice || 0),
        0
      );

    return NextResponse.json(
      {
        totalRequests,
        pendingRequests,
        approvedRequests,
        activeJobs,
        completedJobs,
        totalSpent,
        recentRequests: bookingRequests.slice(0, 5),
        recentJobs: jobs.slice(0, 5),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error fetching customer dashboard data:",
      error
    );

    return NextResponse.json(
      {
        message: "Failed to fetch dashboard data",
      },
      { status: 500 }
    );
  }
}