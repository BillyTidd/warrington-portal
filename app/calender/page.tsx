"use client";

import React, { useEffect, useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  setYear,
} from "date-fns";
import { Edit, Loader2, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DailyView } from "@/components/Calender/DailyView";
import { WeeklyView } from "@/components/Calender/WeeklyView";
import { MonthlyView } from "@/components/Calender/MonthlyView";
import { TaskForm } from "@/components/Calender/TaskForm";
import { Task } from "@/types/task";
import { Header } from "@/components/Calender/Header";

type ViewType = "day" | "week" | "month";

export default function CalendarPage() {
  const [currentView, setCurrentView] = useState<ViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTask, setCurrentTask] = useState<Partial<Task>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTaskListModalOpen, setIsTaskListModalOpen] = useState(false);
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, usersRes, clientsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/admin/users"),
        fetch("/api/clients"),
      ]);
      const [tasksData, usersData, clientsData] = await Promise.all([
        tasksRes.json(),
        usersRes.json(),
        clientsRes.json(),
      ]);
      setTasks(tasksData);
      setUsers(usersData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch calendar data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (direction: any) => {
    switch (currentView) {
      case "day":
        setCurrentDate(
          direction === "prev"
            ? subDays(currentDate, 1)
            : addDays(currentDate, 1)
        );
        break;
      case "week":
        setCurrentDate(
          direction === "prev"
            ? subWeeks(currentDate, 1)
            : addWeeks(currentDate, 1)
        );
        break;
      case "month":
        setCurrentDate(
          direction === "prev"
            ? subMonths(currentDate, 1)
            : addMonths(currentDate, 1)
        );
        break;
    }
  };
  const handleNavigateYear = (direction: "prev" | "next" | Date) => {
    let updatedDate = currentDate;

    if (direction instanceof Date) {
      // If the direction is a Date object, we will extract the year and update it accordingly
      updatedDate = direction;
    } else {
      // Navigate by year
      updatedDate =
        direction === "prev"
          ? subYears(currentDate, 1)
          : addYears(currentDate, 1);
    }

    setCurrentDate(updatedDate); // Update the calendar with the new date
    console.log("Updated Date:", updatedDate); // Log the updated date
  };
  const handleDateClick = (date: Date) => {
    setCurrentTask({ assignDate: format(date, "yyyy-MM-dd") });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleShowMore = (date: Date, tasks: Task[]) => {
    setSelectedDate(date);
    setSelectedDateTasks(tasks);
    setIsTaskListModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = isEditMode ? `/api/tasks/${currentTask._id}` : "/api/tasks";
      const method = isEditMode ? "PUT" : "POST";

      const { _id, ...taskDataWithoutId } = currentTask;

      const selectedUser = users.find(
        (user) => user.name === currentTask.userName
      );
      const taskData = {
        ...taskDataWithoutId,
        userId: selectedUser?._id || "",
        taskStatus: taskDataWithoutId.taskStatus || "normal",
        taskProgress: taskDataWithoutId.taskProgress || "pending",
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save task");
      }

      await fetchData();
      toast.success(
        isEditMode ? "Task updated successfully" : "Task created successfully"
      );
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving task:", error);
      toast.error(
        error.message ||
          (isEditMode ? "Failed to update task" : "Failed to create task")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${currentTask._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete task");
      }

      toast.success("Task deleted successfully");
      setIsModalOpen(false);
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error(error.message || "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-10 px-2 sm:px-4">
        <div className="bg-gray-950 rounded-lg shadow-xl overflow-hidden">
          <Header
            currentDate={currentDate}
            currentView={currentView}
            onViewChange={setCurrentView}
            onNavigate={handleNavigate}
            onNavigateYear={handleNavigateYear}
            tasks={tasks}
            onNewTask={() => {
              setCurrentTask({});
              setIsEditMode(false);
              setIsModalOpen(true);
            }}
          />

          {currentView === "day" && (
            <DailyView
              currentDate={currentDate}
              tasks={tasks}
              onTaskClick={(task) => {
                setCurrentTask(task);
                setIsEditMode(true);
                setIsModalOpen(true);
              }}
              onDateClick={handleDateClick}
            />
          )}

          {currentView === "week" && (
            <WeeklyView
              currentDate={currentDate}
              tasks={tasks}
              onTaskClick={(task) => {
                setCurrentTask(task);
                setIsEditMode(true);
                setIsModalOpen(true);
              }}
              onDateClick={handleDateClick}
            />
          )}

          {currentView === "month" && (
            <MonthlyView
              currentDate={currentDate}
              tasks={tasks}
              onTaskClick={(task) => {
                setCurrentTask(task);
                setIsEditMode(true);
                setIsModalOpen(true);
              }}
              onDateClick={handleDateClick}
              onShowMoreClick={handleShowMore}
              isLoading={isLoading}
            />
          )}
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>

            <TaskForm
              currentTask={currentTask}
              users={users}
              clients={clients}
              isEditMode={isEditMode}
              onSubmit={handleSaveTask}
              onDelete={() => setIsDeleteDialogOpen(true)}
              isSaving={isSaving}
              setCurrentTask={setCurrentTask}
            />
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this task?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                task.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTask}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={isTaskListModalOpen}
          onOpenChange={setIsTaskListModalOpen}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                Tasks for {selectedDate && format(selectedDate, "MMMM d, yyyy")}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {selectedDateTasks.map((task) => (
                <div
                  key={task._id}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <span>{task.ticketName}</span>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentTask(task);
                        setIsEditMode(true);
                        setIsModalOpen(true);
                        setIsTaskListModalOpen(false);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentTask(task);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
