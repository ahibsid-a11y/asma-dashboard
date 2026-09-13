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
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["app_role"] | null
          avatar: string | null
          avatar_url: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_admin: { Args: { _user_id: string }; Returns: boolean }
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
      gender_type: "L" | "P"
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
      gender_type: ["L", "P"],
      member_status: ["Aktif", "Nonaktif"],
    },
  },
} as const
