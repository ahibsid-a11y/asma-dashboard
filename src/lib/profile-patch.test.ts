/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { changedProfileFields, profilePatchSchema, profileUpdateFields } from "./profile-patch";

describe("partial profile edits", () => {
  it("preserves class and dorm when only phone changes", () => {
    const original = { name: "Santri", class: "Kelas 8A", dorm: "Asrama A", phone: "081" };
    const patch = profileUpdateFields(profilePatchSchema.parse({ phone: "082" }));
    expect({ ...original, ...patch }).toEqual({ name: "Santri", class: "Kelas 8A", dorm: "Asrama A", phone: "082" });
  });
  it("sends only changed fields from a complete form", () => {
    const original = { name: "Santri", class: "Kelas 7A", dorm: "Asrama B", rfid_card: "123" };
    expect(changedProfileFields({ ...original, name: "Santri Baru" }, original)).toEqual({ name: "Santri Baru" });
  });
  it("allows explicit clearing without clearing unrelated fields", () => {
    expect(profileUpdateFields(profilePatchSchema.parse({ phone: null }))).toEqual({ phone: null });
  });
  it("ignores protected privilege fields", () => {
    expect(profileUpdateFields(profilePatchSchema.parse({ phone: "082", account_type: "super_admin", status: "Aktif" }))).toEqual({ phone: "082" });
  });
});