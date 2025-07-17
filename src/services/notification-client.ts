/**
 * Client-Side Notification Service - Nest by Eden Oasis
 * 
 * This module provides notification functionality specifically for client-side use.
 * It only imports browser-compatible modules and avoids any server-side dependencies.
 * 
 * @fileoverview Client-side notification service
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

import { createClient } from '@/lib/supabase/client'
import type {
    Notification,
    NotificationData
} from '@/types/notifications'
import { apiGet, apiPost, apiPatch } from '@/lib/apiClient';

/**
 * Client-Side Notification Service Class
 * 
 * Handles notification operations that can be safely executed in browser environments.
 * This service is specifically designed for client components and avoids any
 * server-side dependencies that would cause Next.js bundling issues.
 */
export class ClientNotificationService {
    private supabase: ReturnType<typeof createClient>

    /**
     * Initialize Client Notification Service
     * 
     * Creates a new notification service instance using only the browser client.
     */
    constructor() {
        this.supabase = createClient()
    }

    /**
     * Create In-App Notification (Client-Side)
     * 
     * Creates a new in-app notification record using the browser client.
     * This is safe to call from client components.
     */
    async createNotification(notificationData: NotificationData): Promise<{
        success: boolean
        error?: string
        notification?: Notification
    }> {
        try {
            // Validate required fields
            if (!notificationData.userId || !notificationData.title || !notificationData.message) {
                return {
                    success: false,
                    error: 'Missing required notification fields: userId, title, or message'
                }
            }

            // Use centralized API client
            const { data, error } = await apiPost<{ data: Notification; error: string | null }>(`/api/notifications`, notificationData);
            if (error) return { success: false, error };
            return { success: true, notification: data };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
        }
    }

    /**
     * Mark Notification as Read (Client-Side)
     * 
     * Marks a notification as read using the browser client.
     */
    async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Use centralized API client
            const { error } = await apiPatch<{ data: Notification; error: string | null }>(`/api/notifications/${notificationId}`, { is_read: true });
            if (error) return { success: false, error };
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
        }
    }

    /**
     * Get User Notifications (Client-Side)
     * 
     * Retrieves notifications for a user using the browser client.
     */
    async getUserNotifications(
        userId: string,
        options: {
            unreadOnly?: boolean
            category?: string
            limit?: number
            offset?: number
        } = {}
    ): Promise<{
        success: boolean
        notifications?: Notification[]
        error?: string
    }> {
        try {
            const params = new URLSearchParams();
            if (options.unreadOnly) params.append('unreadOnly', 'true');
            if (options.category) params.append('category', options.category);
            if (options.limit) params.append('limit', String(options.limit));
            if (options.offset) params.append('offset', String(options.offset));
            const { data, error } = await apiGet<{ data: Notification[]; error: string | null }>(`/api/notifications?userId=${userId}&${params.toString()}`);
            if (error) return { success: false, error };
            return { success: true, notifications: data };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
        }
    }
}

/**
 * Default Client Notification Service Instance
 * 
 * Pre-configured client notification service for browser environments.
 */
export const clientNotificationService = new ClientNotificationService() 