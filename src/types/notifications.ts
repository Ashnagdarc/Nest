/**
 * Notification Types - Nest by Eden Oasis
 * 
 * Type definitions for the notification system separated from service logic
 * to avoid importing server-side code in client components.
 * 
 * @fileoverview Notification type definitions for client and server use
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

import type { Database } from '@/types/supabase'

// Core notification types from database
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

/**
 * Notification Data Interface
 * 
 * Defines the structure for notification content and metadata
 * to ensure consistent notification creation and processing.
 */
export interface NotificationData {
    /** Unique identifier for the recipient user */
    userId: string
    /** Primary notification title */
    title: string
    /** Detailed notification message */
    message: string
    /** Notification type for categorization and styling */
    type: 'info' | 'success' | 'warning' | 'error' | 'system'
    /** Optional URL for navigation when notification is clicked */
    actionUrl?: string
    /** Optional metadata for additional context */
    metadata?: Record<string, unknown>
    /** Priority level affecting delivery urgency */
    priority?: 'low' | 'normal' | 'high' | 'critical'
    /** Scheduled delivery time (null for immediate delivery) */
    scheduledFor?: string
    /** Notification category for user preference filtering */
    category?: 'equipment' | 'system' | 'security' | 'announcement'
}

/**
 * Notification Preferences Interface
 * 
 * Defines user preferences for notification delivery channels
 * and types to respect user communication preferences.
 */
export interface NotificationPreferences {
    /** Enable/disable push notifications */
    push: boolean
    /** Enable/disable email notifications */
    email: boolean
    /** Enable/disable in-app notifications */
    inApp: boolean
    /** Specific preferences by notification category */
    categories: {
        equipment: boolean
        system: boolean
        security: boolean
        announcements: boolean
    }
    /** Quiet hours when notifications should be delayed */
    quietHours?: {
        start: string // HH:MM format
        end: string   // HH:MM format
        timezone: string
    }
    /** Delivery frequency preferences */
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
}

/**
 * Extended notification type for client components
 * 
 * Includes additional fields that may be computed or added
 * in client-side processing.
 */
export type ClientNotification = Notification & {
    category?: string
    metadata?: Record<string, unknown>
} 