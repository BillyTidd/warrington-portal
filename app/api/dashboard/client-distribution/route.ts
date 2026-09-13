export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { calculateDateRange, formatDateForApi } from "@/lib/date-helpers";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "thisMonth";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const { startDate, endDate } = calculateDateRange(
      timeframe,
      startDateParam,
      endDateParam
    );

    const client = await clientPromise;
    const db = client.db();
    const entries = await db
      .collection("entries")
      .find(
        {
          date: {
            $gte: formatDateForApi(startDate),
            $lte: formatDateForApi(endDate),
          },
        },
        { projection: { client: 1, totalAmount: 1, _id: 0 } }
      )
      .toArray();

    return NextResponse.json(
      { entries, dateRange: { start: startDate, end: endDate } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching client cost-distribution data:", error);
    return NextResponse.json(
      { error: "Failed to fetch client cost-distribution data" },
      { status: 500 }
    );
  }
}
