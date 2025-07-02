/**
 * Request Status Badge Component
 * 
 * A reusable status badge component that displays request status
 * with consistent color coding and visual indicators.
 * 
 * @component
 */

import { Badge } from "@/components/ui/badge";

interface RequestStatusBadgeProps {
    status: string;
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
    switch (status.toLowerCase()) {
        case 'new':
            return <Badge className="bg-green-500">New</Badge>;
        case 'pending':
            return <Badge className="bg-blue-500">Pending</Badge>;
        case 'approved':
            return <Badge className="bg-purple-500">Approved</Badge>;
        case 'checked_out':
            return <Badge className="bg-orange-500">Checked Out</Badge>;
        case 'overdue':
            return <Badge className="bg-red-500">Overdue</Badge>;
        case 'returned':
            return <Badge className="bg-gray-500">Returned</Badge>;
        case 'partially_returned':
            return <Badge className="bg-yellow-500">Partially Returned</Badge>;
        case 'cancelled':
            return <Badge className="bg-red-500">Cancelled</Badge>;
        case 'rejected':
            return <Badge className="bg-red-500">Rejected</Badge>;
        default:
            return <Badge>{status}</Badge>;
    }
} 