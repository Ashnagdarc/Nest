"use client";

import { CheckCircle2 } from "lucide-react";

export function CheckinEmptyState() {
    return (
        <div className="rounded-xl border border-dashed border-border bg-muted/10 px-6 py-14 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
            <h3 className="text-lg font-semibold">All caught up</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                No pending check-ins need your review right now.
            </p>
        </div>
    );
}
