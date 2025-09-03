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
            gears: {
                Row: {
                    id: string
                    name: string
                    category: string
                    description: string | null
                    serial_number: string | null
                    purchase_date: string | null
                    image_url: string | null
                    quantity: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    category: string
                    description?: string | null
                    serial_number?: string | null
                    purchase_date?: string | null
                    image_url?: string | null
                    quantity?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    category?: string
                    description?: string | null
                    serial_number?: string | null
                    purchase_date?: string | null
                    image_url?: string | null
                    quantity?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            gear_states: {
                Row: {
                    id: number
                    gear_id: string
                    status: string
                    available_quantity: number
                    checked_out_to: string | null
                    current_request_id: string | null
                    due_date: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    gear_id: string
                    status: string
                    available_quantity: number
                    checked_out_to?: string | null
                    current_request_id?: string | null
                    due_date?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    gear_id?: string
                    status?: string
                    available_quantity?: number
                    checked_out_to?: string | null
                    current_request_id?: string | null
                    due_date?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            gear_requests: {
                Row: {
                    id: string
                    user_id: string
                    reason: string
                    destination: string | null
                    expected_duration: string | null
                    team_members: string | null
                    status: string
                    created_at: string
                    updated_at: string
                    due_date: string | null
                    approved_at: string | null
                    admin_notes: string | null
                    updated_by: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    reason: string
                    destination?: string | null
                    expected_duration?: string | null
                    team_members?: string | null
                    status: string
                    created_at?: string
                    updated_at?: string
                    due_date?: string | null
                    approved_at?: string | null
                    admin_notes?: string | null
                    updated_by?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    reason?: string
                    destination?: string | null
                    expected_duration?: string | null
                    team_members?: string | null
                    status?: string
                    created_at?: string
                    updated_at?: string
                    due_date?: string | null
                    approved_at?: string | null
                    admin_notes?: string | null
                    updated_by?: string | null
                }
            }
            gear_request_gears: {
                Row: {
                    id: number
                    gear_request_id: string
                    gear_id: string
                    quantity: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    gear_request_id: string
                    gear_id: string
                    quantity?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    gear_request_id?: string
                    gear_id?: string
                    quantity?: number
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            update_gear_status: {
                Args: {
                    p_gear_id: string
                    p_status: string
                    p_available_quantity: number
                    p_checked_out_to?: string
                    p_current_request_id?: string
                    p_due_date?: string
                }
                Returns: void
            }
            checkout_gear: {
                Args: {
                    p_gear_id: string
                    p_user_id: string
                    p_request_id: string
                    p_quantity: number
                    p_due_date: string
                }
                Returns: void
            }
            checkin_gear: {
                Args: {
                    p_gear_id: string
                }
                Returns: void
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}

// Helper types
export type Gear = Database['public']['Tables']['gears']['Row']
export type GearState = Database['public']['Tables']['gear_states']['Row']
export type GearRequest = Database['public']['Tables']['gear_requests']['Row']
export type GearRequestGear = Database['public']['Tables']['gear_request_gears']['Row']

// Extended types for UI
export interface GearWithState extends Gear {
    currentState?: GearState
}

export interface GearRequestWithDetails extends GearRequest {
    gears?: Array<GearRequestGear & {
        gear?: Gear
        state?: GearState
    }>
    user?: {
        id: string
        full_name?: string | null
        email?: string | null
    }
}