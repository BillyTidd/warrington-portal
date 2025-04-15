import { format } from "date-fns";

/**
 * Utility functions for chart data calculations
 * This moves calculations from the backend to the frontend
 * for better performance and flexibility
 */

/**
 * Process raw entries for employee performance chart
 */
export function processEmployeePerformanceData(entries: any[]) {
  if (!entries || entries.length === 0) {
    return { chartData: [], employeeTotals: [] };
  }

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

  return {
    chartData,
    employeeTotals,
  };
}

/**
 * Process raw entries for client distribution chart
 */
export function processClientDistributionData(
  entries: any[],
  chartType = "pie"
) {
  if (!entries || entries.length === 0) {
    return { chartData: [], totalAmount: 0 };
  }

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

    return {
      chartData,
      clientTotals,
    };
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

    return {
      chartData: topClients,
      totalAmount,
    };
  }
}

/**
 * Process raw entries for monthly revenue chart
 */
export function processMonthlyRevenueData(entries: any[], groupBy = "month") {
  if (!entries || entries.length === 0) {
    return {
      chartData: [],
      statistics: {
        totalRevenue: 0,
        averageRevenue: 0,
        growthRate: 0,
        entriesCount: 0,
      },
    };
  }

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

  return {
    chartData,
    statistics: {
      totalRevenue,
      averageRevenue,
      growthRate,
      entriesCount: entries.length,
    },
  };
}

/**
 * Process raw entries and invoices for summary data
 */
export function processSummaryData(
  currentEntries: any[],
  currentInvoices: any[],
  previousEntries: any[],
  previousInvoices: any[]
) {
  if (!currentEntries) currentEntries = [];
  if (!currentInvoices) currentInvoices = [];
  if (!previousEntries) previousEntries = [];
  if (!previousInvoices) previousInvoices = [];

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
  const previousTotalInvoices = previousInvoices.length || 0;
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
      ? currentInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) /
        totalInvoices
      : 0;

  return {
    totalEntries,
    totalInvoices,
    totalAmount,
    uniqueClients: uniqueClients.size,
    uniqueEmployees: uniqueEmployees.size,
    avgEntryValue,
    avgInvoiceValue,
    percentChange,
  };
}
