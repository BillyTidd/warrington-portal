"use client";
import { startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DatePickerWithRangeProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  timeframe: string;
  onTimeframeChange: (value: string) => void;
  onApply?: () => void;
  className?: string;
}

export function DatePickerWithRange({
  dateRange,
  onDateRangeChange,
  timeframe,
  onTimeframeChange,
  onApply,
  className,
}: DatePickerWithRangeProps) {
  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    onTimeframeChange(value);

    // For preset timeframes, calculate the date range
    const now = new Date();
    let from, to;

    switch (value) {
      case "today":
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        from = startOfDay(yesterday);
        to = endOfDay(yesterday);
        break;
      case "last7":
        to = endOfDay(now);
        from = startOfDay(new Date(now));
        from.setDate(from.getDate() - 6);
        break;
      case "last30":
        to = endOfDay(now);
        from = startOfDay(new Date(now));
        from.setDate(from.getDate() - 29);
        break;
      case "thisMonth":
        from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        to = endOfDay(now);
        break;
      case "lastMonth":
        from = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case "thisQuarter":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        from = startOfDay(new Date(now.getFullYear(), currentQuarter * 3, 1));
        to = endOfDay(now);
        break;
      case "thisYear":
        from = startOfDay(new Date(now.getFullYear(), 0, 1));
        to = endOfDay(now);
        break;
      case "lastYear":
        from = startOfDay(new Date(now.getFullYear() - 1, 0, 1));
        to = endOfDay(new Date(now.getFullYear() - 1, 11, 31));
        break;
      default:
        from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        to = endOfDay(now);
    }

    // Update the date range
    onDateRangeChange({ from, to });

    // Call the apply function if provided
    if (onApply) {
      setTimeout(() => {
        onApply();
      }, 150);
    }
  };

  // Get display text based on timeframe
  const getTimeframeDisplayText = () => {
    switch (timeframe) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "last7":
        return "Last 7 days";
      case "last30":
        return "Last 30 days";
      case "thisMonth":
        return "This month";
      case "month":
        return "This month";
      case "lastMonth":
        return "Last month";
      case "thisQuarter":
        return "This quarter";
      case "quarter":
        return "This quarter";
      case "thisYear":
        return "This year";
      case "year":
        return "This year";
      case "lastYear":
        return "Last year";
      default:
        return "Select time period";
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-[200px] justify-between border px-3 text-left font-normal"
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 opacity-70" />
              <span className="truncate font-medium">
                {getTimeframeDisplayText()}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuItem
            onClick={() => handleTimeframeChange("today")}
            className={timeframe === "today" ? "bg-primary/10 font-medium" : ""}
          >
            Today
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTimeframeChange("yesterday")}
            className={
              timeframe === "yesterday" ? "bg-primary/10 font-medium" : ""
            }
          >
            Yesterday
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTimeframeChange("last7")}
            className={timeframe === "last7" ? "bg-primary/10 font-medium" : ""}
          >
            Last 7 days
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTimeframeChange("last30")}
            className={
              timeframe === "last30" ? "bg-primary/10 font-medium" : ""
            }
          >
            Last 30 days
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTimeframeChange("thisMonth")}
            className={
              timeframe === "thisMonth" || timeframe === "month"
                ? "bg-primary/10 font-medium"
                : ""
            }
          >
            This month
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTimeframeChange("lastMonth")}
            className={
              timeframe === "lastMonth" ? "bg-primary/10 font-medium" : ""
            }
          >
            Last month
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTimeframeChange("thisQuarter")}
            className={
              timeframe === "thisQuarter" || timeframe === "quarter"
                ? "bg-primary/10 font-medium"
                : ""
            }
          >
            This quarter
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTimeframeChange("thisYear")}
            className={
              timeframe === "thisYear" || timeframe === "year"
                ? "bg-primary/10 font-medium"
                : ""
            }
          >
            This year
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTimeframeChange("lastYear")}
            className={
              timeframe === "lastYear" ? "bg-primary/10 font-medium" : ""
            }
          >
            Last year
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
