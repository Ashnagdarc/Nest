import Image from "next/image";
import { format } from "date-fns";
import { Calendar, MapPin, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { GearReturnGroup } from "./types";
import { isOverdue } from "./types";

interface BookingReturnCardProps {
  group: GearReturnGroup;
  selected: boolean;
  quantities: Record<string, number>;
  onToggleGroup: (group: GearReturnGroup) => void;
  onQuantityChange: (gearId: string, delta: number, max: number) => void;
}

export function BookingReturnCard({
  group,
  selected,
  quantities,
  onToggleGroup,
  onQuantityChange,
}: BookingReturnCardProps) {
  const overdue = isOverdue(group.dueDate);
  const groupLabel = group.destination
    ? group.destination
  : group.requestId
    ? `Booking ${format(new Date(group.bookingDate || Date.now()), "MMM d, yyyy")}`
    : `Checkout ${format(new Date(group.bookingDate || Date.now()), "MMM d, yyyy")}`;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        selected && "border-primary ring-1 ring-primary/20",
        overdue && !selected && "border-destructive/40",
      )}
    >
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => onToggleGroup(group)}
          className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/40"
        >
          <Checkbox checked={selected} className="mt-1 pointer-events-none" tabIndex={-1} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold leading-tight">{groupLabel}</p>
                {group.reason && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{group.reason}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">
                  {group.gears.length} item{group.gears.length !== 1 ? "s" : ""}
                </Badge>
                {overdue && (
                  <Badge variant="destructive" className="text-[10px]">
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {group.bookingDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Checked out {format(new Date(group.bookingDate), "MMM d, yyyy")}
                </span>
              )}
              {group.dueDate && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    overdue && "font-medium text-destructive",
                  )}
                >
                  Due {format(new Date(group.dueDate), "MMM d, yyyy")}
                </span>
              )}
              {group.destination && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {group.destination}
                </span>
              )}
            </div>
          </div>
        </button>

        {selected && (
          <div className="border-t border-border bg-muted/20 px-4 py-3">
            <ul className="space-y-3">
              {group.gears.map((gear) => {
                const qty = quantities[gear.id] ?? gear.returnable_quantity;
                const max = gear.returnable_quantity;
                const showQty = max > 1;

                return (
                  <li key={gear.id} className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {gear.image_url ? (
                        <Image
                          src={gear.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{gear.name}</p>
                      {gear.category && (
                        <p className="text-xs text-muted-foreground">{gear.category}</p>
                      )}
                    </div>
                    {showQty ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={qty <= 1}
                          onClick={() => onQuantityChange(gear.id, -1, max)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">
                          {qty}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={qty >= max}
                          onClick={() => onQuantityChange(gear.id, 1, max)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="ml-1 text-xs text-muted-foreground">/ {max}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        ×{max}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
