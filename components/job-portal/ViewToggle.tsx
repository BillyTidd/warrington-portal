"use client";

import { LayoutList, CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ViewToggleProps {
  view: "list" | "calendar";
  onChange: (view: "list" | "calendar") => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <Tabs
      value={view}
      onValueChange={(v) => onChange(v as "list" | "calendar")}
    >
      <TabsList className="bg-white/10 border-none">
        <TabsTrigger
          value="list"
          className="data-[state=active]:bg-white data-[state=active]:text-amber-600 dark:text-white dark:data-[state=active]:text-amber-600 hover:bg-white/20"
        >
          <LayoutList className="h-4 w-4 mr-2" />
          List View
        </TabsTrigger>
        <TabsTrigger
          value="calendar"
          className="data-[state=active]:bg-white data-[state=active]:text-amber-600 dark:text-white dark:data-[state=active]:text-amber-600 hover:bg-white/20"
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Calendar View
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
