export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

function normaliseStatus(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function toAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Please log in." }, { status: 401 });
    }

    if (session.user.role !== "customer") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!ObjectId.isValid(session.user.id)) {
      return NextResponse.json(
        { message: "The customer account ID is invalid." },
        { status: 400 }
      );
    }

    const customerAccountId = new ObjectId(session.user.id);
    const accountIds: Array<ObjectId | string> = [
      customerAccountId,
      session.user.id,
    ];

    const client = await clientPromise;
    const db = client.db();

    const [bookingRequests, jobs] = await Promise.all([
      db
        .collection("booking-requests")
        .find({
          $or: [
            { customer_account_id: { $in: accountIds } },
            { customerAccountId: { $in: accountIds } },
            ...(session.user.email
              ? [{ customerEmail: session.user.email }]
              : []),
          ],
        })
        .sort({ createdAt: -1 })
        .toArray(),
      db
        .collection("jobs")
        .find({
          $or: [
            { customer_account_id: { $in: accountIds } },
            // Temporary compatibility for jobs created before WAR-PORT-038.
            { clientId: session.user.id },
          ],
        })
        .sort({ createdAt: -1 })
        .toArray(),
    ]);

    const pendingRequests = bookingRequests.filter(
      (request) => normaliseStatus(request.status) === "pending"
    );
    const approvedRequests = bookingRequests.filter(
      (request) => normaliseStatus(request.status) === "approved"
    );
    const activeJobs = jobs.filter((job) =>
      ["pending", "in-progress", "in_progress", "assigned"].includes(
        normaliseStatus(job.status)
      )
    );
    const completedJobs = jobs.filter(
      (job) => normaliseStatus(job.status) === "completed"
    );
    const totalSpent = completedJobs.reduce(
      (sum, job) => sum + toAmount(job.clientPrice),
      0
    );

    return NextResponse.json(
      {
        totalRequests: bookingRequests.length,
        pendingRequests: pendingRequests.length,
        approvedRequests: approvedRequests.length,
        activeJobs: activeJobs.length,
        completedJobs: completedJobs.length,
        totalSpent,
        recentRequests: bookingRequests.slice(0, 5),
        recentJobs: activeJobs.slice(0, 5),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching customer dashboard data:", error);
    return NextResponse.json(
      { message: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
