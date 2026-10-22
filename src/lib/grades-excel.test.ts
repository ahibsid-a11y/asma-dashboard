import { describe, it } from "node:test";
import assert from "node:assert/strict";
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
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.studentId, "s1");
    assert.deepEqual(rows[0]!.tpScores, { tp1: 80, tp2: 90 });
    assert.equal(rows[0]!.stsScore, 85);
    assert.equal(rows[0]!.sasScore, 88);
    assert.equal(rows[0]!.changeCount, 4);
    assert.deepEqual(rows[0]!.errors, []);
  });

  it("sel kosong tidak dihitung sebagai perubahan sehingga nilai lama tidak tertimpa", async () => {
    const rows = await parseGradesExcel(
      makeFile([{ nis_nip: "2026002", name: "Bilal Hakim", "TP 1": "", "TP 2": 70, STS: "", SAS: "" }]),
      students,
      tps,
    );
    assert.equal(rows[0]!.studentId, "s2");
    assert.deepEqual(rows[0]!.tpScores, { tp2: 70 });
    assert.equal(rows[0]!.stsScore, undefined);
    assert.equal(rows[0]!.sasScore, undefined);
    assert.equal(rows[0]!.changeCount, 1);
  });

  it("menandai baris dengan NIS yang tidak dikenal", async () => {
    const rows = await parseGradesExcel(
      makeFile([{ nis_nip: "999999", name: "Orang Asing", "TP 1": 80 }]),
      students,
      tps,
    );
    assert.equal(rows[0]!.studentId, null);
    assert.match(rows[0]!.errors.join(" "), /tidak cocok/);
  });

  it("menolak nilai di luar rentang 0-100", async () => {
    const rows = await parseGradesExcel(
      makeFile([{ nis_nip: "2026001", name: "Ahmad Fauzan", "TP 1": 150 }]),
      students,
      tps,
    );
    assert.deepEqual(rows[0]!.tpScores, {});
    assert.match(rows[0]!.errors.join(" "), /0-100/);
  });

  it("mencocokkan berdasarkan nama bila kolom NIS kosong", async () => {
    const rows = await parseGradesExcel(
      makeFile([{ nis_nip: "", name: "Bilal Hakim", STS: 77 }]),
      students,
      tps,
    );
    assert.equal(rows[0]!.studentId, "s2");
    assert.equal(rows[0]!.stsScore, 77);
    assert.deepEqual(rows[0]!.errors, []);
  });
});
