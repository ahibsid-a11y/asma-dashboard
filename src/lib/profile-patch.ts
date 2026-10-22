import { z } from "zod";

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
export const profilePatchSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").optional(),
  display_name: nullableText(100),
  email: z.union([z.string().trim().email("Email tidak valid"), z.literal(""), z.null()]).optional(),
  password: z.string().min(1).optional(),
  phone: nullableText(30),
  gender: z.enum(["L", "P"]).nullable().optional(),
  class: nullableText(80),
  dorm: nullableText(120),
  halaqoh: nullableText(120),
  nis_nip: nullableText(60),
  rfid_card: nullableText(60),
  avatar: z.union([z.string().trim().url("URL foto tidak valid"), z.literal(""), z.null()]).optional(),
});

export const PROFILE_EDIT_FIELDS = ["name", "display_name", "email", "phone", "gender", "class", "dorm", "halaqoh", "nis_nip", "rfid_card", "avatar"] as const;

export function profileUpdateFields(data: z.infer<typeof profilePatchSchema>) {
  const patch: Record<string, string | null> = {};
  for (const field of PROFILE_EDIT_FIELDS) {
    const value = data[field];
    if (value !== undefined) patch[field] = value === "" ? null : value;
  }
  return patch;
}

export function changedProfileFields(values: Record<string, unknown>, original: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const field of PROFILE_EDIT_FIELDS) {
    if (values[field] !== undefined && (values[field] ?? "") !== (original[field] ?? "")) {
      patch[field] = values[field] === "" ? null : values[field];
    }
  }
  if (values["password"]) patch["password"] = values["password"];
  return patch;
}