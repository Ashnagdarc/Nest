"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, CheckSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ManageGearsPageState } from "@/hooks/admin/useManageGearsPage";

interface GearBatchActionsBarProps {
    selectedCount: number;
    onBatchDelete: ManageGearsPageState["handleBatchDelete"];
    onBatchUpdateStatus: ManageGearsPageState["handleBatchUpdateStatus"];
}

export function GearBatchActionsBar({
    selectedCount,
    onBatchDelete,
    onBatchUpdateStatus,
}: GearBatchActionsBarProps) {
    if (selectedCount === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent bg-accent/30 px-6 py-3 shadow-sm"
        >
            <span className="flex items-center gap-2 text-sm font-medium">
                <CheckSquare className="h-4 w-4 text-primary" />
                {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
            </span>
            <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" onClick={onBatchDelete} className="shadow-sm">
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onBatchUpdateStatus("Available")}
                    className="bg-green-100 text-green-800 shadow-sm hover:bg-green-200"
                >
                    <CheckCircle className="mr-1 h-3.5 w-3.5" /> Available
                </Button>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onBatchUpdateStatus("Damaged")}
                    className="bg-orange-100 text-orange-800 shadow-sm hover:bg-orange-200"
                >
                    <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Damaged
                </Button>
            </div>
        </motion.div>
    );
}
