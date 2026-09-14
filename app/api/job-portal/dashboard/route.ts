export const dynamic = "force-dynamic";

import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

type CostTreatment = "billable" | "absorbed";

interface CalculatedJob {
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

function toFiniteNumber(value: unknown) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getClientPrice(job: any) {
  return toFiniteNumber(
    job.clientPrice ??
      job.estimatedCost?.totalCost ??
      job.estimatedCosts?.totalCost ??
      job.jobEstimate?.estimatedCost?.totalCost ??
      job.jobEstimate?.estimatedCosts?.totalCost ??
      0
  );
}

function getWorkerPayments(job: any) {
  if (Array.isArray(job.workers)) {
    return job.workers.reduce(
      (total: number, worker: any) =>
        total + toFiniteNumber(worker.paymentRate),
      0
    );
  }

  return toFiniteNumber(job.workerPaymentRate);
}

function getProgressCost(log: any) {
  return toFiniteNumber(
    log.overtimeCost ??
      log.vehicleUsage?.totalCost ??
      log.cost ??
      0
  );
}

function getCostTreatment(log: any): CostTreatment {
  if (
    log.costTreatment === "billable" ||
    log.costTreatment === "absorbed"
  ) {
    return log.costTreatment;
  }

  // Compatibility for approved records created before costTreatment existed.
  return log.workType === "regular"
    ? "billable"
    : "absorbed";
}

function getManagerName(job: any) {
  return (
    job.managerName ||
    job.jobEstimate?.managerDetails?.fullName ||
    job.jobEstimate?.manager ||
    "No manager"
  );
}

function getJobDate(job: any) {
  const rawDate =
    job.assignDate ?? job.startDate ?? job.createdAt ?? null;

  if (!rawDate) {
    return null;
  }

  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoString(value: unknown) {
  if (!value) {
    return null;
  }

  const date = new Date(value as string | Date);
  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

function calculateJob(job: any): CalculatedJob {
  const clientPrice = getClientPrice(job);
  const workerPayments = getWorkerPayments(job);
  let billableCosts = 0;
  let absorbedCosts = 0;

  const approvedLogs = Array.isArray(job.progressLogs)
    ? job.progressLogs.filter(
        (log: any) =>
          log.jobStatus === "approved" &&
          !log.statusChange
      )
    : [];

  for (const log of approvedLogs) {
    const cost = getProgressCost(log);

    if (getCostTreatment(log) === "billable") {
      billableCosts += cost;
    } else {
      absorbedCosts += cost;
    }
  }

  const totalCosts =
    workerPayments + billableCosts + absorbedCosts;
  const profit = clientPrice - totalCosts;
  const profitMargin =
    clientPrice > 0 ? (profit / clientPrice) * 100 : 0;

  return {
    id: job._id.toString(),
    jobName: String(job.jobName || job.title || "Untitled job"),
    clientName: String(job.clientName || "Unknown client"),
    managerName: String(getManagerName(job)),
    status: String(job.status || "pending"),
    assignDate: toIsoString(
      job.assignDate ?? job.startDate
    ),
    createdAt: toIsoString(job.createdAt),
    clientPrice,
    workerPayments,
    billableCosts,
    absorbedCosts,
    totalCosts,
    profit,
    profitMargin,
  };
}

function parseDateAtStart(value: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateAtEnd(value: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Only administrators can view job analytics" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDateValue = searchParams.get("startDate");
    const endDateValue = searchParams.get("endDate");
    const status = searchParams.get("status") || "all";
    const customerAccountId =
      searchParams.get("customerAccountId") || "all";

    const startDate = parseDateAtStart(startDateValue);
    const endDate = parseDateAtEnd(endDateValue);

    if (startDateValue && !startDate) {
      return NextResponse.json(
        { message: "Invalid start date" },
        { status: 400 }
      );
    }

    if (endDateValue && !endDate) {
      return NextResponse.json(
        { message: "Invalid end date" },
        { status: 400 }
      );
    }

    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        { message: "Start date cannot be after end date" },
        { status: 400 }
      );
    }

    if (
      customerAccountId !== "all" &&
      !ObjectId.isValid(customerAccountId)
    ) {
      return NextResponse.json(
        { message: "Invalid customer account" },
        { status: 400 }
      );
    }

    const query: Record<string, any> = {};

    if (status !== "all") {
      query.status = status;
    }

    if (customerAccountId !== "all") {
      query.$or = [
        {
          customer_account_id: new ObjectId(
            customerAccountId
          ),
        },
        { customer_account_id: customerAccountId },
        {
          customerAccountId: new ObjectId(
            customerAccountId
          ),
        },
        { customerAccountId },
        // Compatibility for older records.
        { clientId: customerAccountId },
      ];
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db();
    const jobs = await db.collection("jobs").find(query).toArray();

    const dateFilteredJobs = jobs.filter((job) => {
      const jobDate = getJobDate(job);

      if (!jobDate) {
        return !startDate && !endDate;
      }

      if (startDate && jobDate < startDate) return false;
      if (endDate && jobDate > endDate) return false;
      return true;
    });

    const calculatedJobs = dateFilteredJobs.map(calculateJob);

    const totalJobs = calculatedJobs.length;
    const pendingJobs = calculatedJobs.filter(
      (job) => job.status === "pending"
    ).length;
    const inProgressJobs = calculatedJobs.filter(
      (job) => job.status === "in-progress"
    ).length;
    const completedJobs = calculatedJobs.filter(
      (job) => job.status === "completed"
    ).length;
    const activeJobs = calculatedJobs.filter(
      (job) =>
        job.status !== "completed" &&
        job.status !== "cancelled"
    ).length;

    const totals = calculatedJobs.reduce(
      (result, job) => {
        result.revenue += job.clientPrice;
        result.workerPayments += job.workerPayments;
        result.billableCosts += job.billableCosts;
        result.absorbedCosts += job.absorbedCosts;
        result.totalCosts += job.totalCosts;
        result.profit += job.profit;
        return result;
      },
      {
        revenue: 0,
        workerPayments: 0,
        billableCosts: 0,
        absorbedCosts: 0,
        totalCosts: 0,
        profit: 0,
      }
    );

    const profitMargin =
      totals.revenue > 0
        ? (totals.profit / totals.revenue) * 100
        : 0;
    const averageJobValue =
      totalJobs > 0 ? totals.revenue / totalJobs : 0;

    const statusMap = new Map<string, number>();
    const monthlyMap = new Map<
      string,
      {
        month: string;
        label: string;
        jobs: number;
        revenue: number;
        totalCosts: number;
        profit: number;
      }
    >();
    const clientMap = new Map<
      string,
      {
        name: string;
        jobs: number;
        revenue: number;
        costs: number;
        profit: number;
      }
    >();
    const managerMap = new Map<
      string,
      {
        name: string;
        jobs: number;
        revenue: number;
        profit: number;
      }
    >();

    for (const job of calculatedJobs) {
      statusMap.set(
        job.status,
        (statusMap.get(job.status) || 0) + 1
      );

      const sourceDate = job.assignDate || job.createdAt;

      if (sourceDate) {
        const date = new Date(sourceDate);
        const month = `${date.getUTCFullYear()}-${String(
          date.getUTCMonth() + 1
        ).padStart(2, "0")}`;
        const label = new Intl.DateTimeFormat("en-GB", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(date);
        const currentMonth = monthlyMap.get(month) || {
          month,
          label,
          jobs: 0,
          revenue: 0,
          totalCosts: 0,
          profit: 0,
        };

        currentMonth.jobs += 1;
        currentMonth.revenue += job.clientPrice;
        currentMonth.totalCosts += job.totalCosts;
        currentMonth.profit += job.profit;
        monthlyMap.set(month, currentMonth);
      }

      const currentClient = clientMap.get(job.clientName) || {
        name: job.clientName,
        jobs: 0,
        revenue: 0,
        costs: 0,
        profit: 0,
      };
      currentClient.jobs += 1;
      currentClient.revenue += job.clientPrice;
      currentClient.costs += job.totalCosts;
      currentClient.profit += job.profit;
      clientMap.set(job.clientName, currentClient);

      const currentManager = managerMap.get(job.managerName) || {
        name: job.managerName,
        jobs: 0,
        revenue: 0,
        profit: 0,
      };
      currentManager.jobs += 1;
      currentManager.revenue += job.clientPrice;
      currentManager.profit += job.profit;
      managerMap.set(job.managerName, currentManager);
    }

    const statusDistribution = Array.from(
      statusMap.entries()
    )
      .map(([statusName, count]) => ({
        status: statusName,
        label: statusName
          .replace(/-/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const monthly = Array.from(monthlyMap.values()).sort(
      (a, b) => a.month.localeCompare(b.month)
    );
    const topClients = Array.from(clientMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    const topManagers = Array.from(managerMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    const lowestProfitJobs = [...calculatedJobs]
      .sort((a, b) => a.profit - b.profit)
      .slice(0, 10);
    const recentJobs = [...calculatedJobs]
      .sort((a, b) => {
        const firstDate = new Date(
          a.createdAt || a.assignDate || 0
        ).getTime();
        const secondDate = new Date(
          b.createdAt || b.assignDate || 0
        ).getTime();
        return secondDate - firstDate;
      })
      .slice(0, 10);

    return NextResponse.json(
      {
        summary: {
          totalJobs,
          activeJobs,
          pendingJobs,
          inProgressJobs,
          completedJobs,
          ...totals,
          profitMargin,
          averageJobValue,
        },
        monthly,
        statusDistribution,
        topClients,
        topManagers,
        lowestProfitJobs,
        recentJobs,
        costComposition: [
          {
            name: "Worker payments",
            value: totals.workerPayments,
          },
          {
            name: "Billable costs",
            value: totals.billableCosts,
          },
          {
            name: "Absorbed costs",
            value: totals.absorbedCosts,
          },
        ],
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load job analytics:", error);

    return NextResponse.json(
      { message: "Failed to load job analytics" },
      { status: 500 }
    );
  }
}
