export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import {
  calculateDateRange,
  calculatePreviousPeriod,
  formatDateForApi,
} from "@/lib/date-helpers";

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

    const { startDate: currentStartDate, endDate: currentEndDate } =
      calculateDateRange(timeframe, startDateParam, endDateParam);
    const { previousStartDate, previousEndDate } = calculatePreviousPeriod(
      currentStartDate,
      currentEndDate
    );

    const currentStart = formatDateForApi(currentStartDate);
    const currentEnd = formatDateForApi(currentEndDate);
    const previousStart = formatDateForApi(previousStartDate);
    const previousEnd = formatDateForApi(previousEndDate);

    const client = await clientPromise;
    const db = client.db();

    const [
      currentEntries,
      previousEntries,
      currentInvoiceCount,
      previousInvoiceCount,
    ] = await Promise.all([
      db
        .collection("entries")
        .find(
          { date: { $gte: currentStart, $lte: currentEnd } },
          { projection: { client: 1, userName: 1, totalAmount: 1 } }
        )
        .toArray(),
      db
        .collection("entries")
        .find(
          { date: { $gte: previousStart, $lte: previousEnd } },
          { projection: { totalAmount: 1 } }
        )
        .toArray(),
      db.collection("invoice").countDocuments({
        createdAt: { $gte: currentStartDate, $lte: currentEndDate },
      }),
      db.collection("invoice").countDocuments({
        createdAt: { $gte: previousStartDate, $lte: previousEndDate },
      }),
    ]);

    return NextResponse.json(
      {
        currentEntries,
        previousEntries,
        currentInvoiceCount,
        previousInvoiceCount,
        dateRange: {
          current: { start: currentStartDate, end: currentEndDate },
          previous: { start: previousStartDate, end: previousEndDate },
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching summary data:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary data" },
      { status: 500 }
    );
  }
}
