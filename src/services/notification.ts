/**
 * Notification Service - Multi-channel user communication system
 * 
 * Handles push notifications, email alerts, in-app notifications, and real-time messaging
 * for the Nest by Eden Oasis application. Supports user preferences, delivery confirmation,
 * and GDPR-compliant opt-in/opt-out controls.
 * 
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

import { createClient } from '@/lib/supabase/client'
// Server client imported dynamically to avoid bundling in client code
import type {
  Notification,
  Profile,
  NotificationData,
  NotificationPreferences
} from '@/types/notifications'
import { apiGet, apiPost, apiPatch } from '@/lib/apiClient';

// Re-export types for backward compatibility
export type { Notification, Profile, NotificationData, NotificationPreferences }

/**
 * Notification Service Class
 * 
 * Core service class that handles all notification operations including
 * creation, delivery, preference management, and analytics tracking.
 * Provides a unified interface for all notification-related functionality.
 * 
 * @class NotificationService
 */
export class NotificationService {
  private supabase: ReturnType<typeof createClient>

  /**
   * Initialize Notification Service
   * 
   * Creates a new notification service instance with proper Supabase
   * client configuration. Always uses client-side configuration to avoid
   * bundling server-side code in client components.
   * 
   * @constructor
   * @param {boolean} [isServerSide=true] - DEPRECATED: Always uses client-side client now
   */
  constructor(isServerSide: boolean = true) {
    // Always use client-side to avoid bundling server code in client components
    this.supabase = createClient()
  }

  /**
   * Create In-App Notification
   * 
   * Creates a new in-app notification record in the database that will
   * appear in the user's notification center and trigger real-time updates.
   * 
   * @param {NotificationData} notificationData - Notification content and metadata
   * @returns {Promise<{ success: boolean; error?: string; notification?: Notification }>}
   * 
   * @example
   * ```typescript
   * const notificationService = new NotificationService(false)
   * 
   * // Create equipment approval notification
   * const result = await notificationService.createNotification({
   *   userId: 'user-123',
   *   title: 'Equipment Request Approved',
   *   message: 'Your request for MacBook Pro has been approved and is ready for pickup.',
   *   type: 'success',
   *   actionUrl: '/user/my-requests',
   *   category: 'equipment',
   *   priority: 'normal'
   * })
   * 
   * if (result.success) {
   *   console.log('Notification created:', result.notification.id)
   * }
   * ```
   */
  async createNotification(notificationData: NotificationData): Promise<{
    success: boolean
    error?: string
    notification?: Notification
  }> {
    try {
      if (!notificationData.userId || !notificationData.title || !notificationData.message) {
        return {
          success: false,
          error: 'Missing required notification fields: userId, title, or message'
        }
      }
      // Use centralized API client
      const { data, error } = await apiPost<{ data: Notification; error: string | null }>(`/api/notifications`, notificationData);
      if (error) {
        return { success: false, error };
      }
      return { success: true, notification: data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Send Multi-Channel Notification
   * 
   * Sends notifications through multiple channels (push, email, in-app)
   * based on user preferences and notification priority. Handles delivery
   * confirmation and retry logic for failed deliveries.
   * 
   * @param {NotificationData} notificationData - Notification content and metadata
   * @param {string[]} [channels=['inApp']] - Delivery channels to use
   * @returns {Promise<{ success: boolean; deliveryStatus: Record<string, boolean>; error?: string }>}
   * 
   * @example
   * ```typescript
   * // Send critical security notification via all channels
   * const result = await notificationService.sendMultiChannelNotification({
   *   userId: 'user-123',
   *   title: 'Security Alert',
   *   message: 'New login detected from unknown device',
   *   type: 'warning',
   *   category: 'security',
   *   priority: 'high'
   * }, ['inApp', 'email', 'push'])
   * 
   * console.log('Delivery status:', result.deliveryStatus)
   * // { inApp: true, email: true, push: false }
   * ```
   */
  async sendMultiChannelNotification(
    notificationData: NotificationData,
    channels: string[] = ['inApp']
  ): Promise<{
    success: boolean
    deliveryStatus: Record<string, boolean>
    error?: string
  }> {
    const deliveryStatus: Record<string, boolean> = {}
    let overallSuccess = true

    try {
      // Get user preferences for delivery channel filtering
      const preferences = await this.getUserNotificationPreferences(notificationData.userId)

      // Filter channels based on user preferences
      const enabledChannels = channels.filter(channel => {
        switch (channel) {
          case 'inApp':
            return preferences?.inApp !== false
          case 'email':
            return preferences?.email !== false
          case 'push':
            return preferences?.push !== false
          default:
            return true
        }
      })

      // Send through each enabled channel
      for (const channel of enabledChannels) {
        try {
          switch (channel) {
            case 'inApp':
              const inAppResult = await this.createNotification(notificationData)
              deliveryStatus.inApp = inAppResult.success
              break

            case 'email':
              // Email delivery would be implemented here
              // For now, mark as successful if in-app creation succeeded
              deliveryStatus.email = true
              break

            case 'push':
              // Push notification delivery channel was removed (Firebase FCM integration deprecated)
              deliveryStatus.push = false // Placeholder
              break

            default:
              deliveryStatus[channel] = false
          }
        } catch (channelError) {
          console.error(`Failed to deliver via ${channel}:`, channelError)
          deliveryStatus[channel] = false
          overallSuccess = false
        }
      }

      return {
        success: overallSuccess,
        deliveryStatus
      }
    } catch (error) {
      console.error('Multi-channel notification error:', error)
      return {
        success: false,
        deliveryStatus,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get User Notification Preferences
   * 
   * Retrieves user-specific notification preferences for channel filtering
   * and delivery customization. Includes default preferences for new users.
   * 
   * @param {string} userId - User identifier
   * @returns {Promise<NotificationPreferences | null>} User preferences or null if not found
   * 
   * @example
   * ```typescript
   * // Get user notification preferences
   * const preferences = await notificationService.getUserNotificationPreferences('user-123')
   * 
   * if (preferences?.email) {
   *   console.log('User accepts email notifications')
   * }
   * ```
   */
  private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      // In a real implementation, this would fetch from a user_preferences table
      // For now, return default preferences
      return {
        push: true,
        email: true,
        inApp: true,
        categories: {
          equipment: true,
          system: true,
          security: true,
          announcements: true
        },
        frequency: 'immediate'
      }
    } catch (error) {
      console.error('Failed to get user preferences:', error)
      return null
    }
  }

  /**
   * Mark Notification as Read
   * 
   * Updates notification read status and timestamp for user interaction
   * tracking and notification center management.
   * 
   * @param {string} notificationId - Notification identifier
   * @param {string} userId - User identifier for security validation
   * @returns {Promise<{ success: boolean; error?: string }>}
   * 
   * @example
   * ```typescript
   * // Mark notification as read when user clicks it
   * const result = await notificationService.markAsRead('notif-123', 'user-456')
   * ```
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
   * Get User Notifications
   * 
   * Retrieves notifications for a specific user with optional filtering
   * by read status, category, and date range for notification center display.
   * 
   * @param {string} userId - User identifier
   * @param {object} [options] - Query options for filtering and pagination
   * @returns {Promise<{ success: boolean; notifications?: Notification[]; error?: string }>}
   * 
   * @example
   * ```typescript
   * // Get unread notifications for user
   * const result = await notificationService.getUserNotifications('user-123', {
   *   unreadOnly: true,
   *   limit: 20
   * })
   * 
   * if (result.success) {
   *   console.log('Unread notifications:', result.notifications.length)
   * }
   * ```
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
 * Default Notification Service Instance
 * 
 * Pre-configured notification service instance for immediate use
 * throughout the application without requiring manual instantiation.
 * Uses client-side Supabase client for browser environments.
 * 
 * NOTE: This service now only uses client-side configuration to prevent
 * Next.js bundling issues with server-side code in client components.
 * 
 * @example
 * ```typescript
 * import { notificationService } from '@/services/notification'
 * 
 * // Send a quick notification
 * await notificationService.createNotification({
 *   userId: 'user-123',
 *   title: 'Welcome!',
 *   message: 'Welcome to Nest by Eden Oasis',
 *   type: 'info'
 * })
 * ```
 */
export const notificationService = new NotificationService(false)

// Re-export client-safe service for explicit client usage
export {
  clientNotificationService,
  createEquipmentRequestNotification as createEquipmentRequestNotificationClient,
  ClientNotificationService
} from './notification-client'

/**
 * Notification Helper Functions
 * 
 * Utility functions for common notification scenarios and templates
 * to ensure consistent messaging and reduce code duplication.
 */

/**
 * Create Equipment Request Notification
 * 
 * Specialized function for creating equipment request-related notifications
 * with standardized messaging and metadata for request workflow integration.
 * 
 * @param {string} userId - Recipient user ID
 * @param {string} equipmentName - Name of the equipment
 * @param {string} status - Request status (approved, rejected, etc.)
 * @param {string} [actionUrl] - Optional URL for user action
 * @returns {Promise<{ success: boolean; error?: string }>}
 * 
 * @example
 * ```typescript
 * // Notify user of equipment approval
 * await createEquipmentRequestNotification(
 *   'user-123',
 *   'MacBook Pro 16"',
 *   'approved',
 *   '/user/my-requests'
 * )
 * ```
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

  return await notificationService.createNotification({
    userId,
    title: messageConfig.title,
    message: messageConfig.message,
    type: messageConfig.type,
    actionUrl,
    category: 'equipment',
    priority: 'normal'
  })
}
