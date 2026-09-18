import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface TahfizExamQuestion {
  question_number: number;
  surah_ayat: string; // misal "QS. An-Naba' : 1 - 20"
  tajwid_score: number; // 0 - 100
  hafalan_score: number; // 0 - 100
  total_score: number; // (tajwid + hafalan) / 2
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
  exam_title: string; // misal "Ujian Tasmi' Akhir Semester Ganjil"
  target_juz: string; // misal "Juz 30 (Juz 'Amma)"
  date: string; // YYYY-MM-DD
  semester: string; // "1" | "2"
  academic_year: string; // "2026/2027"
  questions: TahfizExamQuestion[];
  tajwid_avg: number;
  hafalan_avg: number;
  final_score: number; // 0 - 100
  predicate: TahfizPredicate;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface TahfizExamsStoreData {
  exams: TahfizExam[];
}

const STORE_PATH = path.resolve(process.cwd(), "data", "tahfiz_exams_store.json");

function ensureStoreExists(): void {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    const initialData: TahfizExamsStoreData = {
      exams: [],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initialData, null, 2), "utf-8");
  }
}

export function loadTahfizExamsStore(): TahfizExamsStoreData {
  ensureStoreExists();
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!data.exams || !Array.isArray(data.exams)) {
      data.exams = [];
    }
    return data;
  } catch (err) {
    console.error("Error reading tahfiz exams store:", err);
    return { exams: [] };
  }
}

export function saveTahfizExamsStore(data: TahfizExamsStoreData): void {
  ensureStoreExists();
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save tahfiz exams store:", err);
    throw err;
  }
}

export function calculatePredicate(finalScore: number): TahfizPredicate {
  if (finalScore >= 90) return "Mumtaz (Istimewa)";
  if (finalScore >= 80) return "Jayyid Jiddan (Sangat Baik)";
  if (finalScore >= 70) return "Jayyid (Baik)";
  if (finalScore >= 60) return "Maqbul (Cukup)";
  return "Rasib (Kurang / Mengulang)";
}

export function saveOrUpdateTahfizExam(examData: {
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
}): TahfizExam {
  const store = loadTahfizExamsStore();
  const now = new Date().toISOString();

  // Hitung nilai persoal dan rata-rata
  const processedQuestions: TahfizExamQuestion[] = examData.questions.map((q, idx) => {
    const tajwid = Math.min(100, Math.max(0, Number(q.tajwid_score) || 0));
    const hafalan = Math.min(100, Math.max(0, Number(q.hafalan_score) || 0));
    const total = Math.round((tajwid + hafalan) / 2);
    return {
      question_number: idx + 1,
      surah_ayat: q.surah_ayat,
      tajwid_score: tajwid,
      hafalan_score: hafalan,
      total_score: total,
      notes: q.notes || "",
    };
  });

  const questionCount = processedQuestions.length || 1;
  const tajwidSum = processedQuestions.reduce((sum, q) => sum + q.tajwid_score, 0);
  const hafalanSum = processedQuestions.reduce((sum, q) => sum + q.hafalan_score, 0);

  const tajwid_avg = Math.round(tajwidSum / questionCount);
  const hafalan_avg = Math.round(hafalanSum / questionCount);
  const final_score = Math.round((tajwid_avg + hafalan_avg) / 2);
  const predicate = calculatePredicate(final_score);

  if (examData.id) {
    const idx = store.exams.findIndex((e) => e.id === examData.id);
    if (idx !== -1) {
      store.exams[idx] = {
        ...store.exams[idx]!,
        ...examData,
        questions: processedQuestions,
        tajwid_avg,
        hafalan_avg,
        final_score,
        predicate,
        updated_at: now,
      };
      saveTahfizExamsStore(store);
      return store.exams[idx]!;
    }
  }

  const newExam: TahfizExam = {
    id: examData.id || `exam-${crypto.randomUUID().slice(0, 8)}`,
    ...examData,
    questions: processedQuestions,
    tajwid_avg,
    hafalan_avg,
    final_score,
    predicate,
    created_at: now,
    updated_at: now,
  };

  store.exams.unshift(newExam);
  saveTahfizExamsStore(store);
  return newExam;
}

export function deleteTahfizExam(id: string): boolean {
  const store = loadTahfizExamsStore();
  const lenBefore = store.exams.length;
  store.exams = store.exams.filter((e) => e.id !== id);
  if (store.exams.length !== lenBefore) {
    saveTahfizExamsStore(store);
    return true;
  }
  return false;
}
