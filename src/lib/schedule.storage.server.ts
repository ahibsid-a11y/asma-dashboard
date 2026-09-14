import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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
  period: number; // 1 to 8
  time_start: string; // "07:30"
  time_end: string; // "08:15"
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

interface ScheduleStoreData {
  assignments: ClassSubjectAssignment[];
  slots: TimetableSlot[];
}

const STORE_PATH = path.resolve(process.cwd(), "data", "schedule_store.json");

function ensureStoreDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStore(): ScheduleStoreData {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_PATH)) {
      const initial: ScheduleStoreData = {
        assignments: [],
        slots: [],
      };
      writeStore(initial);
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      slots: Array.isArray(parsed.slots) ? parsed.slots : [],
    };
  } catch (err) {
    console.error("Error reading schedule store:", err);
    return {
      assignments: [],
      slots: [],
    };
  }
}

function writeStore(data: ScheduleStoreData) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing schedule store:", err);
  }
}

// 1. Assignments
export function getAssignments(academicYear = "2026/2027", className?: string) {
  const store = readStore();
  let list = store.assignments.filter((a) => a.academic_year === academicYear);
  if (className && className !== "all") {
    list = list.filter((a) => a.class_name === className);
  }
  return list;
}

export function saveAssignment(
  data: Omit<ClassSubjectAssignment, "id" | "created_at" | "updated_at"> & {
    id?: string | undefined;
  },
): ClassSubjectAssignment {
  const store = readStore();
  const now = new Date().toISOString();
  const { id, ...fields } = data;
  const recordId = id && id.trim().length > 0 ? id : crypto.randomUUID();

  const idx = store.assignments.findIndex((a) => a.id === recordId);
  const existing = idx >= 0 ? store.assignments[idx] : null;

  const record: ClassSubjectAssignment = {
    ...fields,
    id: recordId,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  if (existing && idx >= 0) {
    store.assignments[idx] = record;
  } else {
    store.assignments.push(record);
  }

  writeStore(store);
  return record;
}

export function deleteAssignment(id: string): boolean {
  const store = readStore();
  const lenBefore = store.assignments.length;
  store.assignments = store.assignments.filter((a) => a.id !== id);
  writeStore(store);
  return store.assignments.length < lenBefore;
}

// 2. Timetable Slots
export function getTimetableSlots(
  academicYear = "2026/2027",
  semester: "1" | "2" = "1",
  className?: string,
  teacherId?: string,
) {
  const store = readStore();
  let list = store.slots.filter(
    (s) => s.academic_year === academicYear && s.semester === semester,
  );
  if (className && className !== "all") {
    list = list.filter((s) => s.class_name === className);
  }
  if (teacherId) {
    list = list.filter((s) => s.teacher_id === teacherId);
  }
  return list;
}

export function checkTeacherConflict(
  academicYear: string,
  semester: "1" | "2",
  day: TimetableDay,
  period: number,
  teacherId: string,
  ignoreSlotId?: string,
): TimetableSlot | null {
  if (!teacherId) return null;
  const store = readStore();
  const conflict = store.slots.find(
    (s) =>
      s.academic_year === academicYear &&
      s.semester === semester &&
      s.day === day &&
      s.period === period &&
      s.teacher_id === teacherId &&
      s.id !== ignoreSlotId,
  );
  return conflict || null;
}

export function saveSlot(
  data: Omit<TimetableSlot, "id" | "created_at" | "updated_at"> & { id?: string | undefined },
): { slot: TimetableSlot; conflict: TimetableSlot | null } {
  const store = readStore();
  const now = new Date().toISOString();
  const { id, ...fields } = data;
  const recordId = id && id.trim().length > 0 ? id : crypto.randomUUID();

  // Check teacher conflict
  if (fields.teacher_id) {
    const conflict = checkTeacherConflict(
      fields.academic_year,
      fields.semester,
      fields.day,
      fields.period,
      fields.teacher_id,
      recordId,
    );
    if (conflict) {
      return { slot: conflict, conflict };
    }
  }

  const idx = store.slots.findIndex((s) => s.id === recordId);
  const existing = idx >= 0 ? store.slots[idx] : null;

  const record: TimetableSlot = {
    ...fields,
    id: recordId,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  // Replace any slot for the same class, day, period
  const existingClassSlotIdx = store.slots.findIndex(
    (s) =>
      s.academic_year === fields.academic_year &&
      s.semester === fields.semester &&
      s.class_name === fields.class_name &&
      s.day === fields.day &&
      s.period === fields.period &&
      s.id !== recordId,
  );
  if (existingClassSlotIdx >= 0) {
    store.slots.splice(existingClassSlotIdx, 1);
  }

  const currentIdx = store.slots.findIndex((s) => s.id === recordId);
  if (currentIdx >= 0) {
    store.slots[currentIdx] = record;
  } else {
    store.slots.push(record);
  }

  writeStore(store);
  return { slot: record, conflict: null };
}

export function deleteSlot(id: string): boolean {
  const store = readStore();
  const lenBefore = store.slots.length;
  store.slots = store.slots.filter((s) => s.id !== id);
  writeStore(store);
  return store.slots.length < lenBefore;
}
