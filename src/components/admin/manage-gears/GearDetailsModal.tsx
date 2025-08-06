"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Gear } from '@/types/supabase';
import { Edit, Wrench, Box, Camera, Video, Mic, Speaker, Monitor, Laptop, Lightbulb, Aperture, AirVent, Cable, Puzzle, Car, RotateCcw } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// Category icon and color mapping
const categoryIcons: Record<string, LucideIcon> = {
  camera: Camera,
  lens: Aperture,
  drone: AirVent,
  audio: Speaker,
  laptop: Laptop,
  monitor: Monitor,
  cables: Cable,
  lighting: Lightbulb,
  tripod: Video,
  accessory: Puzzle,
  cars: Car,
  gimbal: RotateCcw,
  microphone: Mic,
  computer: Monitor,
  other: Box,
};

// Helper function to get an icon based on category
const getCategoryIcon = (category?: string, size = 24) => {
  const key = (category || '').toLowerCase();
  const Icon = categoryIcons[key] || Box;
  return <Icon size={size} className="text-muted-foreground" />;
};

interface GearDetailsModalProps {
  isGearDetailsOpen: boolean;
  setIsGearDetailsOpen: (isOpen: boolean) => void;
  selectedGear: Gear | null;
  handleOpenMaintenance: (gear: Gear) => void;
  handleOpenEditDialog: (gear: Gear) => void;
}

export function GearDetailsModal({
  isGearDetailsOpen,
  setIsGearDetailsOpen,
  selectedGear,
  handleOpenMaintenance,
  handleOpenEditDialog,
}: GearDetailsModalProps) {
  return (
    <Dialog open={isGearDetailsOpen} onOpenChange={setIsGearDetailsOpen}>
      <DialogContent className="sm:max-w-[625px] w-[95vw] max-w-full">
        <DialogHeader>
          <DialogTitle>Gear Details</DialogTitle>
          <DialogDescription>
            View complete information for {selectedGear?.name}.
          </DialogDescription>
        </DialogHeader>
        {selectedGear && (
          <div className="grid gap-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-md bg-muted flex items-center justify-center overflow-hidden border shadow-sm">
                {selectedGear.image_url ? (
                  <img
                    src={selectedGear.image_url}
                    alt={selectedGear.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getCategoryIcon(selectedGear.category, 36)
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{selectedGear.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {getCategoryIcon(selectedGear.category, 16)}
                  <p className="text-sm text-muted-foreground">{selectedGear.category}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-muted/20 p-4 rounded-lg border">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                <span className={`mt-1 inline-block px-2 py-1 rounded-full text-xs font-medium ${selectedGear.status === 'Available' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100' :
                  selectedGear.status === 'Booked' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-100' :
                    selectedGear.status === 'Damaged' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-100' :
                      selectedGear.status === 'Under Repair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-100' :
                        selectedGear.status === 'New' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-100' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                  {selectedGear.status}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Serial Number</h4>
                <p className="mt-1 font-mono text-sm">{selectedGear.serial_number || 'N/A'}</p>
              </div>

              {selectedGear.description && (
                <div className="col-span-1 sm:col-span-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                  <p className="mt-1 text-sm">{selectedGear.description}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Added On</h4>
                <p className="mt-1 text-sm">{selectedGear.created_at ? new Date(selectedGear.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Last Updated</h4>
                <p className="mt-1 text-sm">{selectedGear.updated_at ? new Date(selectedGear.updated_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => handleOpenMaintenance(selectedGear)}>
                <Wrench className="mr-2 h-4 w-4 text-yellow-600" />
                Maintenance
              </Button>
              <Button onClick={() => {
                handleOpenEditDialog(selectedGear);
                setIsGearDetailsOpen(false);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Gear
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
