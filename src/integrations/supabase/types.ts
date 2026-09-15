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
      academic_subjects: {
        Row: {
          code: string
          created_at: string
          group: string
          id: string
          is_active: boolean
          kkm: number
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          group?: string
          id?: string
          is_active?: boolean
          kkm?: number
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          group?: string
          id?: string
          is_active?: boolean
          kkm?: number
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
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
      class_subject_assignments: {
        Row: {
          academic_year: string
          class_name: string
          created_at: string
          id: string
          jp_per_week: number
          subject_code: string
          subject_group: string
          subject_id: string
          subject_name: string
          teacher_id: string | null
          teacher_name: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string
          class_name: string
          created_at?: string
          id?: string
          jp_per_week?: number
          subject_code?: string
          subject_group?: string
          subject_id: string
          subject_name?: string
          teacher_id?: string | null
          teacher_name?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_name?: string
          created_at?: string
          id?: string
          jp_per_week?: number
          subject_code?: string
          subject_group?: string
          subject_id?: string
          subject_name?: string
          teacher_id?: string | null
          teacher_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_subject_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
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
      curriculum_elements: {
        Row: {
          cp_description: string
          created_at: string
          id: string
          name: string
          order_index: number
          plan_id: string
          updated_at: string
        }
        Insert: {
          cp_description?: string
          created_at?: string
          id?: string
          name: string
          order_index?: number
          plan_id: string
          updated_at?: string
        }
        Update: {
          cp_description?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_elements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "curriculum_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_plans: {
        Row: {
          academic_year: string
          class_name: string
          completion_percentage: number
          created_at: string
          id: string
          jp_per_week: number
          phase: string
          realization_ganjil_percentage: number
          realization_genap_percentage: number
          subject_id: string
          teacher_id: string | null
          total_tp_count: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_name: string
          completion_percentage?: number
          created_at?: string
          id?: string
          jp_per_week?: number
          phase?: string
          realization_ganjil_percentage?: number
          realization_genap_percentage?: number
          subject_id: string
          teacher_id?: string | null
          total_tp_count?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_name?: string
          completion_percentage?: number
          created_at?: string
          id?: string
          jp_per_week?: number
          phase?: string
          realization_ganjil_percentage?: number
          realization_genap_percentage?: number
          subject_id?: string
          teacher_id?: string | null
          total_tp_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_plans_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_promes_entries: {
        Row: {
          activity_type: string
          allocated_jp: number
          created_at: string
          id: string
          month_name: string
          notes: string | null
          plan_id: string
          semester: string
          tp_id: string
          updated_at: string
          week_number: number
        }
        Insert: {
          activity_type?: string
          allocated_jp?: number
          created_at?: string
          id?: string
          month_name: string
          notes?: string | null
          plan_id: string
          semester: string
          tp_id: string
          updated_at?: string
          week_number: number
        }
        Update: {
          activity_type?: string
          allocated_jp?: number
          created_at?: string
          id?: string
          month_name?: string
          notes?: string | null
          plan_id?: string
          semester?: string
          tp_id?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_promes_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "curriculum_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_time_allocations: {
        Row: {
          calendar_weeks: number
          created_at: string
          effective_jp: number
          effective_weeks: number
          id: string
          month_name: string
          month_order: number
          non_effective_weeks: number
          notes: string | null
          plan_id: string
          semester: string
          updated_at: string
        }
        Insert: {
          calendar_weeks?: number
          created_at?: string
          effective_jp?: number
          effective_weeks?: number
          id?: string
          month_name: string
          month_order?: number
          non_effective_weeks?: number
          notes?: string | null
          plan_id: string
          semester: string
          updated_at?: string
        }
        Update: {
          calendar_weeks?: number
          created_at?: string
          effective_jp?: number
          effective_weeks?: number
          id?: string
          month_name?: string
          month_order?: number
          non_effective_weeks?: number
          notes?: string | null
          plan_id?: string
          semester?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_time_allocations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "curriculum_plans"
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
      grading_settings: {
        Row: {
          academic_year: string
          created_at: string
          id: string
          semester: string
          updated_at: string
          weight_sas: number
          weight_sts: number
          weight_tp: number
        }
        Insert: {
          academic_year: string
          created_at?: string
          id?: string
          semester: string
          updated_at?: string
          weight_sas?: number
          weight_sts?: number
          weight_tp?: number
        }
        Update: {
          academic_year?: string
          created_at?: string
          id?: string
          semester?: string
          updated_at?: string
          weight_sas?: number
          weight_sts?: number
          weight_tp?: number
        }
        Relationships: []
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
      learning_objectives: {
        Row: {
          academic_year: string
          alokasi_jp: number
          assessment_method: string
          atp_flow: string | null
          atp_order: number
          class_name: string
          code: string
          cognitive_level: string
          cp_code: string | null
          created_at: string
          description: string
          dimension: string
          element_name: string | null
          id: string
          order_index: number
          plan_id: string | null
          semester: string
          status_asesmen: boolean
          status_atp: boolean
          status_realisasi: string
          status_tp: boolean
          subject_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          alokasi_jp?: number
          assessment_method?: string
          atp_flow?: string | null
          atp_order?: number
          class_name: string
          code: string
          cognitive_level?: string
          cp_code?: string | null
          created_at?: string
          description: string
          dimension?: string
          element_name?: string | null
          id?: string
          order_index?: number
          plan_id?: string | null
          semester?: string
          status_asesmen?: boolean
          status_atp?: boolean
          status_realisasi?: string
          status_tp?: boolean
          subject_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          alokasi_jp?: number
          assessment_method?: string
          atp_flow?: string | null
          atp_order?: number
          class_name?: string
          code?: string
          cognitive_level?: string
          cp_code?: string | null
          created_at?: string
          description?: string
          dimension?: string
          element_name?: string | null
          id?: string
          order_index?: number
          plan_id?: string | null
          semester?: string
          status_asesmen?: boolean
          status_atp?: boolean
          status_realisasi?: string
          status_tp?: boolean
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_objectives_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "curriculum_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      mutabaah_activities: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mutabaah_records: {
        Row: {
          activity_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutabaah_records_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "mutabaah_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutabaah_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutabaah_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_days: number
          name: string
          requires_uks: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_days?: number
          name: string
          requires_uks?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_days?: number
          name?: string
          requires_uks?: boolean
          updated_at?: string
        }
        Relationships: []
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
      student_permits: {
        Row: {
          actual_checkin_at: string | null
          actual_checkout_at: string | null
          approved_kepsek: boolean
          approved_kepsek_at: string | null
          approved_kepsek_by: string | null
          approved_kesantrian: boolean
          approved_kesantrian_at: string | null
          approved_kesantrian_by: string | null
          approved_kurikulum: boolean
          approved_kurikulum_at: string | null
          approved_kurikulum_by: string | null
          approved_uks: boolean
          approved_uks_at: string | null
          approved_uks_by: string | null
          attachment_url: string | null
          category_id: string | null
          category_name: string
          checkin_officer_id: string | null
          checkout_officer_id: string | null
          created_at: string
          destination: string | null
          end_date: string
          end_time: string
          id: string
          is_overdue: boolean
          notes_kepsek: string | null
          notes_kesantrian: string | null
          notes_kurikulum: string | null
          notes_uks: string | null
          pickup_by: string | null
          pickup_phone: string | null
          reason: string
          rejected_by: string | null
          rejection_reason: string | null
          requires_uks: boolean
          start_date: string
          start_time: string
          status: string
          student_id: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          actual_checkin_at?: string | null
          actual_checkout_at?: string | null
          approved_kepsek?: boolean
          approved_kepsek_at?: string | null
          approved_kepsek_by?: string | null
          approved_kesantrian?: boolean
          approved_kesantrian_at?: string | null
          approved_kesantrian_by?: string | null
          approved_kurikulum?: boolean
          approved_kurikulum_at?: string | null
          approved_kurikulum_by?: string | null
          approved_uks?: boolean
          approved_uks_at?: string | null
          approved_uks_by?: string | null
          attachment_url?: string | null
          category_id?: string | null
          category_name: string
          checkin_officer_id?: string | null
          checkout_officer_id?: string | null
          created_at?: string
          destination?: string | null
          end_date: string
          end_time?: string
          id?: string
          is_overdue?: boolean
          notes_kepsek?: string | null
          notes_kesantrian?: string | null
          notes_kurikulum?: string | null
          notes_uks?: string | null
          pickup_by?: string | null
          pickup_phone?: string | null
          reason: string
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_uks?: boolean
          start_date: string
          start_time?: string
          status?: string
          student_id: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          actual_checkin_at?: string | null
          actual_checkout_at?: string | null
          approved_kepsek?: boolean
          approved_kepsek_at?: string | null
          approved_kepsek_by?: string | null
          approved_kesantrian?: boolean
          approved_kesantrian_at?: string | null
          approved_kesantrian_by?: string | null
          approved_kurikulum?: boolean
          approved_kurikulum_at?: string | null
          approved_kurikulum_by?: string | null
          approved_uks?: boolean
          approved_uks_at?: string | null
          approved_uks_by?: string | null
          attachment_url?: string | null
          category_id?: string | null
          category_name?: string
          checkin_officer_id?: string | null
          checkout_officer_id?: string | null
          created_at?: string
          destination?: string | null
          end_date?: string
          end_time?: string
          id?: string
          is_overdue?: boolean
          notes_kepsek?: string | null
          notes_kesantrian?: string | null
          notes_kurikulum?: string | null
          notes_uks?: string | null
          pickup_by?: string | null
          pickup_phone?: string | null
          reason?: string
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_uks?: boolean
          start_date?: string
          start_time?: string
          status?: string
          student_id?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_permits_approved_kepsek_by_fkey"
            columns: ["approved_kepsek_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_permits_approved_kesantrian_by_fkey"
            columns: ["approved_kesantrian_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_permits_approved_kurikulum_by_fkey"
            columns: ["approved_kurikulum_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_permits_approved_uks_by_fkey"
            columns: ["approved_uks_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_permits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "permit_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_permits_checkin_officer_id_fkey"
            columns: ["checkin_officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_permits_checkout_officer_id_fkey"
            columns: ["checkout_officer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_permits_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_permits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_permits_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subject_summaries: {
        Row: {
          academic_year: string
          avg_tp_score: number
          class_name: string
          created_at: string
          final_score: number
          highest_tp_desc: string | null
          id: string
          letter_grade: string
          lowest_tp_desc: string | null
          sas_score: number
          semester: string
          sts_score: number
          student_id: string
          subject_id: string
          teacher_notes: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string
          avg_tp_score?: number
          class_name?: string
          created_at?: string
          final_score?: number
          highest_tp_desc?: string | null
          id?: string
          letter_grade?: string
          lowest_tp_desc?: string | null
          sas_score?: number
          semester?: string
          sts_score?: number
          student_id: string
          subject_id: string
          teacher_notes?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string
          avg_tp_score?: number
          class_name?: string
          created_at?: string
          final_score?: number
          highest_tp_desc?: string | null
          id?: string
          letter_grade?: string
          lowest_tp_desc?: string | null
          sas_score?: number
          semester?: string
          sts_score?: number
          student_id?: string
          subject_id?: string
          teacher_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subject_summaries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tp_grades: {
        Row: {
          created_at: string
          graded_by: string | null
          id: string
          score: number
          student_id: string
          tp_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          graded_by?: string | null
          id?: string
          score?: number
          student_id: string
          tp_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          graded_by?: string | null
          id?: string
          score?: number
          student_id?: string
          tp_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tp_grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tp_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tp_grades_tp_id_fkey"
            columns: ["tp_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      tahfiz_hafalan_records: {
        Row: {
          ayat_end: number
          ayat_start: number
          catatan: string
          created_at: string
          date: string
          id: string
          juz: number
          musyrif_id: string | null
          nilai: string
          predikat: string | null
          student_id: string
          surah_name: string
          type: string
          updated_at: string
        }
        Insert: {
          ayat_end?: number
          ayat_start?: number
          catatan?: string
          created_at?: string
          date: string
          id?: string
          juz?: number
          musyrif_id?: string | null
          nilai?: string
          predikat?: string | null
          student_id: string
          surah_name?: string
          type?: string
          updated_at?: string
        }
        Update: {
          ayat_end?: number
          ayat_start?: number
          catatan?: string
          created_at?: string
          date?: string
          id?: string
          juz?: number
          musyrif_id?: string | null
          nilai?: string
          predikat?: string | null
          student_id?: string
          surah_name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tahfiz_hafalan_records_musyrif_id_fkey"
            columns: ["musyrif_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tahfiz_hafalan_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tahfiz_iqro_records: {
        Row: {
          catatan: string
          created_at: string
          date: string
          halaman: number
          id: string
          murojaah_harian: string | null
          musyrif_id: string | null
          nilai: string
          student_id: string
          tahap: string
          updated_at: string
        }
        Insert: {
          catatan?: string
          created_at?: string
          date: string
          halaman?: number
          id?: string
          murojaah_harian?: string | null
          musyrif_id?: string | null
          nilai?: string
          student_id: string
          tahap?: string
          updated_at?: string
        }
        Update: {
          catatan?: string
          created_at?: string
          date?: string
          halaman?: number
          id?: string
          murojaah_harian?: string | null
          musyrif_id?: string | null
          nilai?: string
          student_id?: string
          tahap?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tahfiz_iqro_records_musyrif_id_fkey"
            columns: ["musyrif_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tahfiz_iqro_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tahfiz_student_levels: {
        Row: {
          created_at: string
          current_position_desc: string | null
          level: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_position_desc?: string | null
          level?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_position_desc?: string | null
          level?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tahfiz_student_levels_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tahfiz_tilawah_records: {
        Row: {
          ayat_end: number
          ayat_start: number
          catatan: string
          created_at: string
          date: string
          halaman: number | null
          id: string
          juz: number
          murojaah_harian: string | null
          musyrif_id: string | null
          nilai_kelancaran: string
          nilai_tajwid: string | null
          student_id: string
          surah_name: string
          updated_at: string
        }
        Insert: {
          ayat_end?: number
          ayat_start?: number
          catatan?: string
          created_at?: string
          date: string
          halaman?: number | null
          id?: string
          juz?: number
          murojaah_harian?: string | null
          musyrif_id?: string | null
          nilai_kelancaran?: string
          nilai_tajwid?: string | null
          student_id: string
          surah_name?: string
          updated_at?: string
        }
        Update: {
          ayat_end?: number
          ayat_start?: number
          catatan?: string
          created_at?: string
          date?: string
          halaman?: number | null
          id?: string
          juz?: number
          murojaah_harian?: string | null
          musyrif_id?: string | null
          nilai_kelancaran?: string
          nilai_tajwid?: string | null
          student_id?: string
          surah_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tahfiz_tilawah_records_musyrif_id_fkey"
            columns: ["musyrif_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tahfiz_tilawah_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          academic_year: string
          class_name: string
          created_at: string
          day: string
          id: string
          period: number
          room: string | null
          semester: string
          slot_type: string
          subject_code: string
          subject_id: string
          subject_name: string
          teacher_id: string | null
          teacher_name: string | null
          time_end: string
          time_start: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          class_name: string
          created_at?: string
          day: string
          id?: string
          period: number
          room?: string | null
          semester?: string
          slot_type?: string
          subject_code?: string
          subject_id?: string
          subject_name?: string
          teacher_id?: string | null
          teacher_name?: string | null
          time_end?: string
          time_start?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_name?: string
          created_at?: string
          day?: string
          id?: string
          period?: number
          room?: string | null
          semester?: string
          slot_type?: string
          subject_code?: string
          subject_id?: string
          subject_name?: string
          teacher_id?: string | null
          teacher_name?: string | null
          time_end?: string
          time_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      violation_types: {
        Row: {
          category: string
          created_at: string
          default_penalty: string | null
          id: string
          is_active: boolean
          points: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          default_penalty?: string | null
          id?: string
          is_active?: boolean
          points?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_penalty?: string | null
          id?: string
          is_active?: boolean
          points?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
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
        | "pembina_ekskul"
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
        "pembina_ekskul",
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
