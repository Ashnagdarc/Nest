import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from '@/lib/supabase/client';
import { subscribeToTable } from '@/lib/utils/realtime-utils';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { apiGet } from '@/lib/apiClient';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

export function NotificationsSection() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    // Fetch notifications
    const fetchNotifications = async () => {
        const { data, error } = await apiGet<{ data: Notification[]; error: string | null }>(`/api/notifications?limit=10`);
        if (error) {
            console.error('Error fetching notifications:', error);
            return;
        }
        setNotifications(data || []);
        setIsLoading(false);
    };

    // Set up real-time subscription
    useEffect(() => {
        fetchNotifications();

        const subscription = subscribeToTable('notifications', '*', (payload) => {
            if (payload.eventType === 'INSERT') {
                setNotifications(prev => [payload.new, ...prev].slice(0, 10));
            } else if (payload.eventType === 'UPDATE') {
                setNotifications(prev =>
                    prev.map(notif =>
                        notif.id === payload.new.id ? payload.new : notif
                    )
                );
            }
        });

        return () => {
            if (subscription) {
                subscription.channel.unsubscribe();
            }
        };
    }, []);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-bold">Recent Notifications</CardTitle>
                <Bell className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        No recent notifications
                    </p>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 rounded-lg border ${notification.is_read ? 'bg-background' : 'bg-muted/50'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold">{notification.title}</h4>
                                    <Badge variant={getVariantForType(notification.type)}>
                                        {notification.type}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                    {notification.message}
                                </p>
                                <time className="text-xs text-muted-foreground">
                                    {format(new Date(notification.created_at), 'PPp')}
                                </time>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function getVariantForType(type: string): "default" | "secondary" | "destructive" | "outline" {
    switch (type.toLowerCase()) {
        case 'error':
            return 'destructive';
        case 'warning':
            return 'secondary';
        case 'success':
            return 'default';
        default:
            return 'outline';
    }
}
