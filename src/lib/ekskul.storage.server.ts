/**
 * Penyimpanan data ekstrakurikuler di database (Supabase), agar data tetap ada
 * setelah aplikasi dipublish. Semua penulisan dilakukan lewat service role.
 */
import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";

import type {
  EkskulAttendanceRecord,
  EkskulCategory,
  EkskulEnrollment,
  EkskulGrade,
  EkskulItem,
  EkskulPayment,
  EkskulSession,
  EkskulStoreData,
} from "./ekskul.types";

export type {
  EkskulAttendanceRecord,
  EkskulCategory,
  EkskulEnrollment,
  EkskulFeePeriod,
  EkskulGrade,
  EkskulItem,
  EkskulPayment,
  EkskulSession,
  EkskulStoreData,
} from "./ekskul.types";

/**
 * Akses database memakai identitas pengguna yang sedang login (aturan keamanan
 * baris tetap berlaku). Bila tidak ada sesi pada permintaan, gunakan klien
 * layanan sebagai cadangan.
 */
async function db(): Promise<any> {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  let authorization = "";
  try {
    authorization = getRequest()?.headers.get("authorization") ?? "";
  } catch {
    authorization = "";
  }
  if (url && key && authorization) {
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { apikey: key, Authorization: authorization } },
    }) as any;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `ekskul-${base || crypto.randomUUID().slice(0, 8)}`;
}

// ──────────────────────────────────────────────────────────────
// Pembacaan
// ──────────────────────────────────────────────────────────────

export async function loadEkskulStore(): Promise<EkskulStoreData> {
  const supabase = await db();
  const [ekskuls, enrollments, payments, sessions, attendances, grades] = await Promise.all([
    supabase.from("ekskuls").select("*").order("category").order("name"),
    supabase.from("ekskul_enrollments").select("*"),
    supabase.from("ekskul_payments").select("*"),
    supabase.from("ekskul_sessions").select("*").order("date", { ascending: false }),
    supabase.from("ekskul_attendances").select("*"),
    supabase.from("ekskul_grades").select("*"),
  ]);

  return {
    ekskuls: (ekskuls.data ?? []) as EkskulItem[],
    enrollments: (enrollments.data ?? []) as EkskulEnrollment[],
    payments: (payments.data ?? []) as EkskulPayment[],
    sessions: (sessions.data ?? []) as EkskulSession[],
    attendances: (attendances.data ?? []) as EkskulAttendanceRecord[],
    grades: (grades.data ?? []) as EkskulGrade[],
  };
}

export async function listEkskuls(): Promise<EkskulItem[]> {
  const supabase = await db();
  const { data } = await supabase.from("ekskuls").select("*").order("category").order("name");
  return (data ?? []) as EkskulItem[];
}

export async function getEkskulById(id: string): Promise<EkskulItem | undefined> {
  const supabase = await db();
  const { data } = await supabase.from("ekskuls").select("*").eq("id", id).maybeSingle();
  return (data ?? undefined) as EkskulItem | undefined;
}

// ──────────────────────────────────────────────────────────────
// Master ekskul
// ──────────────────────────────────────────────────────────────

export async function saveOrUpdateEkskul(
  item: Partial<EkskulItem> & { name: string; category: EkskulCategory },
): Promise<EkskulItem> {
  const supabase = await db();
  const row: Record<string, unknown> = {
    id: item.id || slugify(item.name),
    name: item.name,
    category: item.category,
    fee: item.fee ?? 0,
    fee_period: item.fee_period ?? "per_bulan",
    coach_name: item.coach_name || "Belum Ditentukan",
    coach_id: item.coach_id || null,
    schedule_day: item.schedule_day || "Sabtu",
    schedule_time: item.schedule_time || "16:00 - 17:30",
    location: item.location || "Pesantren",
    quota: item.quota ?? 30,
    description: item.description || "",
    is_active: item.is_active ?? true,
  };

  const { data, error } = await supabase
    .from("ekskuls")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as EkskulItem;
}

export async function deleteEkskulItem(id: string): Promise<boolean> {
  const supabase = await db();
  const { error } = await supabase.from("ekskuls").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

// ──────────────────────────────────────────────────────────────
// Pendaftaran
// ──────────────────────────────────────────────────────────────

export async function enrollStudentToEkskul(data: {
  ekskul_id: string;
  student_id: string;
  semester: string;
  academic_year: string;
}): Promise<EkskulEnrollment> {
  const supabase = await db();

  const { data: existing } = await supabase
    .from("ekskul_enrollments")
    .select("*")
    .eq("ekskul_id", data.ekskul_id)
    .eq("student_id", data.student_id)
    .eq("semester", data.semester)
    .eq("academic_year", data.academic_year)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "aktif") {
      const { data: revived } = await supabase
        .from("ekskul_enrollments")
        .update({ status: "aktif" })
        .eq("id", existing.id)
        .select("*")
        .single();
      return revived as EkskulEnrollment;
    }
    return existing as EkskulEnrollment;
  }

  const { data: enrollment, error } = await supabase
    .from("ekskul_enrollments")
    .insert({
      ekskul_id: data.ekskul_id,
      student_id: data.student_id,
      semester: data.semester,
      academic_year: data.academic_year,
      status: "aktif",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Tagihan awal otomatis untuk ekskul pilihan berbayar
  const ekskul = await getEkskulById(data.ekskul_id);
  if (ekskul && ekskul.category === "pilihan" && ekskul.fee > 0) {
    const periodLabel =
      ekskul.fee_period === "per_semester" ? `Semester ${data.semester}` : "Tagihan Awal Masuk";
    await supabase.from("ekskul_payments").insert({
      enrollment_id: enrollment.id,
      ekskul_id: data.ekskul_id,
      student_id: data.student_id,
      period_label: periodLabel,
      amount: ekskul.fee,
      status: "belum_bayar",
    });
  }

  return enrollment as EkskulEnrollment;
}

export async function unenrollStudentFromEkskul(enrollmentId: string): Promise<boolean> {
  const supabase = await db();
  const { error } = await supabase
    .from("ekskul_enrollments")
    .update({ status: "keluar" })
    .eq("id", enrollmentId);
  if (error) throw new Error(error.message);
  return true;
}

// ──────────────────────────────────────────────────────────────
// Pembayaran
// ──────────────────────────────────────────────────────────────

export async function recordPaymentUpdate(data: {
  paymentId: string;
  status: "lunas" | "belum_bayar";
  payment_method?: "tunai" | "transfer" | "potong_tabungan" | undefined;
  notes?: string | undefined;
  verified_by?: string | undefined;
}): Promise<EkskulPayment | null> {
  const supabase = await db();
  const patch: Record<string, unknown> = { status: data.status };
  if (data.status === "lunas") {
    patch["payment_date"] = new Date().toISOString().split("T")[0];
    patch["receipt_no"] = `REC-EKSKUL-${Date.now().toString().slice(-6)}`;
  } else {
    patch["payment_date"] = null;
    patch["receipt_no"] = null;
  }
  if (data.payment_method) patch["payment_method"] = data.payment_method;
  if (data.notes !== undefined) patch["notes"] = data.notes;
  if (data.verified_by) patch["verified_by"] = data.verified_by;

  const { data: updated, error } = await supabase
    .from("ekskul_payments")
    .update(patch)
    .eq("id", data.paymentId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (updated ?? null) as EkskulPayment | null;
}

export async function createBillingForStudent(data: {
  enrollment_id: string;
  student_id: string;
  ekskul_id: string;
  period_label: string;
  amount: number;
}): Promise<EkskulPayment> {
  const supabase = await db();
  const { data: payment, error } = await supabase
    .from("ekskul_payments")
    .insert({
      enrollment_id: data.enrollment_id,
      student_id: data.student_id,
      ekskul_id: data.ekskul_id,
      period_label: data.period_label,
      amount: data.amount,
      status: "belum_bayar",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return payment as EkskulPayment;
}

// ──────────────────────────────────────────────────────────────
// Sesi & presensi
// ──────────────────────────────────────────────────────────────

export async function createSessionAndAttendance(data: {
  ekskul_id: string;
  date: string;
  topic: string;
  academic_year: string;
  semester: string;
  records: {
    student_id: string;
    status: "hadir" | "izin" | "sakit" | "alpa";
    notes?: string | undefined;
  }[];
  created_by?: string | undefined;
}): Promise<EkskulSession> {
  const supabase = await db();
  const { data: session, error } = await supabase
    .from("ekskul_sessions")
    .insert({
      ekskul_id: data.ekskul_id,
      date: data.date,
      topic: data.topic,
      semester: data.semester,
      academic_year: data.academic_year,
      created_by: data.created_by || null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  if (data.records.length > 0) {
    const { error: attError } = await supabase.from("ekskul_attendances").upsert(
      data.records.map((rec) => ({
        session_id: session.id,
        student_id: rec.student_id,
        status: rec.status,
        notes: rec.notes || "",
      })),
      { onConflict: "session_id,student_id" },
    );
    if (attError) throw new Error(attError.message);
  }

  return session as EkskulSession;
}

// ──────────────────────────────────────────────────────────────
// Nilai rapor ekskul
// ──────────────────────────────────────────────────────────────

export async function saveStudentEkskulGrade(data: {
  ekskul_id: string;
  student_id: string;
  semester: string;
  academic_year: string;
  grade: "A" | "B" | "C" | "D";
  predicate: "Sangat Baik" | "Baik" | "Cukup" | "Kurang";
  description: string;
}): Promise<EkskulGrade> {
  const supabase = await db();
  const { data: saved, error } = await supabase
    .from("ekskul_grades")
    .upsert(data, { onConflict: "ekskul_id,student_id,semester,academic_year" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return saved as EkskulGrade;
}

export async function getStudentReportEkskulGrades(
  studentId: string,
  semester: string,
  academicYear: string,
): Promise<{ name: string; grade: string; description: string }[]> {
  const supabase = await db();
  const ekskuls = await listEkskuls();
  const byId = new Map(ekskuls.map((e) => [e.id, e]));

  const { data: grades } = await supabase
    .from("ekskul_grades")
    .select("*")
    .eq("student_id", studentId)
    .eq("semester", semester)
    .eq("academic_year", academicYear);

  const result: { name: string; grade: string; description: string }[] = [];
  for (const g of (grades ?? []) as EkskulGrade[]) {
    const ekskul = byId.get(g.ekskul_id);
    if (!ekskul) continue;
    result.push({
      name: ekskul.name,
      grade: g.grade,
      description:
        g.description ||
        `Menunjukkan keaktifan dan penguasaan teknik yang ${g.predicate.toLowerCase()} dalam kegiatan ${ekskul.name}.`,
    });
  }

  if (result.length === 0) {
    const { data: enrollments } = await supabase
      .from("ekskul_enrollments")
      .select("ekskul_id")
      .eq("student_id", studentId)
      .eq("semester", semester)
      .eq("academic_year", academicYear)
      .eq("status", "aktif");

    for (const enr of (enrollments ?? []) as { ekskul_id: string }[]) {
      const ekskul = byId.get(enr.ekskul_id);
      if (!ekskul) continue;
      result.push({
        name: ekskul.name,
        grade: "B",
        description: `Aktif mengikuti seluruh rangkaian kegiatan ${ekskul.name} semester ini dengan disiplin.`,
      });
    }
  }

  return result;
}
