"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  timeframe: string;
  onTimeframeChange: (value: string) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  timeframe,
  onTimeframeChange,
  className,
}: DateRangePickerProps) {
  const [isCustomRange, setIsCustomRange] = useState(false);

  // Reset custom range when timeframe changes
  useEffect(() => {
    if (timeframe !== "custom" && isCustomRange) {
      setIsCustomRange(false);
    }
  }, [timeframe, isCustomRange]);

  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    if (value === "custom") {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
      onTimeframeChange(value);
    }
  };

  // Handle date range selection
  const handleDateRangeChange = (range: DateRange | undefined) => {
    onDateRangeChange(range);
    if (range?.from && range?.to) {
      onTimeframeChange("custom");
    }
  };

  return (
    <Card className={cn("border-none shadow-none", className)}>
      <CardContent className="flex items-center gap-2 p-2">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <Select value={timeframe} onValueChange={handleTimeframeChange}>
          <SelectTrigger className="h-8 w-[180px] border-none bg-transparent px-2 shadow-none">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="last30">Last 30 Days</SelectItem>
            <SelectItem value="last90">Last 90 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {isCustomRange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 justify-start border-dashed text-sm font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}
      </CardContent>
    </Card>
  );
}
