import React from 'react';
import { Badge } from '@/components/ui/badge';

interface GearAvailabilityBadgeProps {
    quantity?: number;
    availableQuantity?: number;
    status?: string;
}

export function GearAvailabilityBadge({ quantity = 1, availableQuantity, status }: GearAvailabilityBadgeProps) {
    // If available quantity is not provided, calculate it based on status
    const effectiveAvailableQuantity = availableQuantity !== undefined
        ? availableQuantity
        : status === 'Available' ? quantity : 0;

    // Determine badge color based on availability
    let badgeVariant: 'default' | 'outline' | 'secondary' | 'destructive' = 'default';

    if (effectiveAvailableQuantity === 0) {
        badgeVariant = 'destructive';
    } else if (effectiveAvailableQuantity < quantity) {
        badgeVariant = 'secondary';
    }

    return (
        <Badge variant={badgeVariant} className="text-xs font-medium">
            {effectiveAvailableQuantity} of {quantity} available
        </Badge>
    );
}
