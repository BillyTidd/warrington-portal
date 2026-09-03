export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;

const allowedFiles: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel"],
};

export function validateJobDocument(
  fileName: string,
  mimeType: string,
  size: number
) {
  if (!fileName || !mimeType || !Number.isFinite(size)) {
    return "Invalid file information";
  }

  if (size <= 0 || size > MAX_DOCUMENT_SIZE) {
    return "Each file must be 25 MB or smaller";
  }

  const extension = fileName.split(".").pop()?.toLowerCase();

  if (!extension || !allowedFiles[extension]) {
    return "Only PDF, PNG, JPG, XLSX and CSV files are supported";
  }

  if (!allowedFiles[extension].includes(mimeType)) {
    return "The file extension does not match its content type";
  }

  return null;
}