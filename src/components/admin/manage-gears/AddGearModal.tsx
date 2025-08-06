"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AddGearForm from '@/components/admin/add-gear-form';
import { Gear } from '@/types/supabase';
import { PlusCircle } from 'lucide-react';

interface AddGearModalProps {
  isAddModalOpen: boolean;
  setIsAddModalOpen: (isOpen: boolean) => void;
  handleAddGear: (data: Gear) => void;
}

export function AddGearModal({ isAddModalOpen, setIsAddModalOpen, handleAddGear }: AddGearModalProps) {
  return (
    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
      <DialogTrigger asChild>
        <Button className="text-xs sm:text-sm bg-primary hover:bg-primary/90">
          <PlusCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Add New Gear</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] w-[95vw] max-w-full">
        <DialogHeader>
          <DialogTitle>Add New Gear</DialogTitle>
          <DialogDescription>
            Fill in the details for the new equipment.
          </DialogDescription>
        </DialogHeader>
        <AddGearForm onSubmit={handleAddGear} />
      </DialogContent>
    </Dialog>
  );
}
