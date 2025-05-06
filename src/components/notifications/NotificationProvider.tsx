"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Database } from '@/types/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type Notification = {
    id: string;
    type: 'gear' | 'profile' | 'system';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
};

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { toast } = useToast();
    const supabase = createClient();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Get current user
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user?.id) {
                setUserId(user.id);
            }
        });
    }, [supabase]);

    // Map DB notification to UI notification
    const mapDbNotificationToUi = useCallback((n: Database['public']['Tables']['notifications']['Row']): Notification => {
        let title = 'Notification';
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

    const handleNotificationChange = useCallback((payload: {
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        new: Database['public']['Tables']['notifications']['Row'];
        old: Database['public']['Tables']['notifications']['Row'];
    }) => {
        if (payload.eventType === 'INSERT') {
            const newNotification = mapDbNotificationToUi(payload.new);
            setNotifications(prev => [newNotification, ...prev]);

            // Show toast for new notification
            toast({
                title: newNotification.title,
                description: newNotification.message,
                duration: 5000,
            });
        } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev =>
                prev.map(n => n.id === payload.new.id ? mapDbNotificationToUi(payload.new) : n)
            );
        } else if (payload.eventType === 'DELETE') {
            setNotifications(prev =>
                prev.filter(n => n.id !== payload.old.id)
            );
        }
    }, [mapDbNotificationToUi, toast]);

    const fetchNotifications = useCallback(async (uid: string) => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching notifications:', error);
            return;
        }

        setNotifications((data || []).map(mapDbNotificationToUi));
    }, [supabase, mapDbNotificationToUi]);

    useEffect(() => {
        if (!userId) return;
        // Fetch initial notifications for this user
        fetchNotifications(userId);

        // Set up real-time subscription for notifications for this user
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes' as any, // Type assertion needed due to Supabase types
                { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                handleNotificationChange
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, supabase, fetchNotifications, handleNotificationChange]);

    const markAsRead = async (id: string) => {
        if (!userId) return;
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('Error marking notification as read:', error);
            return;
        }

        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = async () => {
        if (!userId) return;
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('read', false)
            .eq('user_id', userId);

        if (error) {
            console.error('Error marking all notifications as read:', error);
            return;
        }

        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
            }}
        >
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