"use client";

import { RadioGroup } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface ReasonChipsProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function ReasonChips({ options, value, onChange }: ReasonChipsProps) {
  return (
    <RadioGroup
      onValueChange={onChange}
      value={value}
      className="mt-2 flex flex-wrap gap-2"
    >
      {options.map((reason) => {
        const isSelected = value === reason;
        return (
          <button
            key={reason}
            type="button"
            onClick={() => onChange(reason)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isSelected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
            )}
          >
            {reason}
          </button>
        );
      })}
    </RadioGroup>
  );
}
