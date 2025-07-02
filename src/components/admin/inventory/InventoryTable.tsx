/**
 * Inventory Table Component
 * 
 * Displays equipment inventory in a table format with actions.
 * Handles sorting, filtering, and equipment item actions.
 * 
 * @component
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EquipmentStatusBadge } from './EquipmentStatusBadge';

interface InventoryItem {
    id: string;
    name: string;
    category?: string;
    status: string;
    serial_number?: string;
}

interface InventoryTableProps {
    items: InventoryItem[];
    onViewItem: (item: InventoryItem) => void;
    onEditItem: (item: InventoryItem) => void;
}

export function InventoryTable({ items, onViewItem, onEditItem }: InventoryTableProps) {
    if (items.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No inventory items found
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.category || 'Uncategorized'}</TableCell>
                            <TableCell>
                                <EquipmentStatusBadge status={item.status} />
                            </TableCell>
                            <TableCell>{item.serial_number || 'N/A'}</TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onViewItem(item)}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onEditItem(item)}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
} 