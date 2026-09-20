import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { Job } from "@/types/job";

type RGB = [number, number, number];
type ReportRole = "admin" | "customer" | "employee" | string;

type ReportJob = Job & {
  jobReference?: string;
  estimatedCost?: { totalCost?: number };
  estimatedCosts?: { totalCost?: number };
  jobEstimate?: {
    estimatedCost?: { totalCost?: number };
    jobReference?: string;
    manager?: string;
    managerDetails?: { fullName?: string };
  };
};

interface ReportSession {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: ReportRole;
  };
}

interface ReportIdentity {
  name: string;
  email: string;
  phone: string;
  addressLines: string[];
}

const COMPANY = {
  legalName: "Warrington Installations Limited",
  displayName: "WARRINGTON INSTALLS",
  addressLines: [
    "165 Harborough Road",
    "Kingsthorpe",
    "Northampton",
    "NN2 8DL",
  ],
  email: "Accounts@warringtoninstalls.co.uk",
  utr: "42683 25579",
  companyNumber: "13607313",
  vatNumber: "416 7088 86",
};

const COLOURS = {
  ink: [19, 24, 31] as RGB,
  muted: [100, 108, 119] as RGB,
  line: [218, 221, 226] as RGB,
  gold: [251, 194, 30] as RGB,
  goldDark: [179, 118, 0] as RGB,
  cream: [255, 250, 232] as RGB,
  softGrey: [247, 248, 250] as RGB,
  white: [255, 255, 255] as RGB,
};

const PAGE_MARGIN = 14;
const FOOTER_HEIGHT = 18;
let logoDataUrlPromise: Promise<string | null> | null = null;

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue(value));
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sentenceCase(value: unknown): string {
  const text = String(value || "pending").replace(/[-_]+/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getJobDate(job: ReportJob): Date | null {
  return (
    parseDate(job.assignDate) ||
    parseDate(job.startDate) ||
    parseDate(job.createdAt)
  );
}

function getJobPrice(job: ReportJob): number {
  return numberValue(
    job.clientPrice ??
      job.estimatedCost?.totalCost ??
      job.estimatedCosts?.totalCost ??
      job.jobEstimate?.estimatedCost?.totalCost ??
      0
  );
}

function getJobReference(job: ReportJob): string {
  return String(
    job.jobReference ||
      job.jobEstimate?.jobReference ||
      job._id ||
      job.id ||
      "Not available"
  );
}

function getManagerName(job: ReportJob): string {
  return String(
    job.managerName ||
      job.jobEstimate?.managerDetails?.fullName ||
      job.jobEstimate?.manager ||
      "Not assigned"
  );
}

function getWorkerNames(job: ReportJob): string {
  if (Array.isArray(job.workers) && job.workers.length > 0) {
    return job.workers
      .map((worker) => worker.workerName)
      .filter(Boolean)
      .join(", ");
  }

  return job.workerName || "Unassigned";
}

function getWorkerEarnings(job: ReportJob, userId?: string): number {
  const assignedWorker = job.workers?.find(
    (worker) => String(worker.userId) === String(userId || "")
  );
  const fixedRate = numberValue(
    assignedWorker?.paymentRate ??
      (String(job.userId || "") === String(userId || "")
        ? job.workerPaymentRate
        : 0)
  );

  const progressTotal = (job.progressLogs || []).reduce((total, log) => {
    const belongsToWorker =
      !userId ||
      String(log.updatedBy || "") === String(userId) ||
      String(log.overtimeWorkerId || "") === String(userId);

    if (!belongsToWorker || log.jobStatus === "rejected") return total;

    const entryCost =
      log.workType === "extra"
        ? numberValue(log.overtimeCost ?? log.cost)
        : numberValue(log.cost);

    return total + entryCost;
  }, 0);

  return fixedRate + progressTotal;
}

function splitAddress(address: unknown): string[] {
  if (!address) return [];

  return String(address)
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function getReportIdentity(
  jobs: ReportJob[],
  session: ReportSession | null,
  role: ReportRole
): ReportIdentity {
  const firstJob = jobs[0];

  if (role === "admin") {
    const clientNames = Array.from(
      new Set(jobs.map((job) => job.clientCompany || job.clientName).filter(Boolean))
    );

    return {
      name:
        clientNames.length === 1
          ? String(clientNames[0])
          : clientNames.length > 1
            ? `${clientNames.length} client accounts`
            : "Internal operations",
      email: firstJob?.clientEmail || "",
      phone: firstJob?.clientPhone || "",
      addressLines: splitAddress(firstJob?.client?.address),
    };
  }

  return {
    name:
      firstJob?.clientCompany ||
      firstJob?.clientName ||
      session?.user?.name ||
      (role === "customer" ? "Customer" : "Worker"),
    email: session?.user?.email || firstJob?.clientEmail || "",
    phone: firstJob?.clientPhone || "",
    addressLines: splitAddress(firstJob?.client?.address),
  };
}

function getDocumentTitle(role: ReportRole): string {
  if (role === "customer") return "JOB STATEMENT";
  if (role === "admin") return "JOBS REPORT";
  return "WORKER JOB REPORT";
}

function getReportDates(
  jobs: ReportJob[],
  fallbackStart: Date,
  fallbackEnd: Date
): { start: Date; end: Date } {
  const jobDates = jobs
    .map(getJobDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (jobDates.length > 0) {
    return { start: jobDates[0], end: jobDates[jobDates.length - 1] };
  }

  const start = parseDate(fallbackStart) || new Date();
  const end = parseDate(fallbackEnd) || start;
  return start <= end ? { start, end } : { start: end, end: start };
}

function safeFilePart(value: unknown): string {
  return (
    String(value || "jobs")
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "jobs"
  );
}

export function buildJobsPdfFilename(
  jobs: Job[],
  session: ReportSession | null,
  generatedAt = new Date()
): string {
  const reportJobs = jobs as ReportJob[];
  const identity = getReportIdentity(
    reportJobs,
    session,
    session?.user?.role || "customer"
  );
  return `Warrington-${safeFilePart(identity.name)}-${format(
    generatedAt,
    "yyyy-MM-dd"
  )}.pdf`;
}

async function loadLogoDataUrl(): Promise<string | null> {
  if (typeof window === "undefined" || typeof FileReader === "undefined") {
    return null;
  }

  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch("/logo.jpg")
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load report logo");
        return response.blob();
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          })
      )
      .catch((error) => {
        console.warn("PDF logo could not be loaded:", error);
        return null;
      });
  }

  return logoDataUrlPromise;
}

function drawLogoFallback(doc: jsPDF, x: number, y: number): void {
  doc.setFillColor(...COLOURS.gold);
  doc.roundedRect(x, y, 22, 22, 2, 2, "F");
  doc.setTextColor(...COLOURS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("W", x + 11, y + 15.5, { align: "center" });
  doc.setFontSize(7.5);
  doc.text(COMPANY.displayName, x + 27, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("INSTALLATIONS LIMITED", x + 27, y + 14);
}

function drawBrand(
  doc: jsPDF,
  logoDataUrl: string | null,
  x: number,
  y: number,
  compact = false
): void {
  if (logoDataUrl) {
    const size = compact ? 17 : 31;
    doc.addImage(logoDataUrl, "JPEG", x, y, size, size, undefined, "FAST");
    return;
  }

  drawLogoFallback(doc, x, y);
}

function drawLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number
): void {
  doc.setTextColor(...COLOURS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(label.toUpperCase(), x, y);
  doc.setTextColor(...COLOURS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(value, x, y + 5);
}

function drawFirstPageHeader(
  doc: jsPDF,
  logoDataUrl: string | null,
  title: string,
  reportReference: string,
  generatedAt: Date,
  identity: ReportIdentity,
  period: { start: Date; end: Date },
  jobs: ReportJob[],
  totalValue: number,
  role: ReportRole
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...COLOURS.gold);
  doc.rect(0, 0, pageWidth, 3, "F");
  drawBrand(doc, logoDataUrl, PAGE_MARGIN, 10);

  doc.setTextColor(...COLOURS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, pageWidth - PAGE_MARGIN, 19, { align: "right" });
  doc.setTextColor(...COLOURS.goldDark);
  doc.setFontSize(11);
  doc.text(`#${reportReference}`, pageWidth - PAGE_MARGIN, 27, {
    align: "right",
  });

  doc.setDrawColor(...COLOURS.line);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, 48, pageWidth - PAGE_MARGIN, 48);

  doc.setTextColor(...COLOURS.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  COMPANY.addressLines.forEach((line, index) => {
    doc.text(line, PAGE_MARGIN, 57 + index * 4.4);
  });
  doc.setTextColor(...COLOURS.goldDark);
  doc.textWithLink(COMPANY.email, PAGE_MARGIN, 77, {
    url: `mailto:${COMPANY.email}`,
  });

  const detailsX = pageWidth - PAGE_MARGIN;
  const companyDetails = [
    ["Issued", format(generatedAt, "dd/MM/yyyy")],
    ["Company UTR", COMPANY.utr],
    ["Company No", COMPANY.companyNumber],
    ["VAT No", COMPANY.vatNumber],
  ];
  companyDetails.forEach(([label, value], index) => {
    doc.setTextColor(...COLOURS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(`${label}:`, detailsX - 34, 57 + index * 5, { align: "right" });
    doc.setTextColor(...COLOURS.ink);
    doc.setFont("helvetica", "bold");
    doc.text(value, detailsX, 57 + index * 5, { align: "right" });
  });

  doc.setDrawColor(...COLOURS.line);
  doc.line(PAGE_MARGIN, 84, pageWidth - PAGE_MARGIN, 84);

  doc.setTextColor(...COLOURS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(role === "customer" ? "PREPARED FOR" : "REPORT FOR", PAGE_MARGIN, 92);
  doc.setFontSize(10.5);
  doc.text(identity.name, PAGE_MARGIN, 99);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  let identityY = 104;
  [...identity.addressLines, identity.email, identity.phone]
    .filter(Boolean)
    .slice(0, 5)
    .forEach((line) => {
      doc.text(String(line), PAGE_MARGIN, identityY);
      identityY += 4.2;
    });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("REPORT PERIOD", detailsX, 92, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  const periodText =
    period.start.toDateString() === period.end.toDateString()
      ? format(period.start, "dd MMMM yyyy")
      : `${format(period.start, "dd MMM yyyy")} - ${format(
          period.end,
          "dd MMM yyyy"
        )}`;
  doc.text(periodText, detailsX, 99, { align: "right" });
  doc.setTextColor(...COLOURS.muted);
  doc.text("Portal jobs included in this PDF", detailsX, 104, {
    align: "right",
  });

  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const cardY = 121;
  const gap = 4;
  const cardWidth = (pageWidth - PAGE_MARGIN * 2 - gap * 2) / 3;
  const cards = [
    { label: "JOBS INCLUDED", value: String(jobs.length) },
    { label: "COMPLETED", value: String(completedJobs) },
    {
      label: role === "employee" ? "TOTAL EARNINGS" : "TOTAL JOB VALUE",
      value: formatCurrency(totalValue),
    },
  ];

  cards.forEach((card, index) => {
    const x = PAGE_MARGIN + index * (cardWidth + gap);
    const cardColour = index === 2 ? COLOURS.cream : COLOURS.softGrey;
    doc.setFillColor(...cardColour);
    doc.roundedRect(x, cardY, cardWidth, 22, 2, 2, "F");
    drawLabelValue(doc, card.label, card.value, x + 5, cardY + 7);
  });

  return 151;
}

function drawContinuationHeader(
  doc: jsPDF,
  logoDataUrl: string | null,
  title: string,
  reportReference: string
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLOURS.gold);
  doc.rect(0, 0, pageWidth, 3, "F");
  drawBrand(doc, logoDataUrl, PAGE_MARGIN, 7, true);
  doc.setTextColor(...COLOURS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${title}  #${reportReference}`, pageWidth - PAGE_MARGIN, 15, {
    align: "right",
  });
  doc.setDrawColor(...COLOURS.line);
  doc.line(PAGE_MARGIN, 25, pageWidth - PAGE_MARGIN, 25);
}

function buildTableRows(
  jobs: ReportJob[],
  role: ReportRole,
  userId?: string
): any[][] {
  const sortedJobs = [...jobs].sort((a, b) => {
    const aTime = getJobDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = getJobDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  const rows: any[][] = [];
  let previousGroup = "";

  sortedJobs.forEach((job) => {
    const jobDate = getJobDate(job);
    const group = jobDate ? format(jobDate, "dd/MM/yyyy") : "Unscheduled";

    if (group !== previousGroup) {
      rows.push([
        {
          content: group,
          colSpan: 2,
          styles: {
            fillColor: COLOURS.gold,
            textColor: COLOURS.ink,
            fontStyle: "bold",
            fontSize: 8.8,
            cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
          },
        },
      ]);
      previousGroup = group;
    }

    const title = String(job.jobName || job.title || "Untitled job");
    const details: string[] = [`Job #${getJobReference(job)}`];

    if (role === "admin") {
      details.push(`Client: ${job.clientCompany || job.clientName || "Not assigned"}`);
    }
    if (role !== "employee") {
      details.push(`Manager: ${getManagerName(job)}`);
    }
    details.push(`Status: ${sentenceCase(job.status)}`);

    const workers = getWorkerNames(job);
    if (workers !== "Unassigned") details.push(`Workers: ${workers}`);

    const description = String(job.description || "").trim();
    const clippedDescription =
      description.length > 220 ? `${description.slice(0, 217)}...` : description;
    const content = [title, details.join("  |  "), clippedDescription]
      .filter(Boolean)
      .join("\n");

    const amount =
      role === "employee" ? getWorkerEarnings(job, userId) : getJobPrice(job);

    rows.push([
      {
        content,
        styles: {
          fontStyle: "normal",
          textColor: COLOURS.ink,
          cellPadding: { top: 4, right: 4, bottom: 4, left: 3 },
        },
      },
      {
        content: formatCurrency(amount),
        styles: {
          halign: "right",
          valign: "top",
          fontStyle: "bold",
          textColor: COLOURS.ink,
          cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
        },
      },
    ]);
  });

  return rows;
}

function drawTotals(
  doc: jsPDF,
  startY: number,
  jobs: ReportJob[],
  totalValue: number,
  role: ReportRole,
  logoDataUrl: string | null,
  title: string,
  reportReference: string
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = startY;

  if (y + 48 > pageHeight - FOOTER_HEIGHT) {
    doc.addPage();
    drawContinuationHeader(doc, logoDataUrl, title, reportReference);
    y = 34;
  }

  const completed = jobs.filter((job) => job.status === "completed").length;
  const active = jobs.filter((job) => job.status !== "completed").length;
  const leftX = pageWidth - 91;
  const rightX = pageWidth - PAGE_MARGIN;

  doc.setFillColor(...COLOURS.softGrey);
  doc.rect(leftX, y, 77, 9, "F");
  doc.setTextColor(...COLOURS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Jobs included", leftX + 4, y + 6);
  doc.setTextColor(...COLOURS.ink);
  doc.setFont("helvetica", "bold");
  doc.text(String(jobs.length), rightX - 4, y + 6, { align: "right" });

  y += 9;
  doc.setFillColor(...COLOURS.cream);
  doc.rect(leftX, y, 77, 9, "F");
  doc.setTextColor(...COLOURS.muted);
  doc.setFont("helvetica", "normal");
  doc.text("Completed / active", leftX + 4, y + 6);
  doc.setTextColor(...COLOURS.ink);
  doc.setFont("helvetica", "bold");
  doc.text(`${completed} / ${active}`, rightX - 4, y + 6, { align: "right" });

  y += 9;
  doc.setFillColor(...COLOURS.gold);
  doc.rect(leftX, y, 77, 11, "F");
  doc.setTextColor(...COLOURS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(
    role === "employee" ? "TOTAL EARNINGS" : "TOTAL JOB VALUE",
    leftX + 4,
    y + 7.3
  );
  doc.text(formatCurrency(totalValue), rightX - 4, y + 7.3, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(...COLOURS.muted);
  const note =
    role === "customer"
      ? "This portal-generated job statement shows stored job values and does not add tax or discounts."
      : "This report reflects the job data available in the portal at the time it was generated.";
  doc.text(note, PAGE_MARGIN, y + 7.3, {
    maxWidth: leftX - PAGE_MARGIN - 8,
  });
}

function drawPageFooters(doc: jsPDF, generatedAt: Date): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLOURS.gold);
    doc.setLineWidth(0.5);
    doc.line(
      PAGE_MARGIN,
      pageHeight - FOOTER_HEIGHT,
      pageWidth - PAGE_MARGIN,
      pageHeight - FOOTER_HEIGHT
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...COLOURS.ink);
    doc.text(COMPANY.legalName, PAGE_MARGIN, pageHeight - 10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLOURS.muted);
    doc.text(
      `Generated ${format(generatedAt, "dd/MM/yyyy HH:mm")}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 10, {
      align: "right",
    });
  }
}

export const generateJobsPDF = async (
  jobs: Job[],
  session: ReportSession | null,
  startDate: Date,
  endDate: Date
): Promise<jsPDF> => {
  const reportJobs = (jobs || []) as ReportJob[];

  if (reportJobs.length === 0) {
    throw new Error("At least one job is required to generate a PDF report");
  }

  const generatedAt = new Date();
  const role = session?.user?.role || "customer";
  const title = getDocumentTitle(role);
  const reportReference = format(generatedAt, "yyyyMMdd-HHmm");
  const period = getReportDates(reportJobs, startDate, endDate);
  const identity = getReportIdentity(reportJobs, session, role);
  const totalValue = reportJobs.reduce((total, job) => {
    return (
      total +
      (role === "employee"
        ? getWorkerEarnings(job, session?.user?.id)
        : getJobPrice(job))
    );
  }, 0);
  const logoDataUrl = await loadLogoDataUrl();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  doc.setProperties({
    title: `${title} ${reportReference}`,
    subject: `Warrington portal report containing ${reportJobs.length} jobs`,
    author: COMPANY.legalName,
    creator: "Warrington Portal",
    keywords: "Warrington, jobs, statement, report",
  });

  const tableStartY = drawFirstPageHeader(
    doc,
    logoDataUrl,
    title,
    reportReference,
    generatedAt,
    identity,
    period,
    reportJobs,
    totalValue,
    role
  );

  autoTable(doc, {
    startY: tableStartY,
    margin: {
      top: 32,
      right: PAGE_MARGIN,
      bottom: FOOTER_HEIGHT + 5,
      left: PAGE_MARGIN,
    },
    head: [["JOB DETAILS", role === "employee" ? "EARNINGS" : "AMOUNT"]],
    body: buildTableRows(reportJobs, role, session?.user?.id),
    theme: "plain",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: COLOURS.ink,
      overflow: "linebreak",
      lineColor: COLOURS.line,
      lineWidth: { bottom: 0.18 },
      minCellHeight: 8,
    },
    headStyles: {
      fillColor: COLOURS.ink,
      textColor: COLOURS.white,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 39, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: COLOURS.cream,
    },
    willDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawContinuationHeader(doc, logoDataUrl, title, reportReference);
      }
    },
  });

  const lastTableY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY || tableStartY;

  drawTotals(
    doc,
    lastTableY + 7,
    reportJobs,
    totalValue,
    role,
    logoDataUrl,
    title,
    reportReference
  );
  drawPageFooters(doc, generatedAt);

  return doc;
};
