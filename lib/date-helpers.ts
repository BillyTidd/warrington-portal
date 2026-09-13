import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
} from "date-fns";

export type DashboardTimeframe =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "last90"
  | "thisMonth"
  | "lastMonth"
  | "thisQuarter"
  | "thisYear"
  | "lastYear"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";

export function calculateDateRange(
  timeframe: string,
  customStartDate?: string | null,
  customEndDate?: string | null
) {
  const now = new Date();

  if (customStartDate && customEndDate) {
    const parsedStart = parseISO(customStartDate);
    const parsedEnd = parseISO(customEndDate);

    if (!isValid(parsedStart) || !isValid(parsedEnd)) {
      throw new Error("Invalid custom date range");
    }

    const startDate = startOfDay(parsedStart);
    const endDate = endOfDay(parsedEnd);

    if (startDate > endDate) {
      throw new Error("The start date must be before the end date");
    }

    return { startDate, endDate };
  }

  switch (timeframe) {
    case "today":
      return { startDate: startOfDay(now), endDate: endOfDay(now) };

    case "yesterday": {
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
      };
    }

    case "last7":
    case "week":
      return {
        startDate: startOfDay(subDays(now, 6)),
        endDate: endOfDay(now),
      };

    case "last30":
      return {
        startDate: startOfDay(subDays(now, 29)),
        endDate: endOfDay(now),
      };

    case "last90":
      return {
        startDate: startOfDay(subDays(now, 89)),
        endDate: endOfDay(now),
      };

    case "lastMonth": {
      const previousMonth = subDays(startOfMonth(now), 1);
      return {
        startDate: startOfMonth(previousMonth),
        endDate: endOfMonth(previousMonth),
      };
    }

    case "thisQuarter":
    case "quarter":
      return {
        startDate: startOfQuarter(now),
        endDate: endOfDay(now),
      };

    case "thisYear":
    case "year":
      return {
        startDate: startOfYear(now),
        endDate: endOfDay(now),
      };

    case "lastYear": {
      const previousYear = new Date(now.getFullYear() - 1, 0, 1);
      return {
        startDate: startOfYear(previousYear),
        endDate: endOfYear(previousYear),
      };
    }

    case "thisMonth":
    case "month":
    default:
      return {
        startDate: startOfMonth(now),
        endDate: endOfDay(now),
      };
  }
}

export function calculatePreviousPeriod(
  currentStartDate: Date,
  currentEndDate: Date
) {
  const numberOfDays =
    differenceInCalendarDays(currentEndDate, currentStartDate) + 1;
  const previousEndDate = endOfDay(subDays(currentStartDate, 1));
  const previousStartDate = startOfDay(
    subDays(previousEndDate, numberOfDays - 1)
  );

  return { previousStartDate, previousEndDate };
}

export function calculateYearRange(year: string) {
  const parsedYear = Number.parseInt(year, 10);

  if (!Number.isInteger(parsedYear)) {
    throw new Error("Invalid year");
  }

  const yearDate = new Date(parsedYear, 0, 1);
  return {
    startDate: startOfYear(yearDate),
    endDate: endOfYear(yearDate),
  };
}

// Entry documents currently store dates as strings such as 2026-09-13.
// Dashboard entry queries must use that same representation.
export function formatDateForApi(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDateFromApi(dateString: string): Date {
  const parsedDate = parseISO(dateString);
  return isValid(parsedDate) ? parsedDate : new Date();
}
