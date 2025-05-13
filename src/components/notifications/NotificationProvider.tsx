"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

type Notification = {
    id: string;
    type: 'gear' | 'profile' | 'system';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
};

interface DbNotification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    user_id: string;
}

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
                    const unreadNotifications = data.filter((n: DbNotification) => !n.read);
                    const unreadIds = unreadNotifications.map((n: DbNotification) => n.id);

                    if (unreadIds.length > 0) {
                        playLoginNotificationSound(unreadIds);
                    }

                    setIsFirstLogin(false);
                }
            }
        } catch (error) {
            console.error("Error in fetchNotifications:", error);
        }
    }, [userId, mapDbNotificationToUi, isFirstLogin, hasUserInteracted]);

    const markAsRead = useCallback(async (notificationId: string) => {
        if (!userId) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;

            // Mark notification as viewed to prevent sound replay
            markNotificationViewed(notificationId);

            // Update local state
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId
                        ? { ...n, read: true }
                        : n
                )
            );
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    }, [userId]);

    const markAllAsRead = useCallback(async () => {
        if (!userId) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;

            // Update local state
            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            );

            // Mark all notifications as viewed
            notifications.forEach(n => markNotificationViewed(n.id));
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    }, [userId, notifications]);

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
                (payload: { new: DbNotification }) => {
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
    }, [supabase, userId]);

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