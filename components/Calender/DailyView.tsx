import React from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";
// import { Task } from "../types";

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
    <div className="flex flex-col h-[calc(100vh-theme(spacing.32))] bg-gray-950">
      <div className="sticky top-0 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 p-4 text-center z-10">
        <div className="text-xl font-semibold text-gray-100">
          {format(currentDate, "EEEE")}
        </div>
        <div className="text-sm text-gray-400">
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
                "bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20",
                "transition-all duration-200 ease-in-out transform hover:scale-[1.02]",
                "text-violet-100"
              )}
            >
              <div className="font-medium">{task.ticketName}</div>
              {task.description && (
                <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {task.description}
                </div>
              )}
            </div>
          ))}
        <div
          className="mt-4 text-center text-gray-500 cursor-pointer hover:text-gray-300"
          onClick={() => onDateClick(currentDate)}
        >
          + Add Task
        </div>
      </div>
    </div>
  );
}
