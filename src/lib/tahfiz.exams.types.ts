// Client-safe types & helpers for Tahfiz exams (no server-only imports).

export interface TahfizExamQuestion {
  question_number: number;
  surah_ayat: string;
  tajwid_score: number;
  hafalan_score: number;
  total_score: number;
  notes?: string;
}

export type TahfizPredicate =
  | "Mumtaz (Istimewa)"
  | "Jayyid Jiddan (Sangat Baik)"
  | "Jayyid (Baik)"
  | "Maqbul (Cukup)"
  | "Rasib (Kurang / Mengulang)";

export interface TahfizExam {
  id: string;
  student_id: string;
  student_name: string;
  nis_nip: string;
  class_name: string;
  halaqoh_name: string;
  musyrif_name: string;
  examiner_name: string;
  exam_title: string;
  target_juz: string;
  date: string;
  semester: string;
  academic_year: string;
  questions: TahfizExamQuestion[];
  tajwid_avg: number;
  hafalan_avg: number;
  final_score: number;
  predicate: TahfizPredicate;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function calculatePredicate(finalScore: number): TahfizPredicate {
  if (finalScore >= 90) return "Mumtaz (Istimewa)";
  if (finalScore >= 80) return "Jayyid Jiddan (Sangat Baik)";
  if (finalScore >= 70) return "Jayyid (Baik)";
  if (finalScore >= 60) return "Maqbul (Cukup)";
  return "Rasib (Kurang / Mengulang)";
}
