import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureSubjects } from "./grades.functions";
import {
  DEFAULT_PERIODS,
  TIMETABLE_DAYS,
  deleteAssignment,
  deleteSlot,
  getAssignments,
  getTimetableSlots,
  saveAssignment,
  saveSlot,
  type TimetableDay,
} from "./schedule.storage.server";

type Ctx = { supabase: any; userId: string };

const DEFAULT_CLASSES = [
  { id: "c-7a", name: "VII A", grade: 7 },
  { id: "c-7b", name: "VII B", grade: 7 },
  { id: "c-8a", name: "VIII A", grade: 8 },
  { id: "c-8b", name: "VIII B", grade: 8 },
  { id: "c-9a", name: "IX A", grade: 9 },
  { id: "c-9b", name: "IX B", grade: 9 },
  { id: "c-10", name: "X", grade: 10 },
  { id: "c-11", name: "XI", grade: 11 },
  { id: "c-12", name: "XII", grade: 12 },
];

/**
 * 1. Mengambil Konteks Penugasan Mapel & Guru per Kelas
 */
export const getSubjectAssignmentContext = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        academicYear: z.string().default("2026/2027"),
        className: z.string().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Ambil Mapel Resmi
    const subjects = await ensureSubjects(supabaseAdmin);

    // 2. Ambil Kelas dari DB (fallback ke DEFAULT_CLASSES)
    const { data: dbClasses } = await (supabaseAdmin as any)
      .from("classes")
      .select("id,name,grade")
      .order("grade")
      .order("name");

    const classes = dbClasses && dbClasses.length > 0 ? dbClasses : DEFAULT_CLASSES;

    // 3. Ambil Guru / Pendidik
    const { data: teachersData } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,nis_nip,account_type")
      .neq("account_type", "santri")
      .order("name");

    const teachers = teachersData || [];

    // 4. Ambil Penugasan Tersimpan
    const assignments = await getAssignments(data.academicYear, data.className);

    return {
      academicYear: data.academicYear,
      subjects,
      classes,
      teachers,
      assignments,
    };
  });

/**
 * 2. Simpan / Perbarui Penugasan Mapel di Kelas
 */
export const saveClassSubjectAssignment = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        academic_year: z.string().default("2026/2027"),
        class_name: z.string().min(1),
        subject_id: z.string().min(1),
        subject_code: z.string().min(1),
        subject_name: z.string().min(1),
        subject_group: z.string().default("Umum"),
        teacher_id: z.string().nullable().optional(),
        teacher_name: z.string().nullable().optional(),
        jp_per_week: z.coerce.number().min(1).default(2),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const saved = await saveAssignment({
      id: data.id,
      academic_year: data.academic_year,
      class_name: data.class_name,
      subject_id: data.subject_id,
      subject_code: data.subject_code,
      subject_name: data.subject_name,
      subject_group: data.subject_group,
      teacher_id: data.teacher_id,
      teacher_name: data.teacher_name,
      jp_per_week: data.jp_per_week,
    });
    return { success: true, assignment: saved };
  });

/**
 * 3. Hapus Penugasan Mapel
 */
export const deleteClassSubjectAssignment = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().min(1),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const deleted = await deleteAssignment(data.id);
    return { success: deleted };
  });

/**
 * 4. Mengambil Konteks Jadwal Pelajaran Mingguan
 */
export const getTimetableContext = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        academicYear: z.string().default("2026/2027"),
        semester: z.enum(["1", "2"]).default("1"),
        className: z.string().optional(),
        teacherId: z.string().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const subjects = await ensureSubjects(supabaseAdmin);

    const { data: dbClasses } = await (supabaseAdmin as any)
      .from("classes")
      .select("id,name,grade")
      .order("grade")
      .order("name");
    const classes = dbClasses && dbClasses.length > 0 ? dbClasses : DEFAULT_CLASSES;

    const { data: teachersData } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,nis_nip,account_type")
      .neq("account_type", "santri")
      .order("name");
    const teachers = teachersData || [];

    const assignments = await getAssignments(data.academicYear, data.className);
    const slots = await getTimetableSlots(
      data.academicYear,
      data.semester,
      data.className,
      data.teacherId,
    );

    return {
      academicYear: data.academicYear,
      semester: data.semester,
      days: TIMETABLE_DAYS,
      periods: DEFAULT_PERIODS,
      classes,
      subjects,
      teachers,
      assignments,
      slots,
    };
  });

/**
 * 5. Simpan Slot Jadwal Pelajaran (dengan Deteksi Bentrok Guru)
 */
export const saveTimetableSlot = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        academic_year: z.string().default("2026/2027"),
        semester: z.enum(["1", "2"]).default("1"),
        class_name: z.string().min(1),
        day: z.enum(["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Ahad"]),
        period: z.coerce.number().min(1).max(24),
        time_start: z.string().min(1),
        time_end: z.string().min(1),
        slot_type: z.enum(["kbm", "istirahat"]).default("kbm"),
        subject_id: z.string().default(""),
        subject_code: z.string().default(""),
        subject_name: z.string().default(""),
        teacher_id: z.string().nullable().optional(),
        teacher_name: z.string().nullable().optional(),
        room: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const result = await saveSlot({
      id: data.id,
      academic_year: data.academic_year,
      semester: data.semester,
      class_name: data.class_name,
      day: data.day as TimetableDay,
      period: data.period,
      time_start: data.time_start,
      time_end: data.time_end,
      subject_id: data.subject_id,
      subject_code: data.subject_code,
      subject_name: data.subject_name,
      teacher_id: data.teacher_id,
      teacher_name: data.teacher_name,
      room: data.room,
    });

    if (result.conflict) {
      return {
        success: false,
        conflict: true,
        message: `BENTROK: Guru ${result.conflict.teacher_name || "ini"} sudah mengajar di kelas ${result.conflict.class_name} pada hari ${result.conflict.day} Jam ke-${result.conflict.period} (${result.conflict.time_start}-${result.conflict.time_end}).`,
      };
    }

    return { success: true, conflict: false, slot: result.slot };
  });

/**
 * 6. Hapus Slot Jadwal Pelajaran
 */
export const deleteTimetableSlot = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().min(1),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const deleted = await deleteSlot(data.id);
    return { success: deleted };
  });

/**
 * 7. Mengambil Jadwal Pelajaran Pengguna yang Sedang Login (Siswa / Guru)
 */
export const getMyTimetable = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        academicYear: z.string().default("2026/2027"),
        semester: z.enum(["1", "2"]).default("1"),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: myProfile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,nis_nip,account_type,class")
      .eq("id", ctx.userId)
      .maybeSingle();

    const isStudent = myProfile?.account_type === "santri";
    const studentClass = myProfile?.class || "VII A";

    const slots = isStudent
      ? await getTimetableSlots(data.academicYear, data.semester, studentClass)
      : await getTimetableSlots(data.academicYear, data.semester, undefined, ctx.userId);

    return {
      isStudent,
      profile: myProfile,
      academicYear: data.academicYear,
      semester: data.semester,
      days: TIMETABLE_DAYS,
      periods: DEFAULT_PERIODS,
      slots,
    };
  });
