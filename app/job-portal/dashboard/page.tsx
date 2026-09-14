"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  PoundSterling,
  Clock3,
  Loader2,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Summary {
  totalJobs: number;
  activeJobs: number;
  pendingJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  revenue: number;
  workerPayments: number;
  billableCosts: number;
  absorbedCosts: number;
  totalCosts: number;
  profit: number;
  profitMargin: number;
  averageJobValue: number;
}

interface MonthlyPoint {
  month: string;
  label: string;
  jobs: number;
  revenue: number;
  totalCosts: number;
  profit: number;
}

interface StatusPoint {
  status: string;
  label: string;
  count: number;
}

interface ClientPoint {
  name: string;
  jobs: number;
  revenue: number;
  costs: number;
  profit: number;
}

interface ManagerPoint {
  name: string;
  jobs: number;
  revenue: number;
  profit: number;
}

interface JobRow {
  id: string;
  jobName: string;
  clientName: string;
  managerName: string;
  status: string;
  assignDate: string | null;
  createdAt: string | null;
  clientPrice: number;
  workerPayments: number;
  billableCosts: number;
  absorbedCosts: number;
  totalCosts: number;
  profit: number;
  profitMargin: number;
}

interface CostPoint {
  name: string;
  value: number;
}

interface DashboardData {
  summary: Summary;
  monthly: MonthlyPoint[];
  statusDistribution: StatusPoint[];
  topClients: ClientPoint[];
  topManagers: ManagerPoint[];
  lowestProfitJobs: JobRow[];
  recentJobs: JobRow[];
  costComposition: CostPoint[];
}

interface CustomerOption {
  customerAccountId: string;
  displayName: string;
  email: string;
}

interface KpiCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "negative";
}

const CHART_COLORS = [
  "#d97706",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not scheduled"
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function statusLabel(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
}: KpiCardProps) {
  const valueColour =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`mt-2 truncate text-2xl font-bold ${valueColour}`}>
              {value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-950/50">
            <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JobPortalDashboardPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [jobStatus, setJobStatus] = useState("all");
  const [customerAccountId, setCustomerAccountId] =
    useState("all");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (
      sessionStatus === "authenticated" &&
      session?.user?.role !== "admin"
    ) {
      router.replace("/job-portal");
    }
  }, [router, session?.user?.role, sessionStatus]);

  useEffect(() => {
    if (session?.user?.role !== "admin") return;

    const loadCustomers = async () => {
      try {
        const response = await fetch(
          "/api/v1/admin/customer-accounts",
          { cache: "no-store" }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to load customers"
          );
        }

        setCustomers(result.customers || []);
      } catch (error) {
        console.error("Unable to load customer filter:", error);
      }
    };

    loadCustomers();
  }, [session?.user?.role]);

  const loadDashboard = useCallback(
    async (backgroundRefresh = false) => {
      if (session?.user?.role !== "admin") return;

      if (startDate && endDate && startDate > endDate) {
        setErrorMessage("Start date cannot be after end date.");
        return;
      }

      if (backgroundRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage("");

      try {
        const query = new URLSearchParams();

        if (startDate) query.set("startDate", startDate);
        if (endDate) query.set("endDate", endDate);
        if (jobStatus !== "all") query.set("status", jobStatus);
        if (customerAccountId !== "all") {
          query.set("customerAccountId", customerAccountId);
        }

        const response = await fetch(
          `/api/job-portal/dashboard?${query.toString()}`,
          { cache: "no-store" }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to load job analytics"
          );
        }

        setData(result);
      } catch (error) {
        console.error("Unable to load job analytics:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load job analytics"
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      customerAccountId,
      endDate,
      jobStatus,
      session?.user?.role,
      startDate,
    ]
  );

  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadDashboard();
    }
  }, [loadDashboard, session?.user?.role]);

  if (sessionStatus === "loading") {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      </Layout>
    );
  }

  if (session?.user?.role !== "admin") {
    return null;
  }

  const summary = data?.summary;
  const profitTone =
    (summary?.profit || 0) < 0 ? "negative" : "positive";

  return (
    <Layout>
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-amber-600" />
              <h1 className="text-3xl font-bold tracking-tight">
                Job Analytics
              </h1>
            </div>
            <p className="mt-1 text-muted-foreground">
              Jobs, revenue, approved costs and profitability from the jobs
              collection.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => loadDashboard(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>
              Date filters use each job&apos;s scheduled start date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="analytics-start-date">Start date</Label>
                <Input
                  id="analytics-start-date"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="analytics-end-date">End date</Label>
                <Input
                  id="analytics-end-date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={customerAccountId}
                  onValueChange={setCustomerAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem
                        key={customer.customerAccountId}
                        value={customer.customerAccountId}
                      >
                        {customer.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={jobStatus} onValueChange={setJobStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">
                      In Progress
                    </SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {errorMessage && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                {errorMessage}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadDashboard(true)}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && !data ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-xl border bg-card">
            <div className="text-center">
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-amber-600" />
              <p className="mt-3 text-sm text-muted-foreground">
                Loading job analytics...
              </p>
            </div>
          </div>
        ) : data && summary ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Total Jobs"
                value={summary.totalJobs.toLocaleString("en-GB")}
                description={`${summary.pendingJobs} pending`}
                icon={BriefcaseBusiness}
              />
              <KpiCard
                title="Active Jobs"
                value={summary.activeJobs.toLocaleString("en-GB")}
                description={`${summary.inProgressJobs} in progress`}
                icon={Activity}
              />
              <KpiCard
                title="Completed Jobs"
                value={summary.completedJobs.toLocaleString("en-GB")}
                description="Completed in the selected period"
                icon={CheckCircle2}
              />
              <KpiCard
                title="Revenue"
                value={formatCurrency(summary.revenue)}
                description="Sum of customer job prices"
                icon={PoundSterling}
              />
              <KpiCard
                title="Total Costs"
                value={formatCurrency(summary.totalCosts)}
                description="Workers plus approved job costs"
                icon={WalletCards}
                tone="negative"
              />
              <KpiCard
                title="Profit"
                value={formatCurrency(summary.profit)}
                description="Revenue minus total costs"
                icon={TrendingUp}
                tone={profitTone}
              />
              <KpiCard
                title="Profit Margin"
                value={`${summary.profitMargin.toFixed(1)}%`}
                description="Profit divided by revenue"
                icon={BarChart3}
                tone={profitTone}
              />
              <KpiCard
                title="Average Job Value"
                value={formatCurrency(summary.averageJobValue)}
                description="Revenue divided by job count"
                icon={Clock3}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Monthly Revenue and Profit</CardTitle>
                  <CardDescription>
                    Revenue, costs and profit by scheduled month
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[340px]">
                  {data.monthly.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.monthly}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" />
                        <YAxis tickFormatter={formatCompactCurrency} />
                        <Tooltip
                          formatter={(value: any) =>
                            formatCurrency(Number(value))
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="revenue"
                          name="Revenue"
                          fill="#d97706"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="totalCosts"
                          name="Total Costs"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          type="monotone"
                          dataKey="profit"
                          name="Profit"
                          stroke="#16a34a"
                          strokeWidth={3}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No monthly data for the selected filters.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Monthly Job Volume</CardTitle>
                  <CardDescription>
                    Number of jobs scheduled each month
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[340px]">
                  {data.monthly.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthly}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar
                          dataKey="jobs"
                          name="Jobs"
                          fill="#2563eb"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No job-volume data for the selected filters.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>
                    Current status of filtered jobs
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[340px]">
                  {data.statusDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.statusDistribution}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={105}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {data.statusDistribution.map((item, index) => (
                            <Cell
                              key={item.status}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No status data for the selected filters.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Cost Composition</CardTitle>
                  <CardDescription>
                    Worker payments and approved cost treatments
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[340px]">
                  {data.costComposition.some((item) => item.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.costComposition}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={105}
                        >
                          {data.costComposition.map((item, index) => (
                            <Cell
                              key={item.name}
                              fill={CHART_COLORS[(index + 1) % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) =>
                            formatCurrency(Number(value))
                          }
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No approved costs for the selected filters.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm xl:col-span-2">
                <CardHeader>
                  <CardTitle>Top Clients by Revenue</CardTitle>
                  <CardDescription>
                    Highest-value customer accounts in the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[360px]">
                  {data.topClients.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.topClients.slice(0, 8)}
                        layout="vertical"
                        margin={{ left: 24 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={formatCompactCurrency}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value: any) =>
                            formatCurrency(Number(value))
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="revenue"
                          name="Revenue"
                          fill="#d97706"
                          radius={[0, 5, 5, 0]}
                        />
                        <Bar
                          dataKey="profit"
                          name="Profit"
                          fill="#16a34a"
                          radius={[0, 5, 5, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No client data for the selected filters.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Top Clients</CardTitle>
                  <CardDescription>
                    Revenue and profit by client
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Jobs</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topClients.length > 0 ? (
                        data.topClients.map((client) => (
                          <TableRow key={client.name}>
                            <TableCell className="font-medium">
                              {client.name}
                            </TableCell>
                            <TableCell className="text-right">
                              {client.jobs}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(client.revenue)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                client.profit < 0
                                  ? "text-red-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {formatCurrency(client.profit)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No clients found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Top Managers</CardTitle>
                  <CardDescription>
                    Job value associated with each manager
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Manager</TableHead>
                        <TableHead className="text-right">Jobs</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topManagers.length > 0 ? (
                        data.topManagers.map((manager) => (
                          <TableRow key={manager.name}>
                            <TableCell className="font-medium">
                              {manager.name}
                            </TableCell>
                            <TableCell className="text-right">
                              {manager.jobs}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(manager.revenue)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                manager.profit < 0
                                  ? "text-red-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {formatCurrency(manager.profit)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No managers found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Lowest-Profit Jobs</CardTitle>
                  <CardDescription>
                    Jobs requiring the closest margin review
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.lowestProfitJobs.length > 0 ? (
                        data.lowestProfitJobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell>
                              <Link
                                href={`/job-portal/${job.id}`}
                                className="font-medium hover:underline"
                              >
                                {job.jobName}
                              </Link>
                            </TableCell>
                            <TableCell>{job.clientName}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(job.clientPrice)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                job.profit < 0
                                  ? "text-red-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {formatCurrency(job.profit)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No jobs found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Recent Jobs</CardTitle>
                  <CardDescription>
                    Most recently created filtered jobs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentJobs.length > 0 ? (
                        data.recentJobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell>
                              <Link
                                href={`/job-portal/${job.id}`}
                                className="font-medium hover:underline"
                              >
                                {job.jobName}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {job.clientName}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {statusLabel(job.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(job.assignDate)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(job.clientPrice)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No recent jobs found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
