export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attendance_alerts: {
        Row: {
          alert_type: string
          created_at: string
          employee_id: string | null
          id: string
          resolved_at: string | null
          severity: string
          status: string
          work_date: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          employee_id?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          work_date?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          work_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      attendance_corrections: {
        Row: {
          correction_type: string
          created_at: string
          employee_id: string
          id: string
          is_demo: boolean
          original_event_id: string | null
          original_value: string | null
          reason: string
          requested_by: string | null
          requested_value: string
          resulting_event_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          work_date: string
        }
        Insert: {
          correction_type: string
          created_at?: string
          employee_id: string
          id?: string
          is_demo?: boolean
          original_event_id?: string | null
          original_value?: string | null
          reason: string
          requested_by?: string | null
          requested_value: string
          resulting_event_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          work_date: string
        }
        Update: {
          correction_type?: string
          created_at?: string
          employee_id?: string
          id?: string
          is_demo?: boolean
          original_event_id?: string | null
          original_value?: string | null
          reason?: string
          requested_by?: string | null
          requested_value?: string
          resulting_event_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_original_event_id_fkey"
            columns: ["original_event_id"]
            isOneToOne: false
            referencedRelation: "attendance_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_resulting_event_id_fkey"
            columns: ["resulting_event_id"]
            isOneToOne: false
            referencedRelation: "attendance_events"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_devices: {
        Row: {
          connection_ref: string | null
          created_at: string
          device_code: string
          device_type: string
          events_duplicate: number
          events_failed: number
          events_processed: number
          events_received: number
          id: string
          is_demo: boolean
          last_error: string | null
          last_event_at: string | null
          last_sync_at: string | null
          location_id: string | null
          name: string
          status: string
        }
        Insert: {
          connection_ref?: string | null
          created_at?: string
          device_code: string
          device_type: string
          events_duplicate?: number
          events_failed?: number
          events_processed?: number
          events_received?: number
          id?: string
          is_demo?: boolean
          last_error?: string | null
          last_event_at?: string | null
          last_sync_at?: string | null
          location_id?: string | null
          name: string
          status?: string
        }
        Update: {
          connection_ref?: string | null
          created_at?: string
          device_code?: string
          device_type?: string
          events_duplicate?: number
          events_failed?: number
          events_processed?: number
          events_received?: number
          id?: string
          is_demo?: boolean
          last_error?: string | null
          last_event_at?: string | null
          last_sync_at?: string | null
          location_id?: string | null
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "attendance_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_event_voids: {
        Row: {
          correction_id: string
          created_at: string
          event_id: string
        }
        Insert: {
          correction_id: string
          created_at?: string
          event_id: string
        }
        Update: {
          correction_id?: string
          created_at?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_voids_correction_id_fkey"
            columns: ["correction_id"]
            isOneToOne: false
            referencedRelation: "attendance_corrections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_event_voids_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "attendance_events"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_events: {
        Row: {
          accuracy_m: number | null
          created_at: string
          created_by: string | null
          device_id: string | null
          employee_id: string
          event_type: string
          id: string
          ip: string | null
          is_demo: boolean
          latitude: number | null
          location_id: string | null
          longitude: number | null
          metadata: Json
          occurred_at: string
          source: string
          work_date: string
        }
        Insert: {
          accuracy_m?: number | null
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          employee_id: string
          event_type: string
          id?: string
          ip?: string | null
          is_demo?: boolean
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          metadata?: Json
          occurred_at?: string
          source: string
          work_date: string
        }
        Update: {
          accuracy_m?: number | null
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          employee_id?: string
          event_type?: string
          id?: string
          ip?: string | null
          is_demo?: boolean
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          metadata?: Json
          occurred_at?: string
          source?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "attendance_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "attendance_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_demo: boolean
          latitude: number | null
          longitude: number | null
          name: string
          radius_m: number
          status: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          radius_m?: number
          status?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          radius_m?: number
          status?: string
        }
        Relationships: []
      }
      attendance_rules: {
        Row: {
          created_at: string
          early_checkout_threshold_minutes: number
          end_time: string
          expected_minutes: number
          grace_minutes: number
          id: string
          is_demo: boolean
          max_break_minutes: number
          name: string
          overtime_threshold_minutes: number
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          early_checkout_threshold_minutes?: number
          end_time: string
          expected_minutes?: number
          grace_minutes?: number
          id?: string
          is_demo?: boolean
          max_break_minutes?: number
          name: string
          overtime_threshold_minutes?: number
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          early_checkout_threshold_minutes?: number
          end_time?: string
          expected_minutes?: number
          grace_minutes?: number
          id?: string
          is_demo?: boolean
          max_break_minutes?: number
          name?: string
          overtime_threshold_minutes?: number
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          department_id: string | null
          email: string | null
          employee_code: string
          full_name: string
          id: string
          is_demo: boolean
          location_id: string | null
          photo_url: string | null
          rule_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_code: string
          full_name: string
          id?: string
          is_demo?: boolean
          location_id?: string | null
          photo_url?: string | null
          rule_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_code?: string
          full_name?: string
          id?: string
          is_demo?: boolean
          location_id?: string | null
          photo_url?: string | null
          rule_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "attendance_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "attendance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          active: boolean
          backup_hash: string
          created_at: string
          id: string
          key_hash: string
          label: string
        }
        Insert: {
          active?: boolean
          backup_hash: string
          created_at?: string
          id?: string
          key_hash: string
          label: string
        }
        Update: {
          active?: boolean
          backup_hash?: string
          created_at?: string
          id?: string
          key_hash?: string
          label?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason?: string | null
          success: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
          success?: boolean
        }
        Relationships: []
      }
      org_settings: {
        Row: {
          id: number
          is_demo: boolean
          org_name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          id?: number
          is_demo?: boolean
          org_name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          id?: number
          is_demo?: boolean
          org_name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attendance_day_summary: {
        Args: { _date: string }
        Returns: {
          break_minutes: number
          break_started_at: string
          check_in: string
          check_in_method: string
          check_out: string
          employee_id: string
          event_count: number
          expected_minutes: number
          gross_minutes: number
          is_early: boolean
          is_late: boolean
          last_activity: string
          late_minutes: number
          net_minutes: number
          on_break: boolean
          overtime_minutes: number
          rule_end: string
          rule_start: string
          status: string
        }[]
      }
      attendance_punch: {
        Args: {
          _accuracy?: number
          _employee_id: string
          _event_type: string
          _lat?: number
          _lng?: number
          _location_id?: string
          _source?: string
        }
        Returns: {
          accuracy_m: number | null
          created_at: string
          created_by: string | null
          device_id: string | null
          employee_id: string
          event_type: string
          id: string
          ip: string | null
          is_demo: boolean
          latitude: number | null
          location_id: string | null
          longitude: number | null
          metadata: Json
          occurred_at: string
          source: string
          work_date: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      attendance_range_summary: {
        Args: { _from: string; _to: string }
        Returns: {
          break_minutes: number
          check_in: string
          check_in_method: string
          check_out: string
          employee_id: string
          expected_minutes: number
          gross_minutes: number
          is_early: boolean
          is_late: boolean
          late_minutes: number
          net_minutes: number
          overtime_minutes: number
          status: string
          work_date: string
        }[]
      }
      can_approve: { Args: { _uid: string }; Returns: boolean }
      can_view_all: { Args: { _uid: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_att_admin: { Args: { _uid: string }; Returns: boolean }
      is_operator: { Args: { _uid: string }; Returns: boolean }
      manual_attendance: {
        Args: {
          _check_in: string
          _check_out: string
          _employee_id: string
          _reason: string
          _work_date: string
        }
        Returns: undefined
      }
      org_today: { Args: never; Returns: string }
      request_correction: {
        Args: {
          _employee_id: string
          _original_event_id: string
          _reason: string
          _requested_time: string
          _type: string
          _work_date: string
        }
        Returns: string
      }
      review_correction: {
        Args: { _approve: boolean; _id: string; _note: string }
        Returns: undefined
      }
      verify_license: {
        Args: { _backup: string; _key: string }
        Returns: boolean
      }
      write_audit: {
        Args: {
          _action: string
          _details: Json
          _entity: string
          _entity_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "attendance_admin"
        | "attendance_manager"
        | "supervisor"
        | "employee"
        | "viewer"
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
      app_role: [
        "super_admin",
        "attendance_admin",
        "attendance_manager",
        "supervisor",
        "employee",
        "viewer",
      ],
    },
  },
} as const
