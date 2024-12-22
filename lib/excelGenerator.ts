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
    { header: "CLIENT", key: "client", width: 30 },
    { header: "DESCRIPTION", key: "description", width: 40 },
    { header: "AMOUNT £", key: "amount", width: 15 },
    { header: "MILEAGE £", key: "mileageMiles", width: 15 },
    { header: "", key: "mileageAmount", width: 15 },
    { header: "EXPENSES £", key: "expensesAmount", width: 15 },
    { header: "OVERTIME £", key: "overtimeHours", width: 15 },
    { header: "", key: "overtimeAmount", width: 15 },
    { header: "Employee", key: "userName", width: 25 },
  ];

  let currentRow = 1;

  // Only add company header for admin users
  if (session?.user?.role === "admin") {
    // Company name and logo section
    worksheet.mergeCells(`A${currentRow}:D${currentRow + 2}`);
    const companyCell = worksheet.getCell(`A${currentRow}`);
    companyCell.value = "WARRINGTON\nINSTALLS";
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
    "CLIENT",
    "DESCRIPTION",
    "AMOUNT £",
    "MILEAGE £",
    "",
    "EXPENSES £",
    "OVERTIME £",
    "",
    session?.user?.role === "admin" ? "EMPLOYEE" : "",
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
      entry.client,
      entry.description,
      entry.totalAmount,
      entry.mileage.miles,
      entry.mileage.amount,
      entry.expenses.amount,
      entry.overtime.hours,
      entry.overtime.amount,
      session?.user?.role === "admin" ? entry.userName : "",
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
  // const totalsRow = worksheet.addRow([
  //   "TOTAL",
  //   "",
  //   "",
  //   dataToDisplay.reduce((sum, entry) => sum + entry.totalAmount, 0),
  //   "",
  //   dataToDisplay.reduce((sum, entry) => sum + entry.mileage.amount, 0),
  //   dataToDisplay.reduce((sum, entry) => sum + entry.expenses.amount, 0),
  //   "",
  //   dataToDisplay.reduce((sum, entry) => sum + entry.overtime.amount, 0),
  //   "",
  // ]);
  const safeGetNumber = (obj: any, path: string): number => {
    const value = path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
    return typeof value === 'number' ? value : 0;
  };
  const totalsRow = worksheet.addRow([
    "TOTAL",
    "",
    "",
    filteredData.reduce((sum, entry) => sum + safeGetNumber(entry, 'totalAmount'), 0),
    "",
    filteredData.reduce((sum, entry) => sum + safeGetNumber(entry, 'mileage.amount'), 0),
    filteredData.reduce((sum, entry) => sum + safeGetNumber(entry, 'expenses.amount'), 0),
    "",
    filteredData.reduce((sum, entry) => sum + safeGetNumber(entry, 'overtime.amount'), 0),
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
  // const amountTotal = dataToDisplay.reduce(
  //   (sum, entry) => sum + entry.totalAmount,
  //   0
  // );
  // const mileageTotal = dataToDisplay.reduce(
  //   (sum, entry) => sum + entry.mileage.amount,
  //   0
  // );
  // const expensesTotal = dataToDisplay.reduce(
  //   (sum, entry) => sum + entry.expenses.amount,
  //   0
  // );
  // const overtimeTotal = dataToDisplay.reduce(
  //   (sum, entry) => sum + entry.overtime.amount,
  //   0
  // );
  const amountTotal = filteredData.reduce((sum, entry) => sum + safeGetNumber(entry, 'totalAmount'), 0);
  const mileageTotal = filteredData.reduce((sum, entry) => sum + safeGetNumber(entry, 'mileage.amount'), 0);
  const expensesTotal = filteredData.reduce((sum, entry) => sum + safeGetNumber(entry, 'expenses.amount'), 0);
  const overtimeTotal = filteredData.reduce((sum, entry) => sum + safeGetNumber(entry, 'overtime.amount'), 0);

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
  doc.text("WARRINGTON INSTALLS", 14, 20);

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
      (entry.expenses?.amount || 0)+
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
