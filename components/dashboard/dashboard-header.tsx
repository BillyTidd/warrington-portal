"use client";
import { Button } from "@/components/ui/button";
import type { DateRange } from "react-day-picker";
import { Download, Filter, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange || (() => {})}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
        />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("mr-2 h-3.5 w-3.5", isLoading && "animate-spin")}
            />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-3.5 w-3.5" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>By Employee</DropdownMenuItem>
              <DropdownMenuItem>By Client</DropdownMenuItem>
              <DropdownMenuItem>By Amount</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Download className="mr-2 h-3.5 w-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>PDF Report</DropdownMenuItem>
              <DropdownMenuItem>Excel Spreadsheet</DropdownMenuItem>
              <DropdownMenuItem>CSV Data</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
import { DateRangePicker } from "./date-range-picket";
