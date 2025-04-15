import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import {
  startOfMonth,
  subDays,
  subQuarters,
  format,
  startOfYear,
  endOfYear,
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
    const timeframe = searchParams.get("timeframe") || "year";
    const year =
      searchParams.get("year") || new Date().getFullYear().toString();
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "month"; // month, week, day

    const client = await clientPromise;
    const db = client.db();

    // Define date range based on timeframe or custom dates
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    if (startDateParam && endDateParam) {
      // Custom date range
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // Predefined timeframes
      switch (timeframe) {
        case "week":
          startDate = subDays(now, 7);
          break;
        case "month":
          startDate = startOfMonth(now);
          break;
        case "quarter":
          startDate = subQuarters(now, 1);
          break;
        case "year":
          startDate = startOfYear(new Date(Number.parseInt(year), 0, 1));
          endDate = endOfYear(new Date(Number.parseInt(year), 0, 1));
          break;
        case "last30":
          startDate = subDays(now, 30);
          break;
        case "last90":
          startDate = subDays(now, 90);
          break;
        default:
          startDate = startOfMonth(now);
      }
    }

    // Get entries within the date range
    const entries = await db
      .collection("entries")
      .find({
        date: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString(),
        },
      })
      .toArray();

    // Group by selected interval
    const revenueData = {};

    // Format function based on groupBy
    let formatString = "MMM dd";
    if (groupBy === "month") {
      formatString = "MMM yyyy";
    } else if (groupBy === "week") {
      formatString = "'Week' w, yyyy";
    }

    // Initialize with zero values
    entries.forEach((entry) => {
      const date = new Date(entry.date);
      const formattedDate = format(date, formatString);

      if (!revenueData[formattedDate]) {
        revenueData[formattedDate] = {
          total: 0,
          count: 0,
        };
      }

      revenueData[formattedDate].total += entry.totalAmount || 0;
      revenueData[formattedDate].count += 1;
    });

    // Convert to chart format
    const chartData = Object.keys(revenueData).map((date) => ({
      name: date,
      total: revenueData[date].total,
      count: revenueData[date].count,
    }));

    // Sort by date
    chartData.sort((a, b) => {
      const dateA = new Date(a.name);
      const dateB = new Date(b.name);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate overall statistics
    const totalRevenue = entries.reduce(
      (sum, entry) => sum + (entry.totalAmount || 0),
      0
    );
    const averageRevenue = totalRevenue / (chartData.length || 1);

    // Calculate growth rate (comparing first and last periods)
    let growthRate = 0;
    if (chartData.length >= 2) {
      const firstPeriod = chartData[0].total;
      const lastPeriod = chartData[chartData.length - 1].total;
      growthRate =
        firstPeriod > 0 ? ((lastPeriod - firstPeriod) / firstPeriod) * 100 : 0;
    }

    return NextResponse.json({
      chartData,
      statistics: {
        totalRevenue,
        averageRevenue,
        growthRate,
        entriesCount: entries.length,
      },
      dateRange: {
        start: startDate,
        end: endDate,
      },
    });
  } catch (error) {
    console.error("Error fetching monthly revenue data:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly revenue data" },
      { status: 500 }
    );
  }
}
