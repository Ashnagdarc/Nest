"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import type { WheelPickerOption } from "@/components/wheel-picker";
import { WheelPicker, WheelPickerWrapper } from "@/components/wheel-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const HOUR_OPTIONS: WheelPickerOption<number>[] = Array.from({ length: 12 }, (_, i) => {
  const value = i + 1;
  return {
    label: value.toString().padStart(2, "0"),
    value,
  };
});

const MINUTE_OPTIONS: WheelPickerOption<number>[] = Array.from({ length: 60 }, (_, i) => ({
  label: i.toString().padStart(2, "0"),
  value: i,
}));

const MERIDIEM_OPTIONS: WheelPickerOption<"AM" | "PM">[] = [
  { label: "AM", value: "AM" },
  { label: "PM", value: "PM" },
];

export type Meridiem = "AM" | "PM";

export interface ParsedTimeSlot {
  hour: number;
  minute: number;
  meridiem: Meridiem;
}

export function formatTimeSlot(hour: number, minute: number, meridiem: Meridiem): string {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${meridiem}`;
}

export function parseTimeSlot(value?: string): ParsedTimeSlot {
  const trimmed = value?.trim() ?? "";
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);

  if (match) {
    const hour = Math.min(12, Math.max(1, parseInt(match[1], 10) || 9));
    const minute = Math.min(59, Math.max(0, parseInt(match[2], 10) || 0));
    const meridiem = (match[3]?.toUpperCase() as Meridiem | undefined) ?? "AM";
    return { hour, minute, meridiem };
  }

  return { hour: 9, minute: 0, meridiem: "AM" };
}

const WHEEL_PROPS = {
  visibleCount: 12,
  optionItemHeight: 36,
} as const;

function TimeWheelPickerWheels({
  parsed,
  onUpdate,
}: {
  parsed: ParsedTimeSlot;
  onUpdate: (next: Partial<ParsedTimeSlot>) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[17rem]" style={{ height: WHEEL_PROPS.optionItemHeight * 5 }}>
      <WheelPickerWrapper className="h-full w-full border-0 bg-transparent shadow-none">
        <WheelPicker
          {...WHEEL_PROPS}
          options={HOUR_OPTIONS}
          value={parsed.hour}
          onValueChange={(hour) => onUpdate({ hour })}
          infinite
        />
        <WheelPicker
          {...WHEEL_PROPS}
          options={MINUTE_OPTIONS}
          value={parsed.minute}
          onValueChange={(minute) => onUpdate({ minute })}
          infinite
        />
        <WheelPicker
          {...WHEEL_PROPS}
          options={MERIDIEM_OPTIONS}
          value={parsed.meridiem}
          onValueChange={(meridiem) => onUpdate({ meridiem })}
        />
      </WheelPickerWrapper>
    </div>
  );
}

interface TimeWheelPickerProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimeWheelPicker({ value, onChange, className }: TimeWheelPickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseTimeSlot(value), [value]);
  const displayValue = formatTimeSlot(parsed.hour, parsed.minute, parsed.meridiem);

  const update = (next: Partial<ParsedTimeSlot>) => {
    const hour = next.hour ?? parsed.hour;
    const minute = next.minute ?? parsed.minute;
    const meridiem = next.meridiem ?? parsed.meridiem;
    onChange(formatTimeSlot(hour, minute, meridiem));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-11 w-full justify-between px-3 font-normal", className)}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{displayValue}</span>
          </span>
          <span className="text-xs text-muted-foreground">Change</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[20rem] gap-0 p-0 sm:max-w-[20rem]">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-center text-base">Start time</DialogTitle>
          <p className="text-center text-sm font-medium text-primary">{displayValue}</p>
        </DialogHeader>
        <div className="px-4 py-5">
          <TimeWheelPickerWheels parsed={parsed} onUpdate={update} />
        </div>
        <div className="border-t border-border p-4">
          <Button type="button" className="w-full" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
