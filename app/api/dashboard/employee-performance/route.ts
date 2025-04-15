import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { startOfMonth, subDays, subQuarters, subYears, format } from "date-fns";

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
          startDate = subYears(now, 1);
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

    // Process entries to group by date and employee
    const dateData = {};
    const employees = new Set();

    // First, identify all employees
    entries.forEach((entry) => {
      if (entry.userName) {
        employees.add(entry.userName);
      }
    });

    // Group entries by date
    entries.forEach((entry) => {
      if (entry.userName) {
        const date = new Date(entry.date);
        const formattedDate = format(date, "MMM dd");

        if (!dateData[formattedDate]) {
          dateData[formattedDate] = {};
          employees.forEach((employee) => {
            dateData[formattedDate][employee] = 0;
          });
        }

        dateData[formattedDate][entry.userName] += entry.totalAmount || 0;
      }
    });

    // Convert to chart format
    const chartData = Object.keys(dateData).map((date) => {
      const dataPoint = { name: date };

      employees.forEach((employee) => {
        dataPoint[employee] = dateData[date][employee] || 0;
      });

      return dataPoint;
    });

    // Sort by date
    chartData.sort((a, b) => {
      const dateA = new Date(a.name);
      const dateB = new Date(b.name);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate totals for each employee
    const employeeTotals = Array.from(employees).map((employee) => {
      const total = entries
        .filter((entry) => entry.userName === employee)
        .reduce((sum, entry) => sum + (entry.totalAmount || 0), 0);

      return {
        name: employee,
        total: total,
        count: entries.filter((entry) => entry.userName === employee).length,
      };
    });

    // Sort employee totals by amount
    employeeTotals.sort((a, b) => b.total - a.total);

    return NextResponse.json({
      chartData,
      employeeTotals,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    });
  } catch (error) {
    console.error("Error fetching employee performance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee performance data" },
      { status: 500 }
    );
  }
}
