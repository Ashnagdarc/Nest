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
    NotificationData,
    NotificationPreferences
} from '@/types/notifications'

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

            // Create notification record
            const { data: notification, error } = await this.supabase
                .from('notifications')
                .insert({
                    user_id: notificationData.userId,
                    title: notificationData.title,
                    message: notificationData.message,
                    type: notificationData.type || 'info',
                    action_url: notificationData.actionUrl,
                    metadata: notificationData.metadata,
                    priority: notificationData.priority || 'normal',
                    category: notificationData.category || 'system',
                    is_read: false,
                    scheduled_for: notificationData.scheduledFor,
                    created_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) {
                console.error('Failed to create notification:', error)
                return {
                    success: false,
                    error: error.message
                }
            }

            return {
                success: true,
                notification
            }
        } catch (error) {
            console.error('Notification creation exception:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }

    /**
     * Mark Notification as Read (Client-Side)
     * 
     * Marks a notification as read using the browser client.
     */
    async markAsRead(notificationId: string, userId: string): Promise<{
        success: boolean
        error?: string
    }> {
        try {
            const { error } = await this.supabase
                .from('notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('id', notificationId)
                .eq('user_id', userId)

            if (error) {
                return {
                    success: false,
                    error: error.message
                }
            }

            return { success: true }
        } catch (error) {
            console.error('Failed to mark notification as read:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
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
            let query = this.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

            // Apply filters
            if (options.unreadOnly) {
                query = query.eq('is_read', false)
            }

            if (options.category) {
                query = query.eq('category', options.category)
            }

            // Apply pagination
            if (options.limit) {
                const offset = options.offset || 0
                query = query.range(offset, offset + options.limit - 1)
            }

            const { data: notifications, error } = await query

            if (error) {
                return {
                    success: false,
                    error: error.message
                }
            }

            return {
                success: true,
                notifications: notifications || []
            }
        } catch (error) {
            console.error('Failed to get user notifications:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
}

/**
 * Default Client Notification Service Instance
 * 
 * Pre-configured client notification service for browser environments.
 */
export const clientNotificationService = new ClientNotificationService()

/**
 * Client-Side Helper Functions
 */

/**
 * Create Equipment Request Notification (Client-Side)
 * 
 * Client-safe version of equipment request notification creation.
 */
export async function createEquipmentRequestNotification(
    userId: string,
    equipmentName: string,
    status: string,
    actionUrl?: string
): Promise<{ success: boolean; error?: string }> {
    const statusMessages = {
        approved: {
            title: 'Equipment Request Approved',
            message: `Your request for ${equipmentName} has been approved and is ready for pickup.`,
            type: 'success' as const
        },
        rejected: {
            title: 'Equipment Request Rejected',
            message: `Your request for ${equipmentName} has been rejected. Please contact an administrator for more information.`,
            type: 'error' as const
        },
        pending: {
            title: 'Equipment Request Submitted',
            message: `Your request for ${equipmentName} has been submitted and is pending approval.`,
            type: 'info' as const
        }
    }

    const messageConfig = statusMessages[status as keyof typeof statusMessages]
    if (!messageConfig) {
        return {
            success: false,
            error: `Unknown request status: ${status}`
        }
    }

    return await clientNotificationService.createNotification({
        userId,
        title: messageConfig.title,
        message: messageConfig.message,
        type: messageConfig.type,
        actionUrl,
        category: 'equipment',
        priority: 'normal'
    })
} 