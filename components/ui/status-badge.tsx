"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  AlertTriangle,
  Ban,
  type LucideIcon,
} from "lucide-react";

export type StatusValue =
  | "pending"
  | "approved"
  | "confirmed"
  | "completed"
  | "in-progress"
  | "converted"
  | "rejected"
  | "declined"
  | "cancelled"
  | "overdue";

type StatusColor = "amber" | "blue" | "green" | "red" | "slate";

interface StatusStyle {
  label: string;
  icon: LucideIcon;
  color: StatusColor;
}

// Canonical status color key — the single source of truth for status colors app-wide.
// Green = positive/final (approved, confirmed, completed, converted)
// Amber = awaiting action (pending)
// Blue  = active/in-progress
// Red   = negative (rejected, declined, overdue)
// Slate = neutral (cancelled)
const STATUS_STYLES: Record<StatusValue, StatusStyle> = {
  pending: { label: "Pending", icon: Clock, color: "amber" },
  "in-progress": { label: "In Progress", icon: Loader2, color: "blue" },
  converted: { label: "Converted", icon: CheckCircle, color: "blue" },
  approved: { label: "Approved", icon: CheckCircle, color: "green" },
  confirmed: { label: "Confirmed", icon: CheckCircle, color: "green" },
  completed: { label: "Completed", icon: CheckCircle, color: "green" },
  rejected: { label: "Rejected", icon: XCircle, color: "red" },
  declined: { label: "Declined", icon: XCircle, color: "red" },
  overdue: { label: "Overdue", icon: AlertTriangle, color: "red" },
  cancelled: { label: "Cancelled", icon: Ban, color: "slate" },
};

// Outline: colored text/border on a transparent background — used everywhere by default.
const OUTLINE_CLASSES: Record<StatusColor, string> = {
  amber: "text-amber-600 border-amber-600 dark:text-amber-400 dark:border-amber-500",
  blue: "text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-500",
  green: "text-green-600 border-green-600 dark:text-green-400 dark:border-green-500",
  red: "text-red-600 border-red-600 dark:text-red-400 dark:border-red-500",
  slate: "text-slate-600 border-slate-600 dark:text-slate-400 dark:border-slate-500",
};

// Solid: white text on a colored fill — reserved for use on top of colored/gradient backgrounds
// (e.g. the job header banner) where outline text wouldn't have enough contrast.
const SOLID_CLASSES: Record<StatusColor, string> = {
  amber: "bg-amber-500 hover:bg-amber-600 text-white border-transparent",
  blue: "bg-blue-500 hover:bg-blue-600 text-white border-transparent",
  green: "bg-green-500 hover:bg-green-600 text-white border-transparent",
  red: "bg-red-500 hover:bg-red-600 text-white border-transparent",
  slate: "bg-slate-500 hover:bg-slate-600 text-white border-transparent",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  showIcon?: boolean;
  variant?: "outline" | "solid";
  className?: string;
}

export function StatusBadge({
  status,
  label,
  showIcon = true,
  variant = "outline",
  className,
}: StatusBadgeProps) {
  const config = STATUS_STYLES[status?.toLowerCase() as StatusValue];
  const Icon = config?.icon ?? Clock;
  const colorClasses = config
    ? (variant === "solid" ? SOLID_CLASSES : OUTLINE_CLASSES)[config.color]
    : "text-muted-foreground border-muted-foreground";

  return (
    <Badge
      variant="outline"
      className={cn("flex items-center gap-1 w-fit", colorClasses, className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{label || config?.label || status || "Unknown"}</span>
    </Badge>
  );
}
