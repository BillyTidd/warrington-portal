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
  const reportNumber = String(Math.floor(Math.random() * 9999)).padStart(4, "0"); // Unique report number
  const fileName = `${session?.user?.name || "User"}_${currentView}_report_${reportNumber}_${timestamp}`;

  // Create new spreadsheet with the improved filename
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: fileName, // Use the new user-friendly filename
        locale: "en_US",
      },
      sheets: [{
        properties: {
          title: "Tasks Report",
          gridProperties: {
            rowCount: 1000,
            columnCount: 7, // 7 columns for report data and additional columns
          },
        },
      }],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;
  const sheetId = spreadsheet.data.sheets![0].properties!.sheetId!;

  // Prepare the header values for the report (adding the report number)
  const headerValues = [
    // First Header - Report title with report number
    ["WARRINGTON INSTALLS", "", "", "", "REPORT #", reportNumber, ""],
    // Second Header - Report address and admin info
    ["Address", "", "", "", `Report by: ${session?.user?.name || "Admin"}`, "", ""],
    // Third Header - Report date
    ["Date: " + format(new Date(), "dd/MM/yyyy"), "", "", "", "", "", ""],
    // Fourth Header - Generation info
    ["", "", "", "", `Generated on: ${format(new Date(), "dd/MM/yyyy")}`, "", ""],
    // Fifth Header - Report type (current view)
    ["", "", "", "", `Report Type: ${currentView}`, "", ""],
    // Empty row to separate the title section from the data
    ["", "", "", "", "", "", ""],
    // Column headers for the report
    ["DATE", "TICKET NAME", "ASSIGNED TO", "CLIENT", "DESCRIPTION"],
  ];

  // Add data rows using the filteredData array
  const dataValues = filteredData.map(entry => [
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
            fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment,padding,wrapStrategy)",
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
            fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment,padding)",
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
            fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment,padding,wrapStrategy)",
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
            fields: "userEnteredFormat(backgroundColor,verticalAlignment,horizontalAlignment,padding,wrapStrategy)",
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
            top: { style: "SOLID_MEDIUM", color: { red: 0.5, green: 0.5, blue: 0.5 } },
            bottom: { style: "SOLID_MEDIUM", color: { red: 0.5, green: 0.5, blue: 0.5 } },
            left: { style: "SOLID_MEDIUM", color: { red: 0.5, green: 0.5, blue: 0.5 } },
            right: { style: "SOLID_MEDIUM", color: { red: 0.5, green: 0.5, blue: 0.5 } },
            innerHorizontal: { style: "SOLID", color: { red: 0.8, green: 0.8, blue: 0.8 } },
            innerVertical: { style: "SOLID", color: { red: 0.8, green: 0.8, blue: 0.8 } },
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
