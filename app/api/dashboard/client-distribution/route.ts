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
    const chartType = searchParams.get("chartType") || "pie"; // Default to pie chart, can be 'line' for line chart
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

    if (chartType === "line") {
      // For line chart: Group by date and client
      const dateData = {};
      const clients = new Set();

      // First, identify all clients
      entries.forEach((entry) => {
        if (entry.client) {
          clients.add(entry.client);
        }
      });

      // Group entries by date
      entries.forEach((entry) => {
        if (entry.client) {
          const date = new Date(entry.date);
          const formattedDate = format(date, "MMM dd");

          if (!dateData[formattedDate]) {
            dateData[formattedDate] = {};
            clients.forEach((client) => {
              dateData[formattedDate][client] = 0;
            });
          }

          dateData[formattedDate][entry.client] += entry.totalAmount || 0;
        }
      });

      // Convert to chart format
      const chartData = Object.keys(dateData).map((date) => {
        const dataPoint = { name: date };

        clients.forEach((client) => {
          dataPoint[client] = dateData[date][client] || 0;
        });

        return dataPoint;
      });

      // Sort by date
      chartData.sort((a, b) => {
        const dateA = new Date(a.name);
        const dateB = new Date(b.name);
        return dateA.getTime() - dateB.getTime();
      });

      // Calculate totals for each client
      const clientTotals = Array.from(clients).map((client) => {
        const total = entries
          .filter((entry) => entry.client === client)
          .reduce((sum, entry) => sum + (entry.totalAmount || 0), 0);

        return {
          name: client,
          total: total,
          count: entries.filter((entry) => entry.client === client).length,
        };
      });

      // Sort client totals by amount
      clientTotals.sort((a, b) => b.total - a.total);

      return NextResponse.json({
        chartData,
        clientTotals,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      });
    } else {
      // For pie chart: Group by client
      const clientData = {};

      entries.forEach((entry) => {
        const client = entry.client;

        if (!clientData[client]) {
          clientData[client] = {
            count: 0,
            amount: 0,
          };
        }

        clientData[client].count += 1;
        clientData[client].amount += entry.totalAmount || 0;
      });

      // Calculate total entries and amount
      const totalEntries = entries.length;
      const totalAmount = entries.reduce(
        (sum, entry) => sum + (entry.totalAmount || 0),
        0
      );

      // Convert to chart format
      const chartData = Object.keys(clientData).map((client) => ({
        name: client,
        value: Math.round((clientData[client].count / totalEntries) * 100),
        amount: clientData[client].amount,
        count: clientData[client].count,
        percentage: Math.round((clientData[client].amount / totalAmount) * 100),
      }));

      // Sort by value (percentage) descending
      chartData.sort((a, b) => b.amount - a.amount);

      // Limit to top 5 clients
      const topClients = chartData.slice(0, 5);

      return NextResponse.json({
        chartData: topClients,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        totalAmount,
      });
    }
  } catch (error) {
    console.error("Error fetching client distribution data:", error);
    return NextResponse.json(
      { error: "Failed to fetch client distribution data" },
      { status: 500 }
    );
  }
}
