/**
 * Activity Icon Component
 * 
 * Displays appropriate icons for different activity types.
 */

import { Activity, Package, ArrowUpDown } from "lucide-react";
import { ActivityItem } from "@/hooks/user-dashboard/use-recent-activity";

interface ActivityIconProps {
    type: ActivityItem["type"];
    className?: string;
}

export function ActivityIcon({ type, className = "h-4 w-4" }: ActivityIconProps) {
    const getActivityIcon = (type: ActivityItem["type"]) => {
        switch (type) {
            case "checkout":
                return <Package className={`${className} text-green-500`} />;
            case "return":
                return <ArrowUpDown className={`${className} text-blue-500`} />;
            case "request":
                return <Activity className={`${className} text-yellow-500`} />;
            default:
                return <Activity className={`${className} text-gray-500`} />;
        }
    };

    return getActivityIcon(type);
} 