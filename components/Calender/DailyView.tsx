import React from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

interface DailyViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDateClick: (date: Date) => void;
}

export function DailyView({
  currentDate,
  tasks,
  onTaskClick,
  onDateClick,
}: DailyViewProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.32))] bg-background">
      <div className="sticky top-0 bg-background/50 backdrop-blur-sm border-b border-border p-4 text-center z-10">
        <div className="text-xl font-semibold text-foreground">
          {format(currentDate, "EEEE")}
        </div>
        <div className="text-sm text-muted-foreground">
          {format(currentDate, "MMMM d, yyyy")}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tasks
          .filter((task) => isSameDay(parseISO(task.assignDate), currentDate))
          .map((task) => (
            <div
              key={task._id}
              onClick={() => onTaskClick(task)}
              className={cn(
                "text-sm p-3 mb-2 rounded-lg cursor-pointer",
                "bg-primary/10 hover:bg-primary/20 border border-primary/20",
                "transition-all duration-200 ease-in-out transform hover:scale-[1.02]",
                "text-primary"
              )}
            >
              <div className="font-medium">{task.ticketName}</div>
              {task.description && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </div>
              )}
            </div>
          ))}
        <div
          className="mt-4 text-center text-muted-foreground cursor-pointer hover:text-primary"
          onClick={() => onDateClick(currentDate)}
        >
          + Add Task
        </div>
      </div>
    </div>
  );
}
