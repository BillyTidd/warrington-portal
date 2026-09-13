"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { startOfMonth } from "date-fns";
import { BriefcaseBusiness, FileText, PoundSterling, Users } from "lucide-react";
import { toast } from "sonner";

import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmployeePerformanceChart } from "@/components/dashboard/employee-performance-chart";
import { ClientDistributionChart } from "@/components/dashboard/client-distribution-chart";
import { MonthlyRevenueChart } from "@/components/dashboard/monthly-revenue-chart";
import {
  getDashboardGroupBy,
  processClientDistributionData,
  processEmployeePerformanceData,
  processMonthlyRevenueData,
  processSummaryData,
} from "@/lib/chart-calculations";

interface SummaryData {
  totalEntries: number;
  totalInvoices: number;
  totalAmount: number;
  uniqueClients: number;
  uniqueEmployees: number;
  avgEntryValue: number;
  percentChange: {
    entries: number;
    invoices: number;
    amount: number;
  };
}

const initialSummaryData: SummaryData = {
  totalEntries: 0,
  totalInvoices: 0,
  totalAmount: 0,
  uniqueClients: 0,
  uniqueEmployees: 0,
  avgEntryValue: 0,
  percentChange: { entries: 0, invoices: 0, amount: 0 },
};

function trendFor(value: number): "up" | "down" | "neutral" {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "neutral";
}

function changeLabel(value: number) {
  if (value === 0) return "No change from previous period";
  return `${Math.abs(value)}% ${value > 0 ? "increase" : "decrease"} from previous period`;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const controllerRef = useRef<AbortController | null>(null);

  const [timeframe, setTimeframe] = useState("thisMonth");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] =
    useState<SummaryData>(initialSummaryData);
  const [employeeData, setEmployeeData] = useState<
    ReturnType<typeof processEmployeePerformanceData>
  >({
    chartData: [],
    employeeTotals: [],
  });
  const [clientData, setClientData] = useState<
    ReturnType<typeof processClientDistributionData>
  >({
    chartData: [],
    totalAmount: 0,
  });
  const [costData, setCostData] = useState<
    ReturnType<typeof processMonthlyRevenueData>
  >({
    chartData: [],
    statistics: {
      totalAmount: 0,
      averageAmount: 0,
      changeRate: 0,
      entriesCount: 0,
    },
  });

  const queryParams = useMemo(() => {
    if (timeframe === "custom" && dateRange?.from && dateRange?.to) {
      return new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      }).toString();
    }

    return new URLSearchParams({ timeframe }).toString();
  }, [timeframe, dateRange]);

  const fetchData = useCallback(
    async (background = false) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (background) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const responses = await Promise.all([
          fetch(`/api/dashboard/summary?${queryParams}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/dashboard/employee-performance?${queryParams}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/dashboard/client-distribution?${queryParams}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/dashboard/monthly-revenue?${queryParams}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);

        const failedResponse = responses.find((response) => !response.ok);
        if (failedResponse) {
          let message = `Dashboard request failed (${failedResponse.status})`;
          try {
            const body = await failedResponse.json();
            message = body.error || body.message || message;
          } catch {
            // The status-based message above is sufficient.
          }
          throw new Error(message);
        }

        const [summaryRaw, employeeRaw, clientRaw, costRaw] =
          await Promise.all(responses.map((response) => response.json()));

        setSummaryData(
          processSummaryData(
            summaryRaw.currentEntries,
            summaryRaw.currentInvoiceCount,
            summaryRaw.previousEntries,
            summaryRaw.previousInvoiceCount
          )
        );
        setEmployeeData(processEmployeePerformanceData(employeeRaw.entries));
        setClientData(processClientDistributionData(clientRaw.entries));
        setCostData(
          processMonthlyRevenueData(
            costRaw.entries,
            getDashboardGroupBy(timeframe)
          )
        );
      } catch (requestError) {
        if (
          requestError instanceof Error &&
          requestError.name !== "AbortError"
        ) {
          console.error("Error fetching dashboard data:", requestError);
          setError(requestError.message);
          toast.error("Unable to refresh the dashboard", {
            description: requestError.message,
          });
        }
      } finally {
        if (controllerRef.current === controller) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [queryParams, timeframe]
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/create-entry");
      return;
    }

    if (status === "authenticated" && session?.user?.role === "admin") {
      void fetchData();
    }

    return () => controllerRef.current?.abort();
  }, [fetchData, router, session?.user?.role, status]);

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36" />
            ))}
          </div>
          <Skeleton className="h-[460px]" />
        </div>
      </Layout>
    );
  }

  if (status !== "authenticated" || session?.user?.role !== "admin") {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <DashboardHeader
          title="Operations Dashboard"
          description="Live operational activity, costs, clients, and invoices"
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onRefresh={() => void fetchData(true)}
          isLoading={isRefreshing}
        />

        {error && (
          <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            <span>{error}. The last successfully loaded figures remain visible.</span>
            <button
              type="button"
              className="font-semibold underline underline-offset-4"
              onClick={() => void fetchData(true)}
            >
              Try again
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Entries"
            value={summaryData.totalEntries}
            icon={<FileText className="h-4 w-4" />}
            description={changeLabel(summaryData.percentChange.entries)}
            trend={trendFor(summaryData.percentChange.entries)}
            variant="blue"
            secondaryValue={`£${summaryData.avgEntryValue.toLocaleString("en-GB", {
              maximumFractionDigits: 0,
            })}`}
            secondaryLabel="average cost per entry"
          />

          <StatCard
            title="Invoices Created"
            value={summaryData.totalInvoices}
            icon={<PoundSterling className="h-4 w-4" />}
            description={changeLabel(summaryData.percentChange.invoices)}
            trend={trendFor(summaryData.percentChange.invoices)}
            variant="green"
          />

          <StatCard
            title="Operational Costs"
            value={`£${summaryData.totalAmount.toLocaleString("en-GB", {
              maximumFractionDigits: 0,
            })}`}
            icon={<BriefcaseBusiness className="h-4 w-4" />}
            description={changeLabel(summaryData.percentChange.amount)}
            trend={trendFor(summaryData.percentChange.amount)}
            variant="amber"
          />

          <StatCard
            title="Active Clients"
            value={summaryData.uniqueClients}
            icon={<Users className="h-4 w-4" />}
            description={`${summaryData.uniqueEmployees} employees submitted entries`}
            trend="neutral"
            variant="indigo"
          />
        </div>

        <Card className="border-t-4 border-t-blue-600">
          <CardHeader>
            <CardTitle>Operational Cost Trend</CardTitle>
            <CardDescription>
              Mileage, expenses, overtime, and sustenance recorded over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyRevenueChart data={costData} timeframe={timeframe} />
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-t-4 border-t-teal-600">
            <CardHeader>
              <CardTitle>Operational Cost by Employee</CardTitle>
              <CardDescription>
                Cost totals from each employee&apos;s submitted entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeePerformanceChart
                data={employeeData}
                timeframe={timeframe}
              />
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-violet-600">
            <CardHeader>
              <CardTitle>Operational Cost by Client</CardTitle>
              <CardDescription>
                Client share of employee expenses in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientDistributionChart
                data={clientData}
                timeframe={timeframe}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
