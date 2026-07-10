"use client";

import { Download, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RequestPageHeaderProps {
    isRefreshing: boolean;
    onRefresh: () => void;
    onExportCsv: () => void;
    onExportPdf: () => void;
}

export function RequestPageHeader({
    isRefreshing,
    onRefresh,
    onExportCsv,
    onExportPdf,
}: RequestPageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Manage gear requests</h1>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                    Review, approve, or reject team equipment bookings.
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                    Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={onExportCsv} className="gap-2">
                    <Download className="h-4 w-4" />
                    CSV
                </Button>
                <Button variant="outline" size="sm" onClick={onExportPdf} className="gap-2">
                    <FileText className="h-4 w-4" />
                    PDF
                </Button>
            </div>
        </div>
    );
}
