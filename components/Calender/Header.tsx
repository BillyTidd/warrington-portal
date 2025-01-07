import React from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewSwitcher } from "./ViewSwitcher";
import {
  format,
  startOfMonth,
  endOfMonth,
  parseISO,
  getYear,
  startOfWeek,
  endOfWeek,
  isSameDay,
  setYear,
  isWithinInterval, // Added for checking if a task date falls within a specific interval
} from "date-fns";

type ViewType = "day" | "week" | "month";

interface HeaderProps {
  currentDate: Date;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onNavigate: (direction: "prev" | "next" | Date) => void; // Updated to accept Date input
  onNewTask: () => void;
  tasks: any[];
  onNavigateYear: any;
}

export function Header({
  currentDate,
  currentView,
  onViewChange,
  onNavigate,
  onNavigateYear,
  onNewTask,
  tasks,
}: HeaderProps) {
  const handleGenerateReport = () => {
    if (currentView === "day") {
      console.log("Day Report:", format(currentDate, "MMMM d, yyyy"));

      const dayTasks = tasks.filter((task) =>
        isSameDay(parseISO(task.assignDate), currentDate)
      );
      console.log("Tasks for this day:", dayTasks);
    } else if (currentView === "week") {
      const startOfWeekDate = startOfWeek(currentDate);
      const endOfWeekDate = endOfWeek(currentDate);
      console.log(
        "Week Report:",
        `${format(startOfWeekDate, "MMMM d, yyyy")} - ${format(
          endOfWeekDate,
          "MMMM d, yyyy"
        )}`
      );

      const weekTasks = tasks.filter((task) => {
        const taskDate = parseISO(task.assignDate);
        return isWithinInterval(taskDate, {
          start: startOfWeekDate,
          end: endOfWeekDate,
        });
      });
      console.log("Tasks for this week:", weekTasks);
    } else if (currentView === "month") {
      console.log("Month Report:", format(currentDate, "MMMM yyyy"));

      const startOfMonthDate = startOfMonth(currentDate);
      const endOfMonthDate = endOfMonth(currentDate);
      const monthTasks = tasks.filter((task) => {
        const taskDate = parseISO(task.assignDate);
        return isWithinInterval(taskDate, {
          start: startOfMonthDate,
          end: endOfMonthDate,
        });
      });
      console.log("Tasks for this month:", monthTasks);
    }
  };

  // Handle year change
  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    const updatedDate = setYear(currentDate, newYear); // Update the year while keeping the month and day intact
    onNavigateYear(updatedDate); // Update the calendar display with the new year
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-violet-600 to-purple-600">
      {/* First Row - Month and Year */}
      <div className="flex flex-col sm:flex-row items-center space-x-4 mb-4 sm:mb-0 w-full">
        <h2 className="text-2xl sm:text-3xl font-bold text-white w-full sm:w-auto">
          {currentView === "day" ? (
            format(currentDate, "MMMM d, yyyy")
          ) : (
            <>
              <span className="hidden sm:inline">
                {format(currentDate, "MMMM yyyy")}
              </span>
              <span className="sm:hidden">
                {format(currentDate, "MMM yyyy")}
              </span>
            </>
          )}
        </h2>
        <Select
          value={getYear(currentDate).toString()}
          onValueChange={handleYearChange} // Trigger year change
        >
          <SelectTrigger>
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {Array.from(
              { length: 10 },
              (_, i) => getYear(new Date()) - 5 + i
            ).map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Second Row - View Switcher and Navigation */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-4 sm:mb-0 w-full">
        <ViewSwitcher currentView={currentView} onViewChange={onViewChange} />

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("prev")}
            className="bg-white/10 border-none text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("next")}
            className="bg-white/10 border-none text-white hover:bg-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Third Row - New Task Button */}
      <div className="flex flex-col sm:flex-row justify-end gap-4 items-center w-full mt-4 sm:mt-0">
        <Button
          onClick={onNewTask}
          className="bg-white text-violet-600 hover:bg-violet-50 w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">New Task</span>
        </Button>

        <Button
          onClick={handleGenerateReport}
          className="bg-white text-violet-600 hover:bg-violet-50 w-full sm:w-auto mt-4 sm:mt-0"
        >
          <span>Generate Report</span>
        </Button>
      </div>
    </div>
  );
}
