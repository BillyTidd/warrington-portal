"use client";

import { Button } from "@/components/ui/button";
import type { DateRange } from "react-day-picker";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePickerWithRange } from "@/components/dashboard/date-picker-with-range";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  timeframe: string;
  onTimeframeChange: (value: string) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function DashboardHeader({
  title,
  description,
  timeframe,
  onTimeframeChange,
  dateRange,
  onDateRangeChange,
  onRefresh,
  isLoading = false,
}: DashboardHeaderProps) {
  // Function to handle date range apply
  const handleDateRangeApply = () => {
    // Trigger refresh when date range is applied
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DatePickerWithRange
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange || (() => {})}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
          onApply={handleDateRangeApply}
        />

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 w-9"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>
    </div>
  );
}
