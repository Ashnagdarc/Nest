"use client";

import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { CheckSquare, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

interface BatchActionsToolbarProps {
  selectedGearIds: string[];
  handleBatchDelete: () => void;
  handleBatchUpdateStatus: (status: string) => void;
}

export function BatchActionsToolbar({
  selectedGearIds,
  handleBatchDelete,
  handleBatchUpdateStatus,
}: BatchActionsToolbarProps) {
  if (selectedGearIds.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-between gap-2 bg-accent/30 px-6 py-3 rounded-lg border border-accent shadow-sm"
    >
      <span className="text-sm font-medium flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-primary" />
        {selectedGearIds.length} {selectedGearIds.length === 1 ? 'item' : 'items'} selected
      </span>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" onClick={handleBatchDelete} className="shadow-sm">
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
        </Button>
        <Button size="sm" variant="secondary" onClick={() => handleBatchUpdateStatus('Available')} className="bg-green-100 text-green-800 hover:bg-green-200 shadow-sm">
          <CheckCircle className="mr-1 h-3.5 w-3.5" /> Available
        </Button>
        <Button size="sm" variant="secondary" onClick={() => handleBatchUpdateStatus('Damaged')} className="bg-orange-100 text-orange-800 hover:bg-orange-200 shadow-sm">
          <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Damaged
        </Button>
      </div>
    </motion.div>
  );
}
