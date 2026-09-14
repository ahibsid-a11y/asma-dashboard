import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SUBJECTS, type AcademicSubject } from "./grades.functions";

export type {
  CurriculumPlan,
  CurriculumElement,
  CurriculumTp,
  CurriculumTimeAllocation,
  CurriculumPromesEntry,
} from "./curriculum.types";
export { DEFAULT_MONTHS_GANJIL, DEFAULT_MONTHS_GENAP } from "./curriculum.types";

import {
  DEFAULT_MONTHS_GANJIL,
  DEFAULT_MONTHS_GENAP,
  type CurriculumPlan,
  type CurriculumElement,
  type CurriculumTp,
  type CurriculumTimeAllocation,
  type CurriculumPromesEntry,
} from "./curriculum.types";


interface CurriculumStoreData {
  plans: Record<string, CurriculumPlan>;
  elements: CurriculumElement[];
  tps: CurriculumTp[];
  timeAllocations: CurriculumTimeAllocation[];
  promesEntries: CurriculumPromesEntry[];
}

const STORE_PATH = path.resolve(process.cwd(), "data", "curriculum_store.json");

function readStore(): CurriculumStoreData {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      const initial: CurriculumStoreData = {
        plans: {},
        elements: [],
        tps: [],
        timeAllocations: [],
        promesEntries: [],
      };
      writeStore(initial);
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      plans: parsed.plans || {},
      elements: Array.isArray(parsed.elements) ? parsed.elements : [],
      tps: Array.isArray(parsed.tps) ? parsed.tps : [],
      timeAllocations: Array.isArray(parsed.timeAllocations) ? parsed.timeAllocations : [],
      promesEntries: Array.isArray(parsed.promesEntries) ? parsed.promesEntries : [],
    };
  } catch (err) {
    console.error("Error reading curriculum store:", err);
    return {
      plans: {},
      elements: [],
      tps: [],
      timeAllocations: [],
      promesEntries: [],
    };
  }
}

function writeStore(data: CurriculumStoreData): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing curriculum store:", err);
  }
}

export function buildPlanKey(subjectId: string, className: string, academicYear: string): string {
  const cleanYear = academicYear.replace(/[^a-zA-Z0-9]/g, "_");
  return `plan_${subjectId}_${className}_${cleanYear}`;
}

export function getOrCreatePlan(
  subjectId: string,
  className: string,
  academicYear: string,
  teacherId?: string | null
): CurriculumPlan {
  const store = readStore();
  const planKey = buildPlanKey(subjectId, className, academicYear);

  if (store.plans[planKey]) {
    return store.plans[planKey];
  }

  const now = new Date().toISOString();
  const newPlan: CurriculumPlan = {
    id: planKey,
    subject_id: subjectId,
    class_name: className,
    academic_year: academicYear,
    teacher_id: teacherId || null,
    phase: "D",
    jp_per_week: 2,
    total_tp_count: 0,
    completion_percentage: 0,
    realization_ganjil_percentage: 0,
    realization_genap_percentage: 0,
    created_at: now,
    updated_at: now,
  };

  store.plans[planKey] = newPlan;

  // Inisialisasi default 12 bulan alokasi waktu
  const allocRows: CurriculumTimeAllocation[] = [];
  DEFAULT_MONTHS_GANJIL.forEach((m, idx) => {
    allocRows.push({
      id: `alloc_${planKey}_1_${idx + 1}`,
      plan_id: planKey,
      semester: "1",
      month_name: m.name,
      month_order: idx + 1,
      calendar_weeks: m.calendar,
      non_effective_weeks: m.nonEffective,
      effective_weeks: m.effective,
      effective_jp: m.effective * 2,
      notes: null,
    });
  });

  DEFAULT_MONTHS_GENAP.forEach((m, idx) => {
    allocRows.push({
      id: `alloc_${planKey}_2_${idx + 7}`,
      plan_id: planKey,
      semester: "2",
      month_name: m.name,
      month_order: idx + 7,
      calendar_weeks: m.calendar,
      non_effective_weeks: m.nonEffective,
      effective_weeks: m.effective,
      effective_jp: m.effective * 2,
      notes: null,
    });
  });

  store.timeAllocations.push(...allocRows);
  writeStore(store);

  return newPlan;
}

export function updatePlanMeta(data: {
  plan_id: string;
  phase?: string | undefined;
  jp_per_week?: number | undefined;
  teacher_id?: string | null | undefined;
}): CurriculumPlan {
  const store = readStore();
  let plan = store.plans[data.plan_id];

  if (!plan) {
    plan = {
      id: data.plan_id,
      subject_id: "sbj_1",
      class_name: "7A",
      academic_year: "2026/2027",
      teacher_id: data.teacher_id || null,
      phase: data.phase || "D",
      jp_per_week: data.jp_per_week || 2,
      total_tp_count: 0,
      completion_percentage: 0,
      realization_ganjil_percentage: 0,
      realization_genap_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } else {
    if (data.phase !== undefined) plan.phase = data.phase;
    if (data.jp_per_week !== undefined) plan.jp_per_week = data.jp_per_week;
    if (data.teacher_id !== undefined) plan.teacher_id = data.teacher_id;
    plan.updated_at = new Date().toISOString();
  }

  // Update effective_jp on timeAllocations for this plan
  if (data.jp_per_week !== undefined) {
    store.timeAllocations = store.timeAllocations.map((a) => {
      if (a.plan_id === data.plan_id) {
        return {
          ...a,
          effective_jp: Math.round(a.effective_weeks * (data.jp_per_week || 2) * 10) / 10,
        };
      }
      return a;
    });
  }

  store.plans[data.plan_id] = plan;
  writeStore(store);
  return plan;
}

export function getElementsByPlanId(planId: string): CurriculumElement[] {
  const store = readStore();
  return store.elements
    .filter((e) => e.plan_id === planId)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
}

export function saveElement(data: {
  action: "create" | "update" | "delete";
  id?: string | undefined;
  plan_id: string;
  name?: string | undefined;
  cp_description?: string | undefined;
  order_index?: number | undefined;
}): { success: boolean; created?: CurriculumElement; updated?: CurriculumElement; deletedId?: string } {
  const store = readStore();
  const now = new Date().toISOString();

  if (data.action === "create") {
    const newElement: CurriculumElement = {
      id: data.id || `elem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      plan_id: data.plan_id,
      name: data.name?.trim() || "Elemen Materi Baru",
      cp_description: data.cp_description?.trim() || "",
      order_index: data.order_index ?? (store.elements.filter((e) => e.plan_id === data.plan_id).length + 1),
      created_at: now,
      updated_at: now,
    };
    store.elements.push(newElement);
    writeStore(store);
    return { success: true, created: newElement };
  }

  if (data.action === "update") {
    if (!data.id) throw new Error("ID elemen wajib diisi");
    const idx = store.elements.findIndex((e) => e.id === data.id);
    if (idx >= 0) {
      const existing = store.elements[idx]!;
      const updated: CurriculumElement = {
        ...existing,
        name: data.name !== undefined ? data.name : existing.name,
        cp_description: data.cp_description !== undefined ? data.cp_description : existing.cp_description,
        order_index: data.order_index !== undefined ? data.order_index : existing.order_index,
        updated_at: now,
      };
      store.elements[idx] = updated;
      writeStore(store);
      return { success: true, updated };
    }
    // If not found by ID, create it
    const created: CurriculumElement = {
      id: data.id,
      plan_id: data.plan_id,
      name: data.name || "Elemen Materi",
      cp_description: data.cp_description || "",
      order_index: data.order_index || 1,
      created_at: now,
      updated_at: now,
    };
    store.elements.push(created);
    writeStore(store);
    return { success: true, created };
  }

  if (data.action === "delete") {
    if (!data.id) throw new Error("ID elemen wajib diisi");
    store.elements = store.elements.filter((e) => e.id !== data.id);
    writeStore(store);
    return { success: true, deletedId: data.id };
  }

  return { success: false };
}

export function getTps(subjectId: string, className: string, academicYear: string): CurriculumTp[] {
  const store = readStore();
  return store.tps
    .filter(
      (t) =>
        t.subject_id === subjectId &&
        t.class_name === className &&
        t.academic_year === academicYear
    )
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
}

export function saveTpBatch(
  planId: string,
  subjectId: string,
  className: string,
  academicYear: string,
  tps: Array<Omit<CurriculumTp, "id"> & { id?: string }>
): { success: boolean; count: number; completionPercentage: number } {
  const store = readStore();
  const now = new Date().toISOString();

  // Remove existing TPs for this subject, class, year
  store.tps = store.tps.filter(
    (t) =>
      !(
        t.subject_id === subjectId &&
        t.class_name === className &&
        t.academic_year === academicYear
      )
  );

  const insertedTps: CurriculumTp[] = tps.map((tp, idx) => ({
    id: tp.id && !tp.id.startsWith("temp_") ? tp.id : `tp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    plan_id: planId,
    subject_id: subjectId,
    class_name: className,
    semester: tp.semester || "1",
    academic_year: academicYear,
    code: tp.code || `TP-${idx + 1}`,
    description: tp.description || "",
    cp_code: tp.cp_code || null,
    element_name: tp.element_name || null,
    cognitive_level: tp.cognitive_level || "C2 - Memahami",
    dimension: tp.dimension || "Pengetahuan",
    atp_order: tp.atp_order || idx + 1,
    atp_flow: tp.atp_flow || null,
    alokasi_jp: Number(tp.alokasi_jp) || 2,
    assessment_method: tp.assessment_method || "Tes Tertulis",
    status_tp: tp.status_tp ?? true,
    status_atp: tp.status_atp ?? true,
    status_asesmen: tp.status_asesmen ?? true,
    status_realisasi: tp.status_realisasi || "Belum Terlaksana",
    order_index: tp.order_index || idx + 1,
    created_at: tp.created_at || now,
    updated_at: now,
  }));

  store.tps.push(...insertedTps);

  // Recalculate completion percentage
  let completePoints = 0;
  for (const t of insertedTps) {
    if (t.code && t.description) completePoints += 1;
    if (t.atp_flow) completePoints += 0.5;
    if (t.alokasi_jp > 0) completePoints += 0.5;
  }
  const maxPoints = Math.max(1, insertedTps.length * 2);
  const completionPct = Math.min(100, Math.round((completePoints / maxPoints) * 100));

  if (store.plans[planId]) {
    store.plans[planId].total_tp_count = insertedTps.length;
    store.plans[planId].completion_percentage = completionPct;
    store.plans[planId].updated_at = now;
  }

  writeStore(store);
  return { success: true, count: insertedTps.length, completionPercentage: completionPct };
}

export function deleteTp(id: string): { success: boolean; deletedId: string } {
  const store = readStore();
  store.tps = store.tps.filter((t) => t.id !== id);
  writeStore(store);
  return { success: true, deletedId: id };
}

export function getTimeAllocations(planId: string, jpPerWeek: number = 2): CurriculumTimeAllocation[] {
  const store = readStore();
  let list = store.timeAllocations.filter((a) => a.plan_id === planId);

  if (list.length === 0) {
    // Generate default 12 months
    const allocRows: CurriculumTimeAllocation[] = [];
    DEFAULT_MONTHS_GANJIL.forEach((m, idx) => {
      allocRows.push({
        id: `alloc_${planId}_1_${idx + 1}`,
        plan_id: planId,
        semester: "1",
        month_name: m.name,
        month_order: idx + 1,
        calendar_weeks: m.calendar,
        non_effective_weeks: m.nonEffective,
        effective_weeks: m.effective,
        effective_jp: m.effective * jpPerWeek,
        notes: null,
      });
    });

    DEFAULT_MONTHS_GENAP.forEach((m, idx) => {
      allocRows.push({
        id: `alloc_${planId}_2_${idx + 7}`,
        plan_id: planId,
        semester: "2",
        month_name: m.name,
        month_order: idx + 7,
        calendar_weeks: m.calendar,
        non_effective_weeks: m.nonEffective,
        effective_weeks: m.effective,
        effective_jp: m.effective * jpPerWeek,
        notes: null,
      });
    });

    store.timeAllocations.push(...allocRows);
    writeStore(store);
    list = allocRows;
  }

  return list.sort((a, b) => a.month_order - b.month_order);
}

export function saveTimeAllocations(
  planId: string,
  allocations: Array<Omit<CurriculumTimeAllocation, "id"> & { id?: string | undefined }>
): { success: boolean; count: number } {
  const store = readStore();

  // Remove existing allocations for this planId
  store.timeAllocations = store.timeAllocations.filter((a) => a.plan_id !== planId);

  const newRows: CurriculumTimeAllocation[] = allocations.map((a, idx) => ({
    id: a.id || `alloc_${planId}_${a.semester}_${a.month_order ?? (idx + 1)}`,
    plan_id: planId,
    semester: a.semester,
    month_name: a.month_name,
    month_order: a.month_order ?? (idx + 1),
    calendar_weeks: Number(a.calendar_weeks) || 0,
    non_effective_weeks: Number(a.non_effective_weeks) || 0,
    effective_weeks: Number(a.effective_weeks) || 0,
    effective_jp: Number(a.effective_jp) || 0,
    notes: a.notes || null,
  }));

  store.timeAllocations.push(...newRows);
  writeStore(store);
  return { success: true, count: newRows.length };
}

export function getPromesEntries(planId: string): CurriculumPromesEntry[] {
  const store = readStore();
  return store.promesEntries.filter((p) => p.plan_id === planId);
}

export function savePromesGrid(
  planId: string,
  semester: "1" | "2",
  entries: Array<Omit<CurriculumPromesEntry, "id" | "plan_id"> & { id?: string; plan_id?: string }>,
  tpStatuses?: Record<string, string>
): { success: boolean; count: number; realizationPercentage: number } {
  const store = readStore();

  // Remove existing entries for this planId and semester
  store.promesEntries = store.promesEntries.filter(
    (p) => !(p.plan_id === planId && p.semester === semester)
  );

  const newRows: CurriculumPromesEntry[] = entries.map((e, idx) => ({
    id: e.id || `promes_${planId}_${e.tp_id}_${e.month_name}_${e.week_number}_${idx}`,
    plan_id: planId,
    tp_id: e.tp_id,
    semester,
    month_name: e.month_name,
    week_number: e.week_number,
    allocated_jp: Number(e.allocated_jp) || 0,
    activity_type: e.activity_type || "kbm",
    notes: e.notes || null,
  }));

  store.promesEntries.push(...newRows);

  // Update TP statuses if provided
  if (tpStatuses) {
    for (const [tpId, status] of Object.entries(tpStatuses)) {
      const target = store.tps.find((t) => t.id === tpId);
      if (target) {
        target.status_realisasi = status;
        target.updated_at = new Date().toISOString();
      }
    }
  }

  // Calculate realization percentage
  let totalAssignedJp = 0;
  for (const r of newRows) {
    if (r.allocated_jp > 0) totalAssignedJp += r.allocated_jp;
  }
  const estimatedMaxJp = 36;
  const realPct = Math.min(100, Math.round((totalAssignedJp / estimatedMaxJp) * 100));

  if (store.plans[planId]) {
    if (semester === "1") {
      store.plans[planId].realization_ganjil_percentage = realPct;
    } else {
      store.plans[planId].realization_genap_percentage = realPct;
    }
    store.plans[planId].updated_at = new Date().toISOString();
  }

  writeStore(store);
  return { success: true, count: newRows.length, realizationPercentage: realPct };
}

export function getSupervisionRecap(
  academicYear: string,
  className?: string,
  activeSubjects: AcademicSubject[] = []
) {
  const store = readStore();
  const classList = className && className !== "all" ? [className] : ["7A", "7B", "8A", "8B", "9A", "9B"];

  const auditList: any[] = [];
  let completedCount = 0;
  let draftCount = 0;
  let emptyCount = 0;

  for (const cls of classList) {
    for (const sbj of activeSubjects) {
      const planKey = buildPlanKey(sbj.id, cls, academicYear);
      const plan = store.plans[planKey];

      const tpCount = plan?.total_tp_count || store.tps.filter(
        (t) => t.subject_id === sbj.id && t.class_name === cls && t.academic_year === academicYear
      ).length;

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
        planId: plan?.id || planKey,
        teacher: null,
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
