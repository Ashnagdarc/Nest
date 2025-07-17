/**
 * Supabase Database Types - Nest by Eden Oasis
 * 
 * This file contains comprehensive TypeScript type definitions for all database
 * tables, views, functions, and enums used in the Nest by Eden Oasis asset
 * management system. These types provide full type safety and IntelliSense
 * support throughout the application.
 * 
 * Key Features:
 * - Complete database schema type definitions
 * - Row, Insert, and Update types for all tables
 * - Enum types for status fields and categories
 * - Function parameter and return types
 * - Comprehensive JSDoc documentation
 * 
 * Usage:
 * - Import Database type for Supabase client initialization
 * - Use individual table types for type-safe queries
 * - Reference enum types for consistent status values
 * 
 * @fileoverview Complete database type definitions for Supabase integration
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

/**
 * Main Database interface that encompasses all tables, views, functions, and enums
 * 
 * This interface is used by the Supabase client to provide type safety across
 * all database operations. It includes the 'public' schema which contains all
 * application tables and related database objects.
 */
export interface Database {
    public: {
        Tables: {
            /**
             * User Profiles Table
             * 
             * Stores extended user information beyond Supabase Auth's basic user data.
             * This table is automatically populated when users sign up and contains
             * profile information, preferences, and role assignments.
             */
            profiles: {
                Row: {
                    /** Unique identifier matching Supabase Auth user ID */
                    id: string;
                    /** User's full display name */
                    full_name: string | null;
                    /** User's primary email address */
                    email: string | null;
                    /** User's role in the system (Admin or User) */
                    role: 'Admin' | 'User';
                    /** User's department or organizational unit */
                    department: string | null;
                    /** URL to user's profile avatar image */
                    avatar_url: string | null;
                    /** User account status */
                    status: 'Active' | 'Inactive' | 'Suspended';
                    /** User's phone number for notifications */
                    phone: string | null;
                    /** User's physical location or office */
                    location: string | null;
                    /** User's employee ID or badge number */
                    employee_id: string | null;
                    /** Timestamp when profile was created */
                    created_at: string;
                    /** Timestamp when profile was last updated */
                    updated_at: string;
                    /** Timestamp of user's last sign-in */
                    last_sign_in_at: string | null;
                    /** Whether the user is banned */
                    is_banned: boolean;
                };
                Insert: {
                    id: string;
                    full_name?: string | null;
                    email?: string | null;
                    role?: 'Admin' | 'User';
                    department?: string | null;
                    avatar_url?: string | null;
                    status?: 'Active' | 'Inactive' | 'Suspended';
                    phone?: string | null;
                    location?: string | null;
                    employee_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    last_sign_in_at?: string | null;
                    is_banned?: boolean;
                };
                Update: {
                    id?: string;
                    full_name?: string | null;
                    email?: string | null;
                    role?: 'Admin' | 'User';
                    department?: string | null;
                    avatar_url?: string | null;
                    status?: 'Active' | 'Inactive' | 'Suspended';
                    phone?: string | null;
                    location?: string | null;
                    employee_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    last_sign_in_at?: string | null;
                    is_banned?: boolean;
                };
            };

            /**
             * Assets/Equipment Table (Gears)
             * 
             * Central repository for all trackable assets in the organization.
             * Supports various asset types from technology equipment to vehicles
             * and office supplies.
             */
            gears: {
                Row: {
                    /** Unique asset identifier */
                    id: string;
                    /** Asset name or title */
                    name: string;
                    /** Asset category (Equipment, Vehicle, Technology, etc.) */
                    category: string;
                    /** Asset brand or manufacturer */
                    brand: string | null;
                    /** Asset model number or name */
                    model: string | null;
                    /** Asset serial number */
                    serial_number: string | null;
                    /** Asset condition rating */
                    condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Damaged';
                    /** Current asset status */
                    status: 'Available' | 'Checked Out' | 'Under Repair' | 'Retired' | 'Lost';
                    /** Detailed asset description */
                    description: string | null;
                    /** Asset location when available */
                    location: string | null;
                    /** Asset purchase price */
                    purchase_price: number | null;
                    /** Asset purchase date */
                    purchase_date: string | null;
                    /** Asset warranty expiration date */
                    warranty_expiry: string | null;
                    /** URL to asset image */
                    image_url: string | null;
                    /** Asset QR code for quick identification */
                    qr_code: string | null;
                    /** ID of user who currently has the asset checked out */
                    checked_out_to: string | null;
                    /** Date when asset was checked out */
                    checked_out_date: string | null;
                    /** Date when asset should be returned */
                    due_date: string | null;
                    /** Timestamp when asset record was created */
                    created_at: string;
                    /** Timestamp when asset record was last updated */
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    category: string;
                    brand?: string | null;
                    model?: string | null;
                    serial_number?: string | null;
                    condition?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Damaged';
                    status?: 'Available' | 'Checked Out' | 'Under Repair' | 'Retired' | 'Lost';
                    description?: string | null;
                    location?: string | null;
                    purchase_price?: number | null;
                    purchase_date?: string | null;
                    warranty_expiry?: string | null;
                    image_url?: string | null;
                    qr_code?: string | null;
                    checked_out_to?: string | null;
                    checked_out_date?: string | null;
                    due_date?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    category?: string;
                    brand?: string | null;
                    model?: string | null;
                    serial_number?: string | null;
                    condition?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Damaged';
                    status?: 'Available' | 'Checked Out' | 'Under Repair' | 'Retired' | 'Lost';
                    description?: string | null;
                    location?: string | null;
                    purchase_price?: number | null;
                    purchase_date?: string | null;
                    warranty_expiry?: string | null;
                    image_url?: string | null;
                    qr_code?: string | null;
                    checked_out_to?: string | null;
                    checked_out_date?: string | null;
                    due_date?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            /**
             * Asset Requests Table
             * 
             * Manages the complete lifecycle of asset requests from submission
             * through approval to checkout and return.
             */
            gear_requests: {
                Row: {
                    /** Unique request identifier */
                    id: string;
                    /** ID of the requesting user */
                    user_id: string;
                    /** ID of the requested asset */
                    gear_id: string;
                    /** Reason for requesting the asset */
                    reason: string;
                    /** Request priority level */
                    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
                    /** Current request status */
                    status: 'Pending' | 'Approved' | 'Rejected' | 'Checked Out' | 'Returned' | 'Overdue';
                    /** Requested checkout date */
                    requested_date: string;
                    /** Requested return date */
                    due_date: string | null;
                    /** Date request was approved */
                    approved_date: string | null;
                    /** ID of admin who approved/rejected request */
                    approved_by: string | null;
                    /** Admin notes or rejection reason */
                    admin_notes: string | null;
                    /** Timestamp when request was created */
                    created_at: string;
                    /** Timestamp when request was last updated */
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    gear_id: string;
                    reason: string;
                    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
                    status?: 'Pending' | 'Approved' | 'Rejected' | 'Checked Out' | 'Returned' | 'Overdue';
                    requested_date: string;
                    due_date?: string | null;
                    approved_date?: string | null;
                    approved_by?: string | null;
                    admin_notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    gear_id?: string;
                    reason?: string;
                    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
                    status?: 'Pending' | 'Approved' | 'Rejected' | 'Checked Out' | 'Returned' | 'Overdue';
                    requested_date?: string;
                    due_date?: string | null;
                    approved_date?: string | null;
                    approved_by?: string | null;
                    admin_notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            /**
             * Asset Activity Log Table
             * 
             * Comprehensive audit trail of all asset-related activities
             * for compliance, tracking, and reporting purposes.
             */
            gear_activity_log: {
                Row: {
                    /** Unique activity log entry identifier */
                    id: string;
                    /** ID of the asset involved in the activity */
                    gear_id: string | null;
                    /** ID of the user who performed the activity */
                    user_id: string | null;
                    /** Type of activity performed */
                    activity_type: 'checkout' | 'checkin' | 'request' | 'approval' | 'rejection' | 'maintenance' | 'damage_report' | 'system';
                    /** Current status after the activity */
                    status: string | null;
                    /** Detailed notes about the activity */
                    notes: string | null;
                    /** Timestamp when activity occurred */
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    gear_id?: string | null;
                    user_id?: string | null;
                    activity_type: 'checkout' | 'checkin' | 'request' | 'approval' | 'rejection' | 'maintenance' | 'damage_report' | 'system';
                    status?: string | null;
                    notes?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    gear_id?: string | null;
                    user_id?: string | null;
                    activity_type?: 'checkout' | 'checkin' | 'request' | 'approval' | 'rejection' | 'maintenance' | 'damage_report' | 'system';
                    status?: string | null;
                    notes?: string | null;
                    created_at?: string;
                };
            };

            /**
             * Notifications Table
             * 
             * In-app notification system for user communication
             * about request status, overdue items, and system updates.
             */
            notifications: {
                Row: {
                    /** Unique notification identifier */
                    id: string;
                    /** ID of the user who should receive the notification */
                    user_id: string;
                    /** Notification title or subject */
                    title: string;
                    /** Detailed notification message */
                    message: string;
                    /** Notification type for categorization */
                    type: 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'overdue';
                    /** Whether the notification has been read */
                    is_read: boolean;
                    /** Optional link for actionable notifications */
                    action_url: string | null;
                    /** Related asset ID (if applicable) */
                    gear_id: string | null;
                    /** Related request ID (if applicable) */
                    request_id: string | null;
                    /** Timestamp when notification was created */
                    created_at: string;
                    /** Timestamp when notification was read */
                    read_at: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title: string;
                    message: string;
                    type?: 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'overdue';
                    is_read?: boolean;
                    action_url?: string | null;
                    gear_id?: string | null;
                    request_id?: string | null;
                    created_at?: string;
                    read_at?: string | null;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    title?: string;
                    message?: string;
                    type?: 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'overdue';
                    is_read?: boolean;
                    action_url?: string | null;
                    gear_id?: string | null;
                    request_id?: string | null;
                    created_at?: string;
                    read_at?: string | null;
                };
            };

            /**
             * Application Settings Table
             * 
             * Global application configuration and customization settings.
             */
            app_settings: {
                Row: {
                    /** Setting key identifier */
                    key: string;
                    /** Setting value */
                    value: string;
                    /** Setting description */
                    description: string | null;
                    /** Setting category for organization */
                    category: string | null;
                    /** Timestamp when setting was created */
                    created_at: string;
                    /** Timestamp when setting was last updated */
                    updated_at: string;
                };
                Insert: {
                    key: string;
                    value: string;
                    description?: string | null;
                    category?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    key?: string;
                    value?: string;
                    description?: string | null;
                    category?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            /**
             * Announcements Table
             * 
             * System-wide announcements and communications to users.
             */
            announcements: {
                Row: {
                    /** Unique announcement identifier */
                    id: string;
                    /** Announcement title */
                    title: string;
                    /** Announcement content */
                    content: string;
                    /** Announcement type for styling and priority */
                    type: 'info' | 'warning' | 'success' | 'error';
                    /** Whether announcement is currently active */
                    is_active: boolean;
                    /** ID of admin who created the announcement */
                    created_by: string;
                    /** Timestamp when announcement was created */
                    created_at: string;
                    /** Timestamp when announcement was last updated */
                    updated_at: string;
                    /** Optional expiration date for the announcement */
                    expires_at: string | null;
                };
                Insert: {
                    id?: string;
                    title: string;
                    content: string;
                    type?: 'info' | 'warning' | 'success' | 'error';
                    is_active?: boolean;
                    created_by: string;
                    created_at?: string;
                    updated_at?: string;
                    expires_at?: string | null;
                };
                Update: {
                    id?: string;
                    title?: string;
                    content?: string;
                    type?: 'info' | 'warning' | 'success' | 'error';
                    is_active?: boolean;
                    created_by?: string;
                    created_at?: string;
                    updated_at?: string;
                    expires_at?: string | null;
                };
            };
        };

        Views: {
            [_ in never]: never;
        };

        Functions: {
            /**
             * Mark a notification as read
             * 
             * Updates the notification's read status and sets the read timestamp.
             * 
             * @param notification_id - The ID of the notification to mark as read
             * @returns Success status of the operation
             */
            mark_notification_as_read: {
                Args: {
                    notification_id: string;
                };
                Returns: boolean;
            };

            /**
             * Mark all notifications as read for a user
             * 
             * Bulk operation to mark all unread notifications as read for a specific user.
             * 
             * @param user_id - The ID of the user whose notifications should be marked as read
             * @returns Number of notifications that were updated
             */
            mark_all_notifications_as_read: {
                Args: {
                    user_id: string;
                };
                Returns: number;
            };

            /**
             * Get popular gear/assets
             * 
             * Returns a list of the most frequently requested assets based on
             * request history and current usage patterns.
             * 
             * @param limit_count - Maximum number of popular items to return
             * @returns Array of popular gear with usage statistics
             */
            get_popular_gears: {
                Args: {
                    limit_count?: number;
                };
                Returns: Array<{
                    id: string;
                    name: string;
                    category: string;
                    request_count: number;
                    checkout_count: number;
                }>;
            };
        };

        Enums: {
            /**
             * User Role Enumeration
             * 
             * Defines the available user roles in the system with their corresponding
             * access levels and permissions.
             */
            user_role: 'Admin' | 'User';

            /**
             * Asset Status Enumeration
             * 
             * Defines all possible states an asset can be in during its lifecycle.
             */
            gear_status: 'Available' | 'Checked Out' | 'Under Repair' | 'Retired' | 'Lost';

            /**
             * Asset Condition Enumeration
             * 
             * Defines the physical condition ratings for assets.
             */
            gear_condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Damaged';

            /**
             * Request Status Enumeration
             * 
             * Defines all possible states a request can be in during its workflow.
             */
            request_status: 'Pending' | 'Approved' | 'Rejected' | 'Checked Out' | 'Returned' | 'Overdue';

            /**
             * Request Priority Enumeration
             * 
             * Defines priority levels for asset requests to help with queue management.
             */
            request_priority: 'Low' | 'Medium' | 'High' | 'Urgent';

            /**
             * Notification Type Enumeration
             * 
             * Defines the types of notifications that can be sent to users.
             */
            notification_type: 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'overdue';

            /**
             * Activity Type Enumeration
             * 
             * Defines the types of activities that can be logged in the system.
             */
            activity_type: 'checkout' | 'checkin' | 'request' | 'approval' | 'rejection' | 'maintenance' | 'damage_report' | 'system';
        };

        CompositeTypes: {
            [_ in never]: never;
        };
    };
}

/**
 * Type aliases for easier imports and usage throughout the application
 */

/** User profile data structure */
export type Profile = Database['public']['Tables']['profiles']['Row'];
/** New user profile creation data */
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
/** User profile update data */
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/** Asset/gear data structure */
export type Gear = Database['public']['Tables']['gears']['Row'];
/** New asset creation data */
export type GearInsert = Database['public']['Tables']['gears']['Insert'];
/** Asset update data */
export type GearUpdate = Database['public']['Tables']['gears']['Update'];

/** Asset request data structure */
export type GearRequest = Database['public']['Tables']['gear_requests']['Row'];
/** New request creation data */
export type GearRequestInsert = Database['public']['Tables']['gear_requests']['Insert'];
/** Request update data */
export type GearRequestUpdate = Database['public']['Tables']['gear_requests']['Update'];

/** Activity log entry data structure */
export type ActivityLog = Database['public']['Tables']['gear_activity_log']['Row'];
/** New activity log entry data */
export type ActivityLogInsert = Database['public']['Tables']['gear_activity_log']['Insert'];

/** Notification data structure */
export type Notification = Database['public']['Tables']['notifications']['Row'];
/** New notification creation data */
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
/** Notification update data */
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

/** Application setting data structure */
export type AppSetting = Database['public']['Tables']['app_settings']['Row'];

/** Announcement data structure */
export type Announcement = Database['public']['Tables']['announcements']['Row'];

/**
 * Enumeration type aliases for easier usage
 */
export type UserRole = Database['public']['Enums']['user_role'];
export type GearStatus = Database['public']['Enums']['gear_status'];
export type GearCondition = Database['public']['Enums']['gear_condition'];
export type RequestStatus = Database['public']['Enums']['request_status'];
export type RequestPriority = Database['public']['Enums']['request_priority'];
export type NotificationType = Database['public']['Enums']['notification_type'];
export type ActivityType = Database['public']['Enums']['activity_type'];
