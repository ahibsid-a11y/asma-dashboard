import * as XLSX from "xlsx";

/**
 * Ekspor/impor lembar nilai (TP, STS, SAS) via Excel.
 * - Ekspor menghasilkan file berisi daftar santri + kolom per TP + STS/SAS,
 *   lengkap dengan nilai yang sudah tersimpan.
 * - Impor mencocokkan baris berdasarkan NISN/NIS (atau nama bila NIS kosong)
 *   dan HANYA menimpa sel yang diisi di Excel; sel kosong tidak mengubah
 *   nilai yang sudah tersimpan.
 */

export interface GradesExcelStudent {
  id: string;
  name: string;
  nis_nip: string | null;
}

export interface GradesExcelTp {
  id: string;
  code: string;
  description: string;
}

export interface GradesExcelMeta {
  subjectName: string;
  className: string;
  semester: string;
  academicYear: string;
}

export interface GradesExcelValues {
  tp_scores: Record<string, number>;
  sts_score: number;
  sas_score: number;
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export function downloadGradesExcel(
  meta: GradesExcelMeta,
  students: GradesExcelStudent[],
  tps: GradesExcelTp[],
  grades: Record<string, GradesExcelValues>,
) {
  const header = ["nis_nip", "name", ...tps.map((t) => t.code), "STS", "SAS"];
  const rows = students.map((s) => {
    const g = grades[s.id];
    const row: Record<string, string | number> = {
      nis_nip: s.nis_nip ?? "",
      name: s.name,
    };
    for (const t of tps) {
      const v = g?.tp_scores?.[t.id] ?? 0;
      row[t.code] = v === 0 ? "" : v;
    }
    row["STS"] = g && g.sts_score !== 0 ? g.sts_score : "";
    row["SAS"] = g && g.sas_score !== 0 ? g.sas_score : "";
    return row;
  });

  const sheet = XLSX.utils.json_to_sheet(rows, { header });
  sheet["!cols"] = header.map((h) => ({
    wch: h === "name" ? 32 : h === "nis_nip" ? 16 : 9,
  }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Nilai");

  const notes = XLSX.utils.aoa_to_sheet([
    ["Petunjuk pengisian nilai"],
    ["Mapel", meta.subjectName],
    ["Kelas", meta.className],
    ["Semester", meta.semester],
    ["Tahun Ajaran", meta.academicYear],
    [""],
    ["1.", "Isi nilai 0-100 pada kolom TP, STS, dan SAS."],
    ["2.", "Kolom yang dibiarkan kosong TIDAK mengubah nilai yang sudah tersimpan."],
    ["3.", "Jangan mengubah kolom nis_nip dan name — dipakai untuk mencocokkan santri."],
    ["4.", "Simpan file tetap berformat .xlsx lalu unggah kembali lewat tombol Impor Excel."],
  ]);
  notes["!cols"] = [{ wch: 6 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(book, notes, "Petunjuk");

  const safe = (s: string) => s.replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
  XLSX.writeFile(
    book,
    `nilai-${safe(meta.subjectName)}-${safe(meta.className)}-smt${meta.semester}.xlsx`,
  );
}

export interface ParsedGradeRow {
  rowNumber: number;
  studentId: string | null;
  name: string;
  nis_nip: string;
  tpScores: Record<string, number>;
  stsScore: number | undefined;
  sasScore: number | undefined;
  changeCount: number;
  errors: string[];
}

export async function parseGradesExcel(
  file: File,
  students: GradesExcelStudent[],
  tps: GradesExcelTp[],
): Promise<ParsedGradeRow[]> {
  const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const first = book.SheetNames[0];
  if (!first) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[first]!, {
    defval: "",
  });

  const byNis = new Map(
    students
      .filter((s) => str(s.nis_nip))
      .map((s) => [str(s.nis_nip).toLowerCase(), s] as const),
  );
  const byName = new Map(students.map((s) => [s.name.trim().toLowerCase(), s] as const));

  return raw
    .map((r, index) => {
      const nis = str(r["nis_nip"]);
      const name = str(r["name"]);
      const student =
        (nis ? byNis.get(nis.toLowerCase()) : undefined) ??
        (name ? byName.get(name.toLowerCase()) : undefined);

      const errors: string[] = [];
      const tpScores: Record<string, number> = {};
      let changeCount = 0;

      const readScore = (label: string, v: unknown): number | undefined => {
        const sVal = str(v);
        if (!sVal) return undefined;
        const n = Number(sVal);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          errors.push(`Nilai ${label} harus angka 0-100`);
          return undefined;
        }
        changeCount += 1;
        return Math.round(n);
      };

      for (const t of tps) {
        const v = readScore(t.code, r[t.code]);
        if (v !== undefined) tpScores[t.id] = v;
      }
      const stsScore = readScore("STS", r["STS"]);
      const sasScore = readScore("SAS", r["SAS"]);

      if (!student) errors.push("NISN/NIS tidak cocok dengan santri kelas ini");

      return {
        rowNumber: index + 2,
        studentId: student?.id ?? null,
        name: student?.name ?? name,
        nis_nip: nis,
        tpScores,
        stsScore,
        sasScore,
        changeCount,
        errors,
      };
    })
    .filter((row) => row.nis_nip || row.name || row.changeCount > 0);
}
