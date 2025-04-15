import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import {
  startOfMonth,
  subDays,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns";

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

    const client = await clientPromise;
    const db = client.db();

    // Define date range based on timeframe or custom dates
    const now = new Date();
    let currentStartDate: Date;
    let currentEndDate = now;
    let previousStartDate: Date;
    let previousEndDate: Date;

    if (startDateParam && endDateParam) {
      // Custom date range
      currentStartDate = new Date(startDateParam);
      currentEndDate = new Date(endDateParam);

      // Calculate previous period of same length
      const rangeDuration =
        currentEndDate.getTime() - currentStartDate.getTime();
      previousEndDate = new Date(currentStartDate.getTime() - 1); // 1ms before current start
      previousStartDate = new Date(previousEndDate.getTime() - rangeDuration);
    } else {
      // Predefined timeframes
      switch (timeframe) {
        case "week":
          currentStartDate = subDays(now, 7);
          previousStartDate = subDays(currentStartDate, 7);
          previousEndDate = subDays(currentStartDate, 1);
          break;
        case "month":
          currentStartDate = startOfMonth(now);
          previousEndDate = subDays(currentStartDate, 1);
          previousStartDate = subMonths(currentStartDate, 1);
          break;
        case "quarter":
          currentStartDate = subQuarters(now, 1);
          previousEndDate = subDays(currentStartDate, 1);
          previousStartDate = subQuarters(currentStartDate, 1);
          break;
        case "year":
          currentStartDate = subYears(now, 1);
          previousEndDate = subDays(currentStartDate, 1);
          previousStartDate = subYears(currentStartDate, 1);
          break;
        case "last30":
          currentStartDate = subDays(now, 30);
          previousEndDate = subDays(currentStartDate, 1);
          previousStartDate = subDays(previousEndDate, 30);
          break;
        case "last90":
          currentStartDate = subDays(now, 90);
          previousEndDate = subDays(currentStartDate, 1);
          previousStartDate = subDays(previousEndDate, 90);
          break;
        default:
          currentStartDate = startOfMonth(now);
          previousEndDate = subDays(currentStartDate, 1);
          previousStartDate = subMonths(currentStartDate, 1);
      }
    }

    // Get current period data
    const currentEntries = await db
      .collection("entries")
      .find({
        date: {
          $gte: currentStartDate.toISOString(),
          $lte: currentEndDate.toISOString(),
        },
      })
      .toArray();

    // Get invoices from the invoice collection
    const currentInvoices = await db
      .collection("invoice")
      .find({
        createdAt: {
          $gte: currentStartDate,
          $lte: currentEndDate,
        },
      })
      .toArray();

    // Get previous period data
    const previousEntries = await db
      .collection("entries")
      .find({
        date: {
          $gte: previousStartDate.toISOString(),
          $lte: previousEndDate.toISOString(),
        },
      })
      .toArray();

    const previousInvoices = await db
      .collection("invoice")
      .find({
        createdAt: {
          $gte: previousStartDate,
          $lte: previousEndDate,
        },
      })
      .toArray();

    // Calculate totals for current period
    const totalEntries = currentEntries.length;
    const totalInvoices = currentInvoices.length;
    const totalAmount = currentEntries.reduce(
      (sum, entry) => sum + (entry.totalAmount || 0),
      0
    );

    // Get unique clients and employees
    const uniqueClients = new Set(currentEntries.map((entry) => entry.client));
    const uniqueEmployees = new Set(
      currentEntries.map((entry) => entry.userName)
    );

    // Calculate totals for previous period
    const previousTotalEntries = previousEntries.length;
    const previousTotalInvoices = previousInvoices.length;
    const previousTotalAmount = previousEntries.reduce(
      (sum, entry) => sum + (entry.totalAmount || 0),
      0
    );

    // Calculate percent changes
    const calculatePercentChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const percentChange = {
      entries: calculatePercentChange(totalEntries, previousTotalEntries),
      invoices: calculatePercentChange(totalInvoices, previousTotalInvoices),
      amount: calculatePercentChange(totalAmount, previousTotalAmount),
    };

    // Calculate average values
    const avgEntryValue = totalEntries > 0 ? totalAmount / totalEntries : 0;
    const avgInvoiceValue =
      totalInvoices > 0
        ? currentInvoices.reduce(
            (sum, inv) => sum + (inv.totalAmount || 0),
            0
          ) / totalInvoices
        : 0;

    return NextResponse.json({
      totalEntries,
      totalInvoices,
      totalAmount,
      uniqueClients: uniqueClients.size,
      uniqueEmployees: uniqueEmployees.size,
      avgEntryValue,
      avgInvoiceValue,
      percentChange,
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
    });
  } catch (error) {
    console.error("Error fetching summary data:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary data" },
      { status: 500 }
    );
  }
}
