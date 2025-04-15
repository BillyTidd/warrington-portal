import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subDays,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
  startOfDay,
  endOfDay,
  parseISO,
  isValid,
} from "date-fns";

/**
 * Calculate date ranges based on timeframe
 */
export function calculateDateRange(
  timeframe: string,
  customStartDate?: string,
  customEndDate?: string
) {
  const now = new Date();
  let startDate: Date;
  let endDate = now;

  if (customStartDate && customEndDate) {
    // Custom date range - ensure we parse ISO strings correctly
    try {
      startDate = parseISO(customStartDate);
      endDate = parseISO(customEndDate);

      // Validate dates
      if (!isValid(startDate) || !isValid(endDate)) {
        throw new Error("Invalid date format");
      }

      // Ensure start of day for start date and end of day for end date
      startDate = startOfDay(startDate);
      endDate = endOfDay(endDate);
    } catch (error) {
      console.error("Error parsing custom dates:", error);
      // Fallback to current month if date parsing fails
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }
  } else {
    // Predefined timeframes
    switch (timeframe) {
      case "week":
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "quarter":
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case "year":
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case "last30":
        startDate = startOfDay(subDays(now, 30));
        endDate = endOfDay(now);
        break;
      case "last90":
        startDate = startOfDay(subDays(now, 90));
        endDate = endOfDay(now);
        break;
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case "yesterday":
        const yesterday = subDays(now, 1);
        startDate = startOfDay(yesterday);
        endDate = endOfDay(yesterday);
        break;
      case "thisMonth":
        startDate = startOfMonth(now);
        endDate = endOfDay(now);
        break;
      case "lastMonth":
        startDate = startOfMonth(subDays(startOfMonth(now), 1));
        endDate = endOfMonth(subDays(startOfMonth(now), 1));
        break;
      case "thisYear":
        startDate = startOfYear(now);
        endDate = endOfDay(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }
  }

  return { startDate, endDate };
}

/**
 * Calculate previous period date range
 */
export function calculatePreviousPeriod(
  currentStartDate: Date,
  currentEndDate: Date
) {
  // Calculate previous period of same length
  const rangeDuration = currentEndDate.getTime() - currentStartDate.getTime();
  const previousEndDate = new Date(currentStartDate.getTime() - 1); // 1ms before current start
  const previousStartDate = new Date(previousEndDate.getTime() - rangeDuration);

  return { previousStartDate, previousEndDate };
}

/**
 * Calculate date range for a specific year
 */
export function calculateYearRange(year: string) {
  const yearNum = Number.parseInt(year);
  const startDate = startOfYear(new Date(yearNum, 0, 1));
  const endDate = endOfYear(new Date(yearNum, 0, 1));

  return { startDate, endDate };
}

/**
 * Format date for API requests
 * @param date Date to format
 * @returns ISO string with timezone handling
 */
export function formatDateForApi(date: Date): string {
  return date.toISOString();
}

/**
 * Safely parse date string from API
 * @param dateString Date string from API
 * @returns Valid Date object or current date if invalid
 */
export function parseDateFromApi(dateString: string): Date {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : new Date();
  } catch (error) {
    console.error("Error parsing date from API:", error);
    return new Date();
  }
}
