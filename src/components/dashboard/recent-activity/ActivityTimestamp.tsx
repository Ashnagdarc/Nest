/**
 * Activity Timestamp Component
 * 
 * Handles consistent timestamp formatting for activities.
 */

import { formatDistanceToNow, format } from "date-fns";

interface ActivityTimestampProps {
    timestamp: string;
    className?: string;
}

export function ActivityTimestamp({ timestamp, className = "text-xs text-muted-foreground" }: ActivityTimestampProps) {
    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

            if (diffInHours < 24) {
                return formatDistanceToNow(date, { addSuffix: true });
            } else {
                return format(date, 'MMM d, yyyy');
            }
        } catch (error) {
            return 'Invalid date';
        }
    };

    return (
        <span className={className}>
            {formatTimestamp(timestamp)}
        </span>
    );
} 