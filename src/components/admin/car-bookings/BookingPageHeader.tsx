"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookingPageHeaderProps {
    isRefreshing: boolean;
    onRefresh: () => void;
}

export function BookingPageHeader({ isRefreshing, onRefresh }: BookingPageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Manage bookings</h1>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                    Fleet oversight, approvals, and booking history.
                </p>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2 self-start">
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
            </Button>
        </div>
    );
}
