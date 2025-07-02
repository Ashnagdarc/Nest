/**
 * Equipment Status Badge Component
 * 
 * A reusable status badge component that displays equipment status
 * with consistent color coding and visual indicators.
 * 
 * @component
 */

import { Badge } from "@/components/ui/badge";

interface EquipmentStatusBadgeProps {
    status: string;
}

export function EquipmentStatusBadge({ status }: EquipmentStatusBadgeProps) {
    const statusLower = String(status || '').toLowerCase();

    switch (statusLower) {
        case 'available':
            return <Badge className="bg-green-500 hover:bg-green-600">Available</Badge>;
        case 'checked_out':
        case 'checked out':
            return <Badge className="bg-orange-500 hover:bg-orange-600">Checked Out</Badge>;
        case 'maintenance':
        case 'repair':
        case 'under repair':
            return <Badge className="bg-yellow-500 hover:bg-yellow-600">Maintenance</Badge>;
        case 'damaged':
            return <Badge className="bg-red-500 hover:bg-red-600">Damaged</Badge>;
        case 'booked':
        case 'reserved':
            return <Badge className="bg-blue-500 hover:bg-blue-600">Booked</Badge>;
        default:
            return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
} 