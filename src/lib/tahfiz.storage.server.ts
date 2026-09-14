import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { IQRO_STAGES, type IqroStage, SURAH_LIST } from "./quran-data";

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
  nilai: number | string; // e.g. 90 or "Mumtaz"
  catatan: string;
  murojaah_harian?: string | undefined; // e.g. "Lancar", "Perlu Diulang", "Belum Murojaah"
  musyrif_id: string;
  created_at: string;
};

export type TahfizTilawahRecord = {
  id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  juz: number;
  surah_name: string;
  ayat_start: number;
  ayat_end: number;
  halaman?: number | undefined;
  nilai_kelancaran: string; // Mumtaz / Jayyid Jiddan / Jayyid / Maqbul
  nilai_tajwid?: string | undefined;
  catatan: string;
  murojaah_harian?: string | undefined;
  musyrif_id: string;
  created_at: string;
};

export type TahfizHafalanRecord = {
  id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  type: TahfizHafalanType; // sabq (ziyadah) | sabqy (murojaah surat/juz berjalan) | manzil (murojaah mutqin keseluruhan)
  juz: number;
  surah_name: string;
  ayat_start: number;
  ayat_end: number;
  nilai: number | string; // e.g. 95 / Mumtaz
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

const STORE_PATH = path.resolve(process.cwd(), "data", "tahfiz_store.json");

function ensureStoreDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStore(): TahfizStoreData {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_PATH)) {
      const initial: TahfizStoreData = {
        studentLevels: {},
        iqroRecords: [],
        tilawahRecords: [],
        hafalanRecords: [],
      };
      writeStore(initial);
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      studentLevels: parsed.studentLevels || {},
      iqroRecords: Array.isArray(parsed.iqroRecords) ? parsed.iqroRecords : [],
      tilawahRecords: Array.isArray(parsed.tilawahRecords) ? parsed.tilawahRecords : [],
      hafalanRecords: Array.isArray(parsed.hafalanRecords) ? parsed.hafalanRecords : [],
    };
  } catch (err) {
    console.error("Error reading tahfiz store:", err);
    return {
      studentLevels: {},
      iqroRecords: [],
      tilawahRecords: [],
      hafalanRecords: [],
    };
  }
}

function writeStore(data: TahfizStoreData) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing tahfiz store:", err);
  }
}

export function getStudentLevel(studentId: string, defaultGrade?: string): TahfizLevel {
  const store = readStore();
  if (store.studentLevels[studentId]?.level) {
    return store.studentLevels[studentId].level;
  }
  // If not set yet: Grade VII starts with Iqro by default, others start with Tahfiz
  if (defaultGrade?.toUpperCase().includes("VII") || defaultGrade?.startsWith("7")) {
    return "iqro";
  }
  return "tahfiz";
}

export function setStudentLevel(
  studentId: string,
  level: TahfizLevel,
  positionDesc?: string,
): TahfizStudentLevel {
  const store = readStore();
  const current = store.studentLevels[studentId] || {
    student_id: studentId,
    level,
    updated_at: new Date().toISOString(),
  };

  const updated: TahfizStudentLevel = {
    ...current,
    level,
    current_position_desc: positionDesc ?? current.current_position_desc,
    updated_at: new Date().toISOString(),
  };

  store.studentLevels[studentId] = updated;
  writeStore(store);
  return updated;
}

export function saveIqroRecord(
  data: Omit<TahfizIqroRecord, "id" | "created_at"> & { id?: string | undefined },
): TahfizIqroRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const { id, ...fields } = data;
  const recordId = id && id.trim().length > 0 ? id : crypto.randomUUID();

  const idx = store.iqroRecords.findIndex((r) => r.id === recordId);
  const existing = idx >= 0 ? store.iqroRecords[idx] : null;

  const record: TahfizIqroRecord = {
    ...fields,
    id: recordId,
    created_at: existing?.created_at ?? now,
  };

  if (existing && idx >= 0) {
    store.iqroRecords[idx] = record;
  } else {
    store.iqroRecords.unshift(record);
  }

  // Update current position for student
  setStudentLevel(
    data.student_id,
    "iqro",
    `Hal ${data.halaman} (${data.tahap}) - Nilai: ${data.nilai}`,
  );

  writeStore(store);
  return record;
}

export function saveTilawahRecord(
  data: Omit<TahfizTilawahRecord, "id" | "created_at"> & { id?: string | undefined },
): TahfizTilawahRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const { id, ...fields } = data;
  const recordId = id && id.trim().length > 0 ? id : crypto.randomUUID();

  const idx = store.tilawahRecords.findIndex((r) => r.id === recordId);
  const existing = idx >= 0 ? store.tilawahRecords[idx] : null;

  const record: TahfizTilawahRecord = {
    ...fields,
    id: recordId,
    created_at: existing?.created_at ?? now,
  };

  if (existing && idx >= 0) {
    store.tilawahRecords[idx] = record;
  } else {
    store.tilawahRecords.unshift(record);
  }

  // Update current position for student
  setStudentLevel(
    data.student_id,
    "tilawah",
    `Juz ${data.juz} (${data.surah_name}: ${data.ayat_start}-${data.ayat_end})`,
  );

  writeStore(store);
  return record;
}

export function saveTahfizHafalanRecord(
  data: Omit<TahfizHafalanRecord, "id" | "created_at"> & { id?: string | undefined },
): TahfizHafalanRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const { id, ...fields } = data;
  const recordId = id && id.trim().length > 0 ? id : crypto.randomUUID();

  const idx = store.hafalanRecords.findIndex((r) => r.id === recordId);
  const existing = idx >= 0 ? store.hafalanRecords[idx] : null;

  const record: TahfizHafalanRecord = {
    ...fields,
    id: recordId,
    created_at: existing?.created_at ?? now,
  };

  if (existing && idx >= 0) {
    store.hafalanRecords[idx] = record;
  } else {
    store.hafalanRecords.unshift(record);
  }

  // Update current position if sabq (ziyadah)
  if (data.type === "sabq") {
    setStudentLevel(
      data.student_id,
      "tahfiz",
      `Sabq: Juz ${data.juz} - ${data.surah_name}: ${data.ayat_start}-${data.ayat_end}`,
    );
  }

  writeStore(store);
  return record;
}

export function deleteTahfizRecord(
  category: "iqro" | "tilawah" | "hafalan",
  id: string,
): boolean {
  const store = readStore();
  if (category === "iqro") {
    const lenBefore = store.iqroRecords.length;
    store.iqroRecords = store.iqroRecords.filter((r) => r.id !== id);
    writeStore(store);
    return store.iqroRecords.length < lenBefore;
  }
  if (category === "tilawah") {
    const lenBefore = store.tilawahRecords.length;
    store.tilawahRecords = store.tilawahRecords.filter((r) => r.id !== id);
    writeStore(store);
    return store.tilawahRecords.length < lenBefore;
  }
  if (category === "hafalan") {
    const lenBefore = store.hafalanRecords.length;
    store.hafalanRecords = store.hafalanRecords.filter((r) => r.id !== id);
    writeStore(store);
    return store.hafalanRecords.length < lenBefore;
  }
  return false;
}

export function getStudentTahfizHistory(studentId: string) {
  const store = readStore();
  const levelInfo = store.studentLevels[studentId] || null;

  const iqro = store.iqroRecords
    .filter((r) => r.student_id === studentId)
    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  const tilawah = store.tilawahRecords
    .filter((r) => r.student_id === studentId)
    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  const hafalan = store.hafalanRecords
    .filter((r) => r.student_id === studentId)
    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  return {
    levelInfo,
    iqro,
    tilawah,
    hafalan,
  };
}

export function getAllTahfizStore() {
  return readStore();
}
