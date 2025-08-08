/**
 * API Types
 * 
 * Common types used across the application for API interactions
 */

// Re-export Activity type from the hook
export interface Activity {
    id: string;
    type: "checkout" | "return" | "request";
    item: string;
    gear_id?: string;
    user_id?: string;
    timestamp: string;
    status: string;
}

// Re-export Notification type from the notification types
export interface Notification {
    id: string;
    title: string;
    content: string;
    type: string;
    created_at: string;
    created_by: string;
    updated_at?: string;
    read_by: string[];
    is_announcement: false;
    user_id?: string;
}
