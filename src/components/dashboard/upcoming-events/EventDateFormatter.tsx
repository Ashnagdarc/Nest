/**
 * Event Date Formatter Component
 * 
 * Handles consistent date formatting for events with relative time display.
 */

import { format, isToday, isThisWeek, isAfter, addDays } from 'date-fns';
import { Event } from "@/hooks/user-dashboard/use-upcoming-events";

interface EventDateFormatterProps {
    date: string;
    status: Event["status"];
    className?: string;
}

export function EventDateFormatter({ date, status, className = "" }: EventDateFormatterProps) {
    const formatDate = (dateStr: string) => {
        try {
            const eventDate = new Date(dateStr);
            const now = new Date();

            if (isToday(eventDate)) {
                return `Today at ${format(eventDate, 'h:mm a')}`;
            }

            if (isThisWeek(eventDate)) {
                return format(eventDate, 'EEEE, MMM d');
            }

            return format(eventDate, 'MMM d, yyyy');
        } catch (error) {
            return 'Invalid date';
        }
    };

    const getDateClassName = () => {
        const baseClass = `text-sm ${className}`;

        switch (status) {
            case "overdue":
                return `${baseClass} text-red-600 font-medium`;
            case "today":
                return `${baseClass} text-yellow-600 font-medium`;
            case "upcoming":
                return `${baseClass} text-muted-foreground`;
            default:
                return `${baseClass} text-muted-foreground`;
        }
    };

    return (
        <span className={getDateClassName()}>
            {formatDate(date)}
        </span>
    );
} 