import React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

interface MonthlyViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDateClick: (date: Date) => void;
  onShowMoreClick: (date: Date, tasks: Task[]) => void;
  isLoading: boolean;
}

export function MonthlyView({
  currentDate,
  tasks,
  onTaskClick,
  onDateClick,
  onShowMoreClick,
  isLoading,
}: MonthlyViewProps) {
  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => isSameDay(parseISO(task.assignDate), date));
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-px bg-muted p-4">
        <div className="col-span-7 text-center text-muted-foreground font-medium mb-4">
          Loading calendar...
        </div>
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="bg-background p-1 sm:p-2 h-24 sm:h-32 animate-pulse border border-border rounded-md"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="grid grid-cols-7 bg-muted">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-muted">
        {Array.from({
          length: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
          ).getDay(),
        }).map((_, i) => (
          <div
            key={`empty-start-${i}`}
            className="bg-background p-1 sm:p-2 h-24 sm:h-32"
          />
        ))}

        {days.map((day) => {
          const dayTasks = getTasksForDate(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={cn(
                "bg-background p-2 sm:h-32 h-24",
                "hover:bg-muted/50 transition-colors cursor-pointer group",
                !isSameMonth(day, currentDate) && "bg-muted/50",
                isToday(day) && "ring-2 ring-primary ring-inset"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isToday(day) ? "text-primary" : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-1 max-h-16 md:max-h-32 overflow-y-auto">
                {dayTasks.slice(0, 2).map((task) => (
                  <div
                    key={task._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(task);
                    }}
                    className={cn(
                      "text-xs p-1.5 rounded-md cursor-pointer",
                      "bg-primary/10 hover:bg-primary/20 border border-primary/20",
                      "transition-all duration-200 ease-in-out transform hover:scale-[1.02]",
                      "text-primary truncate"
                    )}
                  >
                    {task.ticketName}
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowMoreClick(day, dayTasks);
                    }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    +{dayTasks.length - 2} more
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {Array.from({
          length:
            (7 -
              ((days.length +
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  1
                ).getDay()) %
                7)) %
            7,
        }).map((_, i) => (
          <div
            key={`empty-end-${i}`}
            className="bg-background p-1 sm:p-2 h-24 sm:h-32"
          />
        ))}
      </div>
    </div>
  );
}
