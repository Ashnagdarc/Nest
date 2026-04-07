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
import { apiGet, apiPut, apiDelete } from '@/lib/apiClient';

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
    deleteNotification: (id: string) => Promise<boolean>;
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
            // No user ID available
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Fetching notifications for user
            // Use centralized API client and RESTful endpoint
            const { data, error } = await apiGet<{ data: Notification[]; error: string | null }>(`/api/notifications?userId=${userId}`);
            if (error) {
                setError(error);
                return;
            }
            if (data) {
                setNotifications(data);
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
            setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [userId, isFirstLogin, hasUserInteracted]);

    const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
        if (!userId) {
            const error = new Error("Cannot mark notification as read: No user ID available");
            setError(error.message);
            return false;
        }
        setError(null);
        try {
            // Use centralized API client PUT endpoint
            const { data, error } = await apiPut<{ data: Notification; error: string | null }>(`/api/notifications/${notificationId}`, { is_read: true });
            if (error) {
                setError(`Failed to mark notification as read: ${error}`);
                return false;
            }
            markNotificationViewed(notificationId);
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
            toast({ title: "Success", description: "Notification marked as read.", variant: "default" });
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unexpected error marking notification as read";
            setError(errorMessage);
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
            return false;
        }
    }, [userId, toast]);

    const markAllAsRead = useCallback(async (): Promise<boolean> => {
        if (!userId) {
            setError("Cannot mark all notifications as read: No user ID available");
            return false;
        }
        setError(null);
        try {
            // Use bulk update via PUT (server handles current user session)
            const { data, error } = await apiPut<{ data: Notification[]; error: string | null }>(`/api/notifications/mark-read`, {});
            if (error) {
                setError(`Failed to mark all notifications as read: ${error}`);
                return false;
            }
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            notifications.forEach(n => markNotificationViewed(n.id));
            toast({ title: "Success", description: "All notifications marked as read.", variant: "default" });
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unexpected error marking all notifications as read";
            setError(errorMessage);
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
            return false;
        }
    }, [userId, notifications, toast]);

    const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
        if (!userId) {
            setError("Cannot delete notification: No user ID available");
            return false;
        }
        setError(null);
        try {
            // Use centralized API client DELETE endpoint
            await apiDelete<{ success: boolean; error: string | null }>(`/api/notifications/${notificationId}`);

            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            toast({ title: "Success", description: "Notification deleted.", variant: "default" });
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unexpected error deleting notification";
            setError(errorMessage);
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
            return false;
        }
    }, [userId, toast]);

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
                (payload: { new: Notification }) => {
                    // Reset notification state for new notification
                    resetNotificationState(payload.new.id);

                    // Play sound for new notification
                    playNotificationSound('bell', payload.new.id);

                    // Update notifications list
                    fetchNotifications();
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload: { new: Notification }) => {
                    // Update notifications list when notification is marked as read
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
            refresh,
            deleteNotification
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