import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewType = "day" | "week" | "month";

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex gap-1">
      {(["day", "week", "month"] as ViewType[]).map((view) => (
        <Button
          key={view}
          variant={currentView === view ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onViewChange(view)}
          className={cn(
            "capitalize px-3",
            currentView === view && "bg-white/20 text-white hover:bg-white/25",
            currentView !== view &&
              "text-white/70 hover:text-white hover:bg-white/10"
          )}
        >
          {view}
        </Button>
      ))}
    </div>
  );
}
