import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMemberAdmin } from "@/lib/roles";
import { ensureSubjects } from "@/lib/grades.functions";

type Ctx = { supabase: any; userId: string };

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
  cognitive_level: string; // e.g. "C2 - Memahami"
  dimension: string; // "Pengetahuan" | "Keterampilan" | "Sikap"
  atp_order: number;
  atp_flow: string | null;
  alokasi_jp: number;
  assessment_method: string;
  status_tp: boolean;
  status_atp: boolean;
  status_asesmen: boolean;
  status_realisasi: string; // 'Belum Terlaksana' | 'Sedang Berjalan' | 'Terlaksana'
  order_index: number;
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

/** 1. Ambil Perangkat Ajar Lengkap untuk 1 Mapel & Kelas */
export const getCurriculumPlan = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        subject_id: z.string().uuid(),
        class_name: z.string(),
        academic_year: z.string().default("2026/2027"),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Mapel
    const { data: subject, error: sErr } = await (supabaseAdmin as any)
      .from("academic_subjects")
      .select("*")
      .eq("id", data.subject_id)
      .single();

    if (sErr || !subject) throw new Error("Mata pelajaran tidak ditemukan");

    // Ambil atau inisialisasi curriculum_plans
    let { data: plan } = await (supabaseAdmin as any)
      .from("curriculum_plans")
      .select("*")
      .eq("subject_id", data.subject_id)
      .eq("class_name", data.class_name)
      .eq("academic_year", data.academic_year)
      .maybeSingle();

    if (!plan) {
      const { data: createdPlan, error: pErr } = await (supabaseAdmin as any)
        .from("curriculum_plans")
        .insert({
          subject_id: data.subject_id,
          class_name: data.class_name,
          academic_year: data.academic_year,
          teacher_id: ctx.userId,
          phase: "D",
          jp_per_week: 2,
          total_tp_count: 0,
          completion_percentage: 0,
          realization_ganjil_percentage: 0,
          realization_genap_percentage: 0,
        })
        .select()
        .single();

      if (pErr) throw new Error(pErr.message);
      plan = createdPlan;

      // Inisialisasi 12 bulan alokasi waktu default
      const timeAllocRows: any[] = [];
      for (const m of DEFAULT_MONTHS_GANJIL) {
        timeAllocRows.push({
          plan_id: plan.id,
          semester: "1",
          month_name: m.name,
          month_order: m.order,
          calendar_weeks: m.calendar,
          non_effective_weeks: m.nonEffective,
          effective_weeks: m.effective,
          effective_jp: m.effective * 2,
        });
      }
      for (const m of DEFAULT_MONTHS_GENAP) {
        timeAllocRows.push({
          plan_id: plan.id,
          semester: "2",
          month_name: m.name,
          month_order: m.order,
          calendar_weeks: m.calendar,
          non_effective_weeks: m.nonEffective,
          effective_weeks: m.effective,
          effective_jp: m.effective * 2,
        });
      }

      await (supabaseAdmin as any).from("curriculum_time_allocations").insert(timeAllocRows);
    }

    // Ambil Elemen & CP
    const { data: elements } = await (supabaseAdmin as any)
      .from("curriculum_elements")
      .select("*")
      .eq("plan_id", plan.id)
      .order("order_index", { ascending: true });

    // Ambil TPs (terhubung ke learning_objectives)
    const { data: tps } = await (supabaseAdmin as any)
      .from("learning_objectives")
      .select("*")
      .eq("subject_id", data.subject_id)
      .eq("class_name", data.class_name)
      .eq("academic_year", data.academic_year)
      .order("order_index", { ascending: true });

    // Ambil Alokasi Waktu
    const { data: timeAllocations } = await (supabaseAdmin as any)
      .from("curriculum_time_allocations")
      .select("*")
      .eq("plan_id", plan.id)
      .order("month_order", { ascending: true });

    // Ambil Promes Entries
    const { data: promesEntries } = await (supabaseAdmin as any)
      .from("curriculum_promes_entries")
      .select("*")
      .eq("plan_id", plan.id);

    // Guru info
    let teacher = null;
    if (plan.teacher_id) {
      const { data: tProfile } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id,name,display_name,nis_nip")
        .eq("id", plan.teacher_id)
        .maybeSingle();
      teacher = tProfile;
    }

    // Kepala Sekolah info
    let headmasterName = "Mudir / Kepala Sekolah SMPIT Putra Al-Hanif";
    try {
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
      plan: plan as CurriculumPlan,
      subject,
      teacher,
      headmasterName,
      elements: (elements ?? []) as CurriculumElement[],
      tps: (tps ?? []) as CurriculumTp[],
      timeAllocations: (timeAllocations ?? []) as CurriculumTimeAllocation[],
      promesEntries: (promesEntries ?? []) as CurriculumPromesEntry[],
    };
  });

/** 2. Simpan Pengaturan Metadata Perangkat Ajar */
export const updateCurriculumPlanMeta = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        plan_id: z.string().uuid(),
        phase: z.string().default("D"),
        jp_per_week: z.number().int().min(1).max(10).default(2),
        teacher_id: z.string().uuid().optional().nullable(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const updates: Record<string, any> = {
      phase: data.phase,
      jp_per_week: data.jp_per_week,
      updated_at: new Date().toISOString(),
    };
    if (data.teacher_id !== undefined) updates["teacher_id"] = data.teacher_id;

    const { data: updated, error } = await (supabaseAdmin as any)
      .from("curriculum_plans")
      .update(updates)
      .eq("id", data.plan_id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, updated };
  });

/** 3. Simpan Elemen & Capaian Pembelajaran (CP) */
export const saveCurriculumElement = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        action: z.enum(["create", "update", "delete"]),
        id: z.string().uuid().optional(),
        plan_id: z.string().uuid(),
        name: z.string().trim().min(2).optional(),
        cp_description: z.string().trim().optional(),
        order_index: z.number().int().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = (supabaseAdmin as any).from("curriculum_elements");

    if (data.action === "create") {
      if (!data.name) throw new Error("Nama elemen wajib diisi");
      const { data: created, error } = await table
        .insert({
          plan_id: data.plan_id,
          name: data.name,
          cp_description: data.cp_description || "",
          order_index: data.order_index || 1,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { success: true, created };
    }

    if (!data.id) throw new Error("ID elemen wajib diisi");

    if (data.action === "update") {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) updates["name"] = data.name;
      if (data.cp_description !== undefined) updates["cp_description"] = data.cp_description;
      if (data.order_index !== undefined) updates["order_index"] = data.order_index;

      const { data: updated, error } = await table.update(updates).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return { success: true, updated };
    }

    if (data.action === "delete") {
      const { error } = await table.delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true, deletedId: data.id };
    }

    return { success: false };
  });

/** 4. Simpan / Perbarui Batch TP & ATP (Sinkron Langsung ke learning_objectives) */
export const saveCurriculumTpBatch = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        plan_id: z.string().uuid(),
        subject_id: z.string().uuid(),
        class_name: z.string(),
        academic_year: z.string(),
        tps: z.array(
          z.object({
            id: z.string().uuid().optional(),
            code: z.string().trim().min(2),
            description: z.string().trim().min(5),
            semester: z.string().default("1"),
            element_name: z.string().optional().nullable(),
            cognitive_level: z.string().default("C2 - Memahami"),
            dimension: z.string().default("Pengetahuan"),
            atp_order: z.number().int().default(1),
            atp_flow: z.string().optional().nullable(),
            alokasi_jp: z.number().int().min(1).default(2),
            assessment_method: z.string().default("Tes Tertulis"),
            status_tp: z.boolean().default(true),
            status_atp: z.boolean().default(true),
            status_asesmen: z.boolean().default(true),
            status_realisasi: z.string().default("Belum Terlaksana"),
            order_index: z.number().int().default(1),
          }),
        ),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = (supabaseAdmin as any).from("learning_objectives");

    const upsertRows = data.tps.map((tp, idx) => {
      const row: Record<string, any> = {
        plan_id: data.plan_id,
        subject_id: data.subject_id,
        class_name: data.class_name,
        academic_year: data.academic_year,
        semester: tp.semester || "1",
        code: tp.code,
        description: tp.description,
        element_name: tp.element_name || null,
        cognitive_level: tp.cognitive_level || "C2 - Memahami",
        dimension: tp.dimension || "Pengetahuan",
        atp_order: tp.atp_order || idx + 1,
        atp_flow: tp.atp_flow || null,
        alokasi_jp: tp.alokasi_jp || 2,
        assessment_method: tp.assessment_method || "Tes Tertulis",
        status_tp: tp.status_tp ?? true,
        status_atp: tp.status_atp ?? true,
        status_asesmen: tp.status_asesmen ?? true,
        status_realisasi: tp.status_realisasi || "Belum Terlaksana",
        order_index: tp.order_index || idx + 1,
        updated_at: new Date().toISOString(),
      };
      if (tp.id) row["id"] = tp.id;
      return row;
    });

    if (upsertRows.length > 0) {
      const { error } = await table.upsert(upsertRows);
      if (error) throw new Error(error.message);
    }

    // Hitung % kelengkapan dan jumlah TP
    const totalTpCount = data.tps.length;
    let completePoints = 0;
    for (const t of data.tps) {
      if (t.code && t.description) completePoints += 1;
      if (t.atp_flow) completePoints += 0.5;
      if (t.alokasi_jp > 0) completePoints += 0.5;
    }
    const maxPoints = Math.max(1, totalTpCount * 2);
    const completionPct = Math.min(100, Math.round((completePoints / maxPoints) * 100));

    await (supabaseAdmin as any)
      .from("curriculum_plans")
      .update({
        total_tp_count: totalTpCount,
        completion_percentage: completionPct,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.plan_id);

    return { success: true, count: upsertRows.length, completionPercentage: completionPct };
  });

/** 5. Hapus 1 TP */
export const deleteCurriculumTp = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("learning_objectives").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true, deletedId: data.id };
  });

/** 6. Simpan Analisis Alokasi Waktu (Pekan Kalender & Efektif) */
export const saveCurriculumTimeAllocations = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        plan_id: z.string().uuid(),
        allocations: z.array(
          z.object({
            id: z.string().uuid().optional(),
            semester: z.enum(["1", "2"]),
            month_name: z.string(),
            month_order: z.number().int(),
            calendar_weeks: z.number().min(0),
            non_effective_weeks: z.number().min(0),
            effective_weeks: z.number().min(0),
            effective_jp: z.number().min(0),
            notes: z.string().optional().nullable(),
          }),
        ),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = (supabaseAdmin as any).from("curriculum_time_allocations");

    const rows = data.allocations.map((a) => {
      const row: Record<string, any> = {
        plan_id: data.plan_id,
        semester: a.semester,
        month_name: a.month_name,
        month_order: a.month_order,
        calendar_weeks: a.calendar_weeks,
        non_effective_weeks: a.non_effective_weeks,
        effective_weeks: a.effective_weeks,
        effective_jp: a.effective_jp,
        notes: a.notes || null,
        updated_at: new Date().toISOString(),
      };
      if (a.id) row["id"] = a.id;
      return row;
    });

    const { error } = await table.upsert(rows, { onConflict: "plan_id,semester,month_name" });
    if (error) throw new Error(error.message);

    return { success: true, count: rows.length };
  });

/** 7. Simpan Grid Matriks Program Semester (PROMES) */
export const saveCurriculumPromesGrid = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        plan_id: z.string().uuid(),
        semester: z.enum(["1", "2"]),
        entries: z.array(
          z.object({
            tp_id: z.string().uuid(),
            month_name: z.string(),
            week_number: z.number().int().min(1).max(5),
            allocated_jp: z.number().int().min(0).max(20),
            activity_type: z.enum(["kbm", "formatif", "sts", "sas", "libur", "remedial"]).default("kbm"),
            notes: z.string().optional().nullable(),
          }),
        ),
        tpStatuses: z.record(z.string(), z.string()).optional(), // tp_id -> status_realisasi
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Upsert entries
    const rows = data.entries.map((e) => ({
      plan_id: data.plan_id,
      tp_id: e.tp_id,
      semester: data.semester,
      month_name: e.month_name,
      week_number: e.week_number,
      allocated_jp: e.allocated_jp,
      activity_type: e.activity_type,
      notes: e.notes || null,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error } = await (supabaseAdmin as any)
        .from("curriculum_promes_entries")
        .upsert(rows, { onConflict: "plan_id,tp_id,semester,month_name,week_number" });
      if (error) throw new Error(error.message);
    }

    // Update status realisasi pada learning_objectives jika dikirimkan
    if (data.tpStatuses) {
      for (const [tpId, status] of Object.entries(data.tpStatuses)) {
        await (supabaseAdmin as any)
          .from("learning_objectives")
          .update({ status_realisasi: status, updated_at: new Date().toISOString() })
          .eq("id", tpId);
      }
    }

    // Hitung % realisasi mengajar
    let totalAssignedJp = 0;
    for (const r of rows) {
      if (r.allocated_jp > 0) totalAssignedJp += r.allocated_jp;
    }

    const fieldToUpdate =
      data.semester === "1" ? "realization_ganjil_percentage" : "realization_genap_percentage";
    const estimatedMaxJp = 36; // ~18 pekan x 2 JP
    const realPct = Math.min(100, Math.round((totalAssignedJp / estimatedMaxJp) * 100));

    await (supabaseAdmin as any)
      .from("curriculum_plans")
      .update({ [fieldToUpdate]: realPct, updated_at: new Date().toISOString() })
      .eq("id", data.plan_id);

    return { success: true, count: rows.length, realizationPercentage: realPct };
  });

/** 8. Rekapitulasi & Supervisi Perangkat Ajar Seluruh Guru (Waka Kurikulum & Kepala Sekolah) */
export const getCurriculumSupervisionRecap = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        class_name: z.string().optional(),
        academic_year: z.string().default("2026/2027"),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ambil seluruh mapel aktif
    const subjects = await ensureSubjects(supabaseAdmin);
    const activeSubjects = subjects.filter((s: any) => s.is_active);

    // Ambil seluruh plans
    let query = (supabaseAdmin as any)
      .from("curriculum_plans")
      .select("*, profiles:teacher_id(id,name,display_name,nis_nip)")
      .eq("academic_year", data.academic_year);

    if (data.class_name && data.class_name !== "all") {
      query = query.eq("class_name", data.class_name);
    }

    const { data: plans } = await query;

    const planMap = new Map<string, any>();
    for (const p of plans ?? []) {
      planMap.set(`${p.subject_id}_${p.class_name}`, p);
    }

    const classList = data.class_name && data.class_name !== "all" 
      ? [data.class_name] 
      : ["7A", "7B", "8A", "8B", "9A", "9B"];

    const auditList: any[] = [];
    let completedCount = 0;
    let draftCount = 0;
    let emptyCount = 0;

    for (const cls of classList) {
      for (const sbj of activeSubjects) {
        const plan = planMap.get(`${sbj.id}_${cls}`);

        const tpCount = plan?.total_tp_count || 0;
        const completionPct = Number(plan?.completion_percentage) || 0;
        const realGanjil = Number(plan?.realization_ganjil_percentage) || 0;
        const realGenap = Number(plan?.realization_genap_percentage) || 0;

        let status: "Lengkap" | "Proses" | "Belum Mengisi" = "Belum Mengisi";
        if (completionPct >= 80 && tpCount > 0) {
          status = "Lengkap";
          completedCount++;
        } else if (tpCount > 0 || completionPct > 0) {
          status = "Proses";
          draftCount++;
        } else {
          emptyCount++;
        }

        auditList.push({
          subject: sbj,
          className: cls,
          planId: plan?.id || null,
          teacher: plan?.profiles || null,
          phase: plan?.phase || "D",
          jpPerWeek: plan?.jp_per_week || 2,
          tpCount,
          completionPercentage: completionPct,
          realizationGanjil: realGanjil,
          realizationGenap: realGenap,
          status,
        });
      }
    }

    return {
      totalSubjectsCovered: auditList.length,
      kpi: {
        completed: completedCount,
        draft: draftCount,
        empty: emptyCount,
      },
      auditList,
    };
  });
