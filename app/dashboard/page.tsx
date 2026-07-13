"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileText,
  DollarSign,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RecentEntries } from "@/components/dashboard/recent-entries";
import { EmployeePerformanceChart } from "@/components/dashboard/employee-performance-chart";
import { ClientDistributionChart } from "@/components/dashboard/client-distribution-chart";
import { MonthlyRevenueChart } from "@/components/dashboard/monthly-revenue-chart";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import type { DateRange } from "react-day-picker";
import { startOfMonth, startOfWeek } from "date-fns";
import {
  processEmployeePerformanceData,
  processClientDistributionData,
  processMonthlyRevenueData,
  processSummaryData,
} from "@/lib/chart-calculations";
import { redirect } from "next/navigation";

interface Entry {
  _id: string;
  date: string;
  client: string;
  description: string;
  mileage: {
    miles: number;
    amount: number;
  };
  expenses: {
    description: string;
    amount: number;
  };
  overtime: {
    hours: number;
    amount: number;
  };
  sustenance: {
    description: string;
    amount: number;
  };
  totalAmount: number;
  userId: string;
  userName?: string;
}

interface SummaryData {
  totalEntries: number;
  totalInvoices: number;
  totalAmount: number;
  uniqueClients: number;
  uniqueEmployees: number;
  avgEntryValue: number;
  avgInvoiceValue: number;
  percentChange?: {
    entries: number;
    invoices: number;
    amount: number;
  };
  dateRange?: {
    current: {
      start: string;
      end: string;
    };
    previous: {
      start: string;
      end: string;
    };
  };
}

// Initial state values to avoid repetition
const initialSummaryData: SummaryData = {
  totalEntries: 0,
  totalInvoices: 0,
  totalAmount: 0,
  uniqueClients: 0,
  uniqueEmployees: 0,
  avgEntryValue: 0,
  avgInvoiceValue: 0,
  percentChange: {
    entries: 0,
    invoices: 0,
    amount: 0,
  },
};

export default function Dashboard() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summaryData, setSummaryData] =
    useState<SummaryData>(initialSummaryData);
  if (session?.user?.role !== "admin") {
    redirect("/create-entry");

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600">
            You must be an admin to view this page.
          </p>
        </div>
      </div>
    );
  }
  // Default to current month
  const [timeframe, setTimeframe] = useState("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const [employeeData, setEmployeeData] = useState({
    chartData: [],
    employeeTotals: [],
  });
  const [clientData, setClientData] = useState({
    chartData: [],
    clientTotals: [],
  });
  const [revenueData, setRevenueData] = useState({
    chartData: [],
    statistics: {},
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoize query parameters to prevent unnecessary recalculations
  const queryParams = useMemo(() => {
    if (timeframe === "custom" && dateRange?.from && dateRange?.to) {
      return `startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`;
    }
    return `timeframe=${timeframe}`;
  }, [timeframe, dateRange]);

  // Fetch data with AbortController for cleanup
  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // Create an AbortController to cancel fetch requests if component unmounts
    const controller = new AbortController();
    const signal = controller.signal;

    try {
      // Use Promise.all to fetch data in parallel
      const [
        summaryResponse,
        // entriesResponse,
        employeeResponse,
        clientPieResponse,
        clientLineResponse,
        revenueResponse,
      ] = await Promise.all([
        fetch(`/api/dashboard/summary?${queryParams}`, { signal }),
        // fetch(`/api/entries?limit=5&${queryParams}`, { signal }),
        fetch(`/api/dashboard/employee-performance?${queryParams}`, { signal }),
        fetch(`/api/dashboard/client-distribution?${queryParams}`, { signal }),
        fetch(`/api/dashboard/client-distribution?${queryParams}`, { signal }),
        fetch(`/api/dashboard/monthly-revenue?${queryParams}`, { signal }),
      ]);

      if (summaryResponse.ok) {
        const rawData = await summaryResponse.json();
        // Process summary data on the frontend
        const processedData: any = processSummaryData(
          rawData.currentEntries,
          rawData.currentInvoices,
          rawData.previousEntries,
          rawData.previousInvoices
        );

        // Add date range to processed data
        processedData.dateRange = rawData.dateRange;

        setSummaryData(processedData);
      }

      if (employeeResponse.ok) {
        const rawData = await employeeResponse.json();
        // Process employee performance data on the frontend
        const processedData: any = processEmployeePerformanceData(
          rawData.entries
        );
        setEmployeeData(processedData);
      }

      if (clientPieResponse.ok) {
        const rawData = await clientPieResponse.json();
        // Process client distribution data on the frontend
        const processedData: any = processClientDistributionData(
          rawData.entries,
          "pie"
        );
        setClientData(processedData);
      }

      if (revenueResponse.ok) {
        const rawData = await revenueResponse.json();
        // Process monthly revenue data on the frontend
        const processedData: any = processMonthlyRevenueData(rawData.entries);
        setRevenueData(processedData);
      }
    } catch (error: any) {
      // Only log errors that aren't from aborting the fetch
      if (error.name !== "AbortError") {
        console.error("Error fetching dashboard data:", error);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }

    // Return the abort controller for cleanup
    return controller;
  }, [queryParams]);

  // Initial data fetch with cleanup
  useEffect(() => {
    const controller = fetchData();

    // Cleanup function to abort fetch if component unmounts
    return () => {
      controller.then((c) => c.abort());
    };
  }, [fetchData]);

  // Handle timeframe change - memoized to prevent recreation on each render
  const handleTimeframeChange = useCallback((value: string) => {
    setTimeframe(value);

    // Reset date range if not custom
    if (value !== "custom") {
      // For non-custom timeframes, calculate the appropriate date range
      const now = new Date();
      let from, to;

      switch (value) {
        case "week":
          from = startOfWeek(now);
          to = new Date();
          break;
        case "month":
          from = startOfMonth(now);
          to = new Date();
          break;
        case "quarter":
          from = new Date(
            now.getFullYear(),
            Math.floor(now.getMonth() / 3) * 3,
            1
          );
          to = new Date();
          break;
        case "year":
          from = new Date(now.getFullYear(), 0, 1);
          to = new Date();
          break;
        case "last30":
          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          to = new Date();
          break;
        case "last90":
          from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          to = new Date();
          break;
        default:
          from = startOfMonth(now);
          to = new Date();
      }

      setDateRange({ from, to });
    }
  }, []);

  // Handle date range change - memoized to prevent recreation on each render
  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setTimeframe("custom");
    }
  }, []);

  // Handle refresh - memoized to prevent recreation on each render
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Memoize trend calculations to avoid recalculations on every render
  const entriesTrend = useMemo(() => {
    return summaryData.percentChange?.entries &&
      summaryData.percentChange.entries >= 0
      ? "up"
      : "down";
  }, [summaryData.percentChange?.entries]);

  const invoicesTrend = useMemo(() => {
    return summaryData.percentChange?.invoices &&
      summaryData.percentChange.invoices >= 0
      ? "up"
      : "down";
  }, [summaryData.percentChange?.invoices]);

  const amountTrend = useMemo(() => {
    return summaryData.percentChange?.amount &&
      summaryData.percentChange.amount >= 0
      ? "up"
      : "down";
  }, [summaryData.percentChange?.amount]);

  // Memoize skeleton arrays to prevent recreation on each render
  const skeletonArray = useMemo(() => Array.from({ length: 5 }), []);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <DashboardHeader
          title="Dashboard"
          description="Overview of your business performance"
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          onRefresh={handleRefresh}
          isLoading={isRefreshing}
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Entries"
            value={summaryData.totalEntries}
            icon={<FileText className="h-4 w-4" />}
            description={`${
              summaryData.percentChange?.entries || 0
            }% from previous period`}
            trend={entriesTrend}
            isLoading={isLoading}
            variant="blue"
            secondaryValue={`£${summaryData.avgEntryValue.toLocaleString()}`}
            secondaryLabel="avg. per entry"
          />

          <StatCard
            title="Total Invoices"
            value={summaryData.totalInvoices}
            icon={<DollarSign className="h-4 w-4" />}
            description={`${
              summaryData.percentChange?.invoices || 0
            }% from previous period`}
            trend={invoicesTrend}
            isLoading={isLoading}
            variant="green"
            secondaryValue={`£${summaryData.avgInvoiceValue.toLocaleString()}`}
            secondaryLabel="avg. per invoice"
          />

          <StatCard
            title="Total Revenue"
            value={`£${summaryData.totalAmount.toLocaleString()}`}
            icon={<TrendingUp className="h-4 w-4" />}
            description={`${
              summaryData.percentChange?.amount || 0
            }% from previous period`}
            trend={amountTrend}
            isLoading={isLoading}
            variant="amber"
          />
        </div>

        {/* Charts */}
        <div className="space-y-6">
            {/* Revenue Chart */}
            <Card className="border-t-4 border-t-blue-500 dark:border-t-blue-400">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-medium">
                    Revenue Overview
                  </CardTitle>
                  <CardDescription>Revenue trends over time</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="h-full pt-4">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <MonthlyRevenueChart
                    data={revenueData}
                    timeframe={timeframe}
                  />
                )}
              </CardContent>
            </Card>

            {/* Performance and Distribution Charts */}
            <div className="grid gap-6 md:grid-cols-1">
              <Card className="border-t-4 border-t-amber-500 dark:border-t-amber-400">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base font-medium">
                      Employee Performance
                    </CardTitle>
                    <CardDescription>
                      Revenue generated by each employee
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon">
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="h-full pt-4">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Skeleton className="h-[250px] w-full" />
                    </div>
                  ) : (
                    <EmployeePerformanceChart
                      data={employeeData}
                      timeframe={timeframe}
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-yellow-500 dark:border-t-yellow-400">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base font-medium">
                      Client Distribution
                    </CardTitle>
                    <CardDescription>
                      Revenue distribution by client
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon">
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="h-full pt-4">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Skeleton className="h-[250px] w-full" />
                    </div>
                  ) : (
                    <ClientDistributionChart
                      data={clientData}
                      timeframe={timeframe}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Entries */}
        </div>
      </div>
    </Layout>
  );
}
