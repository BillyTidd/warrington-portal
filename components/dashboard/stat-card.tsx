import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

const cardVariants = cva(
  "overflow-hidden bg-card hover:shadow-md transition-all duration-200",
  {
    variants: {
      variant: {
        blue: "border-l-4 border-blue-500 dark:border-blue-400",
        green: "border-l-4 border-emerald-500 dark:border-emerald-400",
        amber: "border-l-4 border-amber-500 dark:border-amber-400",
        yellow: "border-l-4 border-yellow-500 dark:border-yellow-400",
        rose: "border-l-4 border-rose-500 dark:border-rose-400",
        cyan: "border-l-4 border-cyan-500 dark:border-cyan-400",
        indigo: "border-l-4 border-indigo-500 dark:border-indigo-400",
      },
    },
    defaultVariants: {
      variant: "blue",
    },
  }
);

const iconVariants = cva("rounded-md p-2", {
  variants: {
    variant: {
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      green:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      amber:
        "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      yellow:
        "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
      rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
      cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
      indigo:
        "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    },
  },
  defaultVariants: {
    variant: "blue",
  },
});

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  isLoading?: boolean;
  className?: string;
  variant?: "blue" | "green" | "amber" | "yellow" | "rose" | "cyan" | "indigo";
  secondaryValue?: string;
  secondaryLabel?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  animate?: boolean;
}

// Format number with commas and optional decimal places
const formatNumber = (value: number | string, decimals = 0): string => {
  if (typeof value === "string") {
    // If already a string, return as is (might already be formatted)
    return value;
  }

  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export function StatCard({
  title,
  value,
  icon,
  description,
  trend = "neutral",
  isLoading = false,
  className,
  variant = "blue",
  secondaryValue,
  secondaryLabel,
  valuePrefix = "",
  valueSuffix = "",
  animate = true,
}: StatCardProps) {
  // Format the value if it's a number
  const formattedValue =
    typeof value === "number"
      ? `${valuePrefix}${formatNumber(value)}${valueSuffix}`
      : `${valuePrefix}${value}${valueSuffix}`;

  return (
    <Card className={cn(cardVariants({ variant }), className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn(iconVariants({ variant }))}>{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <>
            <div
              className={cn(
                "text-3xl font-bold",
                animate &&
                  "animate-in fade-in slide-in-from-bottom-1 duration-500"
              )}
            >
              {formattedValue}
            </div>
            {secondaryValue && secondaryLabel && (
              <div className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">{secondaryValue}</span>{" "}
                {secondaryLabel}
              </div>
            )}
            {description && (
              <div className="mt-2 flex items-center text-xs font-medium">
                {trend === "up" && (
                  <div className="flex items-center text-emerald-500 dark:text-emerald-400">
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                    {description}
                  </div>
                )}
                {trend === "down" && (
                  <div className="flex items-center text-rose-500 dark:text-rose-400">
                    <ArrowDownRight className="mr-1 h-3 w-3" />
                    {description}
                  </div>
                )}
                {trend === "neutral" && (
                  <div className="text-muted-foreground">{description}</div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
