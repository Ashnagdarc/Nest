"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { User } from '@supabase/supabase-js';
import {
    playNotificationSound,
    markNotificationViewed,
    resetNotificationState,
    loadSoundPreferences,
    playLoginNotificationSound
} from '@/lib/soundUtils';

// Simplified notification type matching our new DB schema
type Notification = {
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    link?: string;
    category?: string;
    metadata?: Record<string, any>;
};

type NotificationContextType = {
    notifications: Notification[];
    markAsRead: (id: string) => Promise<boolean>;
    markAllAsRead: () => Promise<boolean>;
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [userId, setUserId] = useState<string | null>(null);
    const [isFirstLogin, setIsFirstLogin] = useState(true);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

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
            // Clean up any subscriptions
            if (supabase) {
                supabase.removeAllChannels();
            }
        };
    }, [supabase]);

    const fetchNotifications = useCallback(async () => {
        if (!userId) {
            console.log('No user ID available');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('Fetching notifications for user:', userId);

            // Use direct select to get all fields, including category and metadata
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching notifications:', error);
                setError(error.message);
                return;
            }

            if (data) {
                setNotifications(data);

                // Play login sound if this is first login and there are unread notifications
                if (isFirstLogin && hasUserInteracted) {
                    const unreadNotifications = data.filter((n: Notification) => !n.is_read);
                    const unreadIds = unreadNotifications.map((n: Notification) => n.id);

                    if (unreadIds.length > 0) {
                        playLoginNotificationSound(unreadIds);
                    }

                    setIsFirstLogin(false);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [userId, isFirstLogin, hasUserInteracted, supabase]);

    const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
        if (!userId) {
            const error = new Error("Cannot mark notification as read: No user ID available");
            console.error(error.message);
            setError(error.message);
            return false;
        }

        setError(null);

        try {
            console.log(`Marking notification ${notificationId} as read for user ${userId}`);

            // Try direct database update instead of RPC call
            const { data, error: updateError } = await supabase
                .from('notifications')
                .update({
                    is_read: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', notificationId)
                .eq('user_id', userId);

            // Log the raw response for debugging
            console.log('Update Response:', { data, error: updateError });

            if (updateError) {
                console.error("Error updating notification:", {
                    error: updateError,
                    code: updateError.code,
                    message: updateError.message,
                    details: updateError.details
                });
                setError(`Failed to mark notification as read: ${updateError.message}`);
                return false;
            }

            // Success case
            console.log("Successfully marked as read through direct update");

            // Mark notification as viewed to prevent sound replay
            markNotificationViewed(notificationId);

            // Update local state immediately 
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId
                        ? { ...n, is_read: true }
                        : n
                )
            );

            // Show success toast
            toast({
                title: "Success",
                description: "Notification marked as read.",
                variant: "default"
            });

            return true;

        } catch (error) {
            // Handle unexpected errors
            const errorMessage = error instanceof Error
                ? error.message
                : "Unexpected error marking notification as read";

            console.error("Unexpected error in markAsRead:", {
                error,
                message: errorMessage,
                notificationId,
                userId
            });

            setError(errorMessage);

            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });

            return false;
        }
    }, [userId, supabase, toast, markNotificationViewed]);

    const markAllAsRead = useCallback(async (): Promise<boolean> => {
        if (!userId) {
            console.error("Cannot mark all notifications as read: No user ID available");
            return false;
        }

        setError(null);

        try {
            console.log(`Marking all notifications as read for user ${userId}`);

            // Use direct update instead of RPC
            const { data, error: updateError } = await supabase
                .from('notifications')
                .update({
                    is_read: true,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (updateError) {
                console.error("Error marking all notifications as read:", {
                    error: updateError,
                    code: updateError.code,
                    message: updateError.message,
                    details: updateError.details
                });
                setError(`Failed to mark all notifications as read: ${updateError.message}`);
                return false;
            }

            console.log("Successfully marked all as read through direct update");

            // Update local state right away
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );

            // Mark all notifications as viewed
            notifications.forEach(n => markNotificationViewed(n.id));

            // Show success toast
            toast({
                title: "Success",
                description: "All notifications marked as read.",
                variant: "default"
            });

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : "Unexpected error marking all notifications as read";

            console.error("Error marking all notifications as read:", {
                error,
                message: errorMessage,
                userId
            });

            setError(errorMessage);

            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });

            return false;
        }
    }, [userId, notifications, supabase, toast, markNotificationViewed]);

    // Refresh function that can be called externally
    const refresh = useCallback(async () => {
        if (userId) {
            await fetchNotifications();
        }
    }, [fetchNotifications, userId]);

    useEffect(() => {
        // Only fetch notifications if we have a userId
        if (userId) {
            fetchNotifications();
        }
    }, [userId, fetchNotifications]);

    useEffect(() => {
        if (!supabase || !userId) return;

        const channel = supabase
            .channel('notifications')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload: { new: any }) => {
                    // Reset notification state for new notification
                    resetNotificationState(payload.new.id);

                    // Play sound for new notification
                    playNotificationSound('bell', payload.new.id);

                    // Update notifications list
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId, fetchNotifications]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            markAsRead,
            markAllAsRead,
            unreadCount: notifications.filter(n => !n.is_read).length,
            isLoading,
            error,
            refresh
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