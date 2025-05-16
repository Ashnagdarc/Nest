/**
 * Base notification interface
 */
export interface BaseNotification {
    id: string;
    title: string;
    content: string;
    type: string;
    created_at: string;
    created_by: string;
    updated_at?: string;
    read_by: string[]; // Array of user IDs who have read the notification
}

/**
 * Standard notification interface extending the base
 */
export interface Notification extends BaseNotification {
    is_announcement: false;
    user_id?: string; // Target user for non-announcement notifications
}

/**
 * Announcement interface extending the base
 */
export interface AnnouncementNotification extends BaseNotification {
    is_announcement: true;
}

/**
 * Union type for all notification types
 */
export type AnyNotification = Notification | AnnouncementNotification;

/**
 * Check if a notification is an announcement
 */
export function isAnnouncement(notification: AnyNotification): notification is AnnouncementNotification {
    return notification.is_announcement === true;
}

/**
 * Check if a user has read a notification
 */
export function hasUserRead(notification: AnyNotification, userId: string): boolean {
    return notification.read_by.includes(userId);
}

/**
 * Mark a notification as read for a user
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
    const supabase = createClient();
    return await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
        p_user_id: userId
    });
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(title: string, content: string, createdBy: string) {
    const supabase = createClient();
    return await supabase.rpc('create_announcement', {
        p_title: title,
        p_content: content,
        p_created_by: createdBy
    });
}
