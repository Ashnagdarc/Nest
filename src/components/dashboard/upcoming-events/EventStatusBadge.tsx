/**
 * Event Status Badge Component
 * 
 * Displays status badges for events with appropriate colors and styling.
 */

import { Badge } from "@/components/ui/badge";
import { Event } from "@/hooks/user-dashboard/use-upcoming-events";

interface EventStatusBadgeProps {
    event: Event;
}

export function EventStatusBadge({ event }: EventStatusBadgeProps) {
    const getStatusColor = (status: Event["status"]) => {
        switch (status) {
            case "overdue":
                return "bg-red-500 text-white";
            case "today":
                return "bg-yellow-500 text-black";
            case "upcoming":
                return "bg-blue-500 text-white";
            default:
                return "bg-gray-500 text-white";
        }
    };

    const getStatusText = (event: Event) => {
        if (event.status === "overdue") {
            return event.type === "return" ? "Overdue Return" : "Overdue";
        }
        if (event.status === "today") {
            return event.type === "return" ? "Due Today" : "Today";
        }
        return event.type === "return" ? "Upcoming Return" :
            event.type === "pickup" ? "Ready for Pickup" : "Scheduled";
    };

    return (
        <Badge className={getStatusColor(event.status)}>
            {getStatusText(event)}
        </Badge>
    );
} 