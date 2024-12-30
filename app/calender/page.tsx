"use client";

import { useState, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
  isBefore,
  getYear,
  setYear,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, CalendarIcon, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
import { useSession } from "next-auth/react";

interface Task {
  _id: string;
  ticketName: string;
  userName: string;
  userId: string;
  clientName: string;
  assignDate: string;
  deadline: string;
  description: string;
  taskStatus: "urgent" | "minor" | "normal";
  taskProgress: "pending" | "inProgress" | "paused" | "done";
  googleCalendarEventId?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const tasksForDate = getTasksForDate(date);
    if (tasksForDate.length > 3) {
      setSelectedDateTasks(tasksForDate);
      setIsTaskListModalOpen(true);
    } else {
      setCurrentTask({ assignDate: format(date, "yyyy-MM-dd") });
      setIsEditMode(false);
      setIsModalOpen(true);
    }
  };

  const handleTaskClick = (task: Task) => {
    setCurrentTask(task);
    setIsEditMode(true);
    setIsModalOpen(true);
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

      toast.success(
        isEditMode ? "Task updated successfully" : "Task created successfully"
      );
      setIsModalOpen(false);
      fetchData();
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

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      const taskDate = parseISO(task.assignDate);
      return format(taskDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-10 px-2 sm:px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          {/* Calendar Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <h2 className="text-2xl sm:text-3xl font-bold">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <Select
                value={getYear(currentDate).toString()}
                onValueChange={(value) =>
                  setCurrentDate(setYear(currentDate, parseInt(value)))
                }
              >
                <SelectTrigger className="w-[100px] sm:w-[120px] bg-white/10 border-none text-white">
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
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="bg-white/10 border-none text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="bg-white/10 border-none text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
              <Button
                onClick={() => {
                  setCurrentTask({});
                  setIsEditMode(false);
                  setIsModalOpen(true);
                }}
                className="bg-white text-black hover:bg-blue-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Task</span>
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-700">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                {day}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 p-1 sm:p-2 h-20 sm:h-32 flex items-center justify-center"
                >
                  <Loader2 className="h-4 w-4 sm:h-6 sm:w-6 animate-spin text-gray-400 dark:text-gray-600" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600">
              {Array.from({
                length: new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  1
                ).getDay(),
              }).map((_, i) => (
                <div
                  key={`empty-start-${i}`}
                  className="bg-white dark:bg-gray-800 p-1 sm:p-2 h-20 sm:h-32"
                />
              ))}

              {days.map((day, dayIdx) => {
                const dayTasks = getTasksForDate(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "bg-white dark:bg-gray-800 p-1 sm:p-2 h-20 sm:h-32 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                      !isSameMonth(day, currentDate) &&
                        "text-gray-400 bg-gray-50 dark:bg-gray-900 dark:text-gray-500",
                      isToday(day) &&
                        "bg-blue-50 dark:bg-blue-900 border-2 border-blue-500"
                    )}
                    onClick={() => handleDateClick(day)}
                  >
                    <div className="font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm mb-1">
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-12 sm:max-h-24">
                      {dayTasks.slice(0, 2).map((task) => (
                        <div
                          key={task._id}
                          className={cn(
                            "text-xs p-1 rounded-md cursor-pointer transition-colors",
                            task.taskStatus === "urgent" &&
                              "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800",
                            task.taskStatus === "minor" &&
                              "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800",
                            task.taskStatus === "normal" &&
                              "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(task);
                          }}
                        >
                          {task.ticketName}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                          +{dayTasks.length - 2} more
                        </div>
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
                  className="bg-white dark:bg-gray-800 p-1 sm:p-2 h-20 sm:h-32"
                />
              ))}
            </div>
          )}
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px] sm:w-full">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            <form onSubmit={handleSaveTask}>
              <div className="max-h-[60vh] overflow-y-auto pr-6">
                <div className="grid gap-4 py-4 ">
                  <div className="grid gap-2">
                    <Label htmlFor="ticketName">Ticket Name</Label>
                    <Input
                      id="ticketName"
                      value={currentTask.ticketName || ""}
                      onChange={(e) =>
                        setCurrentTask({
                          ...currentTask,
                          ticketName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="userName">Assign To</Label>
                    <Select
                      value={currentTask.userName}
                      onValueChange={(value) =>
                        setCurrentTask({ ...currentTask, userName: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user._id} value={user.name}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientName">Client</Label>
                    <Select
                      value={currentTask.clientName}
                      onValueChange={(value) =>
                        setCurrentTask({ ...currentTask, clientName: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client._id} value={client.name}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="assignDate">Assign Date</Label>
                    <Input
                      id="assignDate"
                      type="date"
                      value={
                        currentTask.assignDate
                          ? format(
                              parseISO(currentTask.assignDate),
                              "yyyy-MM-dd"
                            )
                          : ""
                      }
                      onChange={(e) =>
                        setCurrentTask({
                          ...currentTask,
                          assignDate: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  {/* Remove or comment out these sections */}
                  {/* <div className="grid gap-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={
                        currentTask.deadline
                          ? format(
                              parseISO(currentTask.deadline),
                              "yyyy-MM-dd"
                            )
                          : ""
                      }
                      onChange={(e) =>
                        setCurrentTask({
                          ...currentTask,
                          deadline: e.target.value,
                        })
                      }
                      required
                      min={currentTask.assignDate}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taskStatus">Task Status</Label>
                    <Select
                      value={currentTask.taskStatus}
                      onValueChange={(
                        value: "urgent" | "minor" | "normal"
                      ) =>
                        setCurrentTask({ ...currentTask, taskStatus: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taskProgress">Task Progress</Label>
                    <Select
                      value={currentTask.taskProgress}
                      onValueChange={(
                        value: "pending" | "inProgress" | "paused" | "done"
                      ) =>
                        setCurrentTask({ ...currentTask, taskProgress: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select progress" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="inProgress">In Progress</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div> */}
                </div>
              </div>
              <DialogFooter>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    Delete
                  </Button>
                )}
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    <>{isEditMode ? "Update" : "Save"} Task</>
                  )}
                </Button>
              </DialogFooter>
            </form>
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
                      onClick={() => handleTaskClick(task)}
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