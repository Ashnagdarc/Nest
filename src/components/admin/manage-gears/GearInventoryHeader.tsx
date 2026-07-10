"use client";

import { Download, PlusCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GearInventoryHeaderProps {
    canManage: boolean;
    onExport: () => void;
    onImportClick: () => void;
    onAddClick: () => void;
}

export function GearInventoryHeader({
    canManage,
    onExport,
    onImportClick,
    onAddClick,
}: GearInventoryHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Manage equipment</h1>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                    View inventory, update status, import/export gear, and maintain records.
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={onImportClick} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                </Button>
                {canManage ? (
                    <Button size="sm" onClick={onAddClick} className="gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Add equipment
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
