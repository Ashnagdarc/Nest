/**
 * Inventory Actions Component
 * 
 * Action buttons for inventory management operations.
 * Provides refresh and add equipment functionality.
 * 
 * @component
 */

import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';

interface InventoryActionsProps {
    onRefresh: () => void;
    onAddEquipment?: () => void;
}

export function InventoryActions({ onRefresh, onAddEquipment }: InventoryActionsProps) {
    return (
        <div className="flex gap-2">
            <Button
                onClick={onRefresh}
                variant="outline"
            >
                Refresh
            </Button>
            <Button
                variant="outline"
                onClick={onAddEquipment}
            >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Equipment
            </Button>
        </div>
    );
} 