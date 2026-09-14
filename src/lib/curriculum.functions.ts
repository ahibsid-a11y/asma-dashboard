import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureSubjects } from "@/lib/grades.functions";
import {
  DEFAULT_MONTHS_GANJIL,
  DEFAULT_MONTHS_GENAP,
  type CurriculumElement,
  type CurriculumPlan,
  type CurriculumPromesEntry,
  type CurriculumTimeAllocation,
  type CurriculumTp,
} from "@/lib/curriculum.types";


export type {
  CurriculumElement,
  CurriculumPlan,
  CurriculumPromesEntry,
  CurriculumTimeAllocation,
  CurriculumTp,
};

export { DEFAULT_MONTHS_GANJIL, DEFAULT_MONTHS_GENAP };

type Ctx = { supabase: any; userId: string };

/** 1. Ambil Perangkat Ajar Lengkap untuk 1 Mapel & Kelas */
export const getCurriculumPlan = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        subject_id: z.string().min(1),
        class_name: z.string(),
        academic_year: z.string().default("2026/2027"),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storage = await import("./curriculum.storage.server");

    // 1. Ambil Mata Pelajaran (pastikan selalu ditemukan, tidak pernah throw)
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

    // 2. Ambil atau Inisialisasi Plan
    let plan: CurriculumPlan | null = null;
    try {
      const { data: pData, error: pErr } = await (supabaseAdmin as any)
        .from("curriculum_plans")
        .select("*")
        .eq("subject_id", data.subject_id)
        .eq("class_name", data.class_name)
        .eq("academic_year", data.academic_year)
        .maybeSingle();

      if (!pErr && pData) {
        plan = pData as CurriculumPlan;
      } else if (!pErr && !pData) {
        const { data: createdPlan, error: cErr } = await (supabaseAdmin as any)
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
          .maybeSingle();

        if (!cErr && createdPlan) {
          plan = createdPlan as CurriculumPlan;
        }
      }
    } catch {
      // Supabase remote table missing or cache error
    }

    if (!plan) {
      try {
        plan = storage.getOrCreatePlan(
          data.subject_id,
          data.class_name,
          data.academic_year,
          ctx.userId
        );
      } catch {
        // penyimpanan file tidak tersedia di server produksi
      }
    }

    if (!plan) {
      throw new Error("Gagal memuat perangkat ajar. Coba muat ulang halaman.");
    }


    // 3. Ambil Elemen & Capaian Pembelajaran (CP)
    let elements: CurriculumElement[] = [];
    try {
      const { data: elData, error: elErr } = await (supabaseAdmin as any)
        .from("curriculum_elements")
        .select("*")
        .eq("plan_id", plan.id)
        .order("order_index", { ascending: true });
      if (!elErr && elData && elData.length > 0) {
        elements = elData as CurriculumElement[];
      }
    } catch {}

    if (elements.length === 0) {
      elements = storage.getElementsByPlanId(plan.id);
    }

    // 4. Ambil TP & ATP (Tujuan Pembelajaran)
    let tps: CurriculumTp[] = [];
    try {
      const { data: tpData, error: tpErr } = await (supabaseAdmin as any)
        .from("learning_objectives")
        .select("*")
        .eq("subject_id", data.subject_id)
        .eq("class_name", data.class_name)
        .eq("academic_year", data.academic_year)
        .order("order_index", { ascending: true });
      if (!tpErr && tpData && tpData.length > 0) {
        tps = tpData as CurriculumTp[];
      }
    } catch {}

    if (tps.length === 0) {
      tps = storage.getTps(data.subject_id, data.class_name, data.academic_year);
    }

    // 5. Ambil Analisis Alokasi Waktu
    let timeAllocations: CurriculumTimeAllocation[] = [];
    try {
      const { data: aData, error: aErr } = await (supabaseAdmin as any)
        .from("curriculum_time_allocations")
        .select("*")
        .eq("plan_id", plan.id)
        .order("month_order", { ascending: true });
      if (!aErr && aData && aData.length > 0) {
        timeAllocations = aData as CurriculumTimeAllocation[];
      }
    } catch {}

    if (timeAllocations.length === 0) {
      timeAllocations = storage.getTimeAllocations(plan.id, plan.jp_per_week || 2);
    }

    // 6. Ambil Grid Matriks PROMES
    let promesEntries: CurriculumPromesEntry[] = [];
    try {
      const { data: prData, error: prErr } = await (supabaseAdmin as any)
        .from("curriculum_promes_entries")
        .select("*")
        .eq("plan_id", plan.id);
      if (!prErr && prData && prData.length > 0) {
        promesEntries = prData as CurriculumPromesEntry[];
      }
    } catch {}

    if (promesEntries.length === 0) {
      promesEntries = storage.getPromesEntries(plan.id);
    }

    // 7. Guru Info
    let teacher: any = null;
    if (plan.teacher_id) {
      try {
        const { data: tProfile } = await (supabaseAdmin as any)
          .from("profiles")
          .select("id,name,display_name,nis_nip")
          .eq("id", plan.teacher_id)
          .maybeSingle();
        teacher = tProfile;
      } catch {}
    }
    if (!teacher && ctx.userId) {
      try {
        const { data: myProfile } = await (supabaseAdmin as any)
          .from("profiles")
          .select("id,name,display_name,nis_nip")
          .eq("id", ctx.userId)
          .maybeSingle();
        teacher = myProfile;
      } catch {}
    }

    // 8. Kepala Sekolah Info
    let headmasterName = "Mudir / Kepala Sekolah SMPIT Putra Al-Hanif";
    try {
      const { data: hm } = await (supabaseAdmin as any)
        .from("profiles")
        .select("name")
        .in("account_type", ["kepala_sekolah", "mudir"])
        .limit(1);
      if (hm && hm[0]?.name) headmasterName = hm[0].name;
    } catch {}

    return {
      plan,
      subject,
      teacher,
      headmasterName,
      elements,
      tps,
      timeAllocations,
      promesEntries,
    };
  });

/** 2. Simpan Pengaturan Metadata Perangkat Ajar */
export const updateCurriculumPlanMeta = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        plan_id: z.string().min(1),
        phase: z.string().default("D"),
        jp_per_week: z.number().int().min(1).max(10).default(2),
        teacher_id: z.string().optional().nullable(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storage = await import("./curriculum.storage.server");

    const updated = storage.updatePlanMeta(data);

    try {
      const updates: Record<string, any> = {
        phase: data.phase,
        jp_per_week: data.jp_per_week,
        updated_at: new Date().toISOString(),
      };
      if (data.teacher_id !== undefined) updates["teacher_id"] = data.teacher_id;

      await (supabaseAdmin as any)
        .from("curriculum_plans")
        .update(updates)
        .eq("id", data.plan_id);
    } catch {}

    return { success: true, updated };
  });

/** 3. Simpan Elemen & Capaian Pembelajaran (CP) */
export const saveCurriculumElement = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        action: z.enum(["create", "update", "delete"]),
        id: z.string().min(1).optional(),
        plan_id: z.string().min(1),
        name: z.string().trim().min(2).optional(),
        cp_description: z.string().trim().optional(),
        order_index: z.number().int().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storage = await import("./curriculum.storage.server");

    // Simpan ke storage lokal persisten
    const storageRes = storage.saveElement(data);

    // Coba simpan ke Supabase jika tabel ada
    try {
      const table = (supabaseAdmin as any).from("curriculum_elements");
      if (data.action === "create") {
        if (!data.name) throw new Error("Nama elemen wajib diisi");
        await table.insert({
          id: storageRes.created?.id,
          plan_id: data.plan_id,
          name: data.name,
          cp_description: data.cp_description || "",
          order_index: data.order_index || 1,
        });
      } else if (data.action === "update" && data.id) {
        await table
          .update({
            name: data.name,
            cp_description: data.cp_description,
            order_index: data.order_index,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
      } else if (data.action === "delete" && data.id) {
        await table.delete().eq("id", data.id);
      }
    } catch {}

    return storageRes;
  });

/** 4. Simpan / Perbarui Batch TP & ATP */
export const saveCurriculumTpBatch = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        plan_id: z.string().min(1),
        subject_id: z.string().min(1),
        class_name: z.string(),
        academic_year: z.string(),
        tps: z.array(
          z.object({
            id: z.string().min(1).optional(),
            code: z.string().trim().min(2),
            description: z.string().trim().min(2),
            semester: z.string().default("1"),
            element_name: z.string().optional().nullable(),
            cognitive_level: z.string().default("C2 - Memahami"),
            dimension: z.string().default("Pengetahuan"),
            atp_order: z.number().int().default(1),
            atp_flow: z.string().optional().nullable(),
            alokasi_jp: z.number().min(0.5).default(2),
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
    const storage = await import("./curriculum.storage.server");

    // Simpan ke storage lokal
    const storageRes = storage.saveTpBatch(
      data.plan_id,
      data.subject_id,
      data.class_name,
      data.academic_year,
      data.tps as any
    );

    // Coba sinkronkan ke Supabase jika tabel learning_objectives ada
    try {
      const table = (supabaseAdmin as any).from("learning_objectives");
      const upsertRows = data.tps.map((tp, idx) => ({
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
      }));

      if (upsertRows.length > 0) {
        await table.upsert(upsertRows);
      }
    } catch {}

    return storageRes;
  });

/** 5. Hapus 1 TP */
export const deleteCurriculumTp = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().min(1),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storage = await import("./curriculum.storage.server");

    const res = storage.deleteTp(data.id);
    try {
      await (supabaseAdmin as any).from("learning_objectives").delete().eq("id", data.id);
    } catch {}
    return res;
  });

/** 6. Simpan Analisis Alokasi Waktu (Pekan Kalender & Efektif) */
export const saveCurriculumTimeAllocations = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        plan_id: z.string().min(1),
        allocations: z.array(
          z.object({
            id: z.string().min(1).optional(),
            semester: z.enum(["1", "2"]),
            month_name: z.string(),
            month_order: z.number(),
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
    const storage = await import("./curriculum.storage.server");

    const storageRes = storage.saveTimeAllocations(data.plan_id, data.allocations as any);

    try {
      const table = (supabaseAdmin as any).from("curriculum_time_allocations");
      const rows = data.allocations.map((a) => ({
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
      }));
      await table.upsert(rows, { onConflict: "plan_id,semester,month_name" });
    } catch {}

    return storageRes;
  });

/** 7. Simpan Grid Matriks Program Semester (PROMES) */
export const saveCurriculumPromesGrid = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        plan_id: z.string().min(1),
        semester: z.enum(["1", "2"]),
        entries: z.array(
          z.object({
            tp_id: z.string().min(1),
            month_name: z.string(),
            week_number: z.number().int().min(1).max(5),
            allocated_jp: z.number().min(0).max(20),
            activity_type: z.enum(["kbm", "formatif", "sts", "sas", "libur", "remedial"]).default("kbm"),
            notes: z.string().optional().nullable(),
          }),
        ),
        tpStatuses: z.record(z.string(), z.string()).optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storage = await import("./curriculum.storage.server");

    const storageRes = storage.savePromesGrid(
      data.plan_id,
      data.semester,
      data.entries as any,
      data.tpStatuses
    );

    try {
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
        await (supabaseAdmin as any)
          .from("curriculum_promes_entries")
          .upsert(rows, { onConflict: "plan_id,tp_id,semester,month_name,week_number" });
      }
    } catch {}

    return storageRes;
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
    const storage = await import("./curriculum.storage.server");

    const subjects = await ensureSubjects(supabaseAdmin);
    const activeSubjects = subjects.filter((s: any) => s.is_active);

    try {
      let query = (supabaseAdmin as any)
        .from("curriculum_plans")
        .select("*, profiles:teacher_id(id,name,display_name,nis_nip)")
        .eq("academic_year", data.academic_year);

      if (data.class_name && data.class_name !== "all") {
        query = query.eq("class_name", data.class_name);
      }

      const { data: plans, error: pErr } = await query;
      if (!pErr && plans && plans.length > 0) {
        const planMap = new Map<string, any>();
        for (const p of plans) {
          planMap.set(`${p.subject_id}_${p.class_name}`, p);
        }

        const classList =
          data.class_name && data.class_name !== "all"
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
      }
    } catch {}

    // Fallback ke penyimpanan storage lokal
    return storage.getSupervisionRecap(data.academic_year, data.class_name, activeSubjects);
  });
