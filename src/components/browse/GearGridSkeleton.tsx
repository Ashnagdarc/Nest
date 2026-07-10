import { Card } from "@/components/ui/card";

/** Placeholder grid shown while the equipment catalog loads. */
export function GearGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div
            className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            aria-hidden="true"
        >
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i} className="overflow-hidden rounded-2xl border-border/60">
                    <div className="m-3 mb-0 aspect-[4/3] rounded-xl bg-muted animate-pulse" />
                    <div className="p-4 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
                        <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                        <div className="h-11 bg-muted rounded-xl animate-pulse w-full mt-2" />
                    </div>
                </Card>
            ))}
        </div>
    );
}
