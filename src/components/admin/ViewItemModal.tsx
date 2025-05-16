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
import { Check, X, Calendar, Tag, Info, Package, Hash } from 'lucide-react';

interface ViewItemModalProps {
    item: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

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
                        <span>{item.category || 'Uncategorized'}</span>
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