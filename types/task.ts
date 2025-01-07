export interface Task {
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
  
  