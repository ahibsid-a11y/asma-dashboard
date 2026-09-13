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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          attendance_date: string
          created_at: string
          id: string
          notes: string | null
          recorded_by: string | null
          scan_time: string
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          scan_time?: string
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          scan_time?: string
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          auto_violation_on_absent: boolean
          auto_violation_on_late: boolean
          created_at: string
          id: string
          is_active: boolean
          is_exit: boolean
          late_cutoff_time: string
          on_time_deadline: string
          session_name: string
          sort_order: number
          target_role: Database["public"]["Enums"]["app_role"][]
          updated_at: string
          violation_points_absent: number
          violation_points_late: number
        }
        Insert: {
          auto_violation_on_absent?: boolean
          auto_violation_on_late?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          is_exit?: boolean
          late_cutoff_time: string
          on_time_deadline: string
          session_name: string
          sort_order?: number
          target_role?: Database["public"]["Enums"]["app_role"][]
          updated_at?: string
          violation_points_absent?: number
          violation_points_late?: number
        }
        Update: {
          auto_violation_on_absent?: boolean
          auto_violation_on_late?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          is_exit?: boolean
          late_cutoff_time?: string
          on_time_deadline?: string
          session_name?: string
          sort_order?: number
          target_role?: Database["public"]["Enums"]["app_role"][]
          updated_at?: string
          violation_points_absent?: number
          violation_points_late?: number
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          color: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          end_time: string | null
          event_date: string
          id: string
          location: string | null
          start_time: string | null
          target_roles: Database["public"]["Enums"]["app_role"][]
          target_type: Database["public"]["Enums"]["calendar_target_type"]
          target_user_ids: string[]
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          color?: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          location?: string | null
          start_time?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][]
          target_type?: Database["public"]["Enums"]["calendar_target_type"]
          target_user_ids?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          location?: string | null
          start_time?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][]
          target_type?: Database["public"]["Enums"]["calendar_target_type"]
          target_user_ids?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          grade: number
          homeroom_teacher_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade: number
          homeroom_teacher_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: number
          homeroom_teacher_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_homeroom_teacher_id_fkey"
            columns: ["homeroom_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dorms: {
        Row: {
          created_at: string
          id: string
          musyrif_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          musyrif_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          musyrif_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dorms_musyrif_id_fkey"
            columns: ["musyrif_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      halaqohs: {
        Row: {
          created_at: string
          id: string
          musyrif_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          musyrif_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          musyrif_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "halaqohs_musyrif_id_fkey"
            columns: ["musyrif_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incidental_attendance_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          id: string
          target_roles: Database["public"]["Enums"]["app_role"][]
          target_type: Database["public"]["Enums"]["incidental_target_type"]
          target_user_ids: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_date?: string
          id?: string
          target_roles?: Database["public"]["Enums"]["app_role"][]
          target_type?: Database["public"]["Enums"]["incidental_target_type"]
          target_user_ids?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          id?: string
          target_roles?: Database["public"]["Enums"]["app_role"][]
          target_type?: Database["public"]["Enums"]["incidental_target_type"]
          target_user_ids?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidental_attendance_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incidental_attendance_records: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["incidental_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status: Database["public"]["Enums"]["incidental_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["incidental_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidental_attendance_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "incidental_attendance_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidental_attendance_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidental_attendance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_positions: {
        Row: {
          created_at: string
          id: string
          position: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["app_role"] | null
          avatar: string | null
          avatar_url: string | null
          category: Database["public"]["Enums"]["member_category"] | null
          class: string | null
          created_at: string
          display_name: string | null
          dorm: string | null
          email: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          halaqoh: string | null
          id: string
          name: string | null
          nis_nip: string | null
          phone: string | null
          preferences: Json
          rfid_card: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["app_role"] | null
          avatar?: string | null
          avatar_url?: string | null
          category?: Database["public"]["Enums"]["member_category"] | null
          class?: string | null
          created_at?: string
          display_name?: string | null
          dorm?: string | null
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          halaqoh?: string | null
          id: string
          name?: string | null
          nis_nip?: string | null
          phone?: string | null
          preferences?: Json
          rfid_card?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["app_role"] | null
          avatar?: string | null
          avatar_url?: string | null
          category?: Database["public"]["Enums"]["member_category"] | null
          class?: string | null
          created_at?: string
          display_name?: string | null
          dorm?: string | null
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          halaqoh?: string | null
          id?: string
          name?: string | null
          nis_nip?: string | null
          phone?: string | null
          preferences?: Json
          rfid_card?: string | null
          status?: Database["public"]["Enums"]["member_status"]
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
      violation_records: {
        Row: {
          category: string
          created_at: string
          date: string
          id: string
          notes: string | null
          points: number
          recorded_by: string | null
          source: string
          updated_at: string
          user_id: string
          violation_title: string
        }
        Insert: {
          category?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          points?: number
          recorded_by?: string | null
          source?: string
          updated_at?: string
          user_id: string
          violation_title: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          points?: number
          recorded_by?: string | null
          source?: string
          updated_at?: string
          user_id?: string
          violation_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "violation_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violation_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_password: {
        Args: { _password: string; _user_id: string }
        Returns: undefined
      }
      can_manage_attendance: {
        Args: { _actor: string; _target: string }
        Returns: boolean
      }
      current_account_type: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_attendance_overseer: { Args: { _user_id: string }; Returns: boolean }
      is_calendar_admin: { Args: { _user_id: string }; Returns: boolean }
      is_member_admin: { Args: { _user_id: string }; Returns: boolean }
      is_not_santri: { Args: { _user_id: string }; Returns: boolean }
      is_session_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "mudir"
        | "kepala_sekolah"
        | "waka_kurikulum"
        | "kabid_kesantrian"
        | "musyrif_asrama"
        | "musyrif_halaqoh"
        | "wali_kelas"
        | "guru_mapel"
        | "kepala_tu"
        | "kepala_rt_sarpras"
        | "tendik"
        | "santri"
      attendance_status: "Hadir" | "Telat" | "Alfa"
      calendar_target_type: "ALL" | "ROLE" | "USERS"
      gender_type: "L" | "P"
      incidental_status: "Hadir" | "Izin" | "Sakit" | "Alfa"
      incidental_target_type: "ROLE" | "USERS"
      member_category:
        | "super_admin"
        | "admin"
        | "guru"
        | "musyrif"
        | "tendik"
        | "siswa"
      member_status: "Aktif" | "Nonaktif"
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
        "mudir",
        "kepala_sekolah",
        "waka_kurikulum",
        "kabid_kesantrian",
        "musyrif_asrama",
        "musyrif_halaqoh",
        "wali_kelas",
        "guru_mapel",
        "kepala_tu",
        "kepala_rt_sarpras",
        "tendik",
        "santri",
      ],
      attendance_status: ["Hadir", "Telat", "Alfa"],
      calendar_target_type: ["ALL", "ROLE", "USERS"],
      gender_type: ["L", "P"],
      incidental_status: ["Hadir", "Izin", "Sakit", "Alfa"],
      incidental_target_type: ["ROLE", "USERS"],
      member_category: [
        "super_admin",
        "admin",
        "guru",
        "musyrif",
        "tendik",
        "siswa",
      ],
      member_status: ["Aktif", "Nonaktif"],
    },
  },
} as const
