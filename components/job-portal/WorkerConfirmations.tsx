"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send,
  RefreshCw,
  MessageSquare,
  Phone,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Worker {
  _id: string;
  name: string;
  phone?: string;
  whatsappNumber?: string;
}

interface Confirmation {
  _id: string;
  workerName: string;
  workerPhone: string;
  channel: "sms" | "whatsapp";
  status: "pending" | "confirmed" | "declined";
  workerResponse: "yes" | "no" | null;
  workerMessage: string | null;
  sentAt: string;
  respondedAt: string | null;
}

interface Props {
  jobId: string;
  workers: Worker[];
}

export function WorkerConfirmations({ jobId, workers }: Props) {
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");

  const workerHasChannel = (worker: Worker) => {
    if (channel === "sms") return !!worker.phone;
    return !!(worker.whatsappNumber || worker.phone);
  };

  const selectableWorkers = workers.filter(workerHasChannel);

  const fetchConfirmations = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/worker-confirmations`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setConfirmations(data)
    } catch {
      toast.error("Failed to load confirmation responses")
    } finally {
      setIsLoading(false)
    }
  }, [jobId]);

  useEffect(() => {
    fetchConfirmations();
  }, [fetchConfirmations]);

  const toggleWorker = (id: string) => {
    setSelectedWorkerIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const selectableIds = selectableWorkers.map((w) => w._id);
    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedWorkerIds.has(id));
    if (allSelected) {
      setSelectedWorkerIds(new Set());
    } else {
      setSelectedWorkerIds(new Set(selectableIds));
    }
  };

  const handleSend = async () => {
    const selected = workers.filter((w) => selectedWorkerIds.has(w._id));
    const canSend = selected.filter(workerHasChannel);

    if (!canSend.length) {
      toast.error("No selected workers have a number for the chosen channel");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/worker-confirmations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workers: canSend.map((w) => ({
            workerId: w._id,
            workerName: w.name,
            phone: w.phone || "",
            whatsappNumber: w.whatsappNumber || "",
          })),
          channel,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }

      const { results } = await res.json();
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.length - successCount;

      if (successCount) toast.success(`Message sent to ${successCount} worker${successCount > 1 ? "s" : ""}`);
      if (failCount) toast.error(`Failed to send to ${failCount} worker${failCount > 1 ? "s" : ""}`);

      setSelectedWorkerIds(new Set());
      await fetchConfirmations();
    } catch (error: any) {
      toast.error(error.message || "Failed to send messages");
    } finally {
      setIsSending(false);
    }
  };

  const skippedWorkers: Worker[] = selectedWorkerIds.size > 0
    ? workers.filter((w) => selectedWorkerIds.has(w._id) && !workerHasChannel(w))
    : [];

  return (
    <div className="space-y-6">
      {/* Send Panel */}
      <Card className="border-none shadow-md">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 pb-3 rounded-t-lg">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-amber-600" />
            Request Worker Confirmation
          </CardTitle>
          <CardDescription>
            Select workers and send them a confirmation request via SMS or WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Channel select */}
          <div className="flex items-center gap-3">
            <Label className="shrink-0 text-sm font-medium">Send via</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as "sms" | "whatsapp")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    SMS
                  </div>
                </SelectItem>
                <SelectItem value="whatsapp">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    WhatsApp
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Worker list */}
          {workers.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              No approved employees found in the system.
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {/* Select all */}
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/30">
                <Checkbox
                  id="select-all"
                  checked={selectableWorkers.length > 0 && selectableWorkers.every((w) => selectedWorkerIds.has(w._id))}
                  onCheckedChange={toggleAll}
                  disabled={selectableWorkers.length === 0}
                />
                <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select all ({selectableWorkers.length} of {workers.length} can receive {channel === "sms" ? "SMS" : "WhatsApp"})
                </Label>
              </div>
              {workers.map((worker) => {
                const hasChannel = workerHasChannel(worker);
                return (
                  <div
                    key={worker._id}
                    className={`flex items-center gap-3 px-3 py-2.5 ${!hasChannel ? "opacity-50" : ""}`}
                  >
                    <Checkbox
                      id={worker._id}
                      checked={selectedWorkerIds.has(worker._id)}
                      onCheckedChange={() => toggleWorker(worker._id)}
                      disabled={!hasChannel}
                    />
                    <Label htmlFor={worker._id} className="flex-1 cursor-pointer">
                      <span className="text-sm font-medium">{worker.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {channel === "whatsapp"
                          ? worker.whatsappNumber || worker.phone || "No number"
                          : worker.phone || "No SMS number"}
                      </span>
                    </Label>
                    {!hasChannel && (
                      <span className="text-xs text-muted-foreground">No {channel} number</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {skippedWorkers.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {skippedWorkers.map((w) => w.name).join(", ")}{" "}
                {skippedWorkers.length === 1 ? "has" : "have"} no {channel} number and will be skipped.
              </span>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={isSending || selectedWorkerIds.size === 0}
            className="w-full"
          >
            {isSending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to {selectedWorkerIds.size} Worker{selectedWorkerIds.size !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Responses Table */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Responses</CardTitle>
            <CardDescription>
              {confirmations.length === 0
                ? "No messages sent yet"
                : `${confirmations.length} message${confirmations.length > 1 ? "s" : ""} sent`}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchConfirmations} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {confirmations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Send confirmation requests above to see responses here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmations.map((c) => {
                  return (
                    <TableRow key={c._id}>
                      <TableCell className="font-medium">{c.workerName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {c.channel === "whatsapp" ? (
                            <MessageSquare className="h-3 w-3 mr-1 text-green-600" />
                          ) : (
                            <Phone className="h-3 w-3 mr-1" />
                          )}
                          {c.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(c.sentAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} className="text-xs" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {c.workerMessage ? (
                          <span title={c.workerMessage}>{c.workerMessage}</span>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
