export type ClassSubjectAssignment = {
  id: string;
  academic_year: string;
  class_name: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  subject_group: string;
  teacher_id?: string | null | undefined;
  teacher_name?: string | null | undefined;
  jp_per_week: number;
  created_at: string;
  updated_at: string;
};

export type TimetableDay = "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu" | "Ahad";

export type TimetableSlot = {
  id: string;
  academic_year: string;
  semester: "1" | "2";
  class_name: string;
  day: TimetableDay;
  period: number;
  time_start: string;
  time_end: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  teacher_id?: string | null | undefined;
  teacher_name?: string | null | undefined;
  room?: string | null | undefined;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_PERIODS = [
  { period: 1, start: "07:30", end: "08:15" },
  { period: 2, start: "08:15", end: "09:00" },
  { period: 3, start: "09:15", end: "10:00" },
  { period: 4, start: "10:00", end: "10:45" },
  { period: 5, start: "10:45", end: "11:30" },
  { period: 6, start: "13:00", end: "13:45" },
  { period: 7, start: "13:45", end: "14:30" },
  { period: 8, start: "15:30", end: "16:15" },
];

export const TIMETABLE_DAYS: TimetableDay[] = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Ahad",
];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

// 1. Penugasan mapel per kelas
export async function getAssignments(
  academicYear = "2026/2027",
  className?: string,
): Promise<ClassSubjectAssignment[]> {
  const db = await admin();
  let query = db
    .from("class_subject_assignments")
    .select("*")
    .eq("academic_year", academicYear)
    .order("subject_name", { ascending: true });
  if (className && className !== "all") {
    query = query.eq("class_name", className);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ClassSubjectAssignment[];
}

export async function saveAssignment(
  data: Omit<ClassSubjectAssignment, "id" | "created_at" | "updated_at"> & {
    id?: string | undefined;
  },
): Promise<ClassSubjectAssignment> {
  const db = await admin();
  const { id, ...fields } = data;
  const payload = {
    academic_year: fields.academic_year,
    class_name: fields.class_name,
    subject_id: fields.subject_id,
    subject_code: fields.subject_code ?? "",
    subject_name: fields.subject_name ?? "",
    subject_group: fields.subject_group ?? "Umum",
    teacher_id: fields.teacher_id ?? null,
    teacher_name: fields.teacher_name ?? null,
    jp_per_week: fields.jp_per_week ?? 2,
    updated_at: new Date().toISOString(),
  };

  if (id && id.trim().length > 0) {
    const { data: updated, error } = await db
      .from("class_subject_assignments")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (updated) return updated as ClassSubjectAssignment;
  }

  const { data: upserted, error: upsertError } = await db
    .from("class_subject_assignments")
    .upsert(payload, { onConflict: "academic_year,class_name,subject_id" })
    .select("*")
    .single();
  if (upsertError) throw new Error(upsertError.message);
  return upserted as ClassSubjectAssignment;
}

export async function deleteAssignment(id: string): Promise<boolean> {
  const db = await admin();
  const { error } = await db.from("class_subject_assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

// 2. Slot jadwal pelajaran
export async function getTimetableSlots(
  academicYear = "2026/2027",
  semester: "1" | "2" = "1",
  className?: string,
  teacherId?: string,
): Promise<TimetableSlot[]> {
  const db = await admin();
  let query = db
    .from("timetable_slots")
    .select("*")
    .eq("academic_year", academicYear)
    .eq("semester", semester)
    .order("period", { ascending: true });
  if (className && className !== "all") query = query.eq("class_name", className);
  if (teacherId) query = query.eq("teacher_id", teacherId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as TimetableSlot[];
}

export async function checkTeacherConflict(
  academicYear: string,
  semester: "1" | "2",
  day: TimetableDay,
  period: number,
  teacherId: string,
  ignoreSlotId?: string,
): Promise<TimetableSlot | null> {
  if (!teacherId) return null;
  const db = await admin();
  let query = db
    .from("timetable_slots")
    .select("*")
    .eq("academic_year", academicYear)
    .eq("semester", semester)
    .eq("day", day)
    .eq("period", period)
    .eq("teacher_id", teacherId);
  if (ignoreSlotId) query = query.neq("id", ignoreSlotId);
  const { data } = await query.limit(1);
  return ((data ?? [])[0] as TimetableSlot | undefined) ?? null;
}

export async function saveSlot(
  data: Omit<TimetableSlot, "id" | "created_at" | "updated_at"> & { id?: string | undefined },
): Promise<{ slot: TimetableSlot; conflict: TimetableSlot | null }> {
  const db = await admin();
  const { id, ...fields } = data;

  if (fields.teacher_id) {
    const conflict = await checkTeacherConflict(
      fields.academic_year,
      fields.semester,
      fields.day,
      fields.period,
      fields.teacher_id,
      id,
    );
    if (conflict && conflict.class_name !== fields.class_name) {
      return { slot: conflict, conflict };
    }
  }

  const payload = {
    academic_year: fields.academic_year,
    semester: fields.semester,
    class_name: fields.class_name,
    day: fields.day,
    period: fields.period,
    time_start: fields.time_start ?? "",
    time_end: fields.time_end ?? "",
    subject_id: fields.subject_id ?? "",
    subject_code: fields.subject_code ?? "",
    subject_name: fields.subject_name ?? "",
    teacher_id: fields.teacher_id ?? null,
    teacher_name: fields.teacher_name ?? null,
    room: fields.room ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: upserted, error } = await db
    .from("timetable_slots")
    .upsert(payload, { onConflict: "academic_year,semester,class_name,day,period" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  return { slot: upserted as TimetableSlot, conflict: null };
}

export async function deleteSlot(id: string): Promise<boolean> {
  const db = await admin();
  const { error } = await db.from("timetable_slots").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}
