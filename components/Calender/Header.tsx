"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2, // Add Loader2 for loader animation
} from "lucide-react";
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
  isWithinInterval,
} from "date-fns";
import { toast } from "sonner";

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
  const { data: session } = useSession();

  // Loader state for report generation
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true); // Start loading
  
    let filteredTasks = [];
  
    try {
      if (currentView === "day") {
        console.log("Day Report:", format(currentDate, "MMMM d, yyyy"));
  
        filteredTasks = tasks.filter((task) =>
          isSameDay(parseISO(task.assignDate), currentDate)
        );
        console.log("Tasks for this day:", filteredTasks);
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
  
        filteredTasks = tasks.filter((task) => {
          const taskDate = parseISO(task.assignDate);
          return isWithinInterval(taskDate, {
            start: startOfWeekDate,
            end: endOfWeekDate,
          });
        });
        console.log("Tasks for this week:", filteredTasks);
      } else if (currentView === "month") {
        console.log("Month Report:", format(currentDate, "MMMM yyyy"));
  
        const startOfMonthDate = startOfMonth(currentDate);
        const endOfMonthDate = endOfMonth(currentDate);
        filteredTasks = tasks.filter((task) => {
          const taskDate = parseISO(task.assignDate);
          return isWithinInterval(taskDate, {
            start: startOfMonthDate,
            end: endOfMonthDate,
          });
        });
        console.log("Tasks for this month:", filteredTasks);
      }
  
      // POST request to generate the report
      const response = await fetch("/api/create-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentDate,
          currentView,
          tasks: filteredTasks, // Send the filtered tasks to the API
          userId: session?.user.id,
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }
  
      const data = await response.json();
      // Assuming the response contains the sheet URL and ID
      console.log("Report URL:", data.sheetUrl);
      console.log("Report ID:", data.reportId);
  
      toast.success("Report generated successfully");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGeneratingReport(false); // Reset loading state
    }
  };
  

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    const updatedDate = setYear(currentDate, newYear); // Update the year while keeping the month and day intact
    onNavigateYear(updatedDate); // Update the calendar display with the new year
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-amber-600 to-yellow-600">
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
          onValueChange={handleYearChange}
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
          variant="ghost"
          onClick={onNewTask}
          className="bg-white text-amber-600 hover:bg-amber-50 w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">New Task</span>
        </Button>

        <Button
          variant="ghost"
          onClick={handleGenerateReport}
          className="bg-white text-amber-600 hover:bg-amber-50 w-full sm:w-auto mt-4 sm:mt-0"
        >
          {isGeneratingReport ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <span>Generate Report</span>
          )}
        </Button>
      </div>
    </div>
  );
}
