import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Event {
    id: string;
    title: string;
    date: string;
    type: "return" | "pickup" | "maintenance";
    status: "upcoming" | "overdue" | "today";
}

export function UpcomingEvents() {
    // This would normally fetch from your backend
    const events: Event[] = [
        {
            id: "1",
            title: "Camera Equipment Return",
            date: "2024-03-25T14:00:00",
            type: "return",
            status: "upcoming"
        },
        {
            id: "2",
            title: "Lighting Kit Pickup",
            date: "2024-03-24T10:00:00",
            type: "pickup",
            status: "today"
        },
        {
            id: "3",
            title: "Audio Equipment Maintenance",
            date: "2024-03-23T09:00:00",
            type: "maintenance",
            status: "overdue"
        }
    ];

    const getStatusColor = (status: Event["status"]) => {
        switch (status) {
            case "upcoming":
                return "bg-blue-500/10 text-blue-500";
            case "today":
                return "bg-green-500/10 text-green-500";
            case "overdue":
                return "bg-red-500/10 text-red-500";
            default:
                return "bg-gray-500/10 text-gray-500";
        }
    };

    const getTypeIcon = (type: Event["type"]) => {
        switch (type) {
            case "return":
                return "↩️";
            case "pickup":
                return "📦";
            case "maintenance":
                return "🔧";
            default:
                return "📅";
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Events
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                        {events.map((event, index) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                            >
                                <div className="text-2xl">{getTypeIcon(event.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate">{event.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(event.date)}
                                        </span>
                                    </div>
                                </div>
                                <Badge className={getStatusColor(event.status)}>
                                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                </Badge>
                            </motion.div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
} 