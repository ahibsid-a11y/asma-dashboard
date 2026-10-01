import {
  calculatePredicate,
  type TahfizExam,
  type TahfizExamQuestion,
} from "./tahfiz.exams.types";

export type { TahfizExam, TahfizExamQuestion, TahfizPredicate } from "./tahfiz.exams.types";
export { calculatePredicate } from "./tahfiz.exams.types";

type Db = any;

export type TahfizExamInput = {
  id?: string;
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
  questions: {
    question_number: number;
    surah_ayat: string;
    tajwid_score: number;
    hafalan_score: number;
    notes?: string;
  }[];
  notes?: string;
};

function toExam(row: any): TahfizExam {
  return {
    ...row,
    date: String(row.date),
    questions: Array.isArray(row.questions) ? row.questions : [],
    tajwid_avg: Number(row.tajwid_avg) || 0,
    hafalan_avg: Number(row.hafalan_avg) || 0,
    final_score: Number(row.final_score) || 0,
    notes: row.notes ?? "",
  } as TahfizExam;
}

export async function listTahfizExams(
  db: Db,
  filter: { studentId?: string | undefined; semester?: string | undefined; academicYear?: string | undefined; halaqoh?: string | undefined } = {},
): Promise<TahfizExam[]> {
  let q = db.from("tahfiz_exams").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
  if (filter.studentId) q = q.eq("student_id", filter.studentId);
  if (filter.semester && filter.semester !== "all") q = q.eq("semester", filter.semester);
  if (filter.academicYear && filter.academicYear !== "all") q = q.eq("academic_year", filter.academicYear);
  if (filter.halaqoh && filter.halaqoh !== "all") q = q.eq("halaqoh_name", filter.halaqoh);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(toExam);
}

export async function saveOrUpdateTahfizExam(db: Db, userId: string, examData: TahfizExamInput): Promise<TahfizExam> {
  const processed: TahfizExamQuestion[] = examData.questions.map((q, idx) => {
    const tajwid = Math.min(100, Math.max(0, Number(q.tajwid_score) || 0));
    const hafalan = Math.min(100, Math.max(0, Number(q.hafalan_score) || 0));
    return {
      question_number: idx + 1,
      surah_ayat: q.surah_ayat,
      tajwid_score: tajwid,
      hafalan_score: hafalan,
      total_score: Math.round((tajwid + hafalan) / 2),
      notes: q.notes || "",
    };
  });
  const n = processed.length || 1;
  const tajwid_avg = Math.round(processed.reduce((s, q) => s + q.tajwid_score, 0) / n);
  const hafalan_avg = Math.round(processed.reduce((s, q) => s + q.hafalan_score, 0) / n);
  const final_score = Math.round((tajwid_avg + hafalan_avg) / 2);

  const row: Record<string, unknown> = {
    student_id: examData.student_id,
    student_name: examData.student_name,
    nis_nip: examData.nis_nip,
    class_name: examData.class_name,
    halaqoh_name: examData.halaqoh_name,
    musyrif_name: examData.musyrif_name,
    examiner_name: examData.examiner_name,
    exam_title: examData.exam_title,
    target_juz: examData.target_juz,
    date: examData.date,
    semester: examData.semester,
    academic_year: examData.academic_year,
    questions: processed,
    tajwid_avg,
    hafalan_avg,
    final_score,
    predicate: calculatePredicate(final_score),
    notes: examData.notes ?? null,
  };

  if (examData.id) {
    const { data, error } = await db.from("tahfiz_exams").update(row).eq("id", examData.id).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return toExam(data);
  }
  const { data, error } = await db
    .from("tahfiz_exams")
    .insert({ ...row, ...(examData.id ? { id: examData.id } : {}), created_by: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toExam(data);
}

export async function deleteTahfizExam(db: Db, id: string): Promise<boolean> {
  const { data, error } = await db.from("tahfiz_exams").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}
