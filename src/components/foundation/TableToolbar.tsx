"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, RefreshCw, PanelsTopLeft } from "lucide-react";

interface TableToolbarProps {
    onRefresh?: () => void;
    onExportCSV?: () => void;
    onExportPDF?: () => void;
    left?: ReactNode;
    right?: ReactNode;
    className?: string;
}

export function TableToolbar({ onRefresh, onExportCSV, onExportPDF, left, right, className }: TableToolbarProps) {
    return (
        <div className={cn("flex flex-wrap items-center justify-between gap-2 sm:gap-3 transition-all motion-normal", className)}>
            <div className="flex items-center gap-2">{left}</div>
            <div className="flex items-center gap-2">
                {right}
                {onExportCSV && (
                    <Button variant="outline" size="sm" onClick={onExportCSV} aria-label="Export CSV">
                        <Download className="icon-16 mr-1" /> CSV
                    </Button>
                )}
                {onExportPDF && (
                    <Button variant="outline" size="sm" onClick={onExportPDF} aria-label="Export PDF">
                        <Download className="icon-16 mr-1" /> PDF
                    </Button>
                )}
                {onRefresh && (
                    <Button variant="outline" size="sm" onClick={onRefresh} aria-label="Refresh table">
                        <RefreshCw className="icon-16 mr-1" /> Refresh
                    </Button>
                )}
            </div>
        </div>
    );
}

export default TableToolbar;


