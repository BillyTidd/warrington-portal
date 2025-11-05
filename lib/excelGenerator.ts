import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  format,
  isSameDay,
  eachDayOfInterval,
  addDays,
  getWeek,
  startOfMonth,
} from "date-fns";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Job } from "@/types/job";
import autoTable from "jspdf-autotable";

interface Entry {
  _id: string;
  date: string;
  client: string;
  description: string;
  mileage: { miles: number; amount: number };
  expenses: { description: string; amount: number };
  overtime: { hours: number; amount: number };
  sustenance: { description: string; amount: number };
  totalAmount: number;
  userId: string;
  userName?: string;
}

interface Filter {
  startDate: Date | null;
  endDate: Date | null;
  weekStart: Date | null;
  client?: any;
}

interface ExcelGeneratorParams {
  filteredData: Entry[];
  filter: Filter;
  session: any; // Replace 'any' with the actual session type
}

export const generateExcelWorkbook = async ({
  filteredData,
  filter,
  session,
}: ExcelGeneratorParams): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Entries");
  // worksheet.views = [
  //   {
  //     state: "frozen",
  //     xSplit: 0,
  //     ySplit: 2, // This will freeze only the header and subheader rows
  //     topLeftCell: "A16", // Position right after the frozen rows
  //     activeCell: "A14", // Position at the header row
  //   },
  // ];
  // Set print options
  worksheet.pageSetup.paperSize = 9; // A4
  worksheet.pageSetup.orientation = "landscape";
  worksheet.pageSetup.fitToPage = true;
  worksheet.pageSetup.margins = {
    left: 0.7,
    right: 0.7,
    top: 0.75,
    bottom: 0.75,
    header: 0.3,
    footer: 0.3,
  };

  worksheet.columns = [
    { header: "DATE", key: "date", width: 15 },
    { header: "EMPLOYEE", key: "userName", width: 25 },
    { header: "DESCRIPTION", key: "description", width: 40 },
    { header: "AMOUNT £", key: "amount", width: 15 },
    { header: "MILEAGE £", key: "mileageMiles", width: 15 },
    { header: "", key: "mileageAmount", width: 15 },
    { header: "EXPENSES £", key: "expensesAmount", width: 15 },
    { header: "OVERTIME £", key: "overtimeHours", width: 15 },
    { header: "", key: "overtimeAmount", width: 15 },
    { header: "CLIENT", key: "client", width: 30 },
  ];

  let currentRow = 1;

  // Only add company header for admin users
  if (session?.user?.role === "admin") {
    // Company name and logo section
    worksheet.mergeCells(`A${currentRow}:D${currentRow + 2}`);
    const companyCell = worksheet.getCell(`A${currentRow}`);
    companyCell.value = "WARRINGTON'S\nINSTALLS";
    companyCell.font = { bold: true, size: 36, name: "Arial" };
    companyCell.alignment = { vertical: "middle", horizontal: "left" };
    worksheet.getRow(currentRow).height = 90;

    // Invoice number section
    worksheet.mergeCells(`E${currentRow}:J${currentRow + 2}`);
    const invoiceCell = worksheet.getCell(`E${currentRow}`);
    const invoiceNumber = String(Math.floor(Math.random() * 9999)).padStart(
      4,
      "0"
    );
    invoiceCell.value = `INVOICE # ${invoiceNumber}`;
    invoiceCell.font = { bold: true, size: 36, name: "Arial" };
    invoiceCell.alignment = { horizontal: "right", vertical: "middle" };

    currentRow += 3;

    // Company details
    worksheet.mergeCells(`A${currentRow}:D${currentRow + 3}`);
    const addressCell = worksheet.getCell(`A${currentRow}`);
    addressCell.value =
      "165 Harborough Road\nKingsthorpe\nNorthampton\nNN2 8DL";
    addressCell.font = { size: 14, name: "Arial" };
    addressCell.alignment = {
      vertical: "top",
      horizontal: "left",
      wrapText: true,
    };
    worksheet.getRow(currentRow).height = 100;

    // Invoice details
    worksheet.mergeCells(`E${currentRow}:J${currentRow + 3}`);
    const detailsCell = worksheet.getCell(`E${currentRow}`);
    detailsCell.value = `Invoice No: ${invoiceNumber}\nInvoice Date: ${format(
      new Date(),
      "dd/MM/yyyy"
    )}\nCompany UTR: 42683 25579\nCompany No: 13607313`;
    detailsCell.font = { size: 14, name: "Arial" };
    detailsCell.alignment = {
      vertical: "top",
      horizontal: "right",
      wrapText: true,
    };

    currentRow += 4;

    // Add separator line
    worksheet.addRow([]);
    const separatorRow = worksheet.getRow(currentRow);
    separatorRow.height = 4;
    separatorRow.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thick" as const, color: { argb: "FF000000" } },
      };
    });
    currentRow++;

    // Add spacing
    worksheet.addRow([]);
    currentRow++;
  }

  // Work Entries Summary section
  worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = "WORK ENTRIES SUMMARY";
  titleCell.font = {
    bold: true,
    size: 18,
    name: "Arial",
    color: { argb: "FF000000" },
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF2CC" },
  };
  worksheet.getRow(currentRow).height = 35;
  currentRow++;

  // Add user info
  worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
  const userCell = worksheet.getCell(`A${currentRow}`);
  userCell.value = `${session?.user?.name?.toUpperCase() || ""}`;
  userCell.font = { bold: true, size: 14, name: "Arial" };
  userCell.alignment = { horizontal: "center", vertical: "middle" };
  userCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF5F5F5" },
  };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  // Add date range info
  worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
  const dateRangeCell = worksheet.getCell(`A${currentRow}`);
  const startDate = filter.startDate
    ? format(filter.startDate, "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");
  const endDate = filter.endDate
    ? format(filter.endDate, "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");
  dateRangeCell.value = `Period: ${startDate} - ${endDate}`;
  dateRangeCell.font = { size: 12, name: "Arial" };
  dateRangeCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(currentRow).height = 25;
  currentRow++;

  // Add spacing
  worksheet.addRow([]);
  currentRow++;

  // Style headers with new design
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = [
    "DATE",
    session?.user?.role === "admin" ? "EMPLOYEE" : "",
    "DESCRIPTION",
    "AMOUNT £",
    "MILEAGE £",
    "",
    "EXPENSES £",
    "OVERTIME £",
    "",
    "CLIENT",
  ];

  // Enhanced header styling
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F497D" },
    };
    cell.font = {
      bold: true,
      size: 11,
      name: "Arial",
      color: { argb: "FFFFFFFF" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
  });
  currentRow++;

  // Add subheaders
  const subHeaderRow = worksheet.getRow(currentRow);
  subHeaderRow.values = [
    "",
    "",
    "",
    "",
    "Miles",
    "Amount £ (auto)",
    "",
    "Hours",
    "Amount £ (auto)",
    "",
  ];

  // Style subheaders
  subHeaderRow.height = 25;
  subHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF2F2F2" },
    };
    cell.font = { bold: true, size: 10, name: "Arial" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  currentRow++;

  // Merge header cells
  worksheet.mergeCells(`E${currentRow - 2}:F${currentRow - 2}`);
  worksheet.mergeCells(`H${currentRow - 2}:I${currentRow - 2}`);

  // Prepare data based on filters
  let dataToDisplay = [];
  if (filter.startDate && filter.endDate) {
    const dateRange = eachDayOfInterval({
      start: filter.startDate,
      end: filter.endDate,
    });
    dataToDisplay = dateRange.map((date) => {
      const entry = filteredData.find((e) => isSameDay(new Date(e.date), date));
      return entry || createEmptyEntry(date);
    });
  } else if (filter.weekStart) {
    const weekRange = Array.from({ length: 7 }, (_, i) =>
      addDays(filter.weekStart!, i)
    );
    dataToDisplay = weekRange.map((date) => {
      const entry = filteredData.find((e) => isSameDay(new Date(e.date), date));
      return entry || createEmptyEntry(date);
    });
  } else {
    dataToDisplay = filteredData;
  }

  // Add data rows
  filteredData.forEach((entry, index) => {
    const row = worksheet.addRow([
      format(new Date(entry.date), "dd-MMM-yyyy"),
      session?.user?.role === "admin" ? entry.userName : "",
      entry.description,
      entry.totalAmount,
      entry.mileage.miles,
      entry.mileage.amount,
      entry.expenses.amount,
      entry.overtime.hours,
      entry.overtime.amount,
      entry.client,
    ]);

    row.height = 25;

    // Style data cells
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Set alignment based on content type
      if ([4, 6, 7, 9].includes(colNumber)) {
        cell.numFmt = "£#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if ([5, 8].includes(colNumber)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }

      // Alternate row colors
      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F5F5" },
        };
      }
    });
    currentRow++;
  });

  // Add empty row
  worksheet.addRow([]);
  currentRow++;

  // Calculate totals and add totals row
  const safeGetNumber = (obj: any, path: string): number => {
    const value = path
      .split(".")
      .reduce(
        (o, key) => (o && o[key] !== undefined ? o[key] : undefined),
        obj
      );
    return typeof value === "number" ? value : 0;
  };
  const totalsRow = worksheet.addRow([
    "TOTAL",
    "",
    "",
    filteredData.reduce(
      (sum, entry) => sum + safeGetNumber(entry, "totalAmount"),
      0
    ),
    "",
    filteredData.reduce(
      (sum, entry) => sum + safeGetNumber(entry, "mileage.amount"),
      0
    ),
    filteredData.reduce(
      (sum, entry) => sum + safeGetNumber(entry, "expenses.amount"),
      0
    ),
    "",
    filteredData.reduce(
      (sum, entry) => sum + safeGetNumber(entry, "overtime.amount"),
      0
    ),
    "",
  ]);
  // Style totals row
  totalsRow.height = 25;
  totalsRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 11, name: "Arial" };
    cell.border = { top: { style: "double" }, bottom: { style: "double" } };
    if ([4, 6, 7, 9].includes(colNumber)) {
      cell.numFmt = "£#,##0.00";
      cell.alignment = { horizontal: "right", vertical: "middle" };
    } else {
      cell.alignment = { horizontal: "left", vertical: "middle" };
    }
  });

  currentRow++;
  worksheet.addRow([]);
  currentRow++;

  // Add calculation box
  const boxStartRow = currentRow;

  // Add calculation box title with merged cells and styling
  worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
  const boxTitleCell = worksheet.getCell(`C${currentRow}`);
  boxTitleCell.value = "CALCULATION SUMMARY";
  boxTitleCell.font = {
    bold: true,
    size: 14,
    name: "Arial",
    color: { argb: "FFFFFFFF" },
  };
  boxTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  boxTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F497D" },
  };
  boxTitleCell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
    bottom: { style: "thin" },
  };

  // Helper function for calculation rows
  const addCalculationRow = (
    label: string,
    amount: number,
    isTotal = false
  ) => {
    const row = worksheet.addRow(["", "", label, amount]);
    row.height = 25;

    const labelCell = row.getCell(3);
    const amountCell = row.getCell(4);

    labelCell.font = { name: "Arial", size: 11, bold: true };
    labelCell.alignment = { horizontal: "right", vertical: "middle" };
    labelCell.border = { left: { style: "thin" }, right: { style: "thin" } };

    amountCell.numFmt = "£#,##0.00";
    amountCell.alignment = { horizontal: "right", vertical: "middle" };
    amountCell.font = { name: "Arial", size: 11, bold: true };
    amountCell.border = { left: { style: "thin" }, right: { style: "thin" } };

    if (isTotal) {
      const totalStyle = {
        border: {
          top: { style: "double" as const },
          bottom: { style: "double" as const },
          left: { style: "thin" as const },
          right: { style: "thin" as const },
        },
        font: { name: "Arial", bold: true, size: 12 },
        fill: {
          type: "pattern" as const,
          pattern: "solid" as const,
          fgColor: { argb: "FFFFF2CC" },
        },
      };

      labelCell.border = totalStyle.border;
      labelCell.font = totalStyle.font;
      labelCell.fill = totalStyle.fill;

      amountCell.border = totalStyle.border;
      amountCell.font = totalStyle.font;
      amountCell.fill = totalStyle.fill;
    }

    currentRow++;
    return row;
  };

  // Calculate all totals
  const amountTotal = filteredData.reduce(
    (sum, entry) => sum + safeGetNumber(entry, "totalAmount"),
    0
  );
  const mileageTotal = filteredData.reduce(
    (sum, entry) => sum + safeGetNumber(entry, "mileage.amount"),
    0
  );
  const expensesTotal = filteredData.reduce(
    (sum, entry) => sum + safeGetNumber(entry, "expenses.amount"),
    0
  );
  const overtimeTotal = filteredData.reduce(
    (sum, entry) => sum + safeGetNumber(entry, "overtime.amount"),
    0
  );

  // Add individual totals
  addCalculationRow("Amount Total", amountTotal);
  addCalculationRow("Mileage Total", mileageTotal);
  addCalculationRow("Expenses Total", expensesTotal);
  addCalculationRow("Overtime Total", overtimeTotal);

  // Add empty row for spacing
  worksheet.addRow([]);
  currentRow++;

  // Calculate grand total
  const grandTotal = amountTotal + mileageTotal + expensesTotal + overtimeTotal;

  // Add grand total and tax calculations
  addCalculationRow("TOTAL:", grandTotal, true);
  addCalculationRow("CIS Deduction (20%):", grandTotal * 0.2);
  addCalculationRow("TOTAL AFTER CIS:", grandTotal * 0.8, true);

  // Style the entire calculation box
  for (let i = boxStartRow; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    // Add left and right borders to the box
    row.getCell(3).border = {
      ...row.getCell(3).border,
      left: { style: "thin" },
    };
    row.getCell(4).border = {
      ...row.getCell(4).border,
      right: { style: "thin" },
    };
  }

  // Add bottom border to the box
  const lastRow = worksheet.getRow(worksheet.rowCount);
  lastRow.getCell(3).border = {
    ...lastRow.getCell(3).border,
    bottom: { style: "thin" },
  };
  lastRow.getCell(4).border = {
    ...lastRow.getCell(4).border,
    bottom: { style: "thin" },
  };

  return workbook;
};

const createEmptyEntry = (date: Date): Entry => ({
  _id: "",
  date: format(date, "yyyy-MM-dd"),
  client: "",
  description: "",
  mileage: {
    miles: 0,
    amount: 0,
  },
  expenses: {
    description: "",
    amount: 0,
  },
  overtime: {
    hours: 0,
    amount: 0,
  },
  sustenance: {
    description: "",
    amount: 0,
  },
  totalAmount: 0,
  userId: "",
});

export const handleDownloadCSV = async (
  params: ExcelGeneratorParams,
  handleUploadToDrive: (obj: any) => Promise<void>
) => {
  const { filteredData, filter, session } = params;
  const currentYear = new Date().getFullYear().toString();
  const selectedDate = filter.startDate || new Date();
  const month = format(selectedDate, "MMMM");
  const isAdmin = session?.user?.role === "admin";

  let fileName: string;
  let fileData: string;
  let mimeType: string;

  if (isAdmin) {
    // Generate Excel for admin
    const workbook = await generateExcelWorkbook(params);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fileName = `work_entries_${format(new Date(), "dd-MMM-yyyy")}.xlsx`;
    saveAs(blob, fileName);
    fileData = Buffer.from(buffer).toString("base64");
    mimeType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else {
    // Generate PDF for employee
    const doc = await generatePDF(filteredData, session);
    const pdfOutput = doc.output("arraybuffer");
    const blob = new Blob([pdfOutput], { type: "application/pdf" });

    fileName = `work_entries_${format(new Date(), "dd-MMM-yyyy")}.pdf`;
    saveAs(blob, fileName);
    fileData = Buffer.from(pdfOutput).toString("base64");
    mimeType = "application/pdf";
  }

  let folderPath = "";

  if (isAdmin) {
    folderPath += filter.client
      ? `/Admin Invoice/${currentYear}/${filter.client}/${month}/`
      : `/Admin Invoice/${currentYear}/`;
  } else {
    const weekOfMonth =
      getWeek(selectedDate) - getWeek(startOfMonth(selectedDate)) + 1;
    folderPath += `/Employee Invoice/${session.user.name}/${currentYear}/${month}/WEEK-${weekOfMonth}/`;
  }

  const obj: any = {
    fileName,
    fileData,
    folderPath,
    mimeType,
    userRole: session?.user?.role,
    filteredData: params.filteredData,
  };

  await handleUploadToDrive(obj);
};

export const generatePDF = async (
  data: Entry[],
  session: any
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Enhanced header section
  const pageWidth = doc.internal.pageSize.width;

  // Background for header
  doc.setFillColor(31, 73, 125);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Add company name
  doc.setTextColor(255);
  doc.setFontSize(24); // Reduced from 28
  doc.setFont("helvetica", "bold");
  doc.text("WARRINGTON'S INSTALLS", 14, 20);

  // Add user info section
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(`Employee: ${session?.user?.name?.toUpperCase() || ""}`, 14, 35);

  // Add generation timestamp
  doc.setFontSize(12);
  doc.text(
    `Generated: ${format(new Date(), "dd-MMM-yyyy HH:mm:ss")}`,
    pageWidth - 14,
    35,
    { align: "right" }
  );

  // Table configuration with exact header structure
  const tableHeaders = [
    [
      "DATE",
      "CLIENT",
      "DESCRIPTION",
      "AMOUNT £",
      { content: "MILEAGE £", colSpan: 2 },
      "EXPENSES £",
      { content: "OVERTIME £", colSpan: 2 },
      "TOTAL AMOUNT £",
    ],
    [
      "",
      "",
      "",
      "",
      "Miles",
      "Amount £ (auto)",
      "",
      "Hours",
      "Amount £ (auto)",
      "",
    ],
  ];

  const tableData = data.map((entry) => {
    const totalAmount =
      entry.totalAmount +
      (entry.mileage?.amount || 0) +
      (entry.expenses?.amount || 0) +
      (entry.overtime?.amount || 0);
    // Changed to include expenses instead of overtime

    return [
      format(new Date(entry.date), "dd-MMM-yyyy"),
      entry.client,
      entry.description,
      `£${Number(entry.totalAmount).toFixed(2)}`,
      entry.mileage?.miles || "",
      `£${Number(entry.mileage?.amount || 0).toFixed(2)}`,
      `£${Number(entry.expenses?.amount || 0).toFixed(2)}`,
      entry.overtime?.hours || "",
      `£${Number(entry.overtime?.amount || 0).toFixed(2)}`,
      `£${totalAmount.toFixed(2)}`,
    ];
  });

  // Calculate totals
  const totalAmount = data.reduce((sum, entry) => sum + entry.totalAmount, 0);
  const mileageTotal = data.reduce(
    (sum, entry) => sum + (entry.mileage?.amount || 0),
    0
  );
  const expensesTotal = data.reduce(
    (sum, entry) => sum + (entry.expenses?.amount || 0),
    0
  );
  const overtimeTotal = data.reduce(
    (sum, entry) => sum + (entry.overtime?.amount || 0),
    0
  );

  const grandTotal = totalAmount + mileageTotal + expensesTotal + overtimeTotal;
  const cisDeduction = grandTotal * 0.2;
  const totalAfterCIS = grandTotal - cisDeduction;

  // Table styling to match exactly with the image
  (doc as any).autoTable({
    head: tableHeaders,
    body: tableData,
    startY: 50,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [31, 73, 125],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 9,
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
      lineWidth: 0.1,
    },
    // Set specific styles for the second header row
    columnStyles: {
      0: { cellWidth: 25 }, // Date
      1: { cellWidth: 30 }, // Client
      2: { cellWidth: 40 }, // Description
      3: { cellWidth: 22, halign: "right" }, // Amount
      4: { cellWidth: 20, halign: "center" }, // Mileage Miles
      5: { cellWidth: 25, halign: "right" }, // Mileage Amount
      6: { cellWidth: 25, halign: "right" }, // Expenses Amount
      7: { cellWidth: 20, halign: "center" }, // Overtime Hours
      8: { cellWidth: 25, halign: "right" }, // Overtime Amount
      9: { cellWidth: 25, halign: "right" }, // Total Amount
    },
    // Style for the second header row (sub-headers)
    createdHeaderCell: function (cell: any, data: any) {
      if (data.row.index === 1) {
        cell.styles.fillColor = [255, 255, 255];
        cell.styles.textColor = [0, 0, 0];
        cell.styles.fontStyle = "bold";
      }
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didDrawPage: (data: any) => {
      // Page number at bottom
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 20,
        doc.internal.pageSize.height - 10,
        { align: "right" }
      );
    },
  });

  // Add calculation box with enhanced styling
  let startY = (doc as any).lastAutoTable.finalY + 10;
  // Check if there's enough space for calculation box
  if (startY + 100 > doc.internal.pageSize.height - 20) {
    doc.addPage();
    startY = 20;
  }

  // Add calculation title with matching style
  doc.setFillColor(31, 73, 125);
  doc.rect(pageWidth - 80, startY, 70, 8, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CALCULATION SUMMARY", pageWidth - 75, startY + 6);

  // Reset text color for calculations
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const addRow = (label: string, value: number, isBold: boolean = false) => {
    if (isBold) doc.setFont("helvetica", "bold");
    doc.text(label, pageWidth - 75, startY + (doc as any).calculationBoxY);
    doc.text(
      `£${value.toFixed(2)}`,
      pageWidth - 15,
      startY + (doc as any).calculationBoxY,
      { align: "right" }
    );
    if (isBold) doc.setFont("helvetica", "normal");
    (doc as any).calculationBoxY += 7;
  };

  (doc as any).calculationBoxY = 15;
  addRow("Amount Total:", totalAmount);
  addRow("Mileage Total:", mileageTotal);
  addRow("Expenses Total:", expensesTotal);
  addRow("Overtime Total:", overtimeTotal);

  // Add line before grand total
  (doc as any).calculationBoxY += 2;
  doc.line(
    pageWidth - 75,
    startY + (doc as any).calculationBoxY,
    pageWidth - 15,
    startY + (doc as any).calculationBoxY
  );
  (doc as any).calculationBoxY += 5;

  addRow("TOTAL:", grandTotal, true);
  addRow("CIS Deduction (20%):", cisDeduction);

  // Add line before final total
  (doc as any).calculationBoxY += 2;
  doc.line(
    pageWidth - 75,
    startY + (doc as any).calculationBoxY,
    pageWidth - 15,
    startY + (doc as any).calculationBoxY
  );
  (doc as any).calculationBoxY += 5;

  addRow("TOTAL AFTER CIS:", totalAfterCIS, true);

  return doc;
};

type RGB = [number, number, number];
type FontStyle = "normal" | "bold" | "italic" | "bolditalic";

export const generateJobPDF = async (
  job: Job,
  session: any
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Define colors for consistent branding (using proper RGB tuples)
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
  doc.text(`JOB DETAILS REPORT`, 14, 35);

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

  // Calculate job metrics
  const daysRemaining = job.expireDate
    ? Math.ceil(
        (new Date(job.expireDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;
  const isOverdue = daysRemaining < 0 && job.status !== "completed";

  // Add job summary box
  doc.setFillColor(245, 245, 250); // Light background
  doc.roundedRect(14, 55, pageWidth - 28, 25, 3, 3, "F");

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Job Summary:", 20, 63);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  // Summary items in a row
  const summaryY = 72;
  const col1 = 20;
  const col2 = pageWidth / 4;
  const col3 = pageWidth / 2;
  const col4 = (3 * pageWidth) / 4 - 10;

  doc.setFont("helvetica", "bold");
  doc.text("Client:", col1, summaryY);
  doc.text("Worker:", col2, summaryY);
  doc.text("Status:", col3, summaryY);
  doc.text("Timeline:", col4, summaryY);

  doc.setFont("helvetica", "normal");
  doc.text(job.clientName || "N/A", col1, summaryY + 6);
  doc.text(job.workerName || "N/A", col2, summaryY + 6);

  // Status with color indicator
  let statusColor: RGB = [255, 180, 0]; // Default yellow for pending
  if (job.status === "completed") {
    statusColor = [0, 180, 0]; // Green
  } else if (job.status === "in-progress") {
    statusColor = [0, 120, 255]; // Blue
  }

  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.circle(col3, summaryY + 3, 2, "F");
  doc.text(
    job.status
      ? job.status.charAt(0).toUpperCase() + job.status.slice(1)
      : "Pending",
    col3 + 5,
    summaryY + 6
  );

  // Timeline text
  const timelineText = isOverdue
    ? `Overdue by ${Math.abs(daysRemaining)} days`
    : job.status === "completed"
    ? "Completed"
    : `${daysRemaining} days remaining`;
  doc.text(timelineText, col4, summaryY + 6);

  // Create a more detailed job information table
  const jobDetailsTable: any = {
    head: [
      [
        {
          content: "JOB INFORMATION",
          colSpan: 4,
          styles: {
            halign: "center",
            fontStyle: "bold" as FontStyle,
            fontSize: 12,
            fillColor: primaryColor,
            textColor: [255, 255, 255] as RGB,
          },
        },
      ],
    ],
    body: [
      ["Job Name", job.jobName || "", "Job ID", job._id || ""],
      ["Client", job.clientName || "", "Worker", job.workerName || ""],
      [
        "Start Date",
        job.assignDate ? format(new Date(job.assignDate), "dd-MMM-yyyy") : "",
        "Due Date",
        job.expireDate ? format(new Date(job.expireDate), "dd-MMM-yyyy") : "",
      ],
      [
        "Status",
        job.status
          ? job.status.charAt(0).toUpperCase() + job.status.slice(1)
          : "Pending",
        "Time Remaining",
        isOverdue
          ? `Overdue by ${Math.abs(daysRemaining)} days`
          : `${daysRemaining} days remaining`,
      ],
    ],
  };

  // Add the job details table
  autoTable(doc, {
    startY: 90,
    head: jobDetailsTable.head,
    body: jobDetailsTable.body,
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
      lineWidth: 0.1,
      textColor: [50, 50, 50] as RGB,
    },
    columnStyles: {
      0: {
        fontStyle: "bold" as FontStyle,
        cellWidth: 30,
        fillColor: [240, 240, 250] as RGB,
      },
      1: { cellWidth: 70 },
      2: {
        fontStyle: "bold" as FontStyle,
        cellWidth: 30,
        fillColor: [240, 240, 250] as RGB,
      },
      3: { cellWidth: 70 },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 255] as RGB,
    },
    headStyles: {
      textColor: [255, 255, 255] as RGB,
      fillColor: primaryColor,
    },
  });

  // Add job description in a separate table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 5,
    head: [
      [
        {
          content: "JOB DESCRIPTION",
          styles: {
            halign: "center",
            fontStyle: "bold" as FontStyle,
            fontSize: 12,
            fillColor: primaryColor,
            textColor: [255, 255, 255] as RGB,
          },
        },
      ],
    ],
    body: [[job.description || "No description provided"]],
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      lineWidth: 0.1,
      textColor: [50, 50, 50] as RGB,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 255] as RGB,
    },
  });

  // Create a map to track costs per worker for invoicing
  const workerCosts: any = new Map();

  // Initialize worker costs if workers are defined
  if (job.workers && job.workers.length > 0) {
    job.workers.forEach((worker: any) => {
      workerCosts.set(worker.userId, {
        name: worker.workerName,
        regularCost: 0,
        overtimeCost: 0,
        fixedRate: worker.fixedRate || 0,
        totalCost: worker.fixedRate || 0, // Initialize with fixed rate if available
        logs: [],
      });
    });
  }

  // Filter progress logs based on user role
  let relevantLogs = [];
  if (session?.user?.role === "admin") {
    // Admin sees all logs
    relevantLogs = job.progressLogs || [];
  } else {
    // Workers only see their own logs
    relevantLogs = (job.progressLogs || []).filter(
      (log) => log.updatedBy === session?.user?.id
    );
  }

  // Sort logs by date (newest first)
  const sortedLogs = [...relevantLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Calculate costs from logs
  let regularCosts = 0;
  let overtimeCosts = 0;
  let totalCost = 0;

  // Process logs and calculate costs
  if (sortedLogs.length > 0) {
    sortedLogs.forEach((log) => {
      regularCosts += log.cost || 0;
      overtimeCosts += log.overtimeCost || 0;

      // Track costs per worker for invoicing
      const workerId = log.updatedBy;
      if (workerCosts.has(workerId)) {
        const workerData = workerCosts.get(workerId);
        workerData.regularCost += log.cost || 0;
        workerData.overtimeCost += log.overtimeCost || 0;
        workerData.totalCost =
          (workerData.fixedRate || 0) +
          workerData.regularCost +
          workerData.overtimeCost;
        workerData.logs.push(log);
        workerCosts.set(workerId, workerData);
      }
    });
  }

  // For admin, calculate total costs including fixed rates
  if (session?.user?.role === "admin") {
    // Add fixed rates to total cost
    const fixedRatesTotal: any = Array.from(workerCosts.values()).reduce(
      (sum, worker: any) => sum + (worker.fixedRate || 0),
      0
    );
    totalCost = regularCosts + overtimeCosts + fixedRatesTotal;
  } else {
    // For workers, only show their costs
    totalCost = regularCosts + overtimeCosts;
  }

  // Calculate profit (admin only)
  const profit =
    session?.user?.role === "admin" ? (job.clientPrice || 0) - totalCost : 0;

  // Progress Logs Section
  let progressY = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page
  if (progressY > pageHeight - 100) {
    doc.addPage();
    // Add header to new page
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 20, "F");
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("WARRINGTON'S INSTALLS - JOB DETAILS REPORT", 14, 15);

    // Add decorative element
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 20, pageWidth, 2, "F");

    progressY = 30;
  }

  // Progress logs table headers
  const progressHeaders: any = [
    [
      {
        content: "PROGRESS TIMELINE",
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
      "DATE",
      "UPDATED BY",
      "DETAILS",
      "EXTRA HOURS",
      "EXTRA COST",
      "TOTAL COST",
    ],
  ];

  if (sortedLogs.length > 0) {
    const progressData = sortedLogs.map((log) => [
      format(new Date(log.timestamp), "dd-MMM-yyyy HH:mm"),
      log.updatedByName || "Unknown",
      log.statusChange ? `Status changed to ${log.newStatus}` : log.details,
      log.overtimeHours ? log.overtimeHours.toFixed(1) : "0",
      log.overtimeCost ? `£${log.overtimeCost.toFixed(2)}` : "£0.00",
      `£${((log.cost || 0) + (log.overtimeCost || 0)).toFixed(2)}`,
    ]);

    // Add total row
    const totalRow: any = [
      { content: "", styles: {} },
      { content: "", styles: {} },
      {
        content: "TOTAL",
        styles: {
          fontStyle: "bold" as FontStyle,
          halign: "right",
          fillColor: [240, 240, 250] as RGB,
        },
      },
      { content: "", styles: {} },
      { content: "", styles: {} },
      {
        content: `£${(regularCosts + overtimeCosts).toFixed(2)}`,
        styles: {
          fontStyle: "bold" as FontStyle,
          halign: "right",
          fillColor: [240, 240, 250] as RGB,
        },
      },
    ];
    progressData.push(totalRow);

    // Add the progress timeline table
    autoTable(doc, {
      startY: progressY,
      head: progressHeaders,
      body: progressData,
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
        halign: "center",
        valign: "middle",
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 70 },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 20, halign: "right" },
        5: { cellWidth: 25, halign: "right" },
      },
      alternateRowStyles: {
        fillColor: [250, 250, 255] as RGB,
      },
    });
  } else {
    // Add empty progress timeline table with just the header
    autoTable(doc, {
      startY: progressY,
      head: progressHeaders,
      body: [
        [
          "No progress logs have been recorded for this job.",
          "",
          "",
          "0",
          "£0.00",
          "£0.00",
        ],
      ],
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
        halign: "center",
        valign: "middle",
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 70 },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 20, halign: "right" },
        5: { cellWidth: 25, halign: "right" },
      },
    });
  }

  // Add worker invoicing section if this is a worker's view
  if (session?.user?.role !== "admin" && sortedLogs.length > 0) {
    let invoiceY = (doc as any).lastAutoTable.finalY + 10;

    // Check if we need a new page
    if (invoiceY > pageHeight - 100) {
      doc.addPage();
      // Add header to new page
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 20, "F");
      doc.setTextColor(255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("WARRINGTON'S INSTALLS - JOB DETAILS REPORT", 14, 15);

      // Add decorative element
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 20, pageWidth, 2, "F");

      invoiceY = 30;
    }

    // Get worker data
    const workerId = session?.user?.id;
    const workerData = workerCosts.get(workerId) || {
      name: session?.user?.name || "Unknown",
      regularCost: regularCosts,
      overtimeCost: overtimeCosts,
      fixedRate: 0,
      totalCost: regularCosts + overtimeCosts,
    };

    // Create invoice table
    const invoiceHeaders: any = [
      [
        {
          content: "WORKER INVOICE SUMMARY",
          colSpan: 2,
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

    const invoiceData = [
      ["Worker Name", session?.user?.name || "Unknown"],
      ["Job Name", job.jobName || ""],
      ["Client", job.clientName || ""],
    ];

    // Add fixed rate if applicable
    if (workerData.fixedRate > 0) {
      invoiceData.push(["Fixed Rate", `£${workerData.fixedRate.toFixed(2)}`]);
    }

    // Add regular and overtime costs
    invoiceData.push(
      ["Regular Hours Cost", `£${workerData.regularCost.toFixed(2)}`],
      ["Overtime Cost", `£${workerData.overtimeCost.toFixed(2)}`],
      [
        {
          content: "TOTAL INVOICE AMOUNT",
          styles: {
            fontStyle: "bold" as FontStyle,
            fillColor: [240, 240, 250] as RGB,
          },
        },
        {
          content: `£${workerData.totalCost.toFixed(2)}`,
          styles: {
            fontStyle: "bold" as FontStyle,
            halign: "right",
            fillColor: [240, 240, 250] as RGB,
          },
        },
      ]
    );

    // Add the invoice table
    autoTable(doc, {
      startY: invoiceY,
      head: invoiceHeaders,
      body: invoiceData,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
        lineWidth: 0.1,
        textColor: [50, 50, 50] as RGB,
      },
      columnStyles: {
        0: {
          fontStyle: "bold" as FontStyle,
          cellWidth: 60,
          fillColor: [240, 240, 250] as RGB,
        },
        1: { cellWidth: 60 },
      },
      alternateRowStyles: {
        fillColor: [250, 250, 255] as RGB,
      },
      headStyles: {
        textColor: [255, 255, 255] as RGB,
        fillColor: primaryColor,
      },
    });

    // Add invoice note
    const noteY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    doc.text(
      "Note: This invoice summary can be used to bill for your part of this job.",
      14,
      noteY
    );
  }

  // Add calculation box with enhanced styling (if admin)
  if (session?.user?.role === "admin") {
    let startY = (doc as any).lastAutoTable.finalY + 10;

    // Check if there's enough space for calculation box
    if (startY + 100 > pageHeight - 20) {
      doc.addPage();
      // Add header to new page
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 20, "F");
      doc.setTextColor(255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("WARRINGTON'S INSTALLS - JOB DETAILS REPORT", 14, 15);

      // Add decorative element
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 20, pageWidth, 2, "F");

      startY = 30;
    }

    // Create a professional calculation box with shadow effect
    // Shadow effect (light gray rectangle slightly offset)
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(pageWidth - 78, startY + 2, 70, 100, 3, 3, "F"); // Increased height for worker costs

    // Main box
    doc.setFillColor(250, 250, 255);
    doc.roundedRect(pageWidth - 80, startY, 70, 100, 3, 3, "F"); // Increased height

    // Title bar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(pageWidth - 80, startY, 70, 8, 3, 3, "F");

    // Only round the top corners
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(pageWidth - 80, startY + 4, 70, 4, "F");

    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CALCULATION SUMMARY", pageWidth - 45, startY + 5.5, {
      align: "center",
    });

    // Reset text color for calculations
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Add calculation rows
    let calcY = startY + 15;

    // Client Price
    doc.text("Client Price:", pageWidth - 75, calcY);
    doc.text(`£${(job.clientPrice || 0).toFixed(2)}`, pageWidth - 15, calcY, {
      align: "right",
    });
    calcY += 7;

    // Regular Costs
    doc.text("Regular Costs:", pageWidth - 75, calcY);
    doc.text(`£${regularCosts.toFixed(2)}`, pageWidth - 15, calcY, {
      align: "right",
    });
    calcY += 7;

    // Overtime Costs
    doc.text("Overtime Costs:", pageWidth - 75, calcY);
    doc.text(`£${overtimeCosts.toFixed(2)}`, pageWidth - 15, calcY, {
      align: "right",
    });
    calcY += 7;

    // Fixed Rate Costs
    const fixedRatesTotal: any = Array.from(workerCosts.values()).reduce(
      (sum, worker: any) => sum + (worker.fixedRate || 0),
      0
    );
    if (fixedRatesTotal > 0) {
      doc.text("Fixed Rate Costs:", pageWidth - 75, calcY);
      doc.text(`£${fixedRatesTotal.toFixed(2)}`, pageWidth - 15, calcY, {
        align: "right",
      });
      calcY += 7;
    }

    // Total Costs
    doc.text("Total Costs:", pageWidth - 75, calcY);
    doc.text(`£${totalCost.toFixed(2)}`, pageWidth - 15, calcY, {
      align: "right",
    });
    calcY += 7;

    // Add worker costs section if there are workers
    if (workerCosts.size > 0) {
      // Add line before worker costs
      doc.setDrawColor(200, 200, 200);
      doc.line(pageWidth - 75, calcY, pageWidth - 15, calcY);
      calcY += 5;

      doc.setFont("helvetica", "bold");
      doc.text("WORKER COSTS:", pageWidth - 75, calcY);
      calcY += 7;

      doc.setFont("helvetica", "normal");

      // List each worker's cost breakdown
      for (const [_, workerData] of workerCosts) {
        if (workerData.totalCost > 0) {
          doc.text(`${workerData.name}:`, pageWidth - 75, calcY);
          calcY += 5;

          // Indent and show breakdown
          if (workerData.fixedRate > 0) {
            doc.text(
              `  Fixed Rate: £${workerData.fixedRate.toFixed(2)}`,
              pageWidth - 70,
              calcY
            );
            calcY += 4;
          }

          if (workerData.regularCost > 0) {
            doc.text(
              `  Regular: £${workerData.regularCost.toFixed(2)}`,
              pageWidth - 70,
              calcY
            );
            calcY += 4;
          }

          if (workerData.overtimeCost > 0) {
            doc.text(
              `  Overtime: £${workerData.overtimeCost.toFixed(2)}`,
              pageWidth - 70,
              calcY
            );
            calcY += 4;
          }

          doc.text(
            `  Total: £${workerData.totalCost.toFixed(2)}`,
            pageWidth - 70,
            calcY
          );
          calcY += 6;
        }
      }
    }

    // Add line before profit
    calcY += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(pageWidth - 75, calcY, pageWidth - 15, calcY);
    calcY += 5;

    // Profit (in bold)
    doc.setFont("helvetica", "bold");
    doc.text("PROFIT:", pageWidth - 75, calcY);

    // Set profit color based on value
    if (profit >= 0) {
      doc.setTextColor(0, 150, 0); // Green for positive profit
    } else {
      doc.setTextColor(200, 0, 0); // Red for negative profit
    }

    doc.text(`£${profit.toFixed(2)}`, pageWidth - 15, calcY, {
      align: "right",
    });
    calcY += 7;

    // Reset text color and add profit margin
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Profit Margin: ${
        job.clientPrice ? Math.round((profit / job.clientPrice) * 100) : 0
      }%`,
      pageWidth - 75,
      calcY
    );
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
