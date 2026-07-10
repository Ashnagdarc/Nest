"use client";

import Image from "next/image";
import { Box, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PickableGear } from "@/components/request/GearPickerList";

interface SelectedGearReviewProps {
  gears: PickableGear[];
  quantities: Record<string, number>;
  onQuantityChange: (gearId: string, quantity: number) => void;
  getMaxQuantity: (gearName?: string) => number;
}

export function SelectedGearReview({
  gears,
  quantities,
  onQuantityChange,
  getMaxQuantity,
}: SelectedGearReviewProps) {
  if (gears.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Review &amp; Quantity</CardTitle>
        <CardDescription>
          {gears.length} item{gears.length !== 1 ? "s" : ""} selected — adjust quantities before
          submitting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {gears.map((gear) => {
            const qty = quantities[gear.id] ?? 1;
            const max = getMaxQuantity(gear.name);

            return (
              <div
                key={gear.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:gap-4 sm:p-4"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:h-14 sm:w-14">
                  {gear.image_url ? (
                    <Image
                      src={gear.image_url}
                      alt={gear.name || ""}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Box className="h-5 w-5 opacity-40" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-medium text-foreground">{gear.name}</h4>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onQuantityChange(gear.id, Math.max(1, qty - 1))}
                        disabled={qty <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold tabular-nums">
                        {qty}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onQuantityChange(gear.id, Math.min(max, qty + 1))}
                        disabled={qty >= max}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <span
                      className={cn(
                        "text-xs text-muted-foreground",
                        qty > max && "font-medium text-destructive",
                      )}
                    >
                      Max {max}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
