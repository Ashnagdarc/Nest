/** Shared placeholder rows used while dashboard list data loads. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}
