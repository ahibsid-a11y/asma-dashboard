// Client-safe curriculum types & constants (no server-only imports).

export type CurriculumPlan = {
  id: string;
  subject_id: string;
  class_name: string;
  academic_year: string;
  teacher_id: string | null;
  phase: string;
  jp_per_week: number;
  total_tp_count: number;
  completion_percentage: number;
  realization_ganjil_percentage: number;
  realization_genap_percentage: number;
  created_at?: string;
  updated_at?: string;
};

export type CurriculumElement = {
  id: string;
  plan_id: string;
  order_index: number;
  name: string;
  cp_description: string;
  created_at?: string;
  updated_at?: string;
};

export type CurriculumTp = {
  id: string;
  plan_id: string | null;
  subject_id: string;
  class_name: string;
  semester: string; // '1' | '2'
  academic_year: string;
  code: string;
  description: string;
  cp_code: string | null;
  element_name: string | null;
  cognitive_level: string;
  dimension: string;
  atp_order: number;
  atp_flow: string | null;
  alokasi_jp: number;
  assessment_method: string;
  status_tp: boolean;
  status_atp: boolean;
  status_asesmen: boolean;
  status_realisasi: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
};

export type CurriculumTimeAllocation = {
  id: string;
  plan_id: string;
  semester: "1" | "2";
  month_name: string;
  month_order: number;
  calendar_weeks: number;
  non_effective_weeks: number;
  effective_weeks: number;
  effective_jp: number;
  notes: string | null;
};

export type CurriculumPromesEntry = {
  id: string;
  plan_id: string;
  tp_id: string;
  semester: "1" | "2";
  month_name: string;
  week_number: number;
  allocated_jp: number;
  activity_type: "kbm" | "formatif" | "sts" | "sas" | "libur" | "remedial";
  notes: string | null;
};

export const DEFAULT_MONTHS_GANJIL = [
  { name: "Juli", order: 1, calendar: 4.5, nonEffective: 2.0, effective: 2.5 },
  { name: "Agustus", order: 2, calendar: 5.0, nonEffective: 0.0, effective: 5.0 },
  { name: "September", order: 3, calendar: 4.5, nonEffective: 1.0, effective: 3.5 },
  { name: "Oktober", order: 4, calendar: 4.5, nonEffective: 0.0, effective: 4.5 },
  { name: "November", order: 5, calendar: 4.5, nonEffective: 0.0, effective: 4.5 },
  { name: "Desember", order: 6, calendar: 4.5, nonEffective: 2.5, effective: 2.0 },
];

export const DEFAULT_MONTHS_GENAP = [
  { name: "Januari", order: 7, calendar: 4.5, nonEffective: 1.0, effective: 3.5 },
  { name: "Februari", order: 8, calendar: 4.0, nonEffective: 0.0, effective: 4.0 },
  { name: "Maret", order: 9, calendar: 4.5, nonEffective: 1.0, effective: 3.5 },
  { name: "April", order: 10, calendar: 4.5, nonEffective: 0.5, effective: 4.0 },
  { name: "Mei", order: 11, calendar: 4.5, nonEffective: 0.5, effective: 4.0 },
  { name: "Juni", order: 12, calendar: 4.5, nonEffective: 3.0, effective: 1.5 },
];
