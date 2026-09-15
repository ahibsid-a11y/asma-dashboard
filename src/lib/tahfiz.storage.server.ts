import { type IqroStage } from "./quran-data";

export type TahfizLevel = "iqro" | "tilawah" | "tahfiz";

export type TahfizHafalanType = "sabq" | "sabqy" | "manzil";

export type TahfizStudentLevel = {
  student_id: string;
  level: TahfizLevel;
  current_position_desc?: string | undefined;
  updated_at: string;
};

export type TahfizIqroRecord = {
  id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  halaman: number;
  tahap: IqroStage | string;
  nilai: number | string;
  catatan: string;
  murojaah_harian?: string | undefined;
  musyrif_id: string;
  created_at: string;
};

export type TahfizTilawahRecord = {
  id: string;
  student_id: string;
  date: string;
  juz: number;
  surah_name: string;
  ayat_start: number;
  ayat_end: number;
  halaman?: number | undefined;
  nilai_kelancaran: string;
  nilai_tajwid?: string | undefined;
  catatan: string;
  murojaah_harian?: string | undefined;
  musyrif_id: string;
  created_at: string;
};

export type TahfizHafalanRecord = {
  id: string;
  student_id: string;
  date: string;
  type: TahfizHafalanType;
  juz: number;
  surah_name: string;
  ayat_start: number;
  ayat_end: number;
  nilai: number | string;
  predikat?: string | undefined;
  catatan: string;
  musyrif_id: string;
  created_at: string;
};

interface TahfizStoreData {
  studentLevels: Record<string, TahfizStudentLevel>;
  iqroRecords: TahfizIqroRecord[];
  tilawahRecords: TahfizTilawahRecord[];
  hafalanRecords: TahfizHafalanRecord[];
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function sortByDateDesc<T extends { date: string; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.created_at < b.created_at ? 1 : -1;
  });
}

/** Ambil seluruh data tahfiz dari database */
export async function getAllTahfizStore(): Promise<TahfizStoreData> {
  const db = await admin();

  const [levels, iqro, tilawah, hafalan] = await Promise.all([
    db.from("tahfiz_student_levels").select("*"),
    db.from("tahfiz_iqro_records").select("*").order("date", { ascending: false }),
    db.from("tahfiz_tilawah_records").select("*").order("date", { ascending: false }),
    db.from("tahfiz_hafalan_records").select("*").order("date", { ascending: false }),
  ]);

  const studentLevels: Record<string, TahfizStudentLevel> = {};
  for (const row of levels.data ?? []) {
    studentLevels[row.student_id] = {
      student_id: row.student_id,
      level: row.level as TahfizLevel,
      current_position_desc: row.current_position_desc ?? undefined,
      updated_at: row.updated_at,
    };
  }

  return {
    studentLevels,
    iqroRecords: sortByDateDesc((iqro.data ?? []) as TahfizIqroRecord[]),
    tilawahRecords: sortByDateDesc((tilawah.data ?? []) as TahfizTilawahRecord[]),
    hafalanRecords: sortByDateDesc((hafalan.data ?? []) as TahfizHafalanRecord[]),
  };
}

export function defaultLevelForGrade(defaultGrade?: string): TahfizLevel {
  if (defaultGrade?.toUpperCase().includes("VII") || defaultGrade?.startsWith("7")) {
    return "iqro";
  }
  return "tahfiz";
}

export async function getStudentLevel(
  studentId: string,
  defaultGrade?: string,
): Promise<TahfizLevel> {
  const db = await admin();
  const { data } = await db
    .from("tahfiz_student_levels")
    .select("level")
    .eq("student_id", studentId)
    .maybeSingle();
  if (data?.level) return data.level as TahfizLevel;
  return defaultLevelForGrade(defaultGrade);
}

export async function setStudentLevel(
  studentId: string,
  level: TahfizLevel,
  positionDesc?: string,
): Promise<TahfizStudentLevel> {
  const db = await admin();
  const payload: Record<string, unknown> = {
    student_id: studentId,
    level,
    updated_at: new Date().toISOString(),
  };
  if (positionDesc !== undefined) payload["current_position_desc"] = positionDesc;

  const { data, error } = await db
    .from("tahfiz_student_levels")
    .upsert(payload, { onConflict: "student_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  return {
    student_id: data.student_id,
    level: data.level as TahfizLevel,
    current_position_desc: data.current_position_desc ?? undefined,
    updated_at: data.updated_at,
  };
}

async function upsertRecord(table: string, id: string | undefined, fields: Record<string, unknown>) {
  const db = await admin();
  if (id && id.trim().length > 0) {
    const { data, error } = await db
      .from(table)
      .update(fields)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
  }
  const { data, error } = await db.from(table).insert(fields).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveIqroRecord(
  data: Omit<TahfizIqroRecord, "id" | "created_at"> & { id?: string | undefined },
): Promise<TahfizIqroRecord> {
  const { id, ...fields } = data;
  const record = await upsertRecord("tahfiz_iqro_records", id, {
    student_id: fields.student_id,
    date: fields.date,
    halaman: fields.halaman,
    tahap: String(fields.tahap ?? ""),
    nilai: String(fields.nilai ?? ""),
    catatan: fields.catatan ?? "",
    murojaah_harian: fields.murojaah_harian ?? null,
    musyrif_id: fields.musyrif_id,
  });

  await setStudentLevel(
    data.student_id,
    "iqro",
    `Hal ${data.halaman} (${data.tahap}) - Nilai: ${data.nilai}`,
  );

  return record as TahfizIqroRecord;
}

export async function saveTilawahRecord(
  data: Omit<TahfizTilawahRecord, "id" | "created_at"> & { id?: string | undefined },
): Promise<TahfizTilawahRecord> {
  const { id, ...fields } = data;
  const record = await upsertRecord("tahfiz_tilawah_records", id, {
    student_id: fields.student_id,
    date: fields.date,
    juz: fields.juz,
    surah_name: fields.surah_name,
    ayat_start: fields.ayat_start,
    ayat_end: fields.ayat_end,
    halaman: fields.halaman ?? null,
    nilai_kelancaran: fields.nilai_kelancaran ?? "",
    nilai_tajwid: fields.nilai_tajwid ?? null,
    catatan: fields.catatan ?? "",
    murojaah_harian: fields.murojaah_harian ?? null,
    musyrif_id: fields.musyrif_id,
  });

  await setStudentLevel(
    data.student_id,
    "tilawah",
    `Juz ${data.juz} (${data.surah_name}: ${data.ayat_start}-${data.ayat_end})`,
  );

  return record as TahfizTilawahRecord;
}

export async function saveTahfizHafalanRecord(
  data: Omit<TahfizHafalanRecord, "id" | "created_at"> & { id?: string | undefined },
): Promise<TahfizHafalanRecord> {
  const { id, ...fields } = data;
  const record = await upsertRecord("tahfiz_hafalan_records", id, {
    student_id: fields.student_id,
    date: fields.date,
    type: fields.type,
    juz: fields.juz,
    surah_name: fields.surah_name,
    ayat_start: fields.ayat_start,
    ayat_end: fields.ayat_end,
    nilai: String(fields.nilai ?? ""),
    predikat: fields.predikat ?? null,
    catatan: fields.catatan ?? "",
    musyrif_id: fields.musyrif_id,
  });

  if (data.type === "sabq") {
    await setStudentLevel(
      data.student_id,
      "tahfiz",
      `Sabq: Juz ${data.juz} - ${data.surah_name}: ${data.ayat_start}-${data.ayat_end}`,
    );
  }

  return record as TahfizHafalanRecord;
}

export async function deleteTahfizRecord(
  category: "iqro" | "tilawah" | "hafalan",
  id: string,
): Promise<boolean> {
  const db = await admin();
  const table =
    category === "iqro"
      ? "tahfiz_iqro_records"
      : category === "tilawah"
        ? "tahfiz_tilawah_records"
        : "tahfiz_hafalan_records";
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

export async function getStudentTahfizHistory(studentId: string) {
  const db = await admin();

  const [levelRes, iqro, tilawah, hafalan] = await Promise.all([
    db.from("tahfiz_student_levels").select("*").eq("student_id", studentId).maybeSingle(),
    db
      .from("tahfiz_iqro_records")
      .select("*")
      .eq("student_id", studentId)
      .order("date", { ascending: false }),
    db
      .from("tahfiz_tilawah_records")
      .select("*")
      .eq("student_id", studentId)
      .order("date", { ascending: false }),
    db
      .from("tahfiz_hafalan_records")
      .select("*")
      .eq("student_id", studentId)
      .order("date", { ascending: false }),
  ]);

  const levelRow = levelRes.data;

  return {
    levelInfo: levelRow
      ? ({
          student_id: levelRow.student_id,
          level: levelRow.level as TahfizLevel,
          current_position_desc: levelRow.current_position_desc ?? undefined,
          updated_at: levelRow.updated_at,
        } satisfies TahfizStudentLevel)
      : null,
    iqro: (iqro.data ?? []) as TahfizIqroRecord[],
    tilawah: (tilawah.data ?? []) as TahfizTilawahRecord[],
    hafalan: (hafalan.data ?? []) as TahfizHafalanRecord[],
  };
}
