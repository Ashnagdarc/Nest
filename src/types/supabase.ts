/**
 * Generated Database types from Supabase (MCP generate_typescript_types).
 * Do NOT hand-edit the Database schema section — regenerate instead.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type GeneratedDatabase = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      app_settings: {
        Row: {
          category: string | null
          data_type: string | null
          description: string | null
          is_public: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          category?: string | null
          data_type?: string | null
          description?: string | null
          is_public?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          category?: string | null
          data_type?: string | null
          description?: string | null
          is_public?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: number
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      booking_items: {
        Row: {
          booking_id: string
          car_id: string | null
          checked_out_at: string | null
          created_at: string
          failure_reason: string | null
          gear_id: string | null
          id: string
          idempotency_key: string | null
          item_type: string
          metadata: Json
          quantity: number
          returned_at: string | null
          status: Database["public"]["Enums"]["booking_lifecycle_status"]
          updated_at: string
        }
        Insert: {
          booking_id: string
          car_id?: string | null
          checked_out_at?: string | null
          created_at?: string
          failure_reason?: string | null
          gear_id?: string | null
          id?: string
          idempotency_key?: string | null
          item_type: string
          metadata?: Json
          quantity?: number
          returned_at?: string | null
          status?: Database["public"]["Enums"]["booking_lifecycle_status"]
          updated_at?: string
        }
        Update: {
          booking_id?: string
          car_id?: string | null
          checked_out_at?: string | null
          created_at?: string
          failure_reason?: string | null
          gear_id?: string | null
          id?: string
          idempotency_key?: string | null
          item_type?: string
          metadata?: Json
          quantity?: number
          returned_at?: string | null
          status?: Database["public"]["Enums"]["booking_lifecycle_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_lifecycle_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gear_maintenance_summary"
            referencedColumns: ["gear_id"]
          },
          {
            foreignKeyName: "booking_items_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gears"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "v_gears_with_state"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          id: number
          metadata: Json
          new_status: Database["public"]["Enums"]["booking_lifecycle_status"]
          old_status:
            | Database["public"]["Enums"]["booking_lifecycle_status"]
            | null
          reason: string | null
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          id?: number
          metadata?: Json
          new_status: Database["public"]["Enums"]["booking_lifecycle_status"]
          old_status?:
            | Database["public"]["Enums"]["booking_lifecycle_status"]
            | null
          reason?: string | null
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          id?: number
          metadata?: Json
          new_status?: Database["public"]["Enums"]["booking_lifecycle_status"]
          old_status?:
            | Database["public"]["Enums"]["booking_lifecycle_status"]
            | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_lifecycle_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bookings: {
        Row: {
          approved_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          end_at: string | null
          id: string
          idempotency_key: string | null
          metadata: Json
          reference: string
          requester_id: string
          source_id: string | null
          source_type: string
          start_at: string | null
          status: Database["public"]["Enums"]["booking_lifecycle_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          reference: string
          requester_id: string
          source_id?: string | null
          source_type: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["booking_lifecycle_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          reference?: string
          requester_id?: string
          source_id?: string | null
          source_type?: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["booking_lifecycle_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      car_assignment: {
        Row: {
          booking_id: string
          car_id: string
          created_at: string
        }
        Insert: {
          booking_id: string
          car_id: string
          created_at?: string
        }
        Update: {
          booking_id?: string
          car_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_assignment_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "car_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_assignment_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_bookings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          created_at: string
          date_of_use: string
          destination: string | null
          employee_name: string
          end_time: string | null
          id: string
          purpose: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requester_id: string | null
          start_time: string | null
          status: string
          time_slot: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string
          date_of_use: string
          destination?: string | null
          employee_name: string
          end_time?: string | null
          id?: string
          purpose?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requester_id?: string | null
          start_time?: string | null
          status?: string
          time_slot?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string
          date_of_use?: string
          destination?: string | null
          employee_name?: string
          end_time?: string | null
          id?: string
          purpose?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requester_id?: string | null
          start_time?: string | null
          status?: string
          time_slot?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_bookings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_bookings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "car_bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "car_bookings_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_bookings_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "car_bookings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_bookings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cars: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string | null
          label: string
          plate: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          label: string
          plate?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          label?: string
          plate?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          action: string
          approved_at: string | null
          approved_by: string | null
          checkin_date: string
          condition: string | null
          created_at: string | null
          damage_notes: string | null
          gear_id: string
          id: string
          notes: string | null
          quantity: number
          request_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action: string
          approved_at?: string | null
          approved_by?: string | null
          checkin_date?: string
          condition?: string | null
          created_at?: string | null
          damage_notes?: string | null
          gear_id: string
          id?: string
          notes?: string | null
          quantity?: number
          request_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string
          approved_at?: string | null
          approved_by?: string | null
          checkin_date?: string
          condition?: string | null
          created_at?: string | null
          damage_notes?: string | null
          gear_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          request_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "checkins_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gear_maintenance_summary"
            referencedColumns: ["gear_id"]
          },
          {
            foreignKeyName: "checkins_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gears"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "v_gears_with_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "gear_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_logs: {
        Row: {
          attempt_count: number
          booking_id: string | null
          created_at: string
          error_message: string | null
          html_body: string | null
          id: string
          last_attempt_at: string | null
          max_retries: number
          next_attempt_at: string
          payload_hash: string
          processed_at: string | null
          provider: string
          provider_message_id: string | null
          recipient: string
          status: string
          subject: string | null
          template_name: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          booking_id?: string | null
          created_at?: string
          error_message?: string | null
          html_body?: string | null
          id?: string
          last_attempt_at?: string | null
          max_retries?: number
          next_attempt_at?: string
          payload_hash: string
          processed_at?: string | null
          provider?: string
          provider_message_id?: string | null
          recipient: string
          status: string
          subject?: string | null
          template_name: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          booking_id?: string | null
          created_at?: string
          error_message?: string | null
          html_body?: string | null
          id?: string
          last_attempt_at?: string | null
          max_retries?: number
          next_attempt_at?: string
          payload_hash?: string
          processed_at?: string | null
          provider?: string
          provider_message_id?: string | null
          recipient?: string
          status?: string
          subject?: string | null
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_lifecycle_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      gear_maintenance: {
        Row: {
          created_at: string | null
          date: string
          description: string
          gear_id: string
          id: string
          performed_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          description: string
          gear_id: string
          id?: string
          performed_by?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string
          gear_id?: string
          id?: string
          performed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gear_maintenance_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gear_maintenance_summary"
            referencedColumns: ["gear_id"]
          },
          {
            foreignKeyName: "gear_maintenance_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gears"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_maintenance_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "v_gears_with_state"
            referencedColumns: ["id"]
          },
        ]
      }
      gear_request_gears: {
        Row: {
          created_at: string | null
          gear_id: string
          gear_request_id: string
          id: number
          quantity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gear_id: string
          gear_request_id: string
          id?: number
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gear_id?: string
          gear_request_id?: string
          id?: number
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gear_request_gears_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gear_maintenance_summary"
            referencedColumns: ["gear_id"]
          },
          {
            foreignKeyName: "gear_request_gears_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gears"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_request_gears_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "v_gears_with_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_request_gears_gear_request_id_fkey"
            columns: ["gear_request_id"]
            isOneToOne: false
            referencedRelation: "gear_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      gear_requests: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          client_submission_id: string | null
          created_at: string | null
          destination: string | null
          due_date: string | null
          expected_duration: string | null
          id: string
          reason: string
          status: string
          submitted_by_user_id: string | null
          team_members: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          client_submission_id?: string | null
          created_at?: string | null
          destination?: string | null
          due_date?: string | null
          expected_duration?: string | null
          id?: string
          reason: string
          status?: string
          submitted_by_user_id?: string | null
          team_members?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          client_submission_id?: string | null
          created_at?: string | null
          destination?: string | null
          due_date?: string | null
          expected_duration?: string | null
          id?: string
          reason?: string
          status?: string
          submitted_by_user_id?: string | null
          team_members?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gear_requests_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_requests_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gear_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gear_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      gears: {
        Row: {
          available_quantity: number
          category: string
          checked_out_by: string | null
          checked_out_to: string | null
          condition: string | null
          created_at: string | null
          current_request_id: string | null
          description: string | null
          due_date: string | null
          full_name: string | null
          id: string
          image_url: string | null
          initial_condition: string | null
          last_checkout_date: string | null
          name: string
          owner_id: string | null
          purchase_date: string | null
          quantity: number
          serial_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          available_quantity?: number
          category: string
          checked_out_by?: string | null
          checked_out_to?: string | null
          condition?: string | null
          created_at?: string | null
          current_request_id?: string | null
          description?: string | null
          due_date?: string | null
          full_name?: string | null
          id?: string
          image_url?: string | null
          initial_condition?: string | null
          last_checkout_date?: string | null
          name: string
          owner_id?: string | null
          purchase_date?: string | null
          quantity?: number
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          available_quantity?: number
          category?: string
          checked_out_by?: string | null
          checked_out_to?: string | null
          condition?: string | null
          created_at?: string | null
          current_request_id?: string | null
          description?: string | null
          due_date?: string | null
          full_name?: string | null
          id?: string
          image_url?: string | null
          initial_condition?: string | null
          last_checkout_date?: string | null
          name?: string
          owner_id?: string | null
          purchase_date?: string | null
          quantity?: number
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gears_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gears_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gears_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gears_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          metadata: Json | null
          priority: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          metadata?: Json | null
          priority?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          metadata?: Json | null
          priority?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deleted_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          nest_id: string | null
          notification_preferences: Json | null
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          nest_id?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          nest_id?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_notification_queue: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          dedupe_key: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          max_retries: number | null
          next_attempt_at: string
          processed_at: string | null
          processing_started_at: string | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          dedupe_key?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          max_retries?: number | null
          next_attempt_at?: string
          processed_at?: string | null
          processing_started_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          dedupe_key?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          max_retries?: number | null
          next_attempt_at?: string
          processed_at?: string | null
          processing_started_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      read_announcements: {
        Row: {
          announcement_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "read_announcements_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "read_announcements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "read_announcements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          client_info: Json | null
          created_at: string | null
          expires_at: string | null
          id: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_info?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_info?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      gear_maintenance_summary: {
        Row: {
          gear_id: string | null
          gear_name: string | null
          last_maintenance: string | null
          maintenance_events: number | null
        }
        Relationships: []
      }
      nf_activity_events: {
        Row: {
          actor_id: string | null
          created_at: string | null
          event_type: string | null
          id: string | null
          metadata: Json | null
          summary: string | null
          task_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          metadata?: Json | null
          summary?: string | null
          task_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          metadata?: Json | null
          summary?: string | null
          task_id?: string | null
        }
        Relationships: []
      }
      nf_attachments: {
        Row: {
          checksum: string | null
          created_at: string | null
          deleted_at: string | null
          file_name: string | null
          id: string | null
          mime_type: string | null
          object_key: string | null
          size_bytes: number | null
          task_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          id?: string | null
          mime_type?: string | null
          object_key?: string | null
          size_bytes?: number | null
          task_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          checksum?: string | null
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          id?: string | null
          mime_type?: string | null
          object_key?: string | null
          size_bytes?: number | null
          task_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      nf_audit_events: {
        Row: {
          action: string | null
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          metadata: Json | null
          summary: string | null
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          metadata?: Json | null
          summary?: string | null
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          metadata?: Json | null
          summary?: string | null
        }
        Relationships: []
      }
      nf_automation_rules: {
        Row: {
          action_type: string | null
          action_value: string | null
          created_at: string | null
          created_by: string | null
          from_status:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          id: string | null
          is_active: boolean | null
          name: string | null
          to_status:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          action_type?: string | null
          action_value?: string | null
          created_at?: string | null
          created_by?: string | null
          from_status?:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          to_status?:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string | null
          action_value?: string | null
          created_at?: string | null
          created_by?: string | null
          from_status?:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          to_status?:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nf_checklist_items: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          is_done: boolean | null
          position: number | null
          task_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_done?: boolean | null
          position?: number | null
          task_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_done?: boolean | null
          position?: number | null
          task_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nf_comments: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string | null
          deleted_at: string | null
          id: string | null
          mentioned_user_ids: string[] | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          mentioned_user_ids?: string[] | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          mentioned_user_ids?: string[] | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nf_departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nf_due_extension_requests: {
        Row: {
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string | null
          previous_due_at: string | null
          reason: string | null
          requested_by: string | null
          requested_due_at: string | null
          status: string | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string | null
          previous_due_at?: string | null
          reason?: string | null
          requested_by?: string | null
          requested_due_at?: string | null
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string | null
          previous_due_at?: string | null
          reason?: string | null
          requested_by?: string | null
          requested_due_at?: string | null
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nf_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string | null
          invited_by: string | null
          nest_id: string | null
          note: string | null
          roles: ("admin" | "line_manager" | "hr" | "staff")[] | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          invited_by?: string | null
          nest_id?: string | null
          note?: string | null
          roles?: ("admin" | "line_manager" | "hr" | "staff")[] | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          invited_by?: string | null
          nest_id?: string | null
          note?: string | null
          roles?: ("admin" | "line_manager" | "hr" | "staff")[] | null
          status?: string | null
        }
        Relationships: []
      }
      nf_notification_preferences: {
        Row: {
          chat_assignment: boolean | null
          chat_due_soon: boolean | null
          chat_mention: boolean | null
          chat_overdue: boolean | null
          email_assignment: boolean | null
          email_due_soon: boolean | null
          email_mention: boolean | null
          email_overdue: boolean | null
          email_performance_digest: boolean | null
          push_assignment: boolean | null
          push_due_soon: boolean | null
          push_mention: boolean | null
          push_overdue: boolean | null
          push_performance_digest: boolean | null
          push_status_changed: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          chat_assignment?: boolean | null
          chat_due_soon?: boolean | null
          chat_mention?: boolean | null
          chat_overdue?: boolean | null
          email_assignment?: boolean | null
          email_due_soon?: boolean | null
          email_mention?: boolean | null
          email_overdue?: boolean | null
          email_performance_digest?: boolean | null
          push_assignment?: boolean | null
          push_due_soon?: boolean | null
          push_mention?: boolean | null
          push_overdue?: boolean | null
          push_performance_digest?: boolean | null
          push_status_changed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          chat_assignment?: boolean | null
          chat_due_soon?: boolean | null
          chat_mention?: boolean | null
          chat_overdue?: boolean | null
          email_assignment?: boolean | null
          email_due_soon?: boolean | null
          email_mention?: boolean | null
          email_overdue?: boolean | null
          email_performance_digest?: boolean | null
          push_assignment?: boolean | null
          push_due_soon?: boolean | null
          push_mention?: boolean | null
          push_overdue?: boolean | null
          push_performance_digest?: boolean | null
          push_status_changed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nf_notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          chat_sent_at: string | null
          created_at: string | null
          email_sent_at: string | null
          event_type:
            | "task_assigned"
            | "task_mentioned"
            | "task_due_soon"
            | "task_overdue"
            | "task_status_changed"
            | "invite"
            | "performance_digest"
            | null
          href: string | null
          id: string | null
          idempotency_key: string | null
          metadata: Json | null
          push_sent_at: string | null
          read_at: string | null
          task_id: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          chat_sent_at?: string | null
          created_at?: string | null
          email_sent_at?: string | null
          event_type?:
            | "task_assigned"
            | "task_mentioned"
            | "task_due_soon"
            | "task_overdue"
            | "task_status_changed"
            | "invite"
            | "performance_digest"
            | null
          href?: string | null
          id?: string | null
          idempotency_key?: string | null
          metadata?: Json | null
          push_sent_at?: string | null
          read_at?: string | null
          task_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          chat_sent_at?: string | null
          created_at?: string | null
          email_sent_at?: string | null
          event_type?:
            | "task_assigned"
            | "task_mentioned"
            | "task_due_soon"
            | "task_overdue"
            | "task_status_changed"
            | "invite"
            | "performance_digest"
            | null
          href?: string | null
          id?: string | null
          idempotency_key?: string | null
          metadata?: Json | null
          push_sent_at?: string | null
          read_at?: string | null
          task_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nf_personal_notes: {
        Row: {
          body: string | null
          created_at: string | null
          id: string | null
          noted_on: string | null
          shared_with_manager: boolean | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          noted_on?: string | null
          shared_with_manager?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          noted_on?: string | null
          shared_with_manager?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nf_push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string | null
          endpoint: string | null
          id: string | null
          last_used_at: string | null
          p256dh: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth?: string | null
          created_at?: string | null
          endpoint?: string | null
          id?: string | null
          last_used_at?: string | null
          p256dh?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string | null
          created_at?: string | null
          endpoint?: string | null
          id?: string | null
          last_used_at?: string | null
          p256dh?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nf_tags: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      nf_task_assignees: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nf_task_dependencies: {
        Row: {
          created_at: string | null
          created_by: string | null
          depends_on_task_id: string | null
          id: string | null
          task_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          depends_on_task_id?: string | null
          id?: string | null
          task_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          depends_on_task_id?: string | null
          id?: string | null
          task_id?: string | null
        }
        Relationships: []
      }
      nf_task_tags: {
        Row: {
          tag_id: string | null
          task_id: string | null
        }
        Insert: {
          tag_id?: string | null
          task_id?: string | null
        }
        Update: {
          tag_id?: string | null
          task_id?: string | null
        }
        Relationships: []
      }
      nf_task_templates: {
        Row: {
          checklist_titles: Json | null
          created_at: string | null
          created_by: string | null
          default_priority: "low" | "medium" | "high" | "urgent" | null
          default_status:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          description: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          tags: string[] | null
          updated_at: string | null
          workspace_kind: string | null
        }
        Insert: {
          checklist_titles?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_priority?: "low" | "medium" | "high" | "urgent" | null
          default_status?:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          tags?: string[] | null
          updated_at?: string | null
          workspace_kind?: string | null
        }
        Update: {
          checklist_titles?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_priority?: "low" | "medium" | "high" | "urgent" | null
          default_status?:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          tags?: string[] | null
          updated_at?: string | null
          workspace_kind?: string | null
        }
        Relationships: []
      }
      nf_tasks: {
        Row: {
          approval_decided_at: string | null
          approval_decided_by: string | null
          approval_note: string | null
          approval_requested_at: string | null
          approval_requested_by: string | null
          approval_status: string | null
          archived_at: string | null
          blocked_reason: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_at: string | null
          due_paused_at: string | null
          gear_ref: string | null
          gear_url: string | null
          id: string | null
          priority: "low" | "medium" | "high" | "urgent" | null
          recurrence_ends_at: string | null
          recurrence_interval: number | null
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          status:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          title: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          approval_decided_at?: string | null
          approval_decided_by?: string | null
          approval_note?: string | null
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approval_status?: string | null
          archived_at?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          due_paused_at?: string | null
          gear_ref?: string | null
          gear_url?: string | null
          id?: string | null
          priority?: "low" | "medium" | "high" | "urgent" | null
          recurrence_ends_at?: string | null
          recurrence_interval?: number | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          status?:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          title?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          approval_decided_at?: string | null
          approval_decided_by?: string | null
          approval_note?: string | null
          approval_requested_at?: string | null
          approval_requested_by?: string | null
          approval_status?: string | null
          archived_at?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          due_paused_at?: string | null
          gear_ref?: string | null
          gear_url?: string | null
          id?: string | null
          priority?: "low" | "medium" | "high" | "urgent" | null
          recurrence_ends_at?: string | null
          recurrence_interval?: number | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          status?:
            | "backlog"
            | "todo"
            | "in_progress"
            | "blocked"
            | "review"
            | "completed"
            | null
          title?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      nf_team_memberships: {
        Row: {
          created_at: string | null
          id: string | null
          is_manager: boolean | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_manager?: boolean | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_manager?: boolean | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nf_teams: {
        Row: {
          created_at: string | null
          id: string | null
          is_archived: boolean | null
          name: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      nf_time_entries: {
        Row: {
          created_at: string | null
          id: string | null
          logged_at: string | null
          minutes: number | null
          note: string | null
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          logged_at?: string | null
          minutes?: number | null
          note?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          logged_at?: string | null
          minutes?: number | null
          note?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nf_time_sessions: {
        Row: {
          accumulated_ms: number | null
          created_at: string | null
          id: string | null
          pause_reason: string | null
          paused_at: string | null
          segment_started_at: string | null
          started_at: string | null
          status: string | null
          stopped_at: string | null
          task_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accumulated_ms?: number | null
          created_at?: string | null
          id?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          segment_started_at?: string | null
          started_at?: string | null
          status?: string | null
          stopped_at?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accumulated_ms?: number | null
          created_at?: string | null
          id?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          segment_started_at?: string | null
          started_at?: string | null
          status?: string | null
          stopped_at?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nf_user_roles: {
        Row: {
          created_at: string | null
          id: string | null
          role: "admin" | "line_manager" | "hr" | "staff" | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          role?: "admin" | "line_manager" | "hr" | "staff" | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          role?: "admin" | "line_manager" | "hr" | "staff" | null
          user_id?: string | null
        }
        Relationships: []
      }
      nf_workspaces: {
        Row: {
          created_at: string | null
          id: string | null
          is_archived: boolean | null
          kind: string | null
          name: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          kind?: string | null
          name?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          kind?: string | null
          name?: string | null
          team_id?: string | null
        }
        Relationships: []
      }
      user_activity_summary: {
        Row: {
          email: string | null
          full_name: string | null
          total_checkouts: number | null
          total_requests: number | null
          total_returns: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_booking_lifecycle_compat: {
        Row: {
          created_at: string | null
          end_at: string | null
          id: string | null
          items: Json | null
          reference: string | null
          requester_id: string | null
          source_id: string | null
          source_type: string | null
          start_at: string | null
          status: Database["public"]["Enums"]["booking_lifecycle_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_gears_with_state: {
        Row: {
          category: string | null
          description: string | null
          gear_available_quantity: number | null
          gear_checked_out_to: string | null
          gear_condition: string | null
          gear_created_at: string | null
          gear_current_request_id: string | null
          gear_due_date: string | null
          gear_status: string | null
          gear_updated_at: string | null
          id: string | null
          image_url: string | null
          initial_condition: string | null
          name: string | null
          owner_id: string | null
          purchase_date: string | null
          quantity: number | null
          serial_number: string | null
          state_available_quantity: number | null
          state_checked_out_to: string | null
          state_created_at: string | null
          state_current_request_id: string | null
          state_due_date: string | null
          state_id: number | null
          state_notes: string | null
          state_status: string | null
          state_updated_at: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          gear_available_quantity?: number | null
          gear_checked_out_to?: string | null
          gear_condition?: string | null
          gear_created_at?: string | null
          gear_current_request_id?: string | null
          gear_due_date?: string | null
          gear_status?: string | null
          gear_updated_at?: string | null
          id?: string | null
          image_url?: string | null
          initial_condition?: string | null
          name?: string | null
          owner_id?: string | null
          purchase_date?: string | null
          quantity?: number | null
          serial_number?: string | null
          state_available_quantity?: never
          state_checked_out_to?: string | null
          state_created_at?: never
          state_current_request_id?: string | null
          state_due_date?: string | null
          state_id?: never
          state_notes?: never
          state_status?: never
          state_updated_at?: never
        }
        Update: {
          category?: string | null
          description?: string | null
          gear_available_quantity?: number | null
          gear_checked_out_to?: string | null
          gear_condition?: string | null
          gear_created_at?: string | null
          gear_current_request_id?: string | null
          gear_due_date?: string | null
          gear_status?: string | null
          gear_updated_at?: string | null
          id?: string | null
          image_url?: string | null
          initial_condition?: string | null
          name?: string | null
          owner_id?: string | null
          purchase_date?: string | null
          quantity?: number | null
          serial_number?: string | null
          state_available_quantity?: never
          state_checked_out_to?: string | null
          state_created_at?: never
          state_current_request_id?: string | null
          state_due_date?: string | null
          state_id?: never
          state_notes?: never
          state_status?: never
          state_updated_at?: never
        }
        Relationships: [
          {
            foreignKeyName: "gears_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gears_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_activity_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_request_audit_events: {
        Row: {
          actor_id: string | null
          event_type: string | null
          note: string | null
          occurred_at: string | null
          request_id: string | null
        }
        Relationships: []
      }
      weekly_request_trends: {
        Row: {
          total_checkouts: number | null
          total_requests: number | null
          week: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_gear_request_atomic: {
        Args: { p_actor_id: string; p_request_id: string }
        Returns: Json
      }
      auto_complete_overdue_car_bookings: {
        Args: never
        Returns: {
          failed: number
          processed: number
        }[]
      }
      backfill_bookings_v2: { Args: never; Returns: undefined }
      booking_status_transition_allowed: {
        Args: {
          p_new: Database["public"]["Enums"]["booking_lifecycle_status"]
          p_old: Database["public"]["Enums"]["booking_lifecycle_status"]
        }
        Returns: boolean
      }
      cancel_gear_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      check_gear_availability_simple: {
        Args: {
          p_end_date: string
          p_exclude_booking_id?: string
          p_gear_id: string
          p_start_date: string
        }
        Returns: boolean
      }
      check_gear_booking_conflict: {
        Args: {
          p_booking_id?: string
          p_end_date: string
          p_gear_id: string
          p_start_date: string
        }
        Returns: boolean
      }
      complete_calendar_booking: {
        Args: { p_booking_id: string }
        Returns: {
          available_quantity: number
          gear_status: string
          message: string
          success: boolean
        }[]
      }
      complete_expired_calendar_bookings: {
        Args: never
        Returns: {
          booking_details: Json
          completed_bookings: number
          updated_gears: number
        }[]
      }
      create_announcement: {
        Args: { p_content: string; p_title: string; p_user_id: string }
        Returns: Json
      }
      create_booking_with_items_atomic: {
        Args: {
          p_end_at: string
          p_idempotency_key: string
          p_items: Json
          p_metadata: Json
          p_requester_id: string
          p_source_id: string
          p_source_type: string
          p_start_at: string
        }
        Returns: Json
      }
      create_booking_with_items_v2: {
        Args: {
          p_end_at: string
          p_idempotency_key: string
          p_items: Json
          p_metadata: Json
          p_requester_id: string
          p_source_id: string
          p_source_type: string
          p_start_at: string
        }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_notification_for_all_users: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      debug_announcements: {
        Args: never
        Returns: {
          content: string
          created_at: string
          created_by: string
          id: string
          table_schema: string
          title: string
          updated_at: string
        }[]
      }
      delete_gear_by_admin: { Args: { p_gear_id: string }; Returns: boolean }
      delete_user_cascade: { Args: { p_user_id: string }; Returns: undefined }
      easy_mark_all_read: { Args: never; Returns: Json }
      easy_mark_read: { Args: { notification_id: string }; Returns: Json }
      execute_sql: { Args: { sql_query: string }; Returns: Json }
      fetch_user_notifications: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          id: string
          is_read: boolean
          link: string
          message: string
          metadata: Json
          title: string
          type: string
          updated_at: string
          user_id: string
        }[]
      }
      gear_due_from_duration: {
        Args: { p_duration: string; p_from: string }
        Returns: string
      }
      get_admin_reports_data: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          checkin_date: string
          checkout_date: string
          created_at: string
          due_date: string
          gear_category: string
          gear_id: string
          gear_name: string
          id: string
          reason: string
          status: string
          updated_at: string
          user_id: string
          user_name: string
        }[]
      }
      get_admin_reports_summary: {
        Args: { time_period?: string }
        Returns: Json
      }
      get_all_announcements: {
        Args: never
        Returns: {
          content: string
          created_at: string
          created_by: string
          id: string
          title: string
        }[]
      }
      get_announcement_by_id: {
        Args: { announcement_id: string }
        Returns: Json
      }
      get_announcement_email_data: {
        Args: { p_announcement_id: string }
        Returns: {
          announcement_id: string
          author_name: string
          content: string
          title: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_category_availability: {
        Args: never
        Returns: {
          available: number
          category: string
          checked_out: number
          maintenance: number
          total: number
        }[]
      }
      get_equipment_stats: {
        Args: never
        Returns: {
          available_equipment: number
          checked_out_equipment: number
          total_equipment: number
          under_repair_equipment: number
          utilization_rate: number
        }[]
      }
      get_popular_gears:
        | {
            Args: { end_date?: string; start_date?: string }
            Returns: {
              full_name: string
              gear_id: string
              name: string
              request_count: number
            }[]
          }
        | {
            Args: {
              end_date?: string
              limit_count?: number
              start_date?: string
            }
            Returns: {
              full_name: string
              gear_id: string
              name: string
              request_count: number
            }[]
          }
      get_realtime_tables: { Args: never; Returns: string[] }
      get_recent_announcements: {
        Args: { max_count?: number }
        Returns: {
          content: string
          created_at: string
          created_by: string
          id: string
          title: string
        }[]
      }
      get_request_audit: { Args: { p_request_id: string }; Returns: Json }
      get_request_gears: {
        Args: { request_gear_ids: string[] }
        Returns: {
          available_quantity: number
          category: string
          checked_out_by: string | null
          checked_out_to: string | null
          condition: string | null
          created_at: string | null
          current_request_id: string | null
          description: string | null
          due_date: string | null
          full_name: string | null
          id: string
          image_url: string | null
          initial_condition: string | null
          last_checkout_date: string | null
          name: string
          owner_id: string | null
          purchase_date: string | null
          quantity: number
          serial_number: string | null
          status: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "gears"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_request_stats: {
        Args: never
        Returns: {
          approval_rate: number
          approved_requests: number
          pending_requests: number
          rejected_requests: number
          total_requests: number
        }[]
      }
      get_user_dashboard: { Args: { p_user_id: string }; Returns: Json }
      get_user_stats: {
        Args: never
        Returns: {
          active_users: number
          total_users: number
        }[]
      }
      get_weekly_activity_report: {
        Args: { end_date: string; start_date: string }
        Returns: {
          booking_count: number
          checkin_count: number
          checkout_count: number
          damage_count: number
          gear_id: string
          gear_name: string
          request_count: number
        }[]
      }
      insert_gear_request_lines: {
        Args: { p_lines: Json; p_request_id: string }
        Returns: {
          out_gear_id: string
          out_quantity: number
          out_request_id: string
        }[]
      }
      insert_read_notification: {
        Args: { p_notification_id: string; p_user_id: string }
        Returns: undefined
      }
      is_active_admin_from_profiles: { Args: never; Returns: boolean }
      is_admin_user: { Args: { user_id: string }; Returns: boolean }
      log_gear_activity: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["gear_activity_type"]
          p_details?: Json
          p_gear_id: string
          p_notes?: string
          p_request_id: string
          p_status?: string
          p_user_id: string
        }
        Returns: string
      }
      mark_all_notifications_as_read: { Args: never; Returns: number }
      mark_notification_as_read: {
        Args: { notification_id: string }
        Returns: boolean
      }
      migrate_status_change_maintenance_to_activity: {
        Args: never
        Returns: number
      }
      nestflow_current_profile: {
        Args: never
        Returns: {
          avatar_url: string
          department: string
          email: string
          full_name: string
          is_active: boolean
          nest_id: string
          status: string
          user_id: string
        }[]
      }
      nestflow_current_roles: { Args: never; Returns: string[] }
      nestflow_emit_notification: {
        Args: {
          p_body?: string
          p_event_type: string
          p_href?: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_task_id?: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      nestflow_record_audit: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type: string
          p_metadata?: Json
          p_summary?: string
        }
        Returns: string
      }
      nestflow_resolve_login_email: {
        Args: { identifier: string }
        Returns: string
      }
      nestflow_set_profile_department: {
        Args: { p_department: string; p_user_id: string }
        Returns: undefined
      }
      nestflow_set_profile_status: {
        Args: { p_status: string; p_user_id: string }
        Returns: undefined
      }
      nestflow_set_user_roles: {
        Args: { p_roles: string[]; p_user_id: string }
        Returns: undefined
      }
      nestflow_sync_due_deadline_on_status: {
        Args: { p_from_status: string; p_task_id: string; p_to_status: string }
        Returns: undefined
      }
      nestflow_sync_time_sessions_on_status: {
        Args: { p_from_status: string; p_task_id: string; p_to_status: string }
        Returns: undefined
      }
      process_gear_checkin: {
        Args: {
          p_condition: string
          p_damage_notes?: string
          p_gear_id: string
          p_notes?: string
          p_user_id: string
        }
        Returns: string
      }
      recompute_gear_holder: {
        Args: { p_gear_id: string; p_mark_checkout?: boolean }
        Returns: undefined
      }
      recompute_gear_inventory_state: {
        Args: { p_force_needs_repair?: boolean; p_gear_id: string }
        Returns: undefined
      }
      reconcile_gear_inventory_from_requests: { Args: never; Returns: number }
      release_gear_request_atomic: {
        Args: {
          p_actor_id: string
          p_next_status: Database["public"]["Enums"]["booking_lifecycle_status"]
          p_reason: string
          p_request_id: string
        }
        Returns: Json
      }
      send_announcement_emails: {
        Args: { p_announcement_id: string; p_author_name?: string }
        Returns: {
          emails_sent: number
          errors: string[]
          success: boolean
        }[]
      }
      set_all_notifications_read: { Args: never; Returns: boolean }
      set_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      sync_car_status_from_booking_id: {
        Args: { p_booking_id: string; p_new_status: string }
        Returns: undefined
      }
      sync_car_timeblock: { Args: { p_booking_id: string }; Returns: undefined }
      sync_gear_status_with_availability: {
        Args: never
        Returns: {
          available_qty: number
          gear_id: string
          gear_name: string
          new_status: string
          old_status: string
          total_qty: number
        }[]
      }
      sync_notification_tables: { Args: never; Returns: Json }
      transition_booking_atomic: {
        Args: {
          p_booking_id: string
          p_changed_by: string
          p_idempotency_key: string
          p_metadata: Json
          p_next_status: Database["public"]["Enums"]["booking_lifecycle_status"]
          p_reason: string
        }
        Returns: Json
      }
      transition_booking_status_v2: {
        Args: {
          p_booking_id: string
          p_changed_by: string
          p_idempotency_key: string
          p_metadata: Json
          p_next_status: Database["public"]["Enums"]["booking_lifecycle_status"]
          p_reason: string
        }
        Returns: Json
      }
      update_gear_status: {
        Args: { p_gear_id: string; p_new_status: string }
        Returns: boolean
      }
      upsert_booking_from_legacy: {
        Args: {
          p_end_at: string
          p_metadata?: Json
          p_requester_id: string
          p_source_id: string
          p_source_type: string
          p_start_at: string
          p_status: Database["public"]["Enums"]["booking_lifecycle_status"]
        }
        Returns: string
      }
    }
    Enums: {
      booking_lifecycle_status:
        | "pending"
        | "approved"
        | "checked_out"
        | "active"
        | "completed"
        | "cancelled"
        | "overdue"
        | "failed"
      gear_activity_type:
        | "Request"
        | "Check-in"
        | "Check-out"
        | "Maintenance"
        | "Status Change"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_lifecycle_status: [
        "pending",
        "approved",
        "checked_out",
        "active",
        "completed",
        "cancelled",
        "overdue",
        "failed",
      ],
      gear_activity_type: [
        "Request",
        "Check-in",
        "Check-out",
        "Maintenance",
        "Status Change",
      ],
    },
  },
} as const



/** Tables referenced by app code but absent from live public schema introspection. */
type LegacyTables = {
  request_status_history: {
    Row: {
      id: string
      request_id: string
      status: string
      changed_by: string | null
      note: string | null
      changed_at: string
    }
    Insert: {
      id?: string
      request_id: string
      status: string
      changed_by?: string | null
      note?: string | null
      changed_at?: string
    }
    Update: {
      id?: string
      request_id?: string
      status?: string
      changed_by?: string | null
      note?: string | null
      changed_at?: string
    }
    Relationships: []
  }
  gear_checkouts: {
    Row: {
      id: string
      gear_id: string
      user_id: string | null
      created_at: string | null
      returned_at: string | null
    }
    Insert: {
      id?: string
      gear_id: string
      user_id?: string | null
      created_at?: string | null
      returned_at?: string | null
    }
    Update: {
      id?: string
      gear_id?: string
      user_id?: string | null
      created_at?: string | null
      returned_at?: string | null
    }
    Relationships: []
  }
  gear_states: {
    Row: {
      id: number
      gear_id: string
      status: string | null
      available_quantity: number | null
      checked_out_to: string | null
      due_date: string | null
      current_request_id: string | null
      notes: string | null
      created_at: string | null
      updated_at: string | null
    }
    Insert: {
      id?: number
      gear_id: string
      status?: string | null
      available_quantity?: number | null
      checked_out_to?: string | null
      due_date?: string | null
      current_request_id?: string | null
      notes?: string | null
      created_at?: string | null
      updated_at?: string | null
    }
    Update: {
      id?: number
      gear_id?: string
      status?: string | null
      available_quantity?: number | null
      checked_out_to?: string | null
      due_date?: string | null
      current_request_id?: string | null
      notes?: string | null
      created_at?: string | null
      updated_at?: string | null
    }
    Relationships: []
  }
}

type LegacyFunctions = {
  exec_sql: { Args: { sql?: string; query?: string } & Record<string, unknown>; Returns: unknown }
  create_function: { Args: Record<string, unknown>; Returns: unknown }
  get_gear_status_breakdown: { Args: Record<string, never>; Returns: { status: string; count: string }[] }
}

export type Database = {
  [K in keyof GeneratedDatabase]: K extends 'public'
    ? Omit<GeneratedDatabase['public'], 'Tables' | 'Functions'> & {
        Tables: GeneratedDatabase['public']['Tables'] & LegacyTables
        Functions: GeneratedDatabase['public']['Functions'] & LegacyFunctions
      }
    : GeneratedDatabase[K]
}

export type RequestStatusHistory = Database['public']['Tables']['request_status_history']['Row']
export type RequestStatusHistoryInsert = Database['public']['Tables']['request_status_history']['Insert']

// App helper aliases (stable imports; prefer Tables / Views above as source of truth)
export type Gear = Database['public']['Tables']['gears']['Row']
export type GearRequest = Database['public']['Tables']['gear_requests']['Row']
export type GearRequestGear = Database['public']['Tables']['gear_request_gears']['Row']
export type GearState = Database['public']['Tables']['gear_states']['Row']

export interface GearWithState extends Gear {
  currentState?: GearState
}

export interface GearRequestWithDetails extends GearRequest {
  gears?: Array<
    GearRequestGear & {
      gear?: Gear
      state?: GearState
    }
  >
  user?: {
    id: string
    full_name?: string | null
    email?: string | null
  }
}
