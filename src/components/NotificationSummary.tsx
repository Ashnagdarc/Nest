"use client";

import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NotificationSummaryProps {
    userType: 'admin' | 'user';
    userId?: string;
    className?: string;
}

export function NotificationSummary({ userType, userId, className = "" }: NotificationSummaryProps) {
    const [pendingCount, setPendingCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchPendingCount = async () => {
            try {
                if (userType === 'admin') {
                    // For admins, count pending requests and check-ins
                    const [requestsResult, checkinsResult] = await Promise.all([
                        supabase
                            .from('gear_requests')
                            .select('id', { count: 'exact' })
                            .eq('status', 'Pending'),
                        supabase
                            .from('checkins')
                            .select('id', { count: 'exact' })
                            .eq('status', 'Pending Admin Approval')
                    ]);

                    const requestsCount = requestsResult.count || 0;
                    const checkinsCount = checkinsResult.count || 0;
                    setPendingCount(requestsCount + checkinsCount);
                } else if (userId) {
                    // For users, count unread notifications
                    const { count } = await supabase
                        .from('notifications')
                        .select('id', { count: 'exact' })
                        .eq('user_id', userId)
                        .eq('is_read', false);

                    setPendingCount(count || 0);
                }
            } catch (error) {
                console.error('Error fetching pending count:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPendingCount();

        // Set up real-time subscription
        const channel = supabase
            .channel('notification-summary-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: userType === 'admin' ? 'gear_requests' : 'notifications'
                },
                () => {
                    fetchPendingCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userType, userId, supabase]);

    const handleClick = () => {
        const notificationsPath = userType === 'admin' ? '/admin/notifications' : '/user/notifications';
        router.push(notificationsPath);
    };

    if (isLoading) {
        return (
            <Card className={className}>
                <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                        <Bell className="h-4 w-4 animate-pulse" />
                        <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (pendingCount === 0) {
        return (
            <Card className={className}>
                <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">All caught up!</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`cursor-pointer hover:bg-muted/50 transition-colors ${className}`} onClick={handleClick}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">
                            {pendingCount} pending item{pendingCount > 1 ? 's' : ''}
                        </span>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                        {pendingCount}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}
