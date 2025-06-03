// import fetch from 'node-fetch';

// Utility to format timestamp
function formatTimestamp(date?: string | Date) {
    const d = date ? new Date(date) : new Date();
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

// Event type constants
export enum NotificationEventType {
    USER_REQUEST = 'USER_REQUEST',
    USER_CHECKIN = 'USER_CHECKIN',
    USER_CHECKOUT = 'USER_CHECKOUT',
    USER_SIGNUP = 'USER_SIGNUP',
    ADMIN_ADD_GEAR = 'ADMIN_ADD_GEAR',
    ADMIN_EDIT_GEAR = 'ADMIN_EDIT_GEAR',
    ADMIN_APPROVE_REQUEST = 'ADMIN_APPROVE_REQUEST',
    ADMIN_REJECT_REQUEST = 'ADMIN_REJECT_REQUEST',
    ADMIN_APPROVE_CHECKIN = 'ADMIN_APPROVE_CHECKIN',
    ADMIN_REJECT_CHECKIN = 'ADMIN_REJECT_CHECKIN',
    ADMIN_MAINTENANCE = 'ADMIN_MAINTENANCE',
    GEAR_OVERDUE = 'GEAR_OVERDUE',
    // Add more as needed
}

// Message templates (Markdown formatting, consistent gearNames, timestamps)
const messageTemplates: Record<NotificationEventType, (payload: any) => string> = {
    [NotificationEventType.USER_REQUEST]: ({ userName, userEmail, gearNames, reason, destination, duration, timestamp }) =>
        `**[Request Submitted]**\n- **User:** ${userName} (${userEmail})\n- **Items:** ${gearNames?.join(', ') || 'N/A'}\n- **Reason:** ${reason}\n- **Destination:** ${destination}\n- **Duration:** ${duration}\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
    [NotificationEventType.USER_CHECKIN]: ({ userName, userEmail, gearNames, checkinDate, timestamp }) =>
        `**[Check-in]**\n- **User:** ${userName} (${userEmail})\n- **Items:** ${gearNames?.join(', ') || 'N/A'}\n- **Date:** ${formatTimestamp(checkinDate)}\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
    [NotificationEventType.USER_CHECKOUT]: ({ userName, userEmail, gearNames, checkoutDate, dueDate, timestamp }) =>
        `**[Check-out]**\n- **User:** ${userName} (${userEmail})\n- **Items:** ${gearNames?.join(', ') || 'N/A'}\n- **Checked out:** ${formatTimestamp(checkoutDate)}\n- **Due:** ${formatTimestamp(dueDate)}\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
    [NotificationEventType.USER_SIGNUP]: ({ userName, userEmail, timestamp }) =>
        `**[New User Signup]**\n- **User:** ${userName} (${userEmail})\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
    [NotificationEventType.ADMIN_ADD_GEAR]: ({ adminName, adminEmail, gearNames, category, timestamp }) =>
        `**[Gear Added]**\n- **Admin:** ${adminName} (${adminEmail})\n- **Items:** ${gearNames?.join(', ') || 'N/A'}\n- **Category:** ${category || 'N/A'}\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
    [NotificationEventType.ADMIN_EDIT_GEAR]: ({ adminName, adminEmail, gearNames, category, timestamp }) =>
        `**[Gear Edited]**\n- **Admin:** ${adminName} (${adminEmail})\n- **Items:** ${gearNames?.join(', ') || 'N/A'}\n- **Category:** ${category || 'N/A'}\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
    [NotificationEventType.ADMIN_APPROVE_REQUEST]: ({ adminName, adminEmail, userName, userEmail, gearNames, dueDate, timestamp }) =>
        `**[Request Approved]**\n- **Admin:** ${adminName} (${adminEmail})\n- **User:** ${userName} (${userEmail})\n- **Items:** ${gearNames?.join(', ') || 'N/A'}\n- **Due:** ${formatTimestamp(dueDate)}\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
    [NotificationEventType.ADMIN_REJECT_REQUEST]: ({ adminName, adminEmail, userName, userEmail, gearNames, reason, timestamp }) =>
        `**[Request Rejected]**\n- **Admin:** ${adminName} (${adminEmail})\n- **User:** ${userName} (${userEmail})\n- **Items:** ${gearNames?.join(', ') || 'N/A'}\n- **Reason:** ${reason}\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
    [NotificationEventType.ADMIN_APPROVE_CHECKIN]: ({ adminName, adminEmail, userName, userEmail, gearNames, timestamp }) =>
        `**[Check-in Approved]**\n- **Admin:** ${adminName} (${adminEmail})\n- **User:** ${userName} (${userEmail})\n- **Items:** ${gearNames?.join(', ') || 'N/A'}\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
    [NotificationEventType.ADMIN_REJECT_CHECKIN]: ({ adminName, adminEmail, userName, userEmail, gearNames, reason, timestamp }) =>
        `**[Check-in Rejected]**\n- **Admin:** ${adminName} (${adminEmail})\n- **User:** ${userName} (${userEmail})\n- **Items:** ${gearNames?.join(', ') || 'N/A'}\n- **Reason:** ${reason}\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
    [NotificationEventType.ADMIN_MAINTENANCE]: ({ adminName, adminEmail, gearNames, maintenanceStatus, maintenanceDate, description, timestamp }) =>
        `**[Maintenance]**\n- **Admin:** ${adminName} (${adminEmail})\n- **Items:** ${gearNames?.join(', ') || 'N/A'}\n- **Status:** ${maintenanceStatus}\n- **Date:** ${formatTimestamp(maintenanceDate)}\n- **Description:** ${description}\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
    [NotificationEventType.GEAR_OVERDUE]: ({ userName, userEmail, gearNames, dueDate, overdueDays, timestamp }) =>
        `**[Gear Overdue]**\n- **User:** ${userName} (${userEmail})\n- **Items:** ${gearNames?.join(', ') || 'N/A'}\n- **Due:** ${formatTimestamp(dueDate)}\n- **Overdue by:** ${overdueDays} days\n- **Timestamp:** ${formatTimestamp(timestamp)}`,
};

// Main notification function
export async function notifyGoogleChat(eventType: NotificationEventType, payload: any) {
    // Only send in production (or set up separate webhooks for staging/dev)
    if (process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_CHAT_WEBHOOK_URL_DEV) {
        console.log('[GoogleChat] Skipping notification in non-production environment.');
        return;
    }
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL || process.env.GOOGLE_CHAT_WEBHOOK_URL_DEV;
    if (!webhookUrl) {
        console.error('[GoogleChat] Webhook URL not set.');
        return;
    }
    const template = messageTemplates[eventType];
    if (!template) {
        console.error(`[GoogleChat] No template for event type: ${eventType}`);
        return;
    }
    // Always add a timestamp if not present
    const message = template({ ...payload, timestamp: payload.timestamp || new Date() });
    try {
        // Debug log
        console.log('[GoogleChat] Sending to:', webhookUrl, 'Message:', message);
        // Fire-and-forget (do not block user action)
        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message }),
        }).catch((err) => {
            console.error('[GoogleChat] Notification error:', err);
        });
    } catch (err) {
        console.error('[GoogleChat] Notification error:', err);
    }
} 