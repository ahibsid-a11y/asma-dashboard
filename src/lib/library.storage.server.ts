import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface LibraryVisit {
  id: string;
  student_id: string;
  student_name: string;
  nis_nip: string;
  class_name: string;
  dorm_name?: string | undefined;
  rfid_card?: string | undefined;
  check_in: string; // ISO string
  check_out?: string | null | undefined;
  method: "rfid" | "manual";
  purpose: string; // Misal "Membaca Buku", "Peminjaman / Pengembalian", "Belajar Mandiri", "Tugas Sekolah"
  notes?: string | undefined;
  date: string; // YYYY-MM-DD
  academic_year: string;
  semester: string;
}

interface LibraryStoreData {
  visits: LibraryVisit[];
}

const STORE_PATH = path.resolve(process.cwd(), "data", "library_store.json");

function ensureStoreExists(): void {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    const initialData: LibraryStoreData = {
      visits: [],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initialData, null, 2), "utf-8");
  }
}

export function loadLibraryStore(): LibraryStoreData {
  ensureStoreExists();
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!data.visits || !Array.isArray(data.visits)) {
      data.visits = [];
    }
    return data;
  } catch (err) {
    console.error("Error reading library store, resetting to default:", err);
    return { visits: [] };
  }
}

export function saveLibraryStore(data: LibraryStoreData): void {
  ensureStoreExists();
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save library store:", err);
    throw err;
  }
}

export function addLibraryVisit(visitData: Omit<LibraryVisit, "id">): LibraryVisit {
  const store = loadLibraryStore();
  const newVisit: LibraryVisit = {
    id: `lib-${crypto.randomUUID().slice(0, 8)}`,
    ...visitData,
  };
  store.visits.unshift(newVisit); // taruh terbaru di awal
  saveLibraryStore(store);
  return newVisit;
}

export function checkOutLibraryVisit(visitId: string): LibraryVisit | null {
  const store = loadLibraryStore();
  const visit = store.visits.find((v) => v.id === visitId);
  if (!visit) return null;
  visit.check_out = new Date().toISOString();
  saveLibraryStore(store);
  return visit;
}
