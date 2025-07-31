"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  parseISO,
  addDays,
  getDay,
  isToday,
  isBefore,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  getHours,
  setHours,
  formatISO,
  isSameDay,
} from "date-fns";
import type { Job } from "@/types/job";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CircleDollarSign,
  User2,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarIcon,
  CalendarRange,
  Briefcase,
  ArrowLeft,
  ArrowRight,
  Calendar,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface CalendarViewProps {
  jobs: any[];
  currentDate: Date;
  onViewDetails: (job: Job) => void;
  onNewJob: (date?: string) => void;
  onNavigate: (direction: "prev" | "next") => void;
  setCurrentDate: (date: Date) => void;
}

export function CalendarView({
  jobs,
  currentDate,
  onViewDetails,
  onNewJob,
  onNavigate,
  setCurrentDate,
}: CalendarViewProps) {
  const [displayMode, setDisplayMode] = useState<"assign" | "expire">("assign");
  const [viewType, setViewType] = useState<"month" | "week" | "day">("month");
  const [hoveredHour, setHoveredHour] = useState<string | null>(null);

  // Navigate based on view type
  const handleNavigate = (direction: "prev" | "next") => {
    if (viewType === "month") {
      setCurrentDate(
        direction === "prev"
          ? subMonths(currentDate, 1)
          : addMonths(currentDate, 1)
      );
    } else if (viewType === "week") {
      setCurrentDate(
        direction === "prev"
          ? subWeeks(currentDate, 1)
          : addWeeks(currentDate, 1)
      );
    } else if (viewType === "day") {
      setCurrentDate(
        direction === "prev"
          ? addDays(currentDate, -1)
          : addDays(currentDate, 1)
      );
    }
  };

  // Calculate the days to display in the month view
  const monthViewDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Calculate the starting weekday (0 = Sunday, 1 = Monday, etc.)
    const startDay = getDay(monthStart);

    // Add days from previous month to fill the first week
    const previousDays = Array.from({ length: startDay }, (_, i) => {
      return addDays(monthStart, -i - 1);
    }).reverse();

    // Calculate how many days we need after the month to complete a grid
    // (we want a total of 6 rows of 7 days each = 42 days)
    const totalDaysNeeded = 42;
    const daysAfterMonth = totalDaysNeeded - days.length - previousDays.length;

    // Add days from the next month
    const nextDays = Array.from({ length: daysAfterMonth }, (_, i) => {
      return addDays(monthEnd, i + 1);
    });

    return [...previousDays, ...days, ...nextDays];
  }, [currentDate]);

  // Calculate the days to display in the week view
  const weekViewDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Calculate the hours to display in the day view
  const dayViewHours = useMemo(() => {
    const dayStart = startOfDay(currentDate);
    const dayEnd = endOfDay(currentDate);
    return eachHourOfInterval({ start: dayStart, end: dayEnd });
  }, [currentDate]);

  // Group jobs by date
  const jobsByDate = useMemo(() => {
    const byDate: Record<string, any[]> = {};

    jobs.forEach((job: any) => {
      // Use either the assign date or expire date based on display mode
      const dateKey =
        displayMode === "assign" ? job.assignDate : job.expireDate;
      const formattedDate = format(parseISO(dateKey), "yyyy-MM-dd");

      if (!byDate[formattedDate]) {
        byDate[formattedDate] = [];
      }

      byDate[formattedDate].push(job);
    });

    return byDate;
  }, [jobs, displayMode]);

  // Group jobs by hour for day view
  const jobsByHour = useMemo(() => {
    const byHour: Record<string, any[]> = {};

    if (viewType !== "day") return byHour;

    const currentDateStr = format(currentDate, "yyyy-MM-dd");

    jobs.forEach((job) => {
      const dateKey =
        displayMode === "assign" ? job.assignDate : job.expireDate;
      const jobDate = parseISO(dateKey);
      const jobDateStr = format(jobDate, "yyyy-MM-dd");

      if (jobDateStr === currentDateStr) {
        // Default to 9 AM if no specific time
        const hour = format(jobDate, "HH");
        const hourKey = `${currentDateStr}-${hour}`;

        if (!byHour[hourKey]) {
          byHour[hourKey] = [];
        }

        byHour[hourKey].push(job);
      }
    });

    return byHour;
  }, [jobs, displayMode, currentDate, viewType]);

  // Handle creating a new job from calendar
  const handleCreateJob = (date: Date) => {
    const formattedDate = formatISO(date, { representation: "date" });
    onNewJob(formattedDate);
  };

  // Get job status color class
  const getJobStatusClass = (job: any) => {
    if (job.status === "completed") {
      return "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900/20";
    }
    if (job.status === "in-progress") {
      return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/20";
    }
    if (
      isBefore(parseISO(job.expireDate), new Date()) &&
      job.status !== "completed"
    ) {
      return "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm shadow-red-200 dark:shadow-red-900/20";
    }
    return "bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm shadow-amber-200 dark:shadow-amber-900/20";
  };

  // Get job status icon
  const getJobStatusIcon = (job: any) => {
    if (job.status === "completed") {
      return <CheckCircle2 className="h-3 w-3 mr-1 flex-shrink-0" />;
    }
    if (job.status === "in-progress") {
      return <Clock3 className="h-3 w-3 mr-1 flex-shrink-0" />;
    }
    if (
      isBefore(parseISO(job.expireDate), new Date()) &&
      job.status !== "completed"
    ) {
      return <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0" />;
    }
    return <Clock className="h-3 w-3 mr-1 flex-shrink-0" />;
  };

  // Get current time indicator position for week view
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return (hours + minutes / 60) * 14; // 14px is the height of one hour
  };

  return (
    <Card className="bg-background rounded-lg shadow-lg border-0">
      <div className="p-4 border-b bg-gradient-to-r from-violet-600/90 to-purple-600/90 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              {viewType === "month" ? (
                <CalendarRange className="h-5 w-5" />
              ) : viewType === "week" ? (
                <CalendarDays className="h-5 w-5" />
              ) : (
                <CalendarIcon className="h-5 w-5" />
              )}
            </div>
            <h3 className="text-lg font-medium">
              {viewType === "day"
                ? format(currentDate, "MMMM d, yyyy")
                : viewType === "week"
                ? `${format(weekViewDays[0], "MMM d")} - ${format(
                    weekViewDays[6],
                    "MMM d, yyyy"
                  )}`
                : format(currentDate, "MMMM yyyy")}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleNavigate("prev")}
              className="bg-white/10 border-none text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="bg-white/10 border-none text-white hover:bg-white/20"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleNavigate("next")}
              className="bg-white/10 border-none text-white hover:bg-white/20"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex space-x-2">
            <Tabs
              value={viewType}
              onValueChange={(v) => setViewType(v as "month" | "week" | "day")}
              className="bg-white/10 rounded-lg p-1"
            >
              <TabsList className="bg-transparent">
                <TabsTrigger
                  value="month"
                  className="data-[state=active]:bg-white data-[state=active]:text-violet-600 text-white"
                >
                  Month
                </TabsTrigger>
                <TabsTrigger
                  value="week"
                  className="data-[state=active]:bg-white data-[state=active]:text-violet-600 text-white"
                >
                  Week
                </TabsTrigger>
                <TabsTrigger
                  value="day"
                  className="data-[state=active]:bg-white data-[state=active]:text-violet-600 text-white"
                >
                  Day
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex space-x-2">
            <Button
              variant={displayMode === "assign" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setDisplayMode("assign")}
              className={
                displayMode === "assign"
                  ? "bg-white text-violet-600"
                  : "bg-white/10 border-none text-white"
              }
            >
              Start Dates
            </Button>
            <Button
              variant={displayMode === "expire" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setDisplayMode("expire")}
              className={
                displayMode === "expire"
                  ? "bg-white text-violet-600"
                  : "bg-white/10 border-none text-white"
              }
            >
              Due Dates
            </Button>
          </div>
        </div>
      </div>

      {/* Month View */}
      {viewType === "month" && (
        <div className="p-4">
          {/* Days of the week header */}
          <div className="grid grid-cols-7 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="px-2 py-3 text-center text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-900/20 rounded-md mx-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {monthViewDays.map((date, i) => {
              const dateKey = format(date, "yyyy-MM-dd");
              const dayJobs = jobsByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(date, currentDate);
              const dayNumber = format(date, "d");

              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[120px] p-2 border rounded-lg relative group transition-all hover:shadow-md",
                    !isCurrentMonth && "bg-muted/30 opacity-50",
                    isToday(date) &&
                      "border-violet-500 bg-violet-50/50 dark:bg-violet-950/20 ring-1 ring-violet-500/50"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div
                      className={cn(
                        "text-center font-medium text-sm p-1 h-7 w-7 rounded-full flex items-center justify-center",
                        isToday(date) && "bg-violet-500 text-white"
                      )}
                    >
                      {dayNumber}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-800"
                      onClick={() => handleCreateJob(date)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    {dayJobs.length > 0
                      ? dayJobs.slice(0, 3).map((job) => (
                          <TooltipProvider key={job._id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => onViewDetails(job)}
                                  className={cn(
                                    "w-full text-left text-xs p-1.5 rounded-md truncate block transition-all hover:translate-x-0.5 hover:translate-y-[-1px]",
                                    getJobStatusClass(job)
                                  )}
                                >
                                  <div className="flex items-center">
                                    {getJobStatusIcon(job)}
                                    <span className="truncate font-medium">
                                      {job.jobName}
                                    </span>
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-xs bg-white dark:bg-gray-800 p-3 shadow-xl"
                              >
                                <div className="space-y-2">
                                  <p className="font-medium text-base">
                                    {job.jobName}
                                  </p>
                                  <div className="flex items-center text-xs">
                                    <User2 className="h-3 w-3 mr-1.5" />
                                    <span>{job.workerName}</span>
                                  </div>
                                  <div className="flex items-center text-xs">
                                    <Briefcase className="h-3 w-3 mr-1.5" />
                                    <span>{job.clientName}</span>
                                  </div>
                                  <div className="flex items-center text-xs">
                                    <CircleDollarSign className="h-3 w-3 mr-1.5" />
                                    <span>
                                      ${job.clientPrice?.toFixed(2) || "0.00"}
                                    </span>
                                  </div>
                                  <Badge
                                    className={cn(
                                      "mt-1",
                                      job.status === "completed" &&
                                        "bg-green-500",
                                      job.status === "in-progress" &&
                                        "bg-blue-500",
                                      job.status === "pending" &&
                                        "bg-yellow-500",
                                      isBefore(
                                        parseISO(job.expireDate),
                                        new Date()
                                      ) &&
                                        job.status !== "completed" &&
                                        "bg-red-500"
                                    )}
                                  >
                                    {job.status === "completed"
                                      ? "Completed"
                                      : job.status === "in-progress"
                                      ? "In Progress"
                                      : isBefore(
                                          parseISO(job.expireDate),
                                          new Date()
                                        ) && job.status !== "completed"
                                      ? "Overdue"
                                      : "Pending"}
                                  </Badge>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))
                      : null}

                    {dayJobs.length > 3 && (
                      <div className="text-xs text-center font-medium bg-gray-100 dark:bg-gray-800 rounded-md p-1 mt-1">
                        +{dayJobs.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewType === "week" && (
        <div className="p-4">
          <div className="rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-sm border">
            {/* Week header with days */}
            <div className="grid grid-cols-8 border-b">
              {/* Empty cell for time column */}
              <div className="p-3 border-r bg-violet-50 dark:bg-violet-900/10"></div>

              {/* Day headers */}
              {weekViewDays.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 text-center border-r last:border-r-0",
                    isToday(day) && "bg-violet-50 dark:bg-violet-900/20"
                  )}
                >
                  <div className="font-medium text-violet-600 dark:text-violet-400">
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={cn(
                      "text-sm mt-1 font-medium inline-flex items-center justify-center",
                      isToday(day) &&
                        "bg-violet-500 text-white rounded-full w-7 h-7"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>

            {/* Week grid with hours and events */}
            <div
              className="grid grid-cols-8 relative"
              style={{ height: "700px" }}
            >
              {/* Time column */}
              <div className="border-r bg-violet-50/50 dark:bg-violet-900/10">
                {Array.from({ length: 24 }, (_, i) => (
                  <div
                    key={i}
                    className="h-14 border-b flex items-center justify-end pr-3 text-xs font-medium text-violet-600 dark:text-violet-400"
                  >
                    {i === 0
                      ? "12 AM"
                      : i < 12
                      ? `${i} AM`
                      : i === 12
                      ? "12 PM"
                      : `${i - 12} PM`}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekViewDays.map((day, dayIndex) => {
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={dayIndex}
                    className="relative border-r last:border-r-0"
                  >
                    {/* Current time indicator */}
                    {isCurrentDay && (
                      <div
                        className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
                        style={{ top: `${getCurrentTimePosition()}px` }}
                      >
                        <div className="absolute -left-1 -top-2 w-4 h-4 rounded-full bg-red-500"></div>
                      </div>
                    )}

                    {/* Hour cells */}
                    {Array.from({ length: 24 }, (_, hourIndex) => {
                      const hourDate = setHours(day, hourIndex);
                      const hourKey = format(hourDate, "yyyy-MM-dd-HH");
                      const dateKey = format(hourDate, "yyyy-MM-dd");
                      const hourJobs = jobsByDate[dateKey] || [];
                      const isBusinessHour = hourIndex >= 9 && hourIndex <= 17;
                      const isCurrentHour =
                        isCurrentDay && getHours(new Date()) === hourIndex;
                      const cellId = `${dayIndex}-${hourIndex}`;
                      const isHovered = hoveredHour === cellId;

                      return (
                        <div
                          key={hourIndex}
                          id={cellId}
                          className={cn(
                            "h-14 border-b relative transition-colors",
                            isBusinessHour &&
                              "bg-violet-50/30 dark:bg-violet-900/5",
                            isCurrentHour &&
                              "bg-violet-100/70 dark:bg-violet-900/20",
                            isHovered && "bg-violet-100 dark:bg-violet-900/30"
                          )}
                          onMouseEnter={() => setHoveredHour(cellId)}
                          onMouseLeave={() => setHoveredHour(null)}
                          onClick={() => handleCreateJob(hourDate)}
                        >
                          {/* Add button (visible on hover) */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-6 w-6 absolute top-1 right-1 opacity-0 transition-opacity bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-800 z-10",
                              isHovered && "opacity-100"
                            )}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>

                          {/* Jobs for this hour */}
                          {hourJobs.map((job) => {
                            const jobDate = parseISO(
                              displayMode === "assign"
                                ? job.assignDate
                                : job.expireDate
                            );
                            const jobHour = getHours(jobDate);

                            // Only show job if it's for this hour and day
                            if (
                              jobHour === hourIndex &&
                              isSameDay(jobDate, day)
                            ) {
                              return (
                                <TooltipProvider key={job._id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onViewDetails(job);
                                        }}
                                        className={cn(
                                          "absolute left-1 right-1 text-left text-xs p-1.5 rounded-md truncate shadow-sm transition-all hover:translate-y-[-1px] z-20",
                                          getJobStatusClass(job)
                                        )}
                                        style={{ top: "2px" }}
                                      >
                                        <div className="flex items-center">
                                          {getJobStatusIcon(job)}
                                          <span className="truncate font-medium">
                                            {job.jobName}
                                          </span>
                                        </div>
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="max-w-xs bg-white dark:bg-gray-800 p-3 shadow-xl"
                                    >
                                      <div className="space-y-2">
                                        <p className="font-medium text-base">
                                          {job.jobName}
                                        </p>
                                        <div className="flex items-center text-xs">
                                          <User2 className="h-3 w-3 mr-1.5" />
                                          <span>{job.workerName}</span>
                                        </div>
                                        <div className="flex items-center text-xs">
                                          <Briefcase className="h-3 w-3 mr-1.5" />
                                          <span>{job.clientName}</span>
                                        </div>
                                        <div className="flex items-center text-xs">
                                          <CircleDollarSign className="h-3 w-3 mr-1.5" />
                                          <span>
                                            $
                                            {job.clientPrice?.toFixed(2) ||
                                              "0.00"}
                                          </span>
                                        </div>
                                        <Badge
                                          className={cn(
                                            "mt-1",
                                            job.status === "completed" &&
                                              "bg-green-500",
                                            job.status === "in-progress" &&
                                              "bg-blue-500",
                                            job.status === "pending" &&
                                              "bg-yellow-500",
                                            isBefore(
                                              parseISO(job.expireDate),
                                              new Date()
                                            ) &&
                                              job.status !== "completed" &&
                                              "bg-red-500"
                                          )}
                                        >
                                          {job.status === "completed"
                                            ? "Completed"
                                            : job.status === "in-progress"
                                            ? "In Progress"
                                            : isBefore(
                                                parseISO(job.expireDate),
                                                new Date()
                                              ) && job.status !== "completed"
                                            ? "Overdue"
                                            : "Pending"}
                                        </Badge>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            }
                            return null;
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick navigation */}
          <div className="mt-4 flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("prev")}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Previous Week
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="flex items-center gap-1"
              >
                <Calendar className="h-3 w-3" /> Today
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("next")}
              className="flex items-center gap-1"
            >
              Next Week <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Day View */}
      {viewType === "day" && (
        <div className="p-4">
          <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
            <div className="text-center p-4 border-b bg-violet-50 dark:bg-violet-900/20">
              <h3 className="text-lg font-medium text-violet-600 dark:text-violet-400">
                {format(currentDate, "EEEE, MMMM d, yyyy")}
              </h3>
              {isToday(currentDate) && (
                <Badge className="mt-1 bg-violet-500">Today</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 divide-y">
              {dayViewHours.map((hour, i) => {
                const hourKey = format(hour, "yyyy-MM-dd-HH");
                const hourJobs = jobsByHour[hourKey] || [];
                const isCurrentHour =
                  isToday(currentDate) &&
                  getHours(new Date()) === getHours(hour);
                const isBusinessHour =
                  getHours(hour) >= 9 && getHours(hour) <= 17;

                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[100px] p-2 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 relative group transition-colors",
                      isCurrentHour &&
                        "bg-violet-50/80 dark:bg-violet-900/20 border-l-4 border-violet-500",
                      isBusinessHour && "bg-gray-50/50 dark:bg-gray-900/20" // Highlight business hours
                    )}
                    onClick={() => handleCreateJob(hour)}
                  >
                    <div className="flex">
                      <div className="w-20 text-muted-foreground text-sm font-medium">
                        {format(hour, "h:00 a")}
                      </div>
                      <div className="flex-1 relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-800"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>

                        {hourJobs.map((job) => (
                          <TooltipProvider key={job._id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewDetails(job);
                                  }}
                                  className={cn(
                                    "w-full text-left text-sm p-3 rounded-md mb-2 block shadow-sm transition-all hover:translate-y-[-1px]",
                                    getJobStatusClass(job)
                                  )}
                                >
                                  <div className="flex items-center">
                                    {job.status === "completed" ? (
                                      <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" />
                                    ) : job.status === "in-progress" ? (
                                      <Clock3 className="h-4 w-4 mr-2 flex-shrink-0" />
                                    ) : isBefore(
                                        parseISO(job.expireDate),
                                        new Date()
                                      ) ? (
                                      <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                                    ) : (
                                      <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                                    )}
                                    <div>
                                      <div className="font-medium">
                                        {job.jobName}
                                      </div>
                                      <div className="text-xs mt-1 flex items-center">
                                        <Briefcase className="h-3 w-3 mr-1" />
                                        {job.clientName} •
                                        <User2 className="h-3 w-3 mx-1" />
                                        {job.workerName}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="max-w-xs bg-white dark:bg-gray-800 p-3 shadow-xl"
                              >
                                <div className="space-y-2">
                                  <p className="font-medium text-base">
                                    {job.jobName}
                                  </p>
                                  <div className="flex items-center text-xs">
                                    <User2 className="h-3 w-3 mr-1.5" />
                                    <span>{job.workerName}</span>
                                  </div>
                                  <div className="flex items-center text-xs">
                                    <Briefcase className="h-3 w-3 mr-1.5" />
                                    <span>{job.clientName}</span>
                                  </div>
                                  <div className="flex items-center text-xs">
                                    <CircleDollarSign className="h-3 w-3 mr-1.5" />
                                    <span>
                                      ${job.clientPrice?.toFixed(2) || "0.00"}
                                    </span>
                                  </div>
                                  <Badge
                                    className={cn(
                                      "mt-1",
                                      job.status === "completed" &&
                                        "bg-green-500",
                                      job.status === "in-progress" &&
                                        "bg-blue-500",
                                      job.status === "pending" &&
                                        "bg-yellow-500",
                                      isBefore(
                                        parseISO(job.expireDate),
                                        new Date()
                                      ) &&
                                        job.status !== "completed" &&
                                        "bg-red-500"
                                    )}
                                  >
                                    {job.status === "completed"
                                      ? "Completed"
                                      : job.status === "in-progress"
                                      ? "In Progress"
                                      : isBefore(
                                          parseISO(job.expireDate),
                                          new Date()
                                        ) && job.status !== "completed"
                                      ? "Overdue"
                                      : "Pending"}
                                  </Badge>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick navigation for day view */}
          <div className="mt-4 flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("prev")}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Previous Day
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="flex items-center gap-1"
              >
                <Calendar className="h-3 w-3" /> Today
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("next")}
              className="flex items-center gap-1"
            >
              Next Day <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
