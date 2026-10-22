import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { changedProfileFields, profilePatchSchema, profileUpdateFields } from "./profile-patch";

describe("partial profile edits", () => {
  it("preserves class and dorm when only phone changes", () => {
    const original = { name: "Santri", class: "Kelas 8A", dorm: "Asrama A", phone: "081" };
    const patch = profileUpdateFields(profilePatchSchema.parse({ phone: "082" }));
    assert.deepEqual({ ...original, ...patch }, { name: "Santri", class: "Kelas 8A", dorm: "Asrama A", phone: "082" });
  });
  it("sends only changed fields from a complete form", () => {
    const original = { name: "Santri", class: "Kelas 7A", dorm: "Asrama B", rfid_card: "123" };
    assert.deepEqual(changedProfileFields({ ...original, name: "Santri Baru" }, original), { name: "Santri Baru" });
  });
  it("allows explicit clearing without clearing unrelated fields", () => {
    assert.deepEqual(profileUpdateFields(profilePatchSchema.parse({ phone: null })), { phone: null });
  });
  it("ignores protected privilege fields", () => {
    assert.deepEqual(profileUpdateFields(profilePatchSchema.parse({ phone: "082", account_type: "super_admin", status: "Aktif" })), { phone: "082" });
  });
});