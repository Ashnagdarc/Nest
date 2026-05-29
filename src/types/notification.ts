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
 * Mark a notification as read for the current user (uses standardized function)
 */
export async function markNotificationAsRead(notificationId: string) {
    const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
    });
    return response.json();
}

/**
 * Mark all notifications as read for the current user (uses standardized function)
 */
export async function markAllNotificationsAsRead() {
    const response = await fetch('/api/notifications/mark-read', {
        method: 'PUT',
    });
    return response.json();
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(title: string, content: string, createdBy: string) {
    const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title,
            content,
            author_id: createdBy,
            send_notifications: true,
        }),
    });
    return response.json();
}
