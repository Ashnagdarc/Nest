import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Select items" },
  { id: 2, label: "Condition" },
  { id: 3, label: "Review" },
] as const;

export function ReturnStepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s, index) => {
        const isActive = step === s.id;
        const isComplete = step > s.id;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isComplete && "bg-primary text-primary-foreground",
                  isActive && !isComplete && "bg-primary/15 text-primary ring-2 ring-primary/30",
                  !isActive && !isComplete && "bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? "✓" : s.id}
              </div>
              <span
                className={cn(
                  "hidden text-center text-[10px] font-medium sm:block",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "mb-4 h-0.5 flex-1 rounded-full",
                  step > s.id ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
