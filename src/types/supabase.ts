export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    created_at: string | null
                    updated_at: string | null
                    full_name: string | null
                    avatar_url: string | null
                    email: string | null
                    department: string | null
                    phone: string | null
                    role: 'Admin' | 'User'
                    status: 'Active' | 'Inactive'
                }
                Insert: {
                    id: string
                    created_at?: string | null
                    updated_at?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    email?: string | null
                    department?: string | null
                    phone?: string | null
                    role?: 'Admin' | 'User'
                    status?: 'Active' | 'Inactive'
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    updated_at?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    email?: string | null
                    department?: string | null
                    phone?: string | null
                    role?: 'Admin' | 'User'
                    status?: 'Active' | 'Inactive'
                }
            }
            gears: {
                Row: {
                    id: string
                    created_at: string | null
                    updated_at: string | null
                    name: string
                    description: string | null
                    category: string | null
                    status: 'Available' | 'Checked Out' | 'Needs Repair' | 'Deleted'
                    image_url: string | null
                    checked_out_to: string | null
                    current_request_id: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    updated_at?: string | null
                    name: string
                    description?: string | null
                    category?: string | null
                    status?: 'Available' | 'Checked Out' | 'Needs Repair' | 'Deleted'
                    image_url?: string | null
                    checked_out_to?: string | null
                    current_request_id?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    updated_at?: string | null
                    name?: string
                    description?: string | null
                    category?: string | null
                    status?: 'Available' | 'Checked Out' | 'Needs Repair' | 'Deleted'
                    image_url?: string | null
                    checked_out_to?: string | null
                    current_request_id?: string | null
                }
            }
            gear_requests: {
                Row: {
                    id: string
                    created_at: string | null
                    updated_at: string | null
                    user_id: string
                    gear_ids: string[]
                    status: 'Pending' | 'Approved' | 'Rejected' | 'Checked Out' | 'Returned'
                    due_date: string | null
                    notes: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    updated_at?: string | null
                    user_id: string
                    gear_ids: string[]
                    status?: 'Pending' | 'Approved' | 'Rejected' | 'Checked Out' | 'Returned'
                    due_date?: string | null
                    notes?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    updated_at?: string | null
                    user_id?: string
                    gear_ids?: string[]
                    status?: 'Pending' | 'Approved' | 'Rejected' | 'Checked Out' | 'Returned'
                    due_date?: string | null
                    notes?: string | null
                }
            }
            checkins: {
                Row: {
                    id: string
                    created_at: string | null
                    updated_at: string | null
                    user_id: string
                    gear_id: string
                    checkin_date: string | null
                    notes: string | null
                    status: 'Pending Admin Approval' | 'Completed' | 'Rejected'
                    condition: 'Good' | 'Damaged'
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    updated_at?: string | null
                    user_id: string
                    gear_id: string
                    checkin_date?: string | null
                    notes?: string | null
                    status?: 'Pending Admin Approval' | 'Completed' | 'Rejected'
                    condition?: 'Good' | 'Damaged'
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    updated_at?: string | null
                    user_id?: string
                    gear_id?: string
                    checkin_date?: string | null
                    notes?: string | null
                    status?: 'Pending Admin Approval' | 'Completed' | 'Rejected'
                    condition?: 'Good' | 'Damaged'
                }
            }
            notifications: {
                Row: {
                    id: string
                    created_at: string | null
                    user_id: string
                    title: string
                    message: string
                    type: 'info' | 'success' | 'warning' | 'error'
                    read: boolean
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    user_id: string
                    title: string
                    message: string
                    type?: 'info' | 'success' | 'warning' | 'error'
                    read?: boolean
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    user_id?: string
                    title?: string
                    message?: string
                    type?: 'info' | 'success' | 'warning' | 'error'
                    read?: boolean
                }
            }
        }
    }
}
