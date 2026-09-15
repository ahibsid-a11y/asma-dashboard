export type EkskulCategory = "wajib" | "pilihan";
export type EkskulFeePeriod = "per_bulan" | "per_semester" | "sekali";

export interface EkskulItem {
  id: string;
  name: string;
  category: EkskulCategory;
  fee: number;
  fee_period: EkskulFeePeriod;
  coach_name: string;
  coach_id?: string | undefined;
  schedule_day: string;
  schedule_time: string;
  location: string;
  quota?: number | undefined;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EkskulEnrollment {
  id: string;
  ekskul_id: string;
  student_id: string;
  semester: string;
  academic_year: string;
  enrolled_at: string;
  status: "aktif" | "menunggu_konfirmasi" | "selesai" | "keluar";
}

export interface EkskulPayment {
  id: string;
  enrollment_id: string;
  student_id: string;
  ekskul_id: string;
  period_label: string;
  amount: number;
  status: "lunas" | "belum_bayar";
  payment_date?: string | undefined;
  payment_method?: "tunai" | "transfer" | "potong_tabungan" | undefined;
  notes?: string | undefined;
  receipt_no?: string | undefined;
  verified_by?: string | undefined;
  updated_at: string;
}

export interface EkskulSession {
  id: string;
  ekskul_id: string;
  date: string;
  topic: string;
  academic_year: string;
  semester: string;
  created_at: string;
}

export interface EkskulAttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: "hadir" | "izin" | "sakit" | "alpa";
  notes?: string | undefined;
}

export interface EkskulGrade {
  id: string;
  ekskul_id: string;
  student_id: string;
  semester: string;
  academic_year: string;
  grade: "A" | "B" | "C" | "D";
  predicate: "Sangat Baik" | "Baik" | "Cukup" | "Kurang";
  description: string;
  updated_at: string;
}

export interface EkskulStoreData {
  ekskuls: EkskulItem[];
  enrollments: EkskulEnrollment[];
  payments: EkskulPayment[];
  sessions: EkskulSession[];
  attendances: EkskulAttendanceRecord[];
  grades: EkskulGrade[];
}
