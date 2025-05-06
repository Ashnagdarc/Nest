export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            announcements: {
                Row: {
                    author_id: string | null
                    content: string
                    created_at: string
                    id: string
                    title: string
                }
                Insert: {
                    author_id?: string | null
                    content: string
                    created_at?: string
                    id?: string
                    title: string
                }
                Update: {
                    author_id?: string | null
                    content?: string
                    created_at?: string
                    id?: string
                    title?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "announcements_author_id_fkey"
                        columns: ["author_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            app_settings: {
                Row: {
                    key: string
                    updated_at: string
                    value: string | null
                }
                Insert: {
                    key: string
                    updated_at?: string
                    value?: string | null
                }
                Update: {
                    key?: string
                    updated_at?: string
                    value?: string | null
                }
                Relationships: []
            }
            check_ins: {
                Row: {
                    condition: string
                    created_at: string | null
                    gear_id: string
                    id: string
                    image: string | null
                    remarks: string | null
                    status: string
                    user_id: string
                }
                Insert: {
                    condition: string
                    created_at?: string | null
                    gear_id: string
                    id?: string
                    image?: string | null
                    remarks?: string | null
                    status: string
                    user_id: string
                }
                Update: {
                    condition?: string
                    created_at?: string | null
                    gear_id?: string
                    id?: string
                    image?: string | null
                    remarks?: string | null
                    status?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "check_ins_gear_id_fkey"
                        columns: ["gear_id"]
                        isOneToOne: false
                        referencedRelation: "gears"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "check_ins_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            gear_items: {
                Row: {
                    category: string | null
                    created_at: string | null
                    description: string | null
                    id: string
                    image_url: string | null
                    name: string
                    quantity: number
                    status: string
                    updated_at: string | null
                }
                Insert: {
                    category?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    name: string
                    quantity?: number
                    status?: string
                    updated_at?: string | null
                }
                Update: {
                    category?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    name?: string
                    quantity?: number
                    status?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            gear_requests: {
                Row: {
                    actual_return_date: string | null
                    admin_notes: string | null
                    approval_date: string | null
                    expected_return_date: string | null
                    gear_id: string
                    id: string
                    request_date: string | null
                    status: string
                    user_id: string
                    user_notes: string | null
                }
                Insert: {
                    actual_return_date?: string | null
                    admin_notes?: string | null
                    approval_date?: string | null
                    expected_return_date?: string | null
                    gear_id: string
                    id?: string
                    request_date?: string | null
                    status?: string
                    user_id: string
                    user_notes?: string | null
                }
                Update: {
                    actual_return_date?: string | null
                    admin_notes?: string | null
                    approval_date?: string | null
                    expected_return_date?: string | null
                    gear_id?: string
                    id?: string
                    request_date?: string | null
                    status?: string
                    user_id?: string
                    user_notes?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "gear_requests_gear_id_fkey"
                        columns: ["gear_id"]
                        isOneToOne: false
                        referencedRelation: "gear_items"
                        referencedColumns: ["id"]
                    },
                ]
            }
            gears: {
                Row: {
                    category: string | null
                    condition: string | null
                    created_at: string
                    description: string | null
                    id: string
                    image_url: string | null
                    name: string
                    purchase_date: string | null
                    serial_number: string | null
                    status: Database["public"]["Enums"]["gear_status"]
                }
                Insert: {
                    category?: string | null
                    condition?: string | null
                    created_at?: string
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    name: string
                    purchase_date?: string | null
                    serial_number?: string | null
                    status?: Database["public"]["Enums"]["gear_status"]
                }
                Update: {
                    category?: string | null
                    condition?: string | null
                    created_at?: string
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    name?: string
                    purchase_date?: string | null
                    serial_number?: string | null
                    status?: Database["public"]["Enums"]["gear_status"]
                }
                Relationships: []
            }
            notifications: {
                Row: {
                    content: string
                    created_at: string | null
                    id: string
                    read: boolean | null
                    type: string
                    user_id: string
                }
                Insert: {
                    content: string
                    created_at?: string | null
                    id?: string
                    read?: boolean | null
                    type: string
                    user_id: string
                }
                Update: {
                    content?: string
                    created_at?: string | null
                    id?: string
                    read?: boolean | null
                    type?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "notifications_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    created_at: string
                    department: string | null
                    email: string | null
                    full_name: string | null
                    id: string
                    phone: string | null
                    role: Database["public"]["Enums"]["role"]
                    status: Database["public"]["Enums"]["user_status"]
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string
                    department?: string | null
                    email?: string | null
                    full_name?: string | null
                    id: string
                    phone?: string | null
                    role?: Database["public"]["Enums"]["role"]
                    status?: Database["public"]["Enums"]["user_status"]
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string
                    department?: string | null
                    email?: string | null
                    full_name?: string | null
                    id?: string
                    phone?: string | null
                    role?: Database["public"]["Enums"]["role"]
                    status?: Database["public"]["Enums"]["user_status"]
                    updated_at?: string | null
                }
                Relationships: []
            }
            request_gears: {
                Row: {
                    created_at: string
                    gear_id: string
                    request_id: string
                }
                Insert: {
                    created_at?: string
                    gear_id: string
                    request_id: string
                }
                Update: {
                    created_at?: string
                    gear_id?: string
                    request_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "request_gears_gear_id_fkey"
                        columns: ["gear_id"]
                        isOneToOne: false
                        referencedRelation: "gears"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "request_gears_request_id_fkey"
                        columns: ["request_id"]
                        isOneToOne: false
                        referencedRelation: "requests"
                        referencedColumns: ["id"]
                    },
                ]
            }
            request_status_history: {
                Row: {
                    changed_at: string
                    changed_by: string | null
                    id: string
                    note: string | null
                    request_id: string | null
                    status: string
                }
                Insert: {
                    changed_at?: string
                    changed_by?: string | null
                    id?: string
                    note?: string | null
                    request_id?: string | null
                    status: string
                }
                Update: {
                    changed_at?: string
                    changed_by?: string | null
                    id?: string
                    note?: string | null
                    request_id?: string | null
                    status?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "request_status_history_changed_by_fkey"
                        columns: ["changed_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "request_status_history_request_id_fkey"
                        columns: ["request_id"]
                        isOneToOne: false
                        referencedRelation: "requests"
                        referencedColumns: ["id"]
                    },
                ]
            }
            requests: {
                Row: {
                    admin_notes: string | null
                    checkin_date: string | null
                    checkin_notes: string | null
                    checkout_date: string | null
                    created_at: string
                    damage_description_on_checkin: string | null
                    destination: string | null
                    due_date: string | null
                    duration: string | null
                    id: string
                    is_damaged_on_checkin: boolean | null
                    reason: string | null
                    status: Database["public"]["Enums"]["request_status"]
                    team_members: string | null
                    user_id: string
                }
                Insert: {
                    admin_notes?: string | null
                    checkin_date?: string | null
                    checkin_notes?: string | null
                    checkout_date?: string | null
                    created_at?: string
                    damage_description_on_checkin?: string | null
                    destination?: string | null
                    due_date?: string | null
                    duration?: string | null
                    id?: string
                    is_damaged_on_checkin?: boolean | null
                    reason?: string | null
                    status?: Database["public"]["Enums"]["request_status"]
                    team_members?: string | null
                    user_id: string
                }
                Update: {
                    admin_notes?: string | null
                    checkin_date?: string | null
                    checkin_notes?: string | null
                    checkout_date?: string | null
                    created_at?: string
                    damage_description_on_checkin?: string | null
                    destination?: string | null
                    due_date?: string | null
                    duration?: string | null
                    id?: string
                    is_damaged_on_checkin?: boolean | null
                    reason?: string | null
                    status?: Database["public"]["Enums"]["request_status"]
                    team_members?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "requests_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            users: {
                Row: {
                    created_at: string | null
                    email: string
                    id: string
                    is_active: boolean | null
                    name: string
                    phone: string | null
                    role: string
                }
                Insert: {
                    created_at?: string | null
                    email: string
                    id: string
                    is_active?: boolean | null
                    name: string
                    phone?: string | null
                    role?: string
                }
                Update: {
                    created_at?: string | null
                    email?: string
                    id?: string
                    is_active?: boolean | null
                    name?: string
                    phone?: string | null
                    role?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            create_default_admin: {
                Args: Record<PropertyKey, never>
                Returns: undefined
            }
            get_user_role: {
                Args: { user_id: string }
                Returns: Database["public"]["Enums"]["role"]
            }
            is_admin: {
                Args: { user_id: string }
                Returns: boolean
            }
        }
        Enums: {
            gear_status: "Available" | "Booked" | "Damaged" | "Under Repair" | "New"
            request_status:
            | "Pending"
            | "Approved"
            | "Rejected"
            | "Checked Out"
            | "Checked In"
            | "Overdue"
            | "Cancelled"
            role: "Admin" | "User" | "admin" | "staff" | "user"
            user_status: "Active" | "Inactive"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
    ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {
            gear_status: ["Available", "Booked", "Damaged", "Under Repair", "New"],
            request_status: [
                "Pending",
                "Approved",
                "Rejected",
                "Checked Out",
                "Checked In",
                "Overdue",
                "Cancelled",
            ],
            role: ["Admin", "User", "admin", "staff", "user"],
            user_status: ["Active", "Inactive"],
        },
    },
} as const
