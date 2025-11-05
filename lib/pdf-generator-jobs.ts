import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Job } from "@/types/job";

// Define proper types for jsPDF-AutoTable
type RGB = [number, number, number];
type FontStyle = "normal" | "bold" | "italic" | "bolditalic";

// Define interfaces for our custom types
interface WorkerSummary {
  name: string;
  jobCount: number;
  regularCost: number;
  overtimeCost: number;
  fixedRate: number;
  totalCost: number;
}

interface WorkerJob {
  jobId: string;
  jobName: string;
  clientName: string;
  assignDate?: Date | string | null;
  expireDate?: Date | string | null;
  status: string;
  fixedRate: number;
  regularHours: number;
  overtimeHours: number;
  regularCost: number;
  overtimeCost: number;
  totalCost: number;
}

interface LogEntry {
  jobName: string;
  date: string;
  details: string;
  hours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  total: number;
}

interface Worker {
  userId: string;
  workerName: string;
  paymentRate?: number;
}

// Update the formatDate function to handle time as well
const formatDate = (
  dateString: string | Date | undefined | null,
  formatString = "dd-MMM-yyyy"
): string => {
  if (!dateString) return "N/A";

  try {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return "N/A";
    return format(date, formatString);
  } catch (error) {
    console.error("Date formatting error:", error);
    return "N/A";
  }
};

export const generateJobsPDF = async (
  jobs: Job[],
  session: any,
  startDate: Date,
  endDate: Date
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Define colors for consistent branding
  const primaryColor: RGB = [31, 73, 125]; // Dark blue
  const secondaryColor: RGB = [100, 120, 200]; // Lighter blue
  const accentColor: RGB = [70, 130, 180]; // Steel blue

  // Header background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Add decorative element
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 45, pageWidth, 3, "F");

  // Company name
  doc.setTextColor(255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("WARRINGTON'S INSTALLS", 14, 20);

  // Report title
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(`JOBS SUMMARY REPORT`, 14, 35);

  // Add user info section
  doc.setFontSize(16);
  doc.text(
    `Employee: ${session?.user?.name?.toUpperCase() || ""}`,
    pageWidth - 14,
    20,
    { align: "right" }
  );

  // Add generation timestamp
  doc.setFontSize(12);
  doc.text(
    `Generated: ${format(new Date(), "dd-MMM-yyyy HH:mm:ss")}`,
    pageWidth - 14,
    35,
    { align: "right" }
  );

  // Add report period
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  // Check if start and end dates are the same
  const reportPeriodText =
    startDate.toDateString() === endDate.toDateString()
      ? `Report Date: ${format(startDate, "dd-MMM-yyyy")}`
      : `Report Period: ${format(startDate, "dd-MMM-yyyy")} to ${format(
          endDate,
          "dd-MMM-yyyy"
        )}`;

  doc.text(reportPeriodText, pageWidth / 2, 60, { align: "center" });

  // Add summary statistics
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const inProgressJobs = jobs.filter(
    (job) => job.status === "in-progress"
  ).length;
  const pendingJobs = jobs.filter((job) => job.status === "pending").length;

  // Calculate financial metrics
  let totalClientPrice = 0;
  let totalCosts = 0;
  let totalProfit = 0;
  let totalWorkerEarnings = 0;

  if (session?.user?.role === "admin") {
    // Admin sees all financial data
    jobs.forEach((job) => {
      totalClientPrice += job.clientPrice || 0;

      // Calculate total costs from progress logs
      const jobCosts =
        job.progressLogs?.reduce(
          (sum, log) => sum + (log.cost || 0) + (log.overtimeCost || 0),
          0
        ) || 0;
      totalCosts += jobCosts;

      // Calculate profit
      totalProfit += (job.clientPrice || 0) - jobCosts;
    });
  } else {
    // Regular users only see their earnings
    jobs.forEach((job) => {
      // Calculate worker's earnings from this job
      const workerLogs = job.progressLogs || [];
      const regularEarnings = workerLogs.reduce(
        (sum, log) => sum + (log.cost || 0),
        0
      );
      const overtimeEarnings = workerLogs.reduce(
        (sum, log) => sum + (log.overtimeCost || 0),
        0
      );

      // Add fixed rate if available
      let fixedRate = 0;
      if (job.workers) {
        const worker = job.workers.find(
          (w: Worker) => w.userId === session?.user?.id
        );
        if (worker?.paymentRate) {
          fixedRate = worker.paymentRate;
        }
      } else if (job.workerPaymentRate && job.userId === session?.user?.id) {
        fixedRate = job.workerPaymentRate;
      }

      totalWorkerEarnings += regularEarnings + overtimeEarnings + fixedRate;
    });
  }

  // Add summary box
  doc.setFillColor(245, 245, 250); // Light background
  doc.roundedRect(14, 70, pageWidth - 28, 30, 3, 3, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Summary Statistics:", 20, 78);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Summary items in a row
  const summaryY = 85;
  const col1 = 20;
  const col2 = 70;
  const col3 = 120;
  const col4 = 170;
  const col5 = 220;

  doc.setFont("helvetica", "bold");
  doc.text("Total Jobs:", col1, summaryY);
  doc.text("Completed:", col2, summaryY);
  doc.text("In Progress:", col3, summaryY);
  doc.text("Pending:", col4, summaryY);

  doc.setFont("helvetica", "normal");
  doc.text(totalJobs.toString(), col1 + 25, summaryY);
  doc.text(completedJobs.toString(), col2 + 25, summaryY);
  doc.text(inProgressJobs.toString(), col3 + 25, summaryY);
  doc.text(pendingJobs.toString(), col4 + 25, summaryY);

  // Add financial summary based on user role
  const financialY = summaryY + 10;

  if (session?.user?.role === "admin") {
    // Admin financial summary
    doc.setFont("helvetica", "bold");
    doc.text("Total Client Price:", col1, financialY);
    doc.text("Total Costs:", col3, financialY);
    doc.text("Total Profit:", col5, financialY);

    doc.setFont("helvetica", "normal");
    doc.text(`£${totalClientPrice.toFixed(2)}`, col1 + 35, financialY);
    doc.text(`£${totalCosts.toFixed(2)}`, col3 + 25, financialY);

    // Set profit color based on value
    if (totalProfit >= 0) {
      doc.setTextColor(0, 150, 0); // Green for positive profit
    } else {
      doc.setTextColor(200, 0, 0); // Red for negative profit
    }
    doc.text(`£${totalProfit.toFixed(2)}`, col5 + 25, financialY);
    doc.setTextColor(50, 50, 50); // Reset text color
  } else {
    // Worker financial summary
    doc.setFont("helvetica", "bold");
    doc.text("Total Earnings:", col1, financialY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 150, 0); // Green for earnings
    doc.text(`£${totalWorkerEarnings.toFixed(2)}`, col1 + 35, financialY);
    doc.setTextColor(50, 50, 50); // Reset text color
  }

  // Create jobs table
  const tableHeaders: any[][] = [
    [
      {
        content: "JOBS LIST",
        colSpan: session?.user?.role === "admin" ? 8 : 7,
        styles: {
          halign: "center",
          fontStyle: "bold" as FontStyle,
          fontSize: 12,
          fillColor: primaryColor,
          textColor: [255, 255, 255] as RGB,
        },
      },
    ],
  ];

  // Define table columns based on user role
  const columns: string[] =
    session?.user?.role === "admin"
      ? [
          "Job Name",
          "Client",
          "Worker",
          "Start Date",
          "Due Date",
          "Status",
          "Client Price",
          "Costs",
        ]
      : [
          "Job Name",
          "Client",
          "Start Date",
          "Due Date",
          "Status",
          "Hours Worked",
          "Total Earnings",
        ];

  tableHeaders.push(columns);

  // Prepare table data
  const tableData = jobs.map((job) => {
    if (session?.user?.role === "admin") {
      // Admin view
      const jobCosts =
        job.progressLogs?.reduce(
          (sum, log) => sum + (log.cost || 0) + (log.overtimeCost || 0),
          0
        ) || 0;

      return [
        job.jobName || "",
        job.clientName || "",
        job.workers
          ? job.workers.map((w: Worker) => w.workerName).join(", ")
          : job.workerName || "",
        formatDate(job.assignDate),
        formatDate(job.expireDate),
        job.status
          ? job.status.charAt(0).toUpperCase() + job.status.slice(1)
          : "Pending",
        `£${(job.clientPrice || 0).toFixed(2)}`,
        `£${jobCosts.toFixed(2)}`,
      ];
    } else {
      // Worker view - only show their own data
      const workerLogs = job.progressLogs || [];
      const hoursWorked = workerLogs.reduce(
        (sum, log) => sum + (log.hours || 0) + (log.overtimeHours || 0),
        0
      );
      const regularEarnings = workerLogs.reduce(
        (sum, log) => sum + (log.cost || 0),
        0
      );
      const overtimeEarnings = workerLogs.reduce(
        (sum, log) => sum + (log.overtimeCost || 0),
        0
      );

      // Add fixed rate if available
      let fixedRate = 0;
      if (job.workers) {
        const worker = job.workers.find(
          (w: Worker) => w.userId === session?.user?.id
        );
        if (worker?.paymentRate) {
          fixedRate = worker.paymentRate;
        }
      } else if (job.workerPaymentRate && job.userId === session?.user?.id) {
        fixedRate = job.workerPaymentRate;
      }

      const totalEarnings = regularEarnings + overtimeEarnings + fixedRate;

      return [
        job.jobName || "",
        job.clientName || "",
        formatDate(job.assignDate),
        formatDate(job.expireDate),
        job.status
          ? job.status.charAt(0).toUpperCase() + job.status.slice(1)
          : "Pending",
        hoursWorked.toFixed(1),
        `£${totalEarnings.toFixed(2)}`,
      ];
    }
  });

  // Add the jobs table
  autoTable(doc, {
    startY: 110,
    head: tableHeaders,
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
      lineWidth: 0.1,
      textColor: [50, 50, 50] as RGB,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255] as RGB,
      fontStyle: "bold" as FontStyle,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 255] as RGB,
    },
  });

  // If admin, add worker summary section
  if (session?.user?.role === "admin") {
    // Create a map to track costs per worker
    const workerSummary = new Map<string, WorkerSummary>();
    const workerJobs = new Map<string, WorkerJob[]>();

    // Process all jobs to calculate worker costs
    jobs.forEach((job) => {
      if (job.workers && job.workers.length > 0) {
        job.workers.forEach((worker: Worker) => {
          const workerId = worker.userId;
          const workerName = worker.workerName;

          if (!workerSummary.has(workerId)) {
            workerSummary.set(workerId, {
              name: workerName,
              jobCount: 0,
              regularCost: 0,
              overtimeCost: 0,
              fixedRate: 0,
              totalCost: 0,
            });
            workerJobs.set(workerId, []);
          }

          const summary = workerSummary.get(workerId);
          if (!summary) return; // TypeScript safety check

          summary.jobCount += 1;

          // Add fixed rate if available
          const workerPaymentRate = worker.paymentRate || 0;
          summary.fixedRate += workerPaymentRate;

          // Calculate costs from progress logs for this worker and job
          let jobRegularCost = 0;
          let jobOvertimeCost = 0;
          let jobRegularHours = 0;
          let jobOvertimeHours = 0;

          if (job.progressLogs) {
            job.progressLogs.forEach((log: any) => {
              if (log.updatedBy === workerId) {
                jobRegularCost += log.cost || 0;
                jobOvertimeCost += log.overtimeCost || 0;
                jobRegularHours += log.hours || 0;
                jobOvertimeHours += log.overtimeHours || 0;

                // Add to worker totals
                summary.regularCost += log.cost || 0;
                summary.overtimeCost += log.overtimeCost || 0;
              }
            });
          }

          // Add this job to the worker's job list
          const jobsList = workerJobs.get(workerId);
          if (jobsList) {
            jobsList.push({
              jobId: job.id || "",
              jobName: job.jobName || "Unnamed Job",
              clientName: job.clientName || "No Client",
              assignDate: job.assignDate,
              expireDate: job.expireDate,
              status: job.status || "pending",
              fixedRate: workerPaymentRate,
              regularHours: jobRegularHours,
              overtimeHours: jobOvertimeHours,
              regularCost: jobRegularCost,
              overtimeCost: jobOvertimeCost,
              totalCost: workerPaymentRate + jobRegularCost + jobOvertimeCost,
            });
          }

          summary.totalCost =
            summary.fixedRate + summary.regularCost + summary.overtimeCost;
          workerSummary.set(workerId, summary);
        });
      } else if (job.userId && job.workerName) {
        // Handle old job format
        const workerId = job.userId;
        const workerName = job.workerName;

        if (!workerSummary.has(workerId)) {
          workerSummary.set(workerId, {
            name: workerName,
            jobCount: 0,
            regularCost: 0,
            overtimeCost: 0,
            fixedRate: 0,
            totalCost: 0,
          });
          workerJobs.set(workerId, []);
        }

        const summary = workerSummary.get(workerId);
        if (!summary) return; // TypeScript safety check

        summary.jobCount += 1;

        // Add fixed rate if available
        const workerPaymentRate = job.workerPaymentRate || 0;
        summary.fixedRate += workerPaymentRate;

        // Calculate costs from progress logs
        let jobRegularCost = 0;
        let jobOvertimeCost = 0;
        let jobRegularHours = 0;
        let jobOvertimeHours = 0;

        if (job.progressLogs) {
          job.progressLogs.forEach((log: any) => {
            if (log.updatedBy === workerId) {
              jobRegularCost += log.cost || 0;
              jobOvertimeCost += log.overtimeCost || 0;
              jobRegularHours += log.hours || 0;
              jobOvertimeHours += log.overtimeHours || 0;

              // Add to worker totals
              summary.regularCost += log.cost || 0;
              summary.overtimeCost += log.overtimeCost || 0;
            }
          });
        }

        // Add this job to the worker's job list
        const jobsList = workerJobs.get(workerId);
        if (jobsList) {
          jobsList.push({
            jobId: job.id || "",
            jobName: job.jobName || "Unnamed Job",
            clientName: job.clientName || "No Client",
            assignDate: job.assignDate,
            expireDate: job.expireDate,
            status: job.status || "pending",
            fixedRate: workerPaymentRate,
            regularHours: jobRegularHours,
            overtimeHours: jobOvertimeHours,
            regularCost: jobRegularCost,
            overtimeCost: jobOvertimeCost,
            totalCost: workerPaymentRate + jobRegularCost + jobOvertimeCost,
          });
        }

        summary.totalCost =
          summary.fixedRate + summary.regularCost + summary.overtimeCost;
        workerSummary.set(workerId, summary);
      }
    });

    // Check if we need a new page for worker summary
    const currentY = (doc as any).lastAutoTable.finalY + 10;
    if (currentY > pageHeight - 60) {
      doc.addPage();

      // Add header to new page
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 20, "F");
      doc.setTextColor(255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("WARRINGTON'S INSTALLS - JOBS SUMMARY REPORT", 14, 15);

      // Add decorative element
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 20, pageWidth, 2, "F");
    }

    // Create worker summary table
    const workerHeaders: any[][] = [
      [
        {
          content: "WORKER SUMMARY",
          colSpan: 6,
          styles: {
            halign: "center",
            fontStyle: "bold" as FontStyle,
            fontSize: 12,
            fillColor: primaryColor,
            textColor: [255, 255, 255] as RGB,
          },
        },
      ],
      [
        "Worker Name",
        "Jobs Assigned",
        "Fixed Rate",
        "Regular Costs",
        "Overtime Costs",
        "Total Cost",
      ],
    ];

    // Convert Map to Array for processing
    const workerSummaryArray = Array.from(workerSummary.values());

    const workerData: any = workerSummaryArray.map((worker: WorkerSummary) => [
      worker.name,
      worker.jobCount.toString(),
      `£${worker.fixedRate.toFixed(2)}`,
      `£${worker.regularCost.toFixed(2)}`,
      `£${worker.overtimeCost.toFixed(2)}`,
      `£${worker.totalCost.toFixed(2)}`,
    ]);

    // Add total row
    const totalWorkerCost = workerSummaryArray.reduce(
      (sum, worker) => sum + worker.totalCost,
      0
    );
    const totalFixedRate = workerSummaryArray.reduce(
      (sum, worker) => sum + worker.fixedRate,
      0
    );
    const totalRegularCost = workerSummaryArray.reduce(
      (sum, worker) => sum + worker.regularCost,
      0
    );
    const totalOvertimeCost = workerSummaryArray.reduce(
      (sum, worker) => sum + worker.overtimeCost,
      0
    );

    workerData.push([
      {
        content: "TOTAL",
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: jobs.length.toString(),
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: `£${totalFixedRate.toFixed(2)}`,
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: `£${totalRegularCost.toFixed(2)}`,
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: `£${totalOvertimeCost.toFixed(2)}`,
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: `£${totalWorkerCost.toFixed(2)}`,
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
    ]);

    // Add the worker summary table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: workerHeaders,
      body: workerData,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
        lineWidth: 0.1,
        textColor: [50, 50, 50] as RGB,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255] as RGB,
        fontStyle: "bold" as FontStyle,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 255] as RGB,
      },
    });

    // Now add individual job details for each worker
    // For each worker, create a separate table showing their jobs
    let currentY2 = (doc as any).lastAutoTable.finalY + 15;

    // Process each worker - using Array.from to avoid MapIterator issues
    const workerEntries = Array.from(workerSummary.entries());

    for (const [workerId, worker] of workerEntries) {
      const workerJobsList = workerJobs.get(workerId) || [];

      // Skip if worker has no jobs
      if (workerJobsList.length === 0) continue;

      // Check if we need a new page
      if (currentY2 > pageHeight - 60) {
        doc.addPage();
        currentY2 = 30;

        // Add header to new page
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 20, "F");
        doc.setTextColor(255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("WARRINGTON'S INSTALLS - JOBS SUMMARY REPORT", 14, 15);

        // Add decorative element
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 20, pageWidth, 2, "F");
      }

      // Add worker name as section title
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${worker.name} - Individual Job Details`, 14, currentY2);

      // Create job details table for this worker
      const jobHeaders: any = [
        [
          {
            content: `${worker.name} - Job Details`,
            colSpan: 8,
            styles: {
              halign: "center",
              fontStyle: "bold" as FontStyle,
              fontSize: 11,
              fillColor: primaryColor,
              textColor: [255, 255, 255] as RGB,
            },
          },
        ],
        [
          "Job Name",
          "Client",
          "Start Date",
          "Due Date",
          "Status",
          "Regular Hours",
          "Overtime Hours",
          "Total Earnings",
        ],
      ];

      // Sort jobs by date
      workerJobsList.sort((a, b) => {
        const dateA = a.assignDate ? new Date(a.assignDate).getTime() : 0;
        const dateB = b.assignDate ? new Date(b.assignDate).getTime() : 0;
        return dateB - dateA; // newest first
      });

      const jobData: any = workerJobsList.map((job) => [
        job.jobName,
        job.clientName,
        formatDate(job.assignDate),
        formatDate(job.expireDate),
        job.status.charAt(0).toUpperCase() + job.status.slice(1),
        job.regularHours.toFixed(1),
        job.overtimeHours.toFixed(1),
        `£${job.totalCost.toFixed(2)}`,
      ]);

      // Add total row for this worker's jobs
      const totalRegularHours = workerJobsList.reduce(
        (sum, job) => sum + job.regularHours,
        0
      );
      const totalOvertimeHours = workerJobsList.reduce(
        (sum, job) => sum + job.overtimeHours,
        0
      );
      const totalEarnings = workerJobsList.reduce(
        (sum, job) => sum + job.totalCost,
        0
      );

      jobData.push([
        {
          content: "TOTAL",
          styles: {
            fontStyle: "bold" as FontStyle,
            fillColor: [240, 240, 250] as RGB,
          },
        },
        {
          content: "",
          styles: {
            fontStyle: "bold" as FontStyle,
            fillColor: [240, 240, 250] as RGB,
          },
        },
        {
          content: "",
          styles: {
            fontStyle: "bold" as FontStyle,
            fillColor: [240, 240, 250] as RGB,
          },
        },
        {
          content: "",
          styles: {
            fontStyle: "bold" as FontStyle,
            fillColor: [240, 240, 250] as RGB,
          },
        },
        {
          content: "",
          styles: {
            fontStyle: "bold" as FontStyle,
            fillColor: [240, 240, 250] as RGB,
          },
        },
        {
          content: totalRegularHours.toFixed(1),
          styles: {
            fontStyle: "bold" as FontStyle,
            fillColor: [240, 240, 250] as RGB,
          },
        },
        {
          content: totalOvertimeHours.toFixed(1),
          styles: {
            fontStyle: "bold" as FontStyle,
            fillColor: [240, 240, 250] as RGB,
          },
        },
        {
          content: `£${totalEarnings.toFixed(2)}`,
          styles: {
            fontStyle: "bold" as FontStyle,
            fillColor: [240, 240, 250] as RGB,
          },
        },
      ]);

      // Add the job details table for this worker
      autoTable(doc, {
        startY: currentY2 + 5,
        head: jobHeaders,
        body: jobData,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
          lineWidth: 0.1,
          textColor: [50, 50, 50] as RGB,
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255] as RGB,
          fontStyle: "bold" as FontStyle,
        },
        alternateRowStyles: {
          fillColor: [250, 250, 255] as RGB,
        },
      });

      // Update current Y position for next worker
      currentY2 = (doc as any).lastAutoTable.finalY + 15;
    }
  } else {
    // For regular users, add their personal job summary with detailed breakdown
    // Check if we need a new page
    const currentY = (doc as any).lastAutoTable.finalY + 10;
    if (currentY > pageHeight - 60) {
      doc.addPage();

      // Add header to new page
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 20, "F");
      doc.setTextColor(255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("WARRINGTON'S INSTALLS - JOBS SUMMARY REPORT", 14, 15);

      // Add decorative element
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 20, pageWidth, 2, "F");
    }

    // Create detailed earnings breakdown table
    const earningsHeaders: any[][] = [
      [
        {
          content: "YOUR DETAILED EARNINGS BREAKDOWN",
          colSpan: 8,
          styles: {
            halign: "center",
            fontStyle: "bold" as FontStyle,
            fontSize: 12,
            fillColor: primaryColor,
            textColor: [255, 255, 255] as RGB,
          },
        },
      ],
      [
        "Job Name",
        "Date & Time",
        "Description",
        "Hours",
        "Overtime Hours",
        "Regular Pay",
        "Overtime Pay",
        "Total",
      ],
    ];

    const allLogs: LogEntry[] = [];
    jobs.forEach((job: Job) => {
      if (job.progressLogs && job.progressLogs.length > 0) {
        job.progressLogs.forEach((log: any) => {
          allLogs.push({
            jobName: job.jobName || "",
            date: log.timestamp
              ? formatDate(log.timestamp, "dd-MMM-yyyy HH:mm")
              : "N/A",
            details: log.details || "Work completed",
            hours: log.hours || 0,
            overtimeHours: log.overtimeHours || 0,
            regularPay: log.cost || 0,
            overtimePay: log.overtimeCost || 0,
            total: (log.cost || 0) + (log.overtimeCost || 0),
          });
        });
      }
    });

    // Sort logs by date (newest first)
    allLogs.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    const logsData: any = allLogs.map((log) => [
      log.jobName,
      log.date,
      log.details,
      log.hours.toFixed(1),
      log.overtimeHours.toFixed(1),
      `£${log.regularPay.toFixed(2)}`,
      `£${log.overtimePay.toFixed(2)}`,
      `£${log.total.toFixed(2)}`,
    ]);

    // Add total row
    const totalHours = allLogs.reduce((sum, log) => sum + log.hours, 0);
    const totalOvertimeHours = allLogs.reduce(
      (sum, log) => sum + log.overtimeHours,
      0
    );
    const totalRegularPay = allLogs.reduce(
      (sum, log) => sum + log.regularPay,
      0
    );
    const totalOvertimePay = allLogs.reduce(
      (sum, log) => sum + log.overtimePay,
      0
    );
    const grandTotal = totalRegularPay + totalOvertimePay;

    logsData.push([
      {
        content: "TOTAL",
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: "",
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: "",
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: totalHours.toFixed(1),
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: totalOvertimeHours.toFixed(1),
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: `£${totalRegularPay.toFixed(2)}`,
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: `£${totalOvertimePay.toFixed(2)}`,
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
      {
        content: `£${grandTotal.toFixed(2)}`,
        styles: {
          fontStyle: "bold" as FontStyle,
          fillColor: [240, 240, 250] as RGB,
        },
      },
    ]);

    // Add the earnings breakdown table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: earningsHeaders,
      body: logsData,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
        lineWidth: 0.1,
        textColor: [50, 50, 50] as RGB,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255] as RGB,
        fontStyle: "bold" as FontStyle,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 255] as RGB,
      },
    });
  }

  // Add footer to all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("WARRINGTON'S INSTALLS", 14, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, {
      align: "right",
    });

    // Add timestamp in footer
    const timestamp = format(new Date(), "dd-MMM-yyyy");
    doc.text(timestamp, pageWidth / 2, pageHeight - 10, { align: "center" });
  }

  return doc;
};
