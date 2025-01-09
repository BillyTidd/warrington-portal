import { sheets_v4 } from "googleapis";
import { format } from "date-fns";

interface GoogleSheetGeneratorParams {
  sheets: sheets_v4.Sheets;
  filteredData: any[];
  filter: {
    startDate?: Date;
    endDate?: Date;
    weekStart?: Date;
  };
  session: any;
  currentView: string;
  userId: string;
  invoiceNumber?: any;
}

export const generateGoogleSheet = async ({
  sheets,
  filteredData,
  filter,
  session,
  currentView,
  userId,
}: GoogleSheetGeneratorParams) => {
  // Generate a more descriptive filename with user info and timestamp
  const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
  const reportNumber = String(Math.floor(Math.random() * 9999)).padStart(
    4,
    "0"
  ); // Unique report number
  const fileName = `${
    session?.user?.name || "User"
  }_${currentView}_report_${reportNumber}_${timestamp}`;

  // Create new spreadsheet with the improved filename
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: fileName, // Use the new user-friendly filename
        locale: "en_US",
      },
      sheets: [
        {
          properties: {
            title: "Tasks Report",
            gridProperties: {
              rowCount: 1000,
              columnCount: 7, // 7 columns for report data and additional columns
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;
  const sheetId = spreadsheet.data.sheets![0].properties!.sheetId!;

  // Prepare the header values for the report (adding the report number)
  const headerValues = [
    // First Header - Report title with report number
    ["WARRINGTON INSTALLS", "", "", "", "REPORT #", reportNumber, ""],
    // Second Header - Report address and admin info
    [
      "Address",
      "",
      "",
      "",
      `Report by: ${session?.user?.name || "Admin"}`,
      "",
      "",
    ],
    // Third Header - Report date
    ["Date: " + format(new Date(), "dd/MM/yyyy"), "", "", "", "", "", ""],
    // Fourth Header - Generation info
    [
      "",
      "",
      "",
      "",
      `Generated on: ${format(new Date(), "dd/MM/yyyy")}`,
      "",
      "",
    ],
    // Fifth Header - Report type (current view)
    ["", "", "", "", `Report Type: ${currentView}`, "", ""],
    // Empty row to separate the title section from the data
    ["", "", "", "", "", "", ""],
    // Column headers for the report
    ["DATE", "TICKET NAME", "ASSIGNED TO", "CLIENT", "DESCRIPTION"],
  ];

  // Add data rows using the filteredData array
  const dataValues = filteredData.map((entry) => [
    format(new Date(entry.assignDate), "dd-MMM-yyyy"),
    entry.ticketName || "",
    entry.userName || "",
    entry.clientName || "",
    entry.description || "",
  ]);

  // Update the spreadsheet with the header and data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `A1:G${headerValues.length + dataValues.length}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [...headerValues, ...dataValues],
    },
  });

  // Apply formatting to improve readability and attractiveness
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        // Title Formatting: Merge and color the title row
        {
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: 4,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: 4,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.12, green: 0.12, blue: 0.45 }, // Darker blue for the header
                textFormat: {
                  fontSize: 22,
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                },
                verticalAlignment: "MIDDLE",
                horizontalAlignment: "CENTER",
                padding: { top: 10, bottom: 10 },
                wrapStrategy: "WRAP",
              },
            },
            fields:
              "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment,padding,wrapStrategy)",
          },
        },
        // Address and other custom headers formatting
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 }, // Lighter background for other text
                textFormat: {
                  fontSize: 16,
                  bold: true,
                  foregroundColor: { red: 0, green: 0, blue: 0 },
                },
                verticalAlignment: "MIDDLE",
                horizontalAlignment: "LEFT",
                padding: { left: 15 },
              },
            },
            fields:
              "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment,padding)",
          },
        },
        // Column headers formatting
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 6,
              endRowIndex: 7,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.12, green: 0.29, blue: 0.49 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                  fontSize: 16,
                },
                verticalAlignment: "MIDDLE",
                horizontalAlignment: "CENTER",
                padding: { top: 5, bottom: 5 },
                wrapStrategy: "WRAP",
              },
            },
            fields:
              "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment,padding,wrapStrategy)",
          },
        },
        // Row formatting for task data with alternating row colors
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 7,
              endRowIndex: 7 + dataValues.length,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.97, green: 0.97, blue: 0.97 },
                verticalAlignment: "MIDDLE",
                horizontalAlignment: "LEFT",
                padding: { left: 5, right: 5 },
                wrapStrategy: "WRAP",
              },
            },
            fields:
              "userEnteredFormat(backgroundColor,verticalAlignment,horizontalAlignment,padding,wrapStrategy)",
          },
        },
        // Apply borders to the data section
        {
          updateBorders: {
            range: {
              sheetId,
              startRowIndex: 6,
              endRowIndex: 7 + dataValues.length,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            top: {
              style: "SOLID_MEDIUM",
              color: { red: 0.5, green: 0.5, blue: 0.5 },
            },
            bottom: {
              style: "SOLID_MEDIUM",
              color: { red: 0.5, green: 0.5, blue: 0.5 },
            },
            left: {
              style: "SOLID_MEDIUM",
              color: { red: 0.5, green: 0.5, blue: 0.5 },
            },
            right: {
              style: "SOLID_MEDIUM",
              color: { red: 0.5, green: 0.5, blue: 0.5 },
            },
            innerHorizontal: {
              style: "SOLID",
              color: { red: 0.8, green: 0.8, blue: 0.8 },
            },
            innerVertical: {
              style: "SOLID",
              color: { red: 0.8, green: 0.8, blue: 0.8 },
            },
          },
        },
        // Set column widths for better readability
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: 7,
            },
            properties: {
              pixelSize: 180, // Wider column for better readability
            },
            fields: "pixelSize",
          },
        },
      ],
    },
  });

  // Return the report URL, file name, and report number for storage
  return {
    spreadsheetId,
    spreadsheetUrl: spreadsheet.data.spreadsheetUrl!,
    fileName,
    reportNumber,
  };
};

export const generateInvoiceGoogleSheet = async ({
  sheets,
  filteredData,
  filter,
  session,
  currentView,
  userId,
  invoiceNumber,
}: GoogleSheetGeneratorParams) => {
  const title = `${userId}_${currentView}_report_${format(
    new Date(),
    "yyyy-MM-dd_HH-mm-ss"
  )}`;

  // Create new spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title,
        locale: "en_US",
      },
      sheets: [
        {
          properties: {
            title: "Work Entries",
            gridProperties: {
              rowCount: 1000,
              columnCount: 10,
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;
  const sheetId = spreadsheet.data.sheets![0].properties!.sheetId!;

  let currentRow = 1;
  const requests: sheets_v4.Schema$Request[] = [];

  // Company Header Section (only for admin users)
  if (session?.user?.role === "admin") {
    requests.push(
      // Company name and logo section
      {
        mergeCells: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 3,
            startColumnIndex: 0,
            endColumnIndex: 4,
          },
          mergeType: "MERGE_ALL",
        },
      },
      {
        updateCells: {
          rows: [
            {
              values: [
                {
                  userEnteredValue: { stringValue: "WARRINGTON\nINSTALLS" },
                  userEnteredFormat: {
                    textFormat: { fontSize: 36, bold: true },
                    verticalAlignment: "MIDDLE",
                    horizontalAlignment: "LEFT",
                  },
                },
              ],
            },
          ],
          fields:
            "userEnteredValue,userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment)",
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
        },
      },
      // Invoice number section
      {
        mergeCells: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 3,
            startColumnIndex: 4,
            endColumnIndex: 10,
          },
          mergeType: "MERGE_ALL",
        },
      },
      {
        updateCells: {
          rows: [
            {
              values: [
                {
                  userEnteredValue: {
                    stringValue: `INVOICE # ${invoiceNumber}`,
                  },
                  userEnteredFormat: {
                    textFormat: { fontSize: 36, bold: true },
                    verticalAlignment: "MIDDLE",
                    horizontalAlignment: "RIGHT",
                  },
                },
              ],
            },
          ],
          fields:
            "userEnteredValue,userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment)",
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 4,
            endColumnIndex: 5,
          },
        },
      }
    );

    currentRow += 3;

    // Company details
    requests.push(
      {
        mergeCells: {
          range: {
            sheetId,
            startRowIndex: currentRow,
            endRowIndex: currentRow + 4,
            startColumnIndex: 0,
            endColumnIndex: 4,
          },
          mergeType: "MERGE_ALL",
        },
      },
      {
        updateCells: {
          rows: [
            {
              values: [
                {
                  userEnteredValue: {
                    stringValue:
                      "165 Harborough Road\nKingsthorpe\nNorthampton\nNN2 8DL",
                  },
                  userEnteredFormat: {
                    textFormat: { fontSize: 14 },
                    verticalAlignment: "TOP",
                    horizontalAlignment: "LEFT",
                    wrapStrategy: "WRAP",
                  },
                },
              ],
            },
          ],
          fields:
            "userEnteredValue,userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment,wrapStrategy)",
          range: {
            sheetId,
            startRowIndex: currentRow,
            endRowIndex: currentRow + 1,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
        },
      },
      // Invoice details
      {
        mergeCells: {
          range: {
            sheetId,
            startRowIndex: currentRow,
            endRowIndex: currentRow + 4,
            startColumnIndex: 4,
            endColumnIndex: 10,
          },
          mergeType: "MERGE_ALL",
        },
      },
      {
        updateCells: {
          rows: [
            {
              values: [
                {
                  userEnteredValue: {
                    stringValue: `Invoice No: ${invoiceNumber}\nInvoice Date: ${format(
                      new Date(),
                      "dd/MM/yyyy"
                    )}\nCompany UTR: 42683 25579\nCompany No: 13607313`,
                  },
                  userEnteredFormat: {
                    textFormat: { fontSize: 14 },
                    verticalAlignment: "TOP",
                    horizontalAlignment: "RIGHT",
                    wrapStrategy: "WRAP",
                  },
                },
              ],
            },
          ],
          fields:
            "userEnteredValue,userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment,wrapStrategy)",
          range: {
            sheetId,
            startRowIndex: currentRow,
            endRowIndex: currentRow + 1,
            startColumnIndex: 4,
            endColumnIndex: 5,
          },
        },
      }
    );

    currentRow += 4;

    // Add separator line
    requests.push({
      updateBorders: {
        range: {
          sheetId,
          startRowIndex: currentRow,
          endRowIndex: currentRow + 1,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
        bottom: { style: "SOLID_THICK", color: { red: 0, green: 0, blue: 0 } },
      },
    });

    currentRow += 2; // Add spacing
  }

  // Work Entries Summary section
  requests.push(
    {
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: currentRow,
          endRowIndex: currentRow + 1,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
        mergeType: "MERGE_ALL",
      },
    },
    {
      updateCells: {
        rows: [
          {
            values: [
              {
                userEnteredValue: { stringValue: "WORK ENTRIES SUMMARY" },
                userEnteredFormat: {
                  textFormat: { fontSize: 18, bold: true },
                  verticalAlignment: "MIDDLE",
                  horizontalAlignment: "CENTER",
                  backgroundColor: { red: 1, green: 0.95, blue: 0.8 },
                },
              },
            ],
          },
        ],
        fields:
          "userEnteredValue,userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment,backgroundColor)",
        range: {
          sheetId,
          startRowIndex: currentRow,
          endRowIndex: currentRow + 1,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
      },
    }
  );

  currentRow += 1;

  // Add user info
  requests.push(
    {
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: currentRow,
          endRowIndex: currentRow + 1,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
        mergeType: "MERGE_ALL",
      },
    },
    {
      updateCells: {
        rows: [
          {
            values: [
              {
                userEnteredValue: {
                  stringValue: `${session?.user?.name?.toUpperCase() || ""}`,
                },
                userEnteredFormat: {
                  textFormat: { fontSize: 14, bold: true },
                  verticalAlignment: "MIDDLE",
                  horizontalAlignment: "CENTER",
                  backgroundColor: { red: 0.96, green: 0.96, blue: 0.96 },
                },
              },
            ],
          },
        ],
        fields:
          "userEnteredValue,userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment,backgroundColor)",
        range: {
          sheetId,
          startRowIndex: currentRow,
          endRowIndex: currentRow + 1,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
      },
    }
  );

  currentRow += 1;

  // Add date range info
  const startDate = filter?.startDate
    ? format(filter?.startDate, "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");
  const endDate = filter?.endDate
    ? format(filter?.endDate, "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");

  requests.push(
    {
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: currentRow,
          endRowIndex: currentRow + 1,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
        mergeType: "MERGE_ALL",
      },
    },
    {
      updateCells: {
        rows: [
          {
            values: [
              {
                userEnteredValue: {
                  stringValue: `Period: ${startDate} - ${endDate}`,
                },
                userEnteredFormat: {
                  textFormat: { fontSize: 12 },
                  verticalAlignment: "MIDDLE",
                  horizontalAlignment: "CENTER",
                },
              },
            ],
          },
        ],
        fields:
          "userEnteredValue,userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment)",
        range: {
          sheetId,
          startRowIndex: currentRow,
          endRowIndex: currentRow + 1,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
      },
    }
  );

  currentRow += 2; // Add spacing

  // Style headers
  const headerValues = [
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

  requests.push({
    updateCells: {
      rows: [
        {
          values: headerValues.map((header) => ({
            userEnteredValue: { stringValue: header },
            userEnteredFormat: {
              textFormat: {
                fontSize: 11,
                bold: true,
                foregroundColor: { red: 1, green: 1, blue: 1 },
              },
              verticalAlignment: "MIDDLE",
              horizontalAlignment: "CENTER",
              backgroundColor: { red: 0.12, green: 0.29, blue: 0.49 },
              borders: {
                top: { style: "SOLID" },
                bottom: { style: "SOLID" },
                left: { style: "SOLID" },
                right: { style: "SOLID" },
              },
            },
          })),
        },
      ],
      fields:
        "userEnteredValue,userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment,backgroundColor,borders)",
      range: {
        sheetId,
        startRowIndex: currentRow,
        endRowIndex: currentRow + 1,
        startColumnIndex: 0,
        endColumnIndex: 10,
      },
    },
  });

  currentRow += 1;

  // Add subheaders
  const subHeaderValues = [
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

  requests.push({
    updateCells: {
      rows: [
        {
          values: subHeaderValues.map((header) => ({
            userEnteredValue: { stringValue: header },
            userEnteredFormat: {
              textFormat: { fontSize: 10, bold: true },
              verticalAlignment: "MIDDLE",
              horizontalAlignment: "CENTER",
              backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
              borders: {
                top: { style: "SOLID" },
                bottom: { style: "SOLID" },
                left: { style: "SOLID" },
                right: { style: "SOLID" },
              },
            },
          })),
        },
      ],
      fields:
        "userEnteredValue,userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment,backgroundColor,borders)",
      range: {
        sheetId,
        startRowIndex: currentRow,
        endRowIndex: currentRow + 1,
        startColumnIndex: 0,
        endColumnIndex: 10,
      },
    },
  });

  currentRow += 1;

  // Merge header cells
  requests.push(
    {
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: currentRow - 2,
          endRowIndex: currentRow - 1,
          startColumnIndex: 4,
          endColumnIndex: 6,
        },
        mergeType: "MERGE_ALL",
      },
    },
    {
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: currentRow - 2,
          endRowIndex: currentRow - 1,
          startColumnIndex: 7,
          endColumnIndex: 9,
        },
        mergeType: "MERGE_ALL",
      },
    }
  );

  // Add data rows
  filteredData.forEach((entry, index) => {
    const rowData = [
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
    ];

    requests.push({
      updateCells: {
        rows: [
          {
            values: rowData.map((value, colIndex) => ({
              userEnteredValue:
                typeof value === "number"
                  ? { numberValue: value }
                  : { stringValue: value },
              userEnteredFormat: {
                numberFormat: [3, 5, 6, 8].includes(colIndex)
                  ? { type: "CURRENCY", pattern: "£#,##0.00" }
                  : undefined,
                horizontalAlignment: [3, 5, 6, 8].includes(colIndex)
                  ? "RIGHT"
                  : [4, 7].includes(colIndex)
                  ? "CENTER"
                  : "LEFT",
                verticalAlignment: "MIDDLE",
                backgroundColor:
                  index % 2 === 1
                    ? { red: 0.96, green: 0.96, blue: 0.96 }
                    : undefined,
                borders: {
                  top: { style: "SOLID" },
                  bottom: { style: "SOLID" },
                  left: { style: "SOLID" },
                  right: { style: "SOLID" },
                },
              },
            })),
          },
        ],
        fields:
          "userEnteredValue,userEnteredFormat(numberFormat,horizontalAlignment,verticalAlignment,backgroundColor,borders)",
        range: {
          sheetId,
          startRowIndex: currentRow,
          endRowIndex: currentRow + 1,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
      },
    });

    currentRow += 1;
  });

  // Add empty row
  currentRow += 1;

  // Calculate totals
  const safeGetNumber = (obj: any, path: string): number => {
    const value = path
      .split(".")
      .reduce(
        (o, key) => (o && o[key] !== undefined ? o[key] : undefined),
        obj
      );
    return typeof value === "number" ? value : 0;
  };

  const totals = {
    amount: filteredData.reduce(
      (sum, entry) => sum + safeGetNumber(entry, "totalAmount"),
      0
    ),
    mileage: filteredData.reduce(
      (sum, entry) => sum + safeGetNumber(entry, "mileage.amount"),
      0
    ),
    expenses: filteredData.reduce(
      (sum, entry) => sum + safeGetNumber(entry, "expenses.amount"),
      0
    ),
    overtime: filteredData.reduce(
      (sum, entry) => sum + safeGetNumber(entry, "overtime.amount"),
      0
    ),
  };

  const totalRow = [
    "TOTAL",
    "",
    "",
    totals.amount,
    "",
    totals.mileage,
    totals.expenses,
    "",
    totals.overtime,
    "",
  ];

  requests.push({
    updateCells: {
      rows: [
        {
          values: totalRow.map((value, colIndex) => ({
            userEnteredValue:
              typeof value === "number"
                ? { numberValue: value }
                : { stringValue: value },
            userEnteredFormat: {
              textFormat: { bold: true },
              numberFormat: [3, 5, 6, 8].includes(colIndex)
                ? { type: "CURRENCY", pattern: "£#,##0.00" }
                : undefined,
              horizontalAlignment: [3, 5, 6, 8].includes(colIndex)
                ? "RIGHT"
                : "LEFT",
              verticalAlignment: "MIDDLE",
              borders: {
                top: { style: "DOUBLE" },
                bottom: { style: "DOUBLE" },
              },
            },
          })),
        },
      ],
      fields:
        "userEnteredValue,userEnteredFormat(textFormat,numberFormat,horizontalAlignment,verticalAlignment,borders)",
      range: {
        sheetId,
        startRowIndex: currentRow,
        endRowIndex: currentRow + 1,
        startColumnIndex: 0,
        endColumnIndex: 10,
      },
    },
  });

  currentRow += 2; // Add spacing

  // Add calculation box
  const boxStartRow = currentRow;

  // Add calculation box title
  requests.push(
    {
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: currentRow,
          endRowIndex: currentRow + 1,
          startColumnIndex: 2,
          endColumnIndex: 4,
        },
        mergeType: "MERGE_ALL",
      },
    },
    {
      updateCells: {
        rows: [
          {
            values: [
              {
                userEnteredValue: { stringValue: "CALCULATION SUMMARY" },
                userEnteredFormat: {
                  textFormat: {
                    fontSize: 14,
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                  },
                  verticalAlignment: "MIDDLE",
                  horizontalAlignment: "CENTER",
                  backgroundColor: { red: 0.12, green: 0.29, blue: 0.49 },
                  borders: {
                    top: { style: "SOLID" },
                    bottom: { style: "SOLID" },
                    left: { style: "SOLID" },
                    right: { style: "SOLID" },
                  },
                },
              },
            ],
          },
        ],
        fields:
          "userEnteredValue,userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment,backgroundColor,borders)",
        range: {
          sheetId,
          startRowIndex: currentRow,
          endRowIndex: currentRow + 1,
          startColumnIndex: 2,
          endColumnIndex: 3,
        },
      },
    }
  );

  currentRow += 1;

  // Helper function for calculation rows
  const addCalculationRow = (
    label: string,
    amount: number,
    isTotal: boolean = false
  ) => {
    requests.push({
      updateCells: {
        rows: [
          {
            values: [
              {
                userEnteredValue: { stringValue: label },
                userEnteredFormat: {
                  textFormat: { fontSize: 11, bold: true },
                  horizontalAlignment: "RIGHT",
                  verticalAlignment: "MIDDLE",
                  borders: {
                    left: { style: "SOLID" },
                    right: { style: "SOLID" },
                  },
                  backgroundColor: isTotal
                    ? { red: 1, green: 0.95, blue: 0.8 }
                    : undefined,
                },
              },
              {
                userEnteredValue: { numberValue: amount },
                userEnteredFormat: {
                  numberFormat: { type: "CURRENCY", pattern: "£#,##0.00" },
                  textFormat: { fontSize: 11, bold: true },
                  horizontalAlignment: "RIGHT",
                  verticalAlignment: "MIDDLE",
                  borders: {
                    left: { style: "SOLID" },
                    right: { style: "SOLID" },
                  },
                  backgroundColor: isTotal
                    ? { red: 1, green: 0.95, blue: 0.8 }
                    : undefined,
                },
              },
            ],
          },
        ],
        fields:
          "userEnteredValue,userEnteredFormat(numberFormat,textFormat,horizontalAlignment,verticalAlignment,borders,backgroundColor)",
        range: {
          sheetId,
          startRowIndex: currentRow,
          endRowIndex: currentRow + 1,
          startColumnIndex: 2,
          endColumnIndex: 4,
        },
      },
    });

    if (isTotal) {
      requests.push({
        updateBorders: {
          range: {
            sheetId,
            startRowIndex: currentRow,
            endRowIndex: currentRow + 1,
            startColumnIndex: 2,
            endColumnIndex: 4,
          },
          top: { style: "DOUBLE" },
          bottom: { style: "DOUBLE" },
        },
      });
    }

    currentRow += 1;
  };

  // Add individual totals
  addCalculationRow("Amount Total:", totals.amount);
  addCalculationRow("Mileage Total:", totals.mileage);
  addCalculationRow("Expenses Total:", totals.expenses);
  addCalculationRow("Overtime Total:", totals.overtime);

  // Add empty row for spacing
  currentRow += 1;

  // Calculate grand total
  const grandTotal =
    totals.amount + totals.mileage + totals.expenses + totals.overtime;

  // Add grand total and tax calculations
  addCalculationRow("TOTAL:", grandTotal, true);
  addCalculationRow("CIS Deduction (20%):", grandTotal * 0.2);
  addCalculationRow("TOTAL AFTER CIS:", grandTotal * 0.8, true);

  // Style the entire calculation box
  requests.push({
    updateBorders: {
      range: {
        sheetId,
        startRowIndex: boxStartRow,
        endRowIndex: currentRow,
        startColumnIndex: 2,
        endColumnIndex: 4,
      },
      left: { style: "SOLID" },
      right: { style: "SOLID" },
      bottom: { style: "SOLID" },
    },
  });

  // Apply all formatting
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  return {
    spreadsheetId,
    spreadsheetUrl: spreadsheet.data.spreadsheetUrl!,
  };
};
