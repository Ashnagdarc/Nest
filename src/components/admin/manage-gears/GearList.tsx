"use client";

import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Wrench, Box, Camera, Video, Mic, Speaker, Monitor, Laptop, Lightbulb, Aperture, AirVent, Cable, Puzzle, Car, RotateCcw } from 'lucide-react';
import { Gear } from '@/types/supabase';
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
const categoryColors: Record<string, string> = {
  camera: 'bg-blue-100 text-blue-800',
  lens: 'bg-purple-100 text-purple-800',
  drone: 'bg-cyan-100 text-cyan-800',
  audio: 'bg-green-100 text-green-800',
  laptop: 'bg-indigo-100 text-indigo-800',
  monitor: 'bg-teal-100 text-teal-800',
  cables: 'bg-yellow-100 text-yellow-800',
  lighting: 'bg-orange-100 text-orange-800',
  tripod: 'bg-pink-100 text-pink-800',
  accessory: 'bg-gray-100 text-gray-800',
  cars: 'bg-red-100 text-red-800',
  gimbal: 'bg-fuchsia-100 text-fuchsia-800',
  microphone: 'bg-emerald-100 text-emerald-800',
  computer: 'bg-slate-100 text-slate-800',
  other: 'bg-gray-200 text-gray-700',
};

// Helper function to get an icon based on category
const getCategoryIcon = (category?: string, size = 24) => {
  const key = (category || '').toLowerCase();
  const Icon = categoryIcons[key] || Box;
  return <Icon size={size} className="text-muted-foreground" />;
};

const getCategoryBadgeClass = (category?: string) => {
  const key = (category || '').toLowerCase();
  return categoryColors[key] || 'bg-gray-200 text-gray-700';
};


interface GearListProps {
  gears: Gear[];
  loading: boolean;
  selectedGearIds: string[];
  handleSelectAll: (checked: boolean) => void;
  handleSelectOne: (id: string, checked: boolean) => void;
  handleOpenGearDetails: (gear: Gear) => void;
  handleOpenEditDialog: (gear: Gear) => void;
  handleDeleteGear: (gear: Gear) => void;
  handleOpenMaintenance: (gear: Gear) => void;
  filteredGears: Gear[];
}

export function GearList({
  gears,
  loading,
  selectedGearIds,
  handleSelectAll,
  handleSelectOne,
  handleOpenGearDetails,
  handleOpenEditDialog,
  handleDeleteGear,
  handleOpenMaintenance,
  filteredGears,
}: GearListProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <>
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
            <p className="text-muted-foreground">Loading gear items...</p>
          </div>
        </div>
      ) : filteredGears.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="inline-flex h-10 w-10 rounded-full bg-muted items-center justify-center mb-3">
            <Box className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-1">No gear items found matching your filters.</p>
          <Button
            variant="link"
            onClick={() => {
              // This should be handled by the parent component
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="overflow-x-auto rounded-md border"
        >
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[40px]">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-muted-foreground/30"
                      checked={selectedGearIds.length === filteredGears.length && filteredGears.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </div>
                </TableHead>
                <TableHead className="w-[50px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Quantity</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGears.map((gear) => (
                <TableRow
                  key={gear.id}
                  className="cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => handleOpenGearDetails(gear)}
                >
                  <TableCell className="p-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-muted-foreground/30"
                        checked={selectedGearIds.includes(gear.id)}
                        onChange={(e) => handleSelectOne(gear.id, e.target.checked)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden border shadow-sm">
                      {gear.image_url ? (
                        <img
                          src={gear.image_url}
                          alt={gear.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getCategoryIcon(gear.category, 20)
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{gear.name}</span>
                      <span className="text-xs text-muted-foreground md:hidden">{gear.category}</span>
                      <span className="text-xs md:hidden mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${gear.status === "Available"
                          ? "bg-green-100 text-green-800"
                          : gear.status === "Damaged"
                            ? "bg-red-100 text-red-800"
                            : gear.status === "Under Repair"
                              ? "bg-yellow-100 text-yellow-800"
                              : gear.status === "Checked Out"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}>
                          {gear.status}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="inline-flex items-center gap-2">
                      {getCategoryIcon(gear.category, 16)}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs ${getCategoryBadgeClass(gear.category)}`}>
                        {getCategoryIcon(gear.category, 14)}
                        {gear.category}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${gear.status === "Available"
                        ? "bg-green-100 text-green-800"
                        : gear.status === "Damaged"
                          ? "bg-red-100 text-red-800"
                          : gear.status === "Under Repair"
                            ? "bg-yellow-100 text-yellow-800"
                            : gear.status === "Checked Out"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {gear.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {typeof gear.available_quantity === 'number' && typeof gear.quantity === 'number'
                      ? `${gear.available_quantity} / ${gear.quantity}`
                      : typeof gear.quantity === 'number'
                        ? gear.quantity
                        : '—'}
                  </TableCell>
                  <TableCell className="text-right p-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditDialog(gear);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGear(gear);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-yellow-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenMaintenance(gear);
                        }}
                      >
                        <Wrench className="h-3.5 w-3.5 text-yellow-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}
    </>
  );
}
