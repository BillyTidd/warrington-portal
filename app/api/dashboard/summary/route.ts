import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import {
  calculateDateRange,
  calculatePreviousPeriod,
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
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Create a cache key based on the request parameters
    const cacheKey = `summary:${timeframe}:${startDateParam || ""}:${
      endDateParam || ""
    }`;

    // Try to get data from cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const client = await clientPromise;
    const db = client.db();

    // Define date range based on timeframe or custom dates
    const { startDate: currentStartDate, endDate: currentEndDate } =
      calculateDateRange(timeframe, startDateParam, endDateParam);

    // Format dates for MongoDB query
    const currentStartIso = formatDateForApi(currentStartDate);
    const currentEndIso = formatDateForApi(currentEndDate);

    // Calculate previous period
    const { previousStartDate, previousEndDate } = calculatePreviousPeriod(
      currentStartDate,
      currentEndDate
    );
    const previousStartIso = formatDateForApi(previousStartDate);
    const previousEndIso = formatDateForApi(previousEndDate);

    // Use aggregation pipeline for better performance
    const currentEntriesAgg = db
      .collection("entries")
      .aggregate([
        {
          $match: {
            date: {
              $gte: currentStartIso,
              $lte: currentEndIso,
            },
          },
        },
        {
          $project: {
            client: 1,
            userName: 1,
            totalAmount: 1,
          },
        },
      ])
      .toArray();

    const previousEntriesAgg = db
      .collection("entries")
      .aggregate([
        {
          $match: {
            date: {
              $gte: previousStartIso,
              $lte: previousEndIso,
            },
          },
        },
        {
          $project: {
            totalAmount: 1,
          },
        },
      ])
      .toArray();

    const currentInvoicesAgg = db
      .collection("invoice")
      .aggregate([
        {
          $match: {
            createdAt: {
              $gte: currentStartDate,
              $lte: currentEndDate,
            },
          },
        },
        {
          $project: {
            totalAmount: 1,
          },
        },
      ])
      .toArray();

    const previousInvoicesAgg = db
      .collection("invoice")
      .aggregate([
        {
          $match: {
            createdAt: {
              $gte: previousStartDate,
              $lte: previousEndDate,
            },
          },
        },
        {
          $count: "count",
        },
      ])
      .toArray();

    // Execute all queries in parallel
    const [
      currentEntries,
      previousEntries,
      currentInvoices,
      previousInvoicesCount,
    ] = await Promise.all([
      currentEntriesAgg,
      previousEntriesAgg,
      currentInvoicesAgg,
      previousInvoicesAgg,
    ]);

    const previousInvoices =
      previousInvoicesCount.length > 0
        ? { count: previousInvoicesCount[0].count }
        : { count: 0 };

    const result = {
      currentEntries,
      currentInvoices,
      previousEntries,
      previousInvoices,
      dateRange: {
        current: {
          start: currentStartDate,
          end: currentEndDate,
        },
        previous: {
          start: previousStartDate,
          end: previousEndDate,
        },
      },
    };

    // Cache the result for 5 minutes (adjust TTL as needed)
    setCachedData(cacheKey, result, 5 * 60 * 1000);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching summary data:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary data" },
      { status: 500 }
    );
  }
}
