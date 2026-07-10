"use client";

import Image from "next/image";
import { Box, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PickableGear = {
  id: string;
  name?: string;
  category?: string;
  image_url?: string | null;
  quantity: number;
  available_quantity: number;
  status: string;
};

interface GearPickerListProps {
  gears: PickableGear[];
  selectedIds: string[];
  onToggle: (gearId: string) => void;
  emptyMessage?: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "Partially Available":
      return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
          Limited
        </Badge>
      );
    case "Pending Check-in":
      return (
        <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400">
          Pending return
        </Badge>
      );
    default:
      return null;
  }
}

export function GearPickerList({
  gears,
  selectedIds,
  onToggle,
  emptyMessage = "No equipment found matching your search.",
}: GearPickerListProps) {
  if (gears.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
        <Box className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[min(420px,55vh)] w-full rounded-xl border border-border bg-card">
      <div className="divide-y divide-border">
        {gears.map((gear) => {
          const isSelected = selectedIds.includes(gear.id);
          const bookedCount = Math.max((gear.quantity || 0) - (gear.available_quantity || 0), 0);

          return (
            <div
              key={gear.id}
              role="button"
              tabIndex={0}
              onClick={() => onToggle(gear.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle(gear.id);
                }
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors sm:gap-4 sm:p-4",
                isSelected
                  ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
                  : "hover:bg-muted/50",
              )}
            >
              <div
                aria-hidden
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-background",
                )}
              >
                {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
              </div>

              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:h-16 sm:w-16">
                {gear.image_url ? (
                  <Image
                    src={gear.image_url}
                    alt={gear.name || "Equipment"}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Box className="h-6 w-6 opacity-40" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium text-foreground sm:text-base">
                      {gear.name}
                    </p>
                    {gear.category && (
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {gear.category}
                      </p>
                    )}
                    {bookedCount > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {bookedCount} currently booked
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {gear.available_quantity} available
                    </span>
                    {statusBadge(gear.status)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
