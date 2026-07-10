import type { Gear } from "@/types/supabase";
import { cn } from "@/lib/utils";

export interface GearQuantityInfo {
    total: number;
    available: number;
    checkedOut: number;
    availabilityPercent: number;
}

export function getGearQuantityInfo(gear: Gear): GearQuantityInfo {
    const total = Math.max(1, gear.quantity ?? 1);
    const available = Math.min(total, Math.max(0, gear.available_quantity ?? total));
    const checkedOut = Math.max(0, total - available);
    const availabilityPercent = total > 0 ? Math.round((available / total) * 100) : 0;

    return { total, available, checkedOut, availabilityPercent };
}

interface GearQuantityDisplayProps {
    gear: Gear;
    compact?: boolean;
    className?: string;
}

export function GearQuantityDisplay({ gear, compact = false, className }: GearQuantityDisplayProps) {
    const { total, available, checkedOut, availabilityPercent } = getGearQuantityInfo(gear);

    const barTone =
        availabilityPercent === 100
            ? "bg-green-500"
            : availabilityPercent === 0
              ? "bg-blue-500"
              : "bg-amber-500";

    if (compact) {
        return (
            <span className={cn("text-xs text-muted-foreground", className)}>
                {available} of {total} available
                {checkedOut > 0 ? ` · ${checkedOut} out` : ""}
            </span>
        );
    }

    return (
        <div className={cn("min-w-[7rem] space-y-1.5", className)}>
            <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-foreground">
                    {available}/{total}
                </span>
                <span className="text-muted-foreground">available</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                    className={cn("h-full rounded-full transition-all", barTone)}
                    style={{ width: `${availabilityPercent}%` }}
                />
            </div>
            {checkedOut > 0 && (
                <p className="text-[11px] text-muted-foreground">{checkedOut} checked out</p>
            )}
        </div>
    );
}
