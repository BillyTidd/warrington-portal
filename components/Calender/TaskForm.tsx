import React from "react";
import { Loader2 } from "lucide-react";
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
import { DialogFooter } from "@/components/ui/dialog";
import { Task } from "@/types/task";
import { format, parseISO } from "date-fns";

interface TaskFormProps {
  currentTask: Partial<Task>;
  users: any[];
  clients: any[];
  isEditMode: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onDelete?: () => void;
  isSaving: boolean;
  setCurrentTask: React.Dispatch<React.SetStateAction<Partial<Task>>>;
}

export function TaskForm({
  currentTask,
  users,
  clients,
  isEditMode,
  onSubmit,
  onDelete,
  isSaving,
  setCurrentTask,
}: TaskFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4 py-4">
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
                ? format(parseISO(currentTask.assignDate), "yyyy-MM-dd")
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

        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={currentTask.description || ""}
            onChange={(e) =>
              setCurrentTask({
                ...currentTask,
                description: e.target.value,
              })
            }
          />
        </div>
      </div>

      <DialogFooter>
        {isEditMode && onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete}>
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
  );
}
