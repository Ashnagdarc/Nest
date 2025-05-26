import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, X, Calendar, Tag, Info, Package, Hash, Camera, Aperture, AirVent, Speaker, Laptop, Monitor, Cable, Lightbulb, Video, Puzzle, Car, RotateCcw, Mic, Box } from 'lucide-react';

interface ViewItemModalProps {
    item: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const categoryIcons: Record<string, any> = {
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

const getCategoryIcon = (category?: string, size = 16) => {
    const key = (category || '').toLowerCase();
    const Icon = categoryIcons[key] || Box;
    return <Icon size={size} className="inline-block mr-1 align-text-bottom text-muted-foreground" />;
};

const getCategoryBadgeClass = (category?: string) => {
    const key = (category || '').toLowerCase();
    return categoryColors[key] || 'bg-gray-200 text-gray-700';
};

export function ViewItemModal({ item, open, onOpenChange }: ViewItemModalProps) {
    if (!item) return null;

    const getStatusBadge = (status: string) => {
        switch (String(status || '').toLowerCase()) {
            case 'available':
                return <Badge className="bg-green-500">Available</Badge>;
            case 'checked_out':
            case 'checked out':
                return <Badge className="bg-orange-500">Checked Out</Badge>;
            case 'maintenance':
            case 'repair':
                return <Badge className="bg-yellow-500">Maintenance</Badge>;
            case 'damaged':
                return <Badge className="bg-red-500">Damaged</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" /> {item.name}
                    </DialogTitle>
                    <DialogDescription>Item details</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Category:</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs ${getCategoryBadgeClass(item.category)}`}>
                            {getCategoryIcon(item.category, 12)}
                            {item.category || 'Uncategorized'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Status:</span>
                        {getStatusBadge(item.status)}
                    </div>

                    {item.serial_number && (
                        <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Serial Number:</span>
                            <span>{item.serial_number}</span>
                        </div>
                    )}

                    {item.purchase_date && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Purchase Date:</span>
                            <span>{new Date(item.purchase_date).toLocaleDateString()}</span>
                        </div>
                    )}

                    <Separator />

                    {item.description && (
                        <div className="space-y-2">
                            <h3 className="font-medium">Description</h3>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                    )}

                    {item.notes && (
                        <div className="space-y-2">
                            <h3 className="font-medium">Notes</h3>
                            <p className="text-sm text-muted-foreground">{item.notes}</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 