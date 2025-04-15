import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import {
  calculateDateRange,
  calculateYearRange,
  formatDateForApi,
} from "@/lib/date-helpers";
import { getCachedData, setCachedData } from "@/lib/api-cache";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "month";
    const year =
      searchParams.get("year") || new Date().getFullYear().toString();
    const startDateParam: any = searchParams.get("startDate");
    const endDateParam: any = searchParams.get("endDate");

    // Create a cache key based on the request parameters
    const cacheKey = `monthly-revenue:${timeframe}:${year}:${
      startDateParam || ""
    }:${endDateParam || ""}`;

    // Try to get data from cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const client = await clientPromise;
    const db = client.db();

    // Define date range based on timeframe or custom dates
    const { startDate, endDate } =
      timeframe === "year"
        ? calculateYearRange(year)
        : calculateDateRange(timeframe, startDateParam, endDateParam);

    // Format dates for MongoDB query
    const startIso = formatDateForApi(startDate);
    const endIso = formatDateForApi(endDate);

    // Optimize the query with projection to only fetch needed fields
    const entries = await db
      .collection("entries")
      .find(
        {
          date: {
            $gte: startIso,
            $lte: endIso,
          },
        },
        {
          projection: {
            date: 1,
            totalAmount: 1,
            _id: 0,
          },
        }
      )
      .toArray();

    const result = {
      entries,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    };

    // Cache the result for 5 minutes (adjust TTL as needed)
    setCachedData(cacheKey, result, 5 * 60 * 1000);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching monthly revenue data:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly revenue data" },
      { status: 500 }
    );
  }
}
