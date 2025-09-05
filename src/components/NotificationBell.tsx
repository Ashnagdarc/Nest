"use client";

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NotificationBellProps {
    userType: 'admin' | 'user';
    className?: string;
}

export function NotificationBell({ userType, className = "" }: NotificationBellProps) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const { data, error } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('is_read', false);

                if (error) {
                    console.error('Error fetching unread notifications:', error);
                    return;
                }

                setUnreadCount(data?.length || 0);
            } catch (error) {
                console.error('Error fetching unread count:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUnreadCount();

        // Set up real-time subscription for notifications
        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications'
                },
                () => {
                    fetchUnreadCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const handleNotificationClick = () => {
        const notificationsPath = userType === 'admin' ? '/admin/notifications' : '/user/notifications';
        router.push(notificationsPath);
    };

    if (isLoading) {
        return (
            <Button variant="ghost" size="sm" className={`relative ${className}`} disabled>
                <Bell className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            className={`relative ${className}`}
            onClick={handleNotificationClick}
            title={`${unreadCount} unread notifications`}
        >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
                <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                    {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
            )}
        </Button>
    );
}
