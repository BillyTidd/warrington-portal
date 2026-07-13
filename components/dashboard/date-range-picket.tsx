"use client";

import { useState, useEffect, useRef } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTriggerRef = useRef<HTMLButtonElement>(null);
  const lastSelectedRef = useRef<DateRange | undefined>();

  // Set default date range to current month if not provided
  useEffect(() => {
    if (!dateRange && timeframe === "month") {
      const now = new Date();
      const firstDayOfMonth = startOfMonth(now);
      const lastDayOfMonth = endOfMonth(now);
      onDateRangeChange({
        from: firstDayOfMonth,
        to: lastDayOfMonth,
      });
    }
  }, [dateRange, timeframe, onDateRangeChange]);

  // Reset custom range when timeframe changes
  useEffect(() => {
    if (timeframe !== "custom" && isCustomRange) {
      setIsCustomRange(false);
      setIsPopoverOpen(false);
    }
  }, [timeframe, isCustomRange]);

  // Auto-open popover when custom is selected
  useEffect(() => {
    if (timeframe === "custom" && !isPopoverOpen) {
      setIsCustomRange(true);
      // Small delay to ensure the DOM is ready
      setTimeout(() => {
        setIsPopoverOpen(true);
        if (popoverTriggerRef.current) {
          popoverTriggerRef.current.click();
        }
      }, 100);
    }
  }, [timeframe, isPopoverOpen]);

  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    if (value === "custom") {
      setIsCustomRange(true);
      onTimeframeChange(value);
      // Auto-open the date picker when custom is selected
      setTimeout(() => {
        setIsPopoverOpen(true);
        if (popoverTriggerRef.current) {
          popoverTriggerRef.current.click();
        }
      }, 100);
    } else {
      setIsCustomRange(false);
      setIsPopoverOpen(false);
      onTimeframeChange(value);
    }
  };

  // Handle date range selection
  const handleDateRangeChange = (range: DateRange | undefined) => {
    // Store the last selected range
    lastSelectedRef.current = range;

    // Update the date range
    onDateRangeChange(range);

    // If both from and to dates are selected, close the popover
    if (
      range?.from &&
      range?.to &&
      lastSelectedRef.current?.from &&
      lastSelectedRef.current?.to
    ) {
      onTimeframeChange("custom");
      setIsCustomRange(true);

      // Close the popover after a short delay to allow the UI to update
      setTimeout(() => {
        setIsPopoverOpen(false);
      }, 300);
    }
  };

  return (
    <Card className={cn("border-none shadow-none", className)}>
      <CardContent className="flex items-center flex-wrap gap-2 p-2">
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

        {(isCustomRange || timeframe === "custom") && (
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                ref={popoverTriggerRef}
                variant="outline"
                className={cn(
                  "h-8 justify-start border-dashed text-sm font-normal",
                  !dateRange && "text-muted-foreground",
                  timeframe === "custom" && "border-primary/50 bg-primary/10"
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
                defaultMonth={dateRange?.from || new Date()}
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
