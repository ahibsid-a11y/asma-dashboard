import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectAssignedSubjects } from "./grades-subjects";

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