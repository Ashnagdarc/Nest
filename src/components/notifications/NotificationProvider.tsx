"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { RealtimeChannel, User } from '@supabase/supabase-js';
import {
    playNotificationSound,
    setNotificationReminder,
    clearNotificationReminder,
    clearAllNotificationReminders,
    loadSoundPreferences,
    playLoginNotificationSound
} from '@/lib/soundUtils';

type Notification = {
    id: string;
    type: 'gear' | 'profile' | 'system';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
};

type DbNotification = {
    id: string;
    user_id: string;
    type: string;
    title?: string;
    message: string;
    read: boolean;
    link?: string;
    created_at: string;
    updated_at?: string;
};

type NotificationContextType = {
    notifications: Notification[];
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    unreadCount: number;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { toast } = useToast();
    const supabase = createClient();
    const [userId, setUserId] = useState<string | null>(null);
    const [isFirstLogin, setIsFirstLogin] = useState(true);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Add effect to track user interaction
    useEffect(() => {
        const handleUserInteraction = () => {
            setHasUserInteracted(true);
            // Remove listeners after first interaction
            window.removeEventListener('click', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
        };

        window.addEventListener('click', handleUserInteraction);
        window.addEventListener('keydown', handleUserInteraction);
        window.addEventListener('touchstart', handleUserInteraction);

        return () => {
            window.removeEventListener('click', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
        };
    }, []);

    useEffect(() => {
        // Load sound preferences on mount
        loadSoundPreferences();

        // Get current user
        supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
            if (user?.id) {
                setUserId(user.id);
            }
        });

        // Cleanup all reminders on unmount
        return () => {
            clearAllNotificationReminders();
        };
    }, [supabase]);

    // Map DB notification to UI notification
    const mapDbNotificationToUi = useCallback((n: DbNotification): Notification => {
        let title = n.title || 'Notification';
        let message = n.message;

        if (n.type === 'info') {
            title = 'Information';
        } else if (n.type === 'success') {
            title = 'Success';
        } else if (n.type === 'warning') {
            title = 'Warning';
        } else if (n.type === 'error') {
            title = 'Error';
        }

        return {
            id: n.id,
            type: n.type as 'gear' | 'profile' | 'system',
            title,
            message,
            read: n.read,
            created_at: n.created_at,
        };
    }, []);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching notifications:", error);
                return;
            }

            if (data) {
                const mappedData = data.map(mapDbNotificationToUi);
                setNotifications(mappedData);

                // Play login sound if this is first login and there are unread notifications
                if (isFirstLogin && hasUserInteracted) {
                    const hasUnread = data.some((n: DbNotification) => !n.read);
                    const hasNewAnnouncements = data.some((n: DbNotification) =>
                        !n.read &&
                        (n.type === 'system' || n.message.toLowerCase().includes('announcement'))
                    );

                    if (hasNewAnnouncements) {
                        // Play the login notification sound for announcements
                        playLoginNotificationSound();
                    }

                    setIsFirstLogin(false);

                    // Set up reminders for unread notifications
                    data.filter((notification: DbNotification) => !notification.read).forEach((notification: DbNotification) => {
                        setNotificationReminder(notification.id);
                    });
                } else if (isFirstLogin && !hasUserInteracted) {
                    toast({
                        title: "Sound Playback",
                        description: "Please interact with the page first (click anywhere) to enable notification sounds.",
                        variant: "default",
                    });
                }
            }
        } catch (error) {
            console.error("Error in fetchNotifications:", error);
        }
    }, [userId, mapDbNotificationToUi, isFirstLogin, hasUserInteracted, toast]);

    const markAsRead = useCallback(async (id: string) => {
        if (!userId) return;

        try {
            console.log(`Attempting to mark notification ${id} as read for user ${userId}`);

            // Clear any reminder for this notification immediately for better UX
            clearNotificationReminder(id);

            // Add immediate visual feedback by updating UI first
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, read: true } : n))
            );

            // Use the API endpoint instead of direct Supabase calls
            console.log("Using server-side API to mark notification as read");
            const response = await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notificationId: id }),
                credentials: 'include', // Ensure cookies are sent
            });

            const result = await response.json();

            if (response.ok) {
                console.log("Successfully marked notification as read via API:", result);
            } else {
                console.error("API error marking notification as read:", result.error);

                // Try direct RPC function calls first which have SECURITY DEFINER
                console.log("Falling back to RPC function call");
                try {
                    const { data: rpcData, error: rpcError } = await supabase.rpc('mark_notification_as_read', {
                        notification_id: id
                    });

                    if (!rpcError) {
                        console.log("Successfully marked notification as read via RPC function");
                        return;
                    } else {
                        console.error("RPC function failed:", rpcError);
                    }
                } catch (rpcException) {
                    console.error("Exception in RPC function:", rpcException);
                }

                // Fallback to direct Supabase call if the API and RPC fail
                console.log("Falling back to direct update");
                const { error } = await supabase
                    .from('notifications')
                    .update({
                        read: true,
                        updated_at: new Date().toISOString(),
                        last_error: 'API failed, using direct update'
                    })
                    .eq('id', id);

                if (error) {
                    console.error("Direct update failed:", error);

                    // Last resort - try with no user_id filter
                    try {
                        console.log("Trying force_mark_notification_read function as last resort");
                        const { error: forceError } = await supabase.rpc('force_mark_notification_read', {
                            p_notification_id: id
                        });

                        if (forceError) {
                            console.error("Even force function failed:", forceError);
                        } else {
                            console.log("Successfully marked notification as read via force function");
                        }
                    } catch (forceException) {
                        console.error("Exception in force function:", forceException);
                    }
                }
            }
        } catch (error) {
            console.error("Exception in markAsRead:", error);
        }
    }, [userId, supabase, clearNotificationReminder]);

    const markAllAsRead = useCallback(async () => {
        if (!userId) return;

        const unreadIds = notifications
            .filter(n => !n.read)
            .map(n => n.id);

        if (unreadIds.length === 0) return;

        try {
            console.log("Marking all notifications as read:", unreadIds.length, "notifications");

            // Update UI immediately for better UX
            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            );

            // Clear all reminders immediately
            clearAllNotificationReminders();

            // Use the API endpoint instead of direct Supabase calls
            console.log("Using server-side API to mark all notifications as read");
            const response = await fetch('/api/notifications/mark-read', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Ensure cookies are sent
            });

            const result = await response.json();

            if (response.ok) {
                console.log("Successfully marked all notifications as read via API:", result);
            } else {
                console.error("API error marking all notifications as read:", result.error);

                // Try RPC function call first as fallback
                console.log("Falling back to RPC function call");
                try {
                    const { data: rpcData, error: rpcError } = await supabase.rpc('mark_all_notifications_as_read');

                    if (!rpcError) {
                        console.log("Successfully marked all notifications as read via RPC function, count:", rpcData);
                        return;
                    } else {
                        console.error("RPC function failed:", rpcError);
                    }
                } catch (rpcException) {
                    console.error("Exception in RPC function:", rpcException);
                }

                // Fallback to direct Supabase call if the API and RPC call fail
                console.log("Falling back to direct update");
                const { error } = await supabase
                    .from('notifications')
                    .update({
                        read: true,
                        updated_at: new Date().toISOString(),
                        last_error: 'API failed, using direct update'
                    })
                    .eq('user_id', userId)
                    .in('id', unreadIds);

                if (error) {
                    console.error("Direct update failed:", error);

                    // Last resort - try updating each notification individually using the force function
                    console.log("Trying to mark each notification individually as last resort");
                    let successCount = 0;

                    for (const notificationId of unreadIds) {
                        try {
                            const { error: forceError } = await supabase.rpc('force_mark_notification_read', {
                                p_notification_id: notificationId
                            });

                            if (!forceError) {
                                successCount++;
                            }
                        } catch (e) {
                            console.error(`Error marking notification ${notificationId}:`, e);
                        }
                    }

                    console.log(`Marked ${successCount}/${unreadIds.length} notifications as read via individual updates`);
                }
            }
        } catch (error) {
            console.error("Exception in markAllAsRead:", error);
        }
    }, [userId, notifications, supabase, clearAllNotificationReminders]);

    useEffect(() => {
        // Only fetch notifications if we have a userId
        if (userId) {
            fetchNotifications();
        }
    }, [userId, fetchNotifications]);

    useEffect(() => {
        let channel: RealtimeChannel | null = null;

        const setupRealtimeSubscription = async () => {
            if (!userId) return;

            // Subscribe to notifications table changes for this user
            channel = supabase
                .channel(`notifications:${userId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                }, (payload: { new: DbNotification }) => {
                    // A new notification has been added
                    const newNotification = payload.new;
                    const mappedNotification = mapDbNotificationToUi(newNotification);

                    setNotifications(prev => [mappedNotification, ...prev]);

                    // Play notification sound for new notifications only if user has interacted
                    if (hasUserInteracted) {
                        playNotificationSound('bell');
                    } else {
                        toast({
                            title: "Sound Playback",
                            description: "Please interact with the page first (click anywhere) to enable notification sounds.",
                            variant: "default",
                        });
                    }

                    // Set a reminder for this notification
                    setNotificationReminder(newNotification.id);

                    // Show toast for the new notification
                    toast({
                        title: mappedNotification.title,
                        description: mappedNotification.message,
                        variant: "default",
                    });
                })
                .subscribe();
        };

        setupRealtimeSubscription();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [userId, supabase, mapDbNotificationToUi, hasUserInteracted, toast]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            markAsRead,
            markAllAsRead,
            unreadCount: notifications.filter(n => !n.read).length,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
} 