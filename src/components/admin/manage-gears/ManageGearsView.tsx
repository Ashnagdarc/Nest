"use client";

import { motion } from "framer-motion";
import { GearInventoryHeader } from "@/components/admin/manage-gears/GearInventoryHeader";
import { GearInventoryStats } from "@/components/admin/manage-gears/GearInventoryStats";
import { GearBatchActionsBar } from "@/components/admin/manage-gears/GearBatchActionsBar";
import { GearInventoryListCard } from "@/components/admin/manage-gears/GearInventoryListCard";
import { GearInventoryDialogs } from "@/components/admin/manage-gears/GearInventoryDialogs";
import { useManageGearsPage } from "@/hooks/admin/useManageGearsPage";

export function ManageGearsView() {
    const state = useManageGearsPage();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 pb-8"
        >
            <GearInventoryHeader
                canManage={state.profile?.role === "Admin"}
                onExport={state.handleExport}
                onImportClick={state.handleImportDialogOpen}
                onAddClick={() => state.setIsAddModalOpen(true)}
            />

            <GearInventoryStats summary={state.inventorySummary} loading={state.summaryLoading} />

            <GearInventoryDialogs state={state} />

            <GearBatchActionsBar
                selectedCount={state.selectedGearIds.length}
                onBatchDelete={state.handleBatchDelete}
                onBatchUpdateStatus={state.handleBatchUpdateStatus}
            />

            <GearInventoryListCard state={state} />
        </motion.div>
    );
}
