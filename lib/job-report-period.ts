import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

export type JobReportPeriodType =
  | "all"
  | "day"
  | "week"
  | "month"
  | "year"
  | "custom";

export interface JobReportPeriodValues {
  day: string;
  weekDay: string;
  month: string;
  year: string;
  customStart: string;
  customEnd: string;
}

export interface ResolvedJobReportPeriod {
  startDate?: Date;
  endDate?: Date;
  startDateKey?: string;
  endDateKey?: string;
  label: string;
  fileLabel: string;
}

function parseInputDate(value: string): Date | null {
  if (!value) return null;

  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : null;
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function rangeLabel(start: Date, end: Date): string {
  if (dateKey(start) === dateKey(end)) {
    return format(start, "d MMMM yyyy");
  }

  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, "d")}–${format(end, "d MMMM yyyy")}`;
    }

    return `${format(start, "d MMMM")}–${format(end, "d MMMM yyyy")}`;
  }

  return `${format(start, "d MMMM yyyy")}–${format(
    end,
    "d MMMM yyyy"
  )}`;
}

function resolvedRange(
  startDate: Date,
  endDate: Date,
  label = rangeLabel(startDate, endDate)
): ResolvedJobReportPeriod {
  return {
    startDate,
    endDate,
    startDateKey: dateKey(startDate),
    endDateKey: dateKey(endDate),
    label,
    fileLabel: `${dateKey(startDate)}-to-${dateKey(endDate)}`,
  };
}

export function defaultJobReportPeriodValues(
  today = new Date()
): JobReportPeriodValues {
  const todayKey = dateKey(today);

  return {
    day: todayKey,
    weekDay: todayKey,
    month: format(today, "yyyy-MM"),
    year: format(today, "yyyy"),
    customStart: todayKey,
    customEnd: todayKey,
  };
}

export function resolveJobReportPeriod(
  type: JobReportPeriodType,
  values: JobReportPeriodValues
): ResolvedJobReportPeriod {
  if (type === "all") {
    return {
      label: "All orders",
      fileLabel: "all-orders",
    };
  }

  if (type === "day") {
    const selectedDay = parseInputDate(values.day);
    if (!selectedDay) throw new Error("Please select a valid day");
    return resolvedRange(selectedDay, selectedDay);
  }

  if (type === "week") {
    const selectedDay = parseInputDate(values.weekDay);
    if (!selectedDay) throw new Error("Please select a day within the week");

    const startDate = startOfWeek(selectedDay, { weekStartsOn: 1 });
    const endDate = endOfWeek(selectedDay, { weekStartsOn: 1 });
    return resolvedRange(startDate, endDate);
  }

  if (type === "month") {
    const selectedMonth = parse(
      `${values.month}-01`,
      "yyyy-MM-dd",
      new Date()
    );

    if (!values.month || !isValid(selectedMonth)) {
      throw new Error("Please select a valid month");
    }

    return resolvedRange(
      startOfMonth(selectedMonth),
      endOfMonth(selectedMonth),
      format(selectedMonth, "MMMM yyyy")
    );
  }

  if (type === "year") {
    const year = Number.parseInt(values.year, 10);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error("Please enter a year between 2000 and 2100");
    }

    const selectedYear = new Date(year, 0, 1);
    return resolvedRange(
      startOfYear(selectedYear),
      endOfYear(selectedYear),
      String(year)
    );
  }

  const customStart = parseInputDate(values.customStart);
  const customEnd = parseInputDate(values.customEnd);

  if (!customStart || !customEnd) {
    throw new Error("Please select both custom dates");
  }

  if (customStart.getTime() > customEnd.getTime()) {
    throw new Error("The start date must be before the end date");
  }

  return resolvedRange(customStart, customEnd);
}

