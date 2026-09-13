"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
} from "lucide-react";

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

interface BookingRequestSummary {
  _id: unknown;
  status: string;
  createdAt?: unknown;
  jobEstimate?: {
    jobType?: string;
    jobLocation?: string;
  };
  estimatedCost?: {
    totalCost?: unknown;
  };
}

interface JobSummary {
  _id: unknown;
  jobName?: string;
  status: string;
  expireDate?: unknown;
  clientPrice?: unknown;
}

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  activeJobs: number;
  completedJobs: number;
  totalSpent: number;
  recentRequests: BookingRequestSummary[];
  recentJobs: JobSummary[];
}

function money(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dateLabel(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime())
    ? "Date not available"
    : format(date, "d MMM yyyy");
}

export default function CustomerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (background = false) => {
    if (background) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/customer/dashboard", {
        cache: "no-store",
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.message || `Dashboard request failed (${response.status})`
        );
      }

      setStats(body);
    } catch (requestError) {
      console.error("Error fetching customer dashboard data:", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to fetch dashboard data"
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.role !== "customer") {
      router.replace("/job-portal");
      return;
    }

    if (status === "authenticated" && session?.user?.role === "customer") {
      void fetchDashboardData();
    }
  }, [fetchDashboardData, router, session?.user?.role, status]);

  if (status === "loading" || isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (status !== "authenticated" || session?.user?.role !== "customer") {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Customer Portal</p>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {session.user.name || "Customer"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              Track estimates and active work from one place.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/estimate">New estimate</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => void fetchDashboardData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void fetchDashboardData()}
            >
              Try again
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Total Requests",
              value: stats?.totalRequests || 0,
              caption: "Estimates submitted",
              icon: ClipboardList,
              colour: "border-l-blue-600 text-blue-600",
            },
            {
              title: "Pending Review",
              value: stats?.pendingRequests || 0,
              caption: "Awaiting Warrington review",
              icon: Clock3,
              colour: "border-l-amber-500 text-amber-600",
            },
            {
              title: "Active Jobs",
              value: stats?.activeJobs || 0,
              caption: "Assigned or in progress",
              icon: Package,
              colour: "border-l-indigo-600 text-indigo-600",
            },
            {
              title: "Completed Jobs",
              value: stats?.completedJobs || 0,
              caption: `${money(stats?.totalSpent || 0)} completed value`,
              icon: CheckCircle2,
              colour: "border-l-emerald-600 text-emerald-600",
            },
          ].map((card) => (
            <Card key={card.title} className={`border-l-4 ${card.colour}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <card.icon className="h-5 w-5" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.caption}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                Recent Job Requests
              </CardTitle>
              <CardDescription>
                Your latest estimates and their review status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentRequests?.length ? (
                <div className="space-y-3">
                  {stats.recentRequests.slice(0, 4).map((request) => (
                    <div
                      key={String(request._id)}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {request.jobEstimate?.jobType || "Job Request"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {request.jobEstimate?.jobLocation ||
                            "Location not provided"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {dateLabel(request.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusBadge status={request.status} />
                        <span className="text-sm font-semibold">
                          {money(request.estimatedCost?.totalCost)}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/customer/job-requests">View all requests</Link>
                  </Button>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">No job requests yet</p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Submit an estimate when you are ready to start a project.
                  </p>
                  <Button asChild>
                    <Link href="/estimate">Create an estimate</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                Active Jobs
              </CardTitle>
              <CardDescription>
                Work currently assigned or in progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentJobs?.length ? (
                <div className="space-y-3">
                  {stats.recentJobs.slice(0, 4).map((job) => (
                    <div
                      key={String(job._id)}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {job.jobName || "Untitled job"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Due {dateLabel(job.expireDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusBadge status={job.status} />
                        <span className="text-sm font-semibold">
                          {money(job.clientPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/job-portal">View all jobs</Link>
                  </Button>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">No active jobs</p>
                  <p className="text-sm text-muted-foreground">
                    Approved work will appear here automatically.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
