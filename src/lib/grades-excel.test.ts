import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseGradesExcel, type GradesExcelStudent, type GradesExcelTp } from "./grades-excel";

const students: GradesExcelStudent[] = [
  { id: "s1", name: "Ahmad Fauzan", nis_nip: "2026001" },
  { id: "s2", name: "Bilal Hakim", nis_nip: "2026002" },
];

const tps: GradesExcelTp[] = [
  { id: "tp1", code: "TP 1", description: "Rukun shalat" },
  { id: "tp2", code: "TP 2", description: "Syarat shalat" },
];

function makeFile(rows: Record<string, unknown>[]): File {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Nilai");
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return { arrayBuffer: async () => buffer } as File;
}

describe("parseGradesExcel", () => {
  it("mencocokkan santri berdasarkan NIS dan membaca nilai TP/STS/SAS", async () => {
    const rows = await parseGradesExcel(
      makeFile([{ nis_nip: "2026001", name: "Ahmad Fauzan", "TP 1": 80, "TP 2": 90, STS: 85, SAS: 88 }]),
      students,
      tps,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.studentId).toBe("s1");
    expect(rows[0]!.tpScores).toEqual({ tp1: 80, tp2: 90 });
    expect(rows[0]!.stsScore).toBe(85);
    expect(rows[0]!.sasScore).toBe(88);
    expect(rows[0]!.changeCount).toBe(4);
    expect(rows[0]!.errors).toEqual([]);
  });

  it("sel kosong tidak dihitung sebagai perubahan sehingga nilai lama tidak tertimpa", async () => {
    const rows = await parseGradesExcel(
      makeFile([{ nis_nip: "2026002", name: "Bilal Hakim", "TP 1": "", "TP 2": 70, STS: "", SAS: "" }]),
      students,
      tps,
    );
    expect(rows[0]!.studentId).toBe("s2");
    expect(rows[0]!.tpScores).toEqual({ tp2: 70 });
    expect(rows[0]!.stsScore).toBeUndefined();
    expect(rows[0]!.sasScore).toBeUndefined();
    expect(rows[0]!.changeCount).toBe(1);
  });

  it("menandai baris dengan NIS yang tidak dikenal", async () => {
    const rows = await parseGradesExcel(
      makeFile([{ nis_nip: "999999", name: "Orang Asing", "TP 1": 80 }]),
      students,
      tps,
    );
    expect(rows[0]!.studentId).toBeNull();
    expect(rows[0]!.errors.join(" ")).toContain("tidak cocok");
  });

  it("menolak nilai di luar rentang 0-100", async () => {
    const rows = await parseGradesExcel(
      makeFile([{ nis_nip: "2026001", name: "Ahmad Fauzan", "TP 1": 150 }]),
      students,
      tps,
    );
    expect(rows[0]!.tpScores).toEqual({});
    expect(rows[0]!.errors.join(" ")).toContain("0-100");
  });

  it("mencocokkan berdasarkan nama bila kolom NIS kosong", async () => {
    const rows = await parseGradesExcel(
      makeFile([{ nis_nip: "", name: "Bilal Hakim", STS: 77 }]),
      students,
      tps,
    );
    expect(rows[0]!.studentId).toBe("s2");
    expect(rows[0]!.stsScore).toBe(77);
    expect(rows[0]!.errors).toEqual([]);
  });
});
