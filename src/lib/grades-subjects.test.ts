import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectAssignedSubjects, selectDinasReportSubjects } from "./grades-subjects";

describe("student subjects follow Manajemen Mapel", () => {
  const subjects = [
    { id: "matematika", is_active: true },
    { id: "tajwid", is_active: true },
    { id: "ipa", is_active: true },
    { id: "nonaktif", is_active: false },
  ];
  it("includes only active subjects assigned to the student's class", () => {
    assert.deepEqual(selectAssignedSubjects(subjects, [
      { subject_id: "matematika" }, { subject_id: "tajwid" }, { subject_id: "nonaktif" },
    ], false).map((s) => s.id), ["matematika", "tajwid"]);
  });
  it("does not invent subjects for an unassigned student class", () => {
    assert.deepEqual(selectAssignedSubjects(subjects, [], false), []);
  });
  it("does not replace unmatched assignments with the entire catalog", () => {
    assert.deepEqual(selectAssignedSubjects(subjects, [{ subject_id: "legacy-id" }]), []);
  });
});

describe("printed academic subjects preserve class assignments and saved scores", () => {
  const item = (id: string, group: string, score: number, code = id) => ({
    subject: { id, code, name: id, group, kkm: 75, order_index: 1, is_active: true },
    finalScore: score, letterGrade: "B", highestDesc: "Saved description", lowestDesc: null, teacherNotes: null,
  });
  it("does not replace the student's saved PAI score with a diniyyah average", () => {
    const pai = item("pai", "Umum", 88, "PAI");
    const result = selectDinasReportSubjects([pai, item("fiqih", "Diniyyah", 60)], () => "D");
    assert.equal(result.find((row) => row.subject.code === "PAI"), pai);
    assert.equal(result[0]?.finalScore, 88);
  });
  it("does not invent PAI or Arabic local content for a class without those assignments", () => {
    assert.deepEqual(selectDinasReportSubjects([item("matematika", "Umum", 82)], () => "B").map((row) => row.subject.id), ["matematika"]);
    assert.deepEqual(selectDinasReportSubjects([], () => "B"), []);
  });
  it("keeps manually assigned local-content subjects and their saved grades", () => {
    const local = item("mulok", "Muatan Lokal", 91, "MULOK");
    assert.deepEqual(selectDinasReportSubjects([local, item("arab", "Bahasa Arab", 70)], () => "C"), [local]);
  });
  it("uses only active class assignments when building combined report grades", () => {
    const catalog = [item("fiqih", "Diniyyah", 80), item("tauhid", "Diniyyah", 100)];
    const assigned = selectAssignedSubjects(catalog.map((row) => row.subject), [{ subject_id: "fiqih" }], false);
    const result = selectDinasReportSubjects(catalog.filter((row) => assigned.includes(row.subject)), () => "B");
    assert.equal(result[0]?.finalScore, 80);
    assert.deepEqual(result[0]?.components, [{ name: "fiqih", score: 80 }]);
  });
});