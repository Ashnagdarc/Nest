"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EditGearForm from '@/components/admin/edit-gear-form';
import { Gear } from '@/types/supabase';
import { Edit } from 'lucide-react';

interface EditGearModalProps {
  isEditModalOpen: boolean;
  setIsEditModalOpen: (isOpen: boolean) => void;
  editingGear: Gear | null;
  handleSubmitEdits: (data: Gear) => void;
  isSubmitting: boolean;
}

export function EditGearModal({ isEditModalOpen, setIsEditModalOpen, editingGear, handleSubmitEdits, isSubmitting }: EditGearModalProps) {
  return (
    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
      <DialogContent className="sm:max-w-[625px] w-[95vw] max-w-full">
        <DialogHeader>
          <DialogTitle>Edit Gear</DialogTitle>
          <DialogDescription>
            Update the details for {editingGear?.name}.
          </DialogDescription>
        </DialogHeader>
        {editingGear && (
          <EditGearForm
            gear={editingGear}
            onSubmit={handleSubmitEdits}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
