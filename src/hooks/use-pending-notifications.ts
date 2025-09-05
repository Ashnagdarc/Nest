"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PendingNotification {
    type: 'request' | 'checkin' | 'notification';
    count: number;
    message: string;
}

export function usePendingNotifications(userId?: string, userRole?: string) {
    const [pendingItems, setPendingItems] = useState<PendingNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();
    const { toast } = useToast();

    useEffect(() => {
        console.log('🔍 usePendingNotifications hook triggered:', { userId, userRole });
        if (!userId || !userRole) {
            console.log('❌ Missing userId or userRole, skipping fetch');
            setIsLoading(false);
            return;
        }

        const checkPendingItems = async () => {
            try {
                const pendingNotifications: PendingNotification[] = [];

                if (userRole === 'Admin') {
                    console.log('🔍 Checking admin pending items...');
                    // Check for pending requests
                    const { data: requests, error: requestsError } = await supabase
                        .from('gear_requests')
                        .select('id')
                        .eq('status', 'Pending');

                    console.log('📋 Pending requests:', { requests, requestsError });

                    if (!requestsError && requests && requests.length > 0) {
                        pendingNotifications.push({
                            type: 'request',
                            count: requests.length,
                            message: `${requests.length} pending gear request${requests.length > 1 ? 's' : ''} need${requests.length === 1 ? 's' : ''} approval`
                        });
                    }

                    // Check for pending check-ins
                    const { data: checkins, error: checkinsError } = await supabase
                        .from('checkins')
                        .select('id')
                        .eq('status', 'Pending Admin Approval');

                    console.log('📦 Pending check-ins:', { checkins, checkinsError });

                    if (!checkinsError && checkins && checkins.length > 0) {
                        pendingNotifications.push({
                            type: 'checkin',
                            count: checkins.length,
                            message: `${checkins.length} gear check-in${checkins.length > 1 ? 's' : ''} need${checkins.length === 1 ? 's' : ''} approval`
                        });
                    }
                } else {
                    console.log('🔍 Checking user unread notifications...');
                    // For regular users, check for unread notifications
                    const { data: notifications, error: notificationsError } = await supabase
                        .from('notifications')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('is_read', false);

                    console.log('🔔 User notifications:', { notifications, notificationsError });

                    if (!notificationsError && notifications && notifications.length > 0) {
                        pendingNotifications.push({
                            type: 'notification',
                            count: notifications.length,
                            message: `You have ${notifications.length} unread notification${notifications.length > 1 ? 's' : ''}`
                        });
                    }
                }

                console.log('✅ Final pending notifications:', pendingNotifications);
                setPendingItems(pendingNotifications);
            } catch (error) {
                console.error('❌ Error checking pending notifications:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkPendingItems();
    }, [userId, userRole, supabase]);

    const showPendingNotificationsToast = async () => {
        // Wait for data to load if still loading
        if (isLoading) {
            console.log('⏳ Waiting for pending notifications data to load...');
            // Wait a bit for the data to load
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('🔍 Pending items:', pendingItems);

        if (pendingItems.length === 0) {
            console.log('✅ No pending items found');
            return;
        }

        const totalCount = pendingItems.reduce((sum, item) => sum + item.count, 0);
        const messages = pendingItems.map(item => item.message).join(', ');

        console.log('📢 Showing toast for pending items:', { totalCount, messages });

        toast({
            title: `You have ${totalCount} pending item${totalCount > 1 ? 's' : ''}`,
            description: messages,
            variant: 'default',
            duration: 5000,
        });
    };

    return {
        pendingItems,
        isLoading,
        showPendingNotificationsToast,
        totalPendingCount: pendingItems.reduce((sum, item) => sum + item.count, 0)
    };
}
