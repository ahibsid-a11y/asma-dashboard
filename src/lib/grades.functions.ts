import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMemberAdmin } from "@/lib/roles";

type Ctx = { supabase: any; userId: string };

export type SubjectGroup = "Umum" | "Diniyyah" | "Bahasa Arab" | "Muatan Lokal";

export type AcademicSubject = {
  id: string;
  code: string;
  name: string;
  group: SubjectGroup;
  kkm: number;
  order_index: number;
  is_active: boolean;
};

export type LearningObjective = {
  id: string;
  subject_id: string;
  class_name: string;
  semester: string;
  academic_year: string;
  code: string;
  description: string;
  cp_code: string | null;
  order_index: number;
};

export type StudentSubjectSummary = {
  id: string;
  student_id: string;
  subject_id: string;
  class_name: string;
  semester: string;
  academic_year: string;
  avg_tp_score: number;
  sts_score: number;
  sas_score: number;
  final_score: number;
  letter_grade: string;
  highest_tp_desc: string | null;
  lowest_tp_desc: string | null;
  teacher_notes: string | null;
};

export type GradingSettings = {
  academic_year: string;
  semester: string;
  weight_tp: number;
  weight_sts: number;
  weight_sas: number;
};

export const DEFAULT_SUBJECTS: Omit<AcademicSubject, "id">[] = [
  // Umum (Kemendikdasmen / Kurikulum Merdeka)
  { code: "PAI", name: "Pendidikan Agama Islam & Budi Pekerti", group: "Umum", kkm: 75, order_index: 1, is_active: true },
  { code: "PPKN", name: "Pendidikan Pancasila", group: "Umum", kkm: 75, order_index: 2, is_active: true },
  { code: "BIN", name: "Bahasa Indonesia", group: "Umum", kkm: 75, order_index: 3, is_active: true },
  { code: "MAT", name: "Matematika", group: "Umum", kkm: 75, order_index: 4, is_active: true },
  { code: "IPA", name: "Ilmu Pengetahuan Alam (IPA)", group: "Umum", kkm: 75, order_index: 5, is_active: true },
  { code: "IPS", name: "Ilmu Pengetahuan Sosial (IPS)", group: "Umum", kkm: 75, order_index: 6, is_active: true },
  { code: "BIG", name: "Bahasa Inggris", group: "Umum", kkm: 75, order_index: 7, is_active: true },
  { code: "INF", name: "Informatika", group: "Umum", kkm: 75, order_index: 8, is_active: true },
  { code: "PJK", name: "Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)", group: "Umum", kkm: 75, order_index: 9, is_active: true },
  { code: "SNB", name: "Seni dan Prakarya", group: "Umum", kkm: 75, order_index: 10, is_active: true },

  // Diniyyah (Kepesantrenan AHIBS)
  { code: "FQH", name: "Fiqih Ibadah", group: "Diniyyah", kkm: 75, order_index: 11, is_active: true },
  { code: "THD", name: "Tauhid & Aqidah", group: "Diniyyah", kkm: 75, order_index: 12, is_active: true },
  { code: "SRH", name: "Siroh Nabawiyah & Tarikh", group: "Diniyyah", kkm: 75, order_index: 13, is_active: true },
  { code: "HDS", name: "Hadits & Adab", group: "Diniyyah", kkm: 75, order_index: 14, is_active: true },

  // Bahasa Arab
  { code: "ABA", name: "Al-Arobiyyah Lil Aulad (ABA)", group: "Bahasa Arab", kkm: 75, order_index: 15, is_active: true },
  { code: "IML", name: "Imla & Khot", group: "Bahasa Arab", kkm: 75, order_index: 16, is_active: true },
  { code: "NHW", name: "Nahwu & Shorof Dasar", group: "Bahasa Arab", kkm: 75, order_index: 17, is_active: true },
];

export function calculateLetterGrade(score: number): { grade: "A" | "B" | "C" | "D"; label: string } {
  if (score >= 90) return { grade: "A", label: "Sangat Baik" };
  if (score >= 80) return { grade: "B", label: "Baik" };
  if (score >= 75) return { grade: "C", label: "Cukup (Tuntas)" };
  return { grade: "D", label: "Perlu Bimbingan (Belum Tuntas)" };
}

export async function ensureSubjects(supabaseAdmin: any): Promise<AcademicSubject[]> {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("academic_subjects")
      .select("id,code,name,group,kkm,order_index,is_active")
      .order("order_index", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as AcademicSubject[];
    }

    const { data: inserted, error: insertError } = await (supabaseAdmin as any)
      .from("academic_subjects")
      .insert(DEFAULT_SUBJECTS)
      .select("id,code,name,group,kkm,order_index,is_active");

    if (!insertError && inserted && inserted.length > 0) {
      return inserted as AcademicSubject[];
    }
  } catch (err) {
    console.warn("ensureSubjects fallback to static list:", err);
  }

  return DEFAULT_SUBJECTS.map((s, idx) => ({
    id: `sbj_${idx + 1}`,
    code: s.code,
    name: s.name,
    group: s.group,
    kkm: s.kkm,
    order_index: s.order_index,
    is_active: s.is_active,
  }));
}

/** 1. Ambil daftar mata pelajaran */
export const getAcademicSubjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return ensureSubjects(supabaseAdmin);
  });

/** 2. Kelola mata pelajaran (Admin / Kurikulum) */
export const manageSubject = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        action: z.enum(["create", "update", "delete", "toggle"]),
        id: z.string().optional(),
        code: z.string().trim().min(2).optional(),
        name: z.string().trim().min(3).optional(),
        group: z.enum(["Umum", "Diniyyah", "Bahasa Arab", "Muatan Lokal"]).optional(),
        kkm: z.number().int().min(50).max(100).optional(),
        order_index: z.number().int().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await (supabaseAdmin as any)
      .from("profiles")
      .select("account_type")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (!me || (!isMemberAdmin(me.account_type) && me.account_type !== "waka_kurikulum")) {
      throw new Error("Hanya kurikulum atau admin yang dapat mengelola mata pelajaran");
    }

    const table = (supabaseAdmin as any).from("academic_subjects");

    if (data.action === "create") {
      const { data: created, error } = await table
        .insert({
          code: data.code?.toUpperCase() || `SBJ_${Date.now()}`,
          name: data.name,
          group: data.group || "Umum",
          kkm: data.kkm || 75,
          order_index: data.order_index || 99,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { success: true, created };
    }

    if (!data.id) throw new Error("ID mapel wajib diisi");

    if (data.action === "update") {
      const updates: Record<string, any> = {};
      if ("code" in data && data.code !== undefined) updates["code"] = data.code.toUpperCase();
      if ("name" in data && data.name !== undefined) updates["name"] = data.name;
      if ("group" in data && data.group !== undefined) updates["group"] = data.group;
      if ("kkm" in data && data.kkm !== undefined) updates["kkm"] = data.kkm;
      if ("order_index" in data && data.order_index !== undefined) updates["order_index"] = data.order_index;
      if ("is_active" in data && data.is_active !== undefined) updates["is_active"] = data.is_active;

      const { data: updated, error } = await table.update(updates).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return { success: true, updated };
    }

    if (data.action === "toggle") {
      const { data: existing } = await table.select("is_active").eq("id", data.id).single();
      const next = !existing?.is_active;
      const { error } = await table.update({ is_active: next }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true, is_active: next };
    }

    if (data.action === "delete") {
      const { error } = await table.delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true, deletedId: data.id };
    }

    return { success: false };
  });

/** 3. Ambil daftar Tujuan Pembelajaran (TP & CP) */
export const getLearningObjectives = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        subject_id: z.string().min(1),
        class_name: z.string(),
        semester: z.string().default("1"),
        academic_year: z.string().default("2026/2027"),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let tps: LearningObjective[] = [];
    try {
      const { data: tpData, error } = await (supabaseAdmin as any)
        .from("learning_objectives")
        .select("*")
        .eq("subject_id", data.subject_id)
        .eq("class_name", data.class_name)
        .eq("semester", data.semester)
        .eq("academic_year", data.academic_year)
        .order("order_index", { ascending: true });

      if (!error && tpData && tpData.length > 0) {
        tps = tpData as LearningObjective[];
      }
    } catch {}

    if (tps.length === 0) {
      const storage = await import("./curriculum.storage.server");
      const cTps = storage.getTps(data.subject_id, data.class_name, data.academic_year);
      tps = cTps.filter((t) => t.semester === data.semester) as any;
    }

    return tps;
  });

/** 4. Kelola Tujuan Pembelajaran (TP & CP) */
export const manageLearningObjective = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        action: z.enum(["create", "update", "delete"]),
        id: z.string().min(1).optional(),
        subject_id: z.string().min(1).optional(),
        class_name: z.string().optional(),
        semester: z.string().default("1"),
        academic_year: z.string().default("2026/2027"),
        code: z.string().trim().min(2).optional(),
        description: z.string().trim().min(2).optional(),
        cp_code: z.string().trim().optional().nullable(),
        order_index: z.number().int().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolvePlanUuid } = await import("./curriculum-plan.server");

    if (data.action === "create") {
      if (!data.subject_id || !data.class_name || !data.code || !data.description) {
        throw new Error("Data TP belum lengkap");
      }

      const planId = await resolvePlanUuid(supabaseAdmin, {
        subject_id: data.subject_id,
        class_name: data.class_name,
        academic_year: data.academic_year,
        teacher_id: ctx.userId,
      });

      const { count } = await (supabaseAdmin as any)
        .from("learning_objectives")
        .select("id", { count: "exact", head: true })
        .eq("subject_id", data.subject_id)
        .eq("class_name", data.class_name)
        .eq("academic_year", data.academic_year)
        .eq("semester", data.semester);

      const nextOrder = data.order_index || (count ?? 0) + 1;

      const row = {
        plan_id: planId,
        subject_id: data.subject_id,
        class_name: data.class_name,
        semester: data.semester,
        academic_year: data.academic_year,
        code: data.code,
        description: data.description,
        cp_code: data.cp_code || null,
        element_name: null,
        cognitive_level: "C2 - Memahami",
        dimension: "Pengetahuan",
        atp_order: nextOrder,
        alokasi_jp: 2,
        assessment_method: "Tes Tertulis",
        status_tp: true,
        status_atp: true,
        status_asesmen: true,
        status_realisasi: "Belum Terlaksana",
        order_index: nextOrder,
        updated_at: new Date().toISOString(),
      };

      const { data: created, error } = await (supabaseAdmin as any)
        .from("learning_objectives")
        .upsert(row, { onConflict: "subject_id,class_name,academic_year,code" })
        .select()
        .single();

      if (error) {
        if ((error.message || "").includes("duplicate")) {
          throw new Error(`Kode TP "${data.code}" sudah dipakai pada kelas & mapel ini`);
        }
        throw new Error(error.message);
      }

      if (planId) {
        const { count: total } = await (supabaseAdmin as any)
          .from("learning_objectives")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", planId);
        await (supabaseAdmin as any)
          .from("curriculum_plans")
          .update({ total_tp_count: total ?? 0, updated_at: new Date().toISOString() })
          .eq("id", planId);
      }

      return { success: true, created };
    }

    if (!data.id) throw new Error("ID TP wajib diisi");

    if (data.action === "update") {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (data.code !== undefined) updates["code"] = data.code;
      if (data.description !== undefined) updates["description"] = data.description;
      if (data.cp_code !== undefined) updates["cp_code"] = data.cp_code;
      if (data.order_index !== undefined) updates["order_index"] = data.order_index;

      const { data: updated, error } = await (supabaseAdmin as any)
        .from("learning_objectives")
        .update(updates)
        .eq("id", data.id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { success: true, updated };
    }

    if (data.action === "delete") {
      const { error } = await (supabaseAdmin as any)
        .from("learning_objectives")
        .delete()
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true, deletedId: data.id };
    }

    return { success: false };
  });

/** Daftar kelas resmi untuk dropdown Input Nilai & Perangkat Ajar */
export const listClassOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("classes")
      .select("name,grade")
      .order("grade", { ascending: true })
      .order("name", { ascending: true });

    const names = (data ?? []).map((c: any) => c.name as string).filter(Boolean);
    if (names.length > 0) return names;
    return ["Kelas 7A", "Kelas 7B", "Kelas 8A", "Kelas 8B", "Kelas 9A", "Kelas 9B"];
  });

/** 5. Ambil spreadsheet input nilai untuk satu kelas */
export const getInputGradesSheet = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        subject_id: z.string().min(1),
        class_name: z.string(),
        semester: z.string().default("1"),
        academic_year: z.string().default("2026/2027"),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Mapel (selalu fallback aman)
    const subjects = await ensureSubjects(supabaseAdmin);
    let subject = subjects.find((s) => s.id === data.subject_id);
    if (!subject) {
      subject = subjects[0] || {
        id: data.subject_id,
        code: "MAPEL",
        name: "Mata Pelajaran",
        group: "Umum",
        kkm: 75,
        order_index: 1,
        is_active: true,
      };
    }

    // TP aktif
    let tps: LearningObjective[] = [];
    try {
      const { data: tpData } = await (supabaseAdmin as any)
        .from("learning_objectives")
        .select("*")
        .eq("subject_id", data.subject_id)
        .eq("class_name", data.class_name)
        .eq("semester", data.semester)
        .eq("academic_year", data.academic_year)
        .order("order_index", { ascending: true });
      if (tpData && tpData.length > 0) {
        tps = tpData as LearningObjective[];
      }
    } catch {}

    if (tps.length === 0) {
      const storage = await import("./curriculum.storage.server");
      const cTps = storage.getTps(data.subject_id, data.class_name, data.academic_year);
      tps = cTps.filter((t) => t.semester === data.semester) as any;
    }

    // Santri di kelas tersebut
    let students: any[] = [];
    try {
      const { data: stdData, error: stdErr } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id,name,display_name,nis_nip,dorm,class,avatar")
        .eq("account_type", "santri")
        .eq("status", "Aktif")
        .eq("class", data.class_name)
        .order("name", { ascending: true });
      if (!stdErr && stdData) {
        students = stdData;
      }
    } catch {}

    const studentIds = students.map((s: any) => s.id);

    // Nilai Formatif TP
    const tpGradesMap: Record<string, number> = {};
    if (tps && tps.length > 0 && studentIds.length > 0) {
      try {
        const tpIds = tps.map((t: any) => t.id);
        const { data: tpGrades } = await (supabaseAdmin as any)
          .from("student_tp_grades")
          .select("tp_id,student_id,score")
          .in("tp_id", tpIds)
          .in("student_id", studentIds);

        for (const g of tpGrades ?? []) {
          tpGradesMap[`${g.student_id}_${g.tp_id}`] = Number(g.score);
        }
      } catch {}
    }

    // Nilai Rangkuman Mapel (STS, SAS, Nilai Akhir)
    const summariesMap: Record<string, StudentSubjectSummary> = {};
    if (studentIds.length > 0) {
      try {
        const { data: summaries } = await (supabaseAdmin as any)
          .from("student_subject_summaries")
          .select("*")
          .eq("subject_id", data.subject_id)
          .eq("class_name", data.class_name)
          .eq("semester", data.semester)
          .eq("academic_year", data.academic_year)
          .in("student_id", studentIds);

        for (const sum of summaries ?? []) {
          summariesMap[sum.student_id] = sum as StudentSubjectSummary;
        }
      } catch {}
    }

    // Pengaturan Bobot
    let settings: GradingSettings = {
      academic_year: data.academic_year,
      semester: data.semester,
      weight_tp: 50,
      weight_sts: 25,
      weight_sas: 25,
    };
    try {
      const { data: settingsRow } = await (supabaseAdmin as any)
        .from("grading_settings")
        .select("*")
        .eq("academic_year", data.academic_year)
        .eq("semester", data.semester)
        .maybeSingle();

      if (settingsRow) {
        settings = settingsRow;
      }
    } catch {}

    return {
      subject: subject as AcademicSubject,
      tps,
      students,
      tpGradesMap,
      summariesMap,
      settings,
    };
  });

/** 6. Simpan nilai kelas secara batch (Formatif TP, STS, SAS & Auto-Deskripsi) */
export const saveGradesBatch = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        subject_id: z.string().min(1),
        class_name: z.string(),
        semester: z.string().default("1"),
        academic_year: z.string().default("2026/2027"),
        grades: z.array(
          z.object({
            student_id: z.string().min(1),
            tp_scores: z.record(z.string(), z.number().min(0).max(100)),
            sts_score: z.number().min(0).max(100).default(0),
            sas_score: z.number().min(0).max(100).default(0),
            teacher_notes: z.string().optional(),
          }),
        ),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ambil TP untuk menyusun deskripsi capaian
    const { data: tps } = await (supabaseAdmin as any)
      .from("learning_objectives")
      .select("id,code,description")
      .eq("subject_id", data.subject_id)
      .eq("class_name", data.class_name)
      .eq("semester", data.semester)
      .eq("academic_year", data.academic_year);

    const tpMap = new Map<string, { code: string; description: string }>();
    for (const t of tps ?? []) {
      tpMap.set(t.id, { code: t.code, description: t.description });
    }

    // Ambil bobot nilai
    const { data: settingsRow } = await (supabaseAdmin as any)
      .from("grading_settings")
      .select("*")
      .eq("academic_year", data.academic_year)
      .eq("semester", data.semester)
      .maybeSingle();

    const wTp = (settingsRow?.weight_tp ?? 50) / 100;
    const wSts = (settingsRow?.weight_sts ?? 25) / 100;
    const wSas = (settingsRow?.weight_sas ?? 25) / 100;

    const tpRowsToUpsert: any[] = [];
    const summaryRowsToUpsert: any[] = [];
    const nowIso = new Date().toISOString();

    for (const g of data.grades) {
      let tpSum = 0;
      let tpCount = 0;
      let highestTp: { score: number; desc: string } | null = null;
      let lowestTp: { score: number; desc: string } | null = null;

      // Olah per-TP
      for (const [tpId, score] of Object.entries(g.tp_scores)) {
        const numScore = Number(score) || 0;
        tpSum += numScore;
        tpCount += 1;

        const tpObj = tpMap.get(tpId);
        const desc = tpObj ? `${tpObj.code} (${tpObj.description})` : "materi ajar";

        if (!highestTp || numScore > highestTp.score) {
          highestTp = { score: numScore, desc };
        }
        if (!lowestTp || numScore < lowestTp.score) {
          lowestTp = { score: numScore, desc };
        }

        tpRowsToUpsert.push({
          tp_id: tpId,
          student_id: g.student_id,
          score: numScore,
          graded_by: ctx.userId,
          updated_at: nowIso,
        });
      }

      const avgTp = tpCount > 0 ? Math.round((tpSum / tpCount) * 10) / 10 : 0;
      const sts = Number(g.sts_score) || 0;
      const sas = Number(g.sas_score) || 0;

      // Hitung Nilai Akhir
      const finalScore = Math.round((avgTp * wTp + sts * wSts + sas * wSas) * 10) / 10;
      const { grade } = calculateLetterGrade(finalScore);

      // Susun Deskripsi Rapor Kurikulum Merdeka
      const highestDesc = highestTp && highestTp.score >= 75
        ? `Menunjukkan penguasaan yang sangat baik dalam ${highestTp.desc}.`
        : null;

      const lowestDesc = lowestTp && lowestTp.score < 75
        ? `Perlu bimbingan dan peningkatan pemahaman dalam ${lowestTp.desc}.`
        : null;

      summaryRowsToUpsert.push({
        student_id: g.student_id,
        subject_id: data.subject_id,
        class_name: data.class_name,
        semester: data.semester,
        academic_year: data.academic_year,
        avg_tp_score: avgTp,
        sts_score: sts,
        sas_score: sas,
        final_score: finalScore,
        letter_grade: grade,
        highest_tp_desc: highestDesc,
        lowest_tp_desc: lowestDesc,
        teacher_notes: g.teacher_notes || null,
        updated_at: nowIso,
      });
    }

    // Upsert Formatif TP
    if (tpRowsToUpsert.length > 0) {
      const { error: tpErr } = await (supabaseAdmin as any)
        .from("student_tp_grades")
        .upsert(tpRowsToUpsert, { onConflict: "tp_id,student_id" });
      if (tpErr) throw new Error(tpErr.message);
    }

    // Upsert Rangkuman Mapel
    if (summaryRowsToUpsert.length > 0) {
      const { error: sumErr } = await (supabaseAdmin as any)
        .from("student_subject_summaries")
        .upsert(summaryRowsToUpsert, {
          onConflict: "student_id,subject_id,semester,academic_year",
        });
      if (sumErr) throw new Error(sumErr.message);
    }

    return { success: true, count: summaryRowsToUpsert.length };
  });

/** 7. Rekapitulasi Nilai & Peringkat Kelas (Leger Nilai) */
export const getClassGradesRecap = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        class_name: z.string(),
        semester: z.string().default("1"),
        academic_year: z.string().default("2026/2027"),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Ambil seluruh mapel aktif
    const subjects = await ensureSubjects(supabaseAdmin);
    const activeSubjects = subjects.filter((s) => s.is_active);

    // 2. Ambil santri di kelas tersebut
    const { data: students } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,display_name,nis_nip,dorm,class,avatar")
      .eq("account_type", "santri")
      .eq("status", "Aktif")
      .eq("class", data.class_name)
      .order("name", { ascending: true });

    const studentIds = (students ?? []).map((s: any) => s.id);

    if (studentIds.length === 0) {
      return {
        subjects: activeSubjects,
        studentsRanked: [],
        gradesMatrix: {},
        remedialList: [],
        subjectAverages: {},
      };
    }

    // 3. Ambil seluruh summaries nilai untuk santri di kelas ini
    const { data: summaries } = await (supabaseAdmin as any)
      .from("student_subject_summaries")
      .select("*")
      .eq("class_name", data.class_name)
      .eq("semester", data.semester)
      .eq("academic_year", data.academic_year)
      .in("student_id", studentIds);

    const gradesMatrix: Record<string, StudentSubjectSummary> = {};
    const studentTotals: Record<string, { sum: number; count: number }> = {};
    const subjectStats: Record<string, { sum: number; count: number }> = {};
    const remedialList: any[] = [];

    const subjectKkmMap = new Map<string, number>();
    for (const s of activeSubjects) {
      subjectKkmMap.set(s.id, s.kkm);
    }

    for (const sum of summaries ?? []) {
      const key = `${sum.student_id}_${sum.subject_id}`;
      gradesMatrix[key] = sum as StudentSubjectSummary;

      const score = Number(sum.final_score) || 0;

      // Akumulasi per santri
      if (!studentTotals[sum.student_id]) {
        studentTotals[sum.student_id] = { sum: 0, count: 0 };
      }
      studentTotals[sum.student_id]!.sum += score;
      studentTotals[sum.student_id]!.count += 1;

      // Akumulasi per mapel
      if (!subjectStats[sum.subject_id]) {
        subjectStats[sum.subject_id] = { sum: 0, count: 0 };
      }
      subjectStats[sum.subject_id]!.sum += score;
      subjectStats[sum.subject_id]!.count += 1;

      // Cek remedial KKM
      const kkm = subjectKkmMap.get(sum.subject_id) || 75;
      if (score < kkm) {
        remedialList.push({
          student_id: sum.student_id,
          subject_id: sum.subject_id,
          score,
          kkm,
        });
      }
    }

    // Hitung ranking
    const studentsRanked = (students ?? [])
      .map((s: any) => {
        const tot = studentTotals[s.id];
        const overallAverage = tot && tot.count > 0 ? Math.round((tot.sum / tot.count) * 10) / 10 : 0;
        return {
          student: s,
          totalScore: tot?.sum || 0,
          subjectCount: tot?.count || 0,
          overallAverage,
        };
      })
      .sort((a: any, b: any) => b.overallAverage - a.overallAverage);

    // Rata-rata per mapel
    const subjectAverages: Record<string, number> = {};
    for (const [sbjId, st] of Object.entries(subjectStats)) {
      subjectAverages[sbjId] = st.count > 0 ? Math.round((st.sum / st.count) * 10) / 10 : 0;
    }

    return {
      subjects: activeSubjects,
      studentsRanked,
      gradesMatrix,
      remedialList,
      subjectAverages,
    };
  });

/** 8. Ambil dokumen Rapor Digital Lengkap untuk satu santri */
export const getStudentReportCard = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        semester: z.string().default("1"),
        academic_year: z.string().default("2026/2027"),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Profil santri
    const { data: student, error: stdErr } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,display_name,nis_nip,dorm,class,avatar")
      .eq("id", data.student_id)
      .maybeSingle();

    if (stdErr || !student) throw new Error("Santri tidak ditemukan");

    // 2. Daftar mapel aktif
    const allSubjects = await ensureSubjects(supabaseAdmin);
    const activeSubjects = allSubjects.filter((s) => s.is_active);

    // 3. Nilai summaries
    const { data: summaries } = await (supabaseAdmin as any)
      .from("student_subject_summaries")
      .select("*")
      .eq("student_id", data.student_id)
      .eq("semester", data.semester)
      .eq("academic_year", data.academic_year);

    const summaryMap = new Map<string, StudentSubjectSummary>();
    for (const sum of summaries ?? []) {
      summaryMap.set(sum.subject_id, sum as StudentSubjectSummary);
    }

    // 4. Nilai per-TP
    const { data: tpGrades } = await (supabaseAdmin as any)
      .from("student_tp_grades")
      .select(
        `
        score,
        learning_objectives!inner (
          id,
          subject_id,
          code,
          description,
          order_index
        )
      `,
      )
      .eq("student_id", data.student_id);

    const tpDetailsBySubject: Record<string, { code: string; desc: string; score: number }[]> = {};
    for (const g of tpGrades ?? []) {
      const lo = g.learning_objectives;
      if (!lo) continue;
      if (!tpDetailsBySubject[lo.subject_id]) {
        tpDetailsBySubject[lo.subject_id] = [];
      }
      tpDetailsBySubject[lo.subject_id]!.push({
        code: lo.code,
        desc: lo.description,
        score: Number(g.score),
      });
    }

    // Kelompokkan mapel
    const grouped = {
      umum: [] as any[],
      diniyyah: [] as any[],
      bahasa_arab: [] as any[],
    };

    for (const sbj of activeSubjects) {
      const sum = summaryMap.get(sbj.id);
      const tpList = (tpDetailsBySubject[sbj.id] || []).sort(
        (a, b) => a.code.localeCompare(b.code),
      );

      const finalScore = sum?.final_score ?? 0;
      const letterGrade = sum?.letter_grade ?? "-";

      const item = {
        subject: sbj,
        finalScore,
        letterGrade,
        stsScore: sum?.sts_score ?? 0,
        sasScore: sum?.sas_score ?? 0,
        highestDesc: sum?.highest_tp_desc || null,
        lowestDesc: sum?.lowest_tp_desc || null,
        tpList,
      };

      if (sbj.group === "Umum") grouped.umum.push(item);
      else if (sbj.group === "Diniyyah") grouped.diniyyah.push(item);
      else if (sbj.group === "Bahasa Arab") grouped.bahasa_arab.push(item);
    }

    // 5. Kehadiran dari attendance_records jika ada
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    try {
      const { data: att } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("status")
        .eq("user_id", data.student_id);

      for (const a of att ?? []) {
        if (a.status === "hadir") hadir++;
        else if (a.status === "sakit") sakit++;
        else if (a.status === "izin") izin++;
        else if (a.status === "alpha") alpa++;
      }
    } catch {
      // ignore
    }

    // 6. Wali Kelas & Kepala Sekolah
    let homeroomTeacherName = "Ustadz Wali Kelas";
    let headmasterName = "Mudir / Kepala Sekolah";

    try {
      const { data: hr } = await (supabaseAdmin as any)
        .from("profiles")
        .select("name")
        .eq("account_type", "wali_kelas")
        .eq("class", student.class)
        .maybeSingle();
      if (hr) homeroomTeacherName = hr.name;

      const { data: hm } = await (supabaseAdmin as any)
        .from("profiles")
        .select("name")
        .in("account_type", ["kepala_sekolah", "mudir"])
        .limit(1);
      if (hm && hm[0]) headmasterName = hm[0].name;
    } catch {
      // ignore
    }

    return {
      student,
      semester: data.semester,
      academic_year: data.academic_year,
      school: {
        name: "SMPIT Putra Al-Hanif",
        foundation: "Al-Hanif Islamic Boarding School (AHIBS)",
        address: "Jl. Al-Hanif, Cilegon, Banten",
        logo: "/logo-alhanif.png",
      },
      groupedSubjects: grouped,
      attendance: { hadir, sakit, izin, alpa },
      signatures: {
        homeroomTeacher: homeroomTeacherName,
        headmaster: headmasterName,
      },
    };
  });

/** 9. Ambil data nilai mandiri untuk santri yang sedang login */
export const getMyGrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,display_name,nis_nip,dorm,class,avatar")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (!me) throw new Error("Santri tidak ditemukan");

    // Panggil getStudentReportCard untuk semester 1 tahun 2026/2027
    const allSubjects = await ensureSubjects(supabaseAdmin);
    const activeSubjects = allSubjects.filter((s) => s.is_active);

    const { data: summaries } = await (supabaseAdmin as any)
      .from("student_subject_summaries")
      .select("*")
      .eq("student_id", me.id);

    const summaryMap = new Map<string, any>();
    for (const sum of summaries ?? []) {
      summaryMap.set(sum.subject_id, sum);
    }

    // TP grades
    const { data: tpGrades } = await (supabaseAdmin as any)
      .from("student_tp_grades")
      .select(
        `
        score,
        learning_objectives!inner (
          id,
          subject_id,
          code,
          description
        )
      `,
      )
      .eq("student_id", me.id);

    const tpMap: Record<string, any[]> = {};
    for (const g of tpGrades ?? []) {
      const lo = g.learning_objectives;
      if (!lo) continue;
      if (!tpMap[lo.subject_id]) tpMap[lo.subject_id] = [];
      tpMap[lo.subject_id]!.push({
        code: lo.code,
        desc: lo.description,
        score: Number(g.score),
      });
    }

    const items = activeSubjects.map((sbj) => {
      const sum = summaryMap.get(sbj.id);
      return {
        subject: sbj,
        final_score: sum?.final_score ?? 0,
        letter_grade: sum?.letter_grade ?? "-",
        sts_score: sum?.sts_score ?? 0,
        sas_score: sum?.sas_score ?? 0,
        highest_desc: sum?.highest_tp_desc || null,
        lowest_desc: sum?.lowest_tp_desc || null,
        tpList: (tpMap[sbj.id] || []).sort((a, b) => a.code.localeCompare(b.code)),
      };
    });

    let totalScore = 0;
    let scoredCount = 0;
    for (const it of items) {
      if (it.final_score > 0) {
        totalScore += it.final_score;
        scoredCount++;
      }
    }
    const gpa = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;

    return {
      student: me,
      items,
      overallAverage: gpa,
    };
  });
