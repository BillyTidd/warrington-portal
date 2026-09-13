import { format, parseISO, startOfWeek } from "date-fns";

type GroupBy = "day" | "week" | "month";

interface DashboardEntry {
  date?: unknown;
  totalAmount?: unknown;
  userName?: string | null;
  client?: string | null;
}

function toAmount(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function parseEntryDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function createPeriod(date: Date, groupBy: GroupBy) {
  if (groupBy === "month") {
    return {
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM yyyy"),
    };
  }

  if (groupBy === "week") {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return {
      key: format(weekStart, "yyyy-MM-dd"),
      label: `Week of ${format(weekStart, "d MMM")}`,
    };
  }

  return {
    key: format(date, "yyyy-MM-dd"),
    label: format(date, "d MMM"),
  };
}

export function getDashboardGroupBy(timeframe: string): GroupBy {
  if (["thisYear", "lastYear", "year"].includes(timeframe)) return "month";
  if (["thisQuarter", "quarter", "last90"].includes(timeframe)) return "week";
  return "day";
}

export function processEmployeePerformanceData(entries: DashboardEntry[]) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { chartData: [], employeeTotals: [] };
  }

  const totals = new Map<string, { total: number; count: number }>();

  for (const entry of entries) {
    const employee = entry.userName || "Unassigned employee";
    const current = totals.get(employee) || { total: 0, count: 0 };
    current.total += toAmount(entry.totalAmount);
    current.count += 1;
    totals.set(employee, current);
  }

  const employeeTotals = Array.from(totals, ([name, values]) => ({
    name,
    total: values.total,
    count: values.count,
  })).sort((a, b) => b.total - a.total);

  return { chartData: employeeTotals, employeeTotals };
}

export function processClientDistributionData(entries: DashboardEntry[]) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { chartData: [], totalAmount: 0 };
  }

  const totals = new Map<string, { amount: number; count: number }>();

  for (const entry of entries) {
    const client = entry.client || "Unassigned client";
    const current = totals.get(client) || { amount: 0, count: 0 };
    current.amount += toAmount(entry.totalAmount);
    current.count += 1;
    totals.set(client, current);
  }

  const totalAmount = Array.from(totals.values()).reduce(
    (sum, client) => sum + client.amount,
    0
  );

  const allClients = Array.from(totals, ([name, values]) => ({
    name,
    value: values.amount,
    amount: values.amount,
    count: values.count,
    percentage: totalAmount > 0 ? (values.amount / totalAmount) * 100 : 0,
  })).sort((a, b) => b.amount - a.amount);

  const topClients = allClients.slice(0, 5);
  const remainingClients = allClients.slice(5);

  if (remainingClients.length > 0) {
    const otherAmount = remainingClients.reduce(
      (sum, client) => sum + client.amount,
      0
    );
    const otherCount = remainingClients.reduce(
      (sum, client) => sum + client.count,
      0
    );

    topClients.push({
      name: "Other",
      value: otherAmount,
      amount: otherAmount,
      count: otherCount,
      percentage: totalAmount > 0 ? (otherAmount / totalAmount) * 100 : 0,
    });
  }

  return { chartData: topClients, totalAmount };
}

export function processMonthlyRevenueData(
  entries: DashboardEntry[],
  groupBy: GroupBy = "month"
) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      chartData: [],
      statistics: {
        totalAmount: 0,
        averageAmount: 0,
        changeRate: 0,
        entriesCount: 0,
      },
    };
  }

  const grouped = new Map<
    string,
    { name: string; periodKey: string; total: number; count: number }
  >();

  for (const entry of entries) {
    const date = parseEntryDate(entry.date);
    if (!date) continue;

    const period = createPeriod(date, groupBy);
    const current = grouped.get(period.key) || {
      name: period.label,
      periodKey: period.key,
      total: 0,
      count: 0,
    };

    current.total += toAmount(entry.totalAmount);
    current.count += 1;
    grouped.set(period.key, current);
  }

  const chartData = Array.from(grouped.values()).sort((a, b) =>
    a.periodKey.localeCompare(b.periodKey)
  );
  const totalAmount = chartData.reduce((sum, period) => sum + period.total, 0);
  const averageAmount = chartData.length > 0 ? totalAmount / chartData.length : 0;

  let changeRate = 0;
  if (chartData.length >= 2) {
    const previous = chartData[chartData.length - 2].total;
    const current = chartData[chartData.length - 1].total;
    changeRate = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  return {
    chartData,
    statistics: {
      totalAmount,
      averageAmount,
      changeRate: Math.round(changeRate),
      entriesCount: entries.length,
    },
  };
}

export function processSummaryData(
  currentEntries: DashboardEntry[],
  currentInvoiceCount: number,
  previousEntries: DashboardEntry[],
  previousInvoiceCount: number
) {
  const safeCurrentEntries = Array.isArray(currentEntries) ? currentEntries : [];
  const safePreviousEntries = Array.isArray(previousEntries)
    ? previousEntries
    : [];

  const totalEntries = safeCurrentEntries.length;
  const totalInvoices = toAmount(currentInvoiceCount);
  const totalAmount = safeCurrentEntries.reduce(
    (sum, entry) => sum + toAmount(entry.totalAmount),
    0
  );
  const previousTotalAmount = safePreviousEntries.reduce(
    (sum, entry) => sum + toAmount(entry.totalAmount),
    0
  );

  const uniqueClients = new Set(
    safeCurrentEntries.map((entry) => entry.client).filter(Boolean)
  );
  const uniqueEmployees = new Set(
    safeCurrentEntries.map((entry) => entry.userName).filter(Boolean)
  );

  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    totalEntries,
    totalInvoices,
    totalAmount,
    uniqueClients: uniqueClients.size,
    uniqueEmployees: uniqueEmployees.size,
    avgEntryValue: totalEntries > 0 ? totalAmount / totalEntries : 0,
    percentChange: {
      entries: calculatePercentChange(
        totalEntries,
        safePreviousEntries.length
      ),
      invoices: calculatePercentChange(
        totalInvoices,
        toAmount(previousInvoiceCount)
      ),
      amount: calculatePercentChange(totalAmount, previousTotalAmount),
    },
  };
}
