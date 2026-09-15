import fs from "node:fs";
import path from "node:path";

export type KokurPredicate = "SB" | "BSH" | "MB" | "BB";

export interface KokurTheme {
  id: string;
  focus_dimension: string; // Dimensi Profil Pelajar (Keimanan, Kewargaan, dll)
  title: string; // Cinta Ibadah, Akhlak & Adab, dll
  activities: string; // Shalat 5 waktu, dll
  nilai_hebat: string; // Hanif, Mandiri, dll
  kebiasaan: string; // Beribadah, bangun pagi, dll
}

export const DEFAULT_KOKUR_THEMES: KokurTheme[] = [
  {
    id: "cinta-ibadah",
    focus_dimension: "Keimanan & Ketakwaan",
    title: "Cinta Ibadah",
    activities: "Shalat 5 waktu berjamaah, Muhasabah diri",
    nilai_hebat: "Hanif, Mandiri",
    kebiasaan: "Beribadah, bangun pagi",
  },
  {
    id: "akhlak-adab",
    focus_dimension: "Kewargaan & Komunikasi",
    title: "Akhlak & Adab",
    activities: "Berperilaku baik, tutur kata sopan santun",
    nilai_hebat: "Hanif, Adaptif",
    kebiasaan: "Beribadah, bermasyarakat",
  },
  {
    id: "kemandirian",
    focus_dimension: "Penalaran & Kolaborasi",
    title: "Kemandirian",
    activities: "Belajar mandiri, olahraga rutin, keikutsertaan organisasi",
    nilai_hebat: "Edukatif, Mandiri",
    kebiasaan: "Gemar belajar, berolahraga",
  },
  {
    id: "kedisiplinan",
    focus_dimension: "Kesehatan & Kreativitas",
    title: "Kedisiplinan",
    activities: "Menjaga kebersihan diri & lingkungan, pola makan tertib",
    nilai_hebat: "Berkolaborasi, Mandiri",
    kebiasaan: "Gemar belajar, makan sehat",
  },
  {
    id: "bahasa",
    focus_dimension: "Komunikasi & Kolaborasi",
    title: "Bahasa",
    activities: "Penerapan mufrodat yaumi, latihan public speaking (muhadharah)",
    nilai_hebat: "Edukatif, Tangguh",
    kebiasaan: "Gemar belajar",
  },
];

export interface StudentKokurGrade {
  predicate: KokurPredicate;
  notes?: string;
}

export interface StudentKokurRecord {
  student_id: string;
  semester: string;
  academic_year: string;
  grades: Record<string, StudentKokurGrade>; // themeId -> { predicate, notes }
  narrative: string; // 1 paragraf narasi hasil generate/edit
  updated_at: string;
}

interface KokurStoreData {
  themes: KokurTheme[];
  records: Record<string, StudentKokurRecord>; // key: `${student_id}_${semester}_${academic_year}`
}

const STORE_PATH = path.resolve(process.cwd(), "data", "kokur_store.json");

function ensureStoreDir(): void {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadKokurStore(): KokurStoreData {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_PATH)) {
      const initial: KokurStoreData = {
        themes: DEFAULT_KOKUR_THEMES,
        records: {},
      };
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      themes: parsed.themes?.length ? parsed.themes : DEFAULT_KOKUR_THEMES,
      records: parsed.records || {},
    };
  } catch (err) {
    console.error("Failed to load kokur store:", err);
    return {
      themes: DEFAULT_KOKUR_THEMES,
      records: {},
    };
  }
}

export function saveKokurStore(data: KokurStoreData): void {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save kokur store:", err);
    throw err;
  }
}

/**
 * Otomatis menghasilkan 1 paragraf narasi capaian kokurikuler / P5RA
 * berdasarkan predikat setiap tema (SB, BSH, MB, BB).
 */
export function generateKokurNarrative(
  studentName: string,
  grades: Record<string, StudentKokurGrade>,
  themes: KokurTheme[] = DEFAULT_KOKUR_THEMES
): string {
  const sbThemes: string[] = [];
  const bshThemes: string[] = [];
  const mbThemes: string[] = [];
  const bbThemes: string[] = [];

  for (const theme of themes) {
    const item = grades[theme.id];
    const p = item?.predicate;
    const label = `${theme.title} (${theme.activities})`;
    if (p === "SB") {
      sbThemes.push(label);
    } else if (p === "BSH") {
      bshThemes.push(label);
    } else if (p === "MB") {
      mbThemes.push(label);
    } else if (p === "BB") {
      bbThemes.push(label);
    }
  }

  // Jika belum ada nilai sama sekali
  const totalGraded = sbThemes.length + bshThemes.length + mbThemes.length + bbThemes.length;
  if (totalGraded === 0) {
    return `Ananda ${studentName} telah mengikuti seluruh rangkaian kegiatan Kokurikuler (Projek Penguatan Profil Pelajar) semester ini dengan aktif dan menunjukkan komitmen yang baik dalam setiap tema pembelajaran berkarakter.`;
  }

  const parts: string[] = [];

  if (sbThemes.length > 0) {
    parts.push(
      `Ananda menunjukkan capaian Sangat Berkembang (SB) yang istimewa pada aspek ${sbThemes.join(" serta ")}.`
    );
  }

  if (bshThemes.length > 0) {
    const prefix = sbThemes.length > 0 ? "Adapun" : `Ananda ${studentName}`;
    parts.push(
      `${prefix} pada aspek ${bshThemes.join(" dan ")}, ananda telah Berkembang Sesuai Harapan (BSH).`
    );
  }

  const needImprovement = [...mbThemes, ...bbThemes];
  if (needImprovement.length > 0) {
    parts.push(
      `Perhatian dan bimbingan lebih lanjut perlu ditingkatkan terutama dalam penguatan aspek ${needImprovement.join(" serta ")} agar pembiasaan karakter dan kemandirian ananda dapat berkembang lebih optimal di masa mendatang.`
    );
  } else {
    parts.push(
      "Diharapkan ananda terus mempertahankan kedisiplinan dan akhlak mulia ini baik di lingkungan madrasah maupun di rumah."
    );
  }

  return parts.join(" ");
}

export function getStudentKokurRecord(
  studentId: string,
  semester: string,
  academicYear: string
): StudentKokurRecord | null {
  const store = loadKokurStore();
  const key = `${studentId}_${semester}_${academicYear}`;
  return store.records[key] || null;
}

export function saveStudentKokurRecord(
  record: Omit<StudentKokurRecord, "updated_at">
): StudentKokurRecord {
  const store = loadKokurStore();
  const key = `${record.student_id}_${record.semester}_${record.academic_year}`;
  const fullRecord: StudentKokurRecord = {
    ...record,
    updated_at: new Date().toISOString(),
  };
  store.records[key] = fullRecord;
  saveKokurStore(store);
  return fullRecord;
}
