import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ekskulUpdateFields, manageEkskulSchema } from "./ekskul.schema";

describe("extracurricular edits preserve existing data", () => {
  test("accepts a stored null coach without blocking save", () => {
    const parsed = manageEkskulSchema.parse({ action: "save", item: {
      id: "ekskul-futsal", name: "Futsal", category: "pilihan", coach_id: null,
    } });
    assert.equal(parsed.item?.coach_id, null);
  });
  test("omitted fields do not acquire defaults that overwrite saved values", () => {
    const parsed = manageEkskulSchema.parse({ action: "save", item: {
      id: "ekskul-futsal", name: "Futsal", category: "pilihan",
    } });
    assert.deepEqual(ekskulUpdateFields(parsed.item ?? {}), { name: "Futsal", category: "pilihan" });
  });
  test("keeps null quota, zero fees, inactive status and existing ID", () => {
    const existing = { id: "ekskul-futsal", fee: 75000, is_active: false, quota: null, coach_id: null };
    const patch = ekskulUpdateFields({ id: existing.id, name: "Futsal", fee: 0, quota: null, coach_id: null });
    assert.deepEqual({ ...existing, ...patch }, {
      id: "ekskul-futsal", name: "Futsal", fee: 0, is_active: false, quota: null, coach_id: null,
    });
  });
});