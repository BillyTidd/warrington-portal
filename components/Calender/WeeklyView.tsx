import React from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

interface WeeklyViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDateClick: (date: Date) => void;
}

export function WeeklyView({
  currentDate,
  tasks,
  onTaskClick,
  onDateClick,
}: WeeklyViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.32))] bg-background">
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "p-3 text-center border-l border-border",
              "hover:bg-muted/50 transition-colors cursor-pointer"
            )}
            onClick={() => onDateClick(day)}
          >
            <div className="text-sm font-medium text-foreground">
              {format(day, "EEE")}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(day, "MMM d")}
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="border-l border-border p-2">
              {tasks
                .filter((task) => isSameDay(parseISO(task.assignDate), day))
                .map((task) => (
                  <div
                    key={task._id}
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      "text-xs p-2 mb-1 rounded-md cursor-pointer",
                      "bg-primary/10 hover:bg-primary/20 border border-primary/20",
                      "transition-all duration-200 ease-in-out transform hover:scale-[1.02]",
                      "text-primary"
                    )}
                  >
                    {task.ticketName}
                  </div>
                ))}
              <div
                className="mt-2 text-center text-xs text-muted-foreground cursor-pointer hover:text-primary"
                onClick={() => onDateClick(day)}
              >
                + Add
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
