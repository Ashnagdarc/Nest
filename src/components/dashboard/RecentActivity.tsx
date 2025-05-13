import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Package, ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityItem {
    id: string;
    type: "checkout" | "return" | "request";
    item: string;
    timestamp: string;
    status: string;
}

export function RecentActivity() {
    // This would normally fetch from your backend
    const activities: ActivityItem[] = [
        {
            id: "1",
            type: "checkout",
            item: "Sony A7III Camera",
            timestamp: "2024-03-24T15:30:00",
            status: "Checked out successfully"
        },
        {
            id: "2",
            type: "return",
            item: "Lighting Kit",
            timestamp: "2024-03-24T14:00:00",
            status: "Returned in good condition"
        },
        {
            id: "3",
            type: "request",
            item: "Audio Recording Set",
            timestamp: "2024-03-24T10:00:00",
            status: "Request pending approval"
        }
    ];

    const getActivityIcon = (type: ActivityItem["type"]) => {
        switch (type) {
            case "checkout":
                return <Package className="h-4 w-4 text-blue-500" />;
            case "return":
                return <ArrowUpDown className="h-4 w-4 text-green-500" />;
            case "request":
                return <Activity className="h-4 w-4 text-orange-500" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                        {activities.map((activity, index) => (
                            <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                            >
                                <div className="p-2 rounded-full bg-background">
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm truncate">{activity.item}</h4>
                                        <span className="text-xs text-muted-foreground">
                                            {formatTimestamp(activity.timestamp)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {activity.status}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
} 