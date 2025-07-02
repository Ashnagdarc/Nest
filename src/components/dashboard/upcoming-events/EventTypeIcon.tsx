/**
 * Event Type Icon Component
 * 
 * Displays appropriate icons for different event types.
 */

import { Calendar, Clock, ArrowUpDown } from "lucide-react";
import { Event } from "@/hooks/user-dashboard/use-upcoming-events";

interface EventTypeIconProps {
    type: Event["type"];
    className?: string;
}

export function EventTypeIcon({ type, className = "h-4 w-4" }: EventTypeIconProps) {
    const getTypeIcon = (type: Event["type"]) => {
        switch (type) {
            case "return":
                return <ArrowUpDown className={`${className} text-orange-500`} />;
            case "pickup":
                return <Calendar className={`${className} text-green-500`} />;
            case "maintenance":
                return <Clock className={`${className} text-blue-500`} />;
            default:
                return <Calendar className={`${className} text-gray-500`} />;
        }
    };

    return getTypeIcon(type);
} 