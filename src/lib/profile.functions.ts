import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const blankToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const profileSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi"),
  email: z.preprocess(blankToUndefined, z.string().trim().email("Email tidak valid").optional()),
  password: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  phone: optionalText(30),
  gender: z.preprocess(blankToUndefined, z.enum(["L", "P"]).optional()),
  class: optionalText(80),
  dorm: optionalText(120),
  halaqoh: optionalText(120),
  nis_nip: optionalText(60),
  rfid_card: optionalText(60),
  avatar: z.preprocess(blankToUndefined, z.string().trim().url("URL foto tidak valid").optional()),
});

type Ctx = { supabase: any; userId: string };

const empty = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("nis_nip")) return "Nomor induk ini sudah dipakai anggota lain";
  if (m.includes("rfid")) return "Nomor kartu RFID ini sudah dipakai anggota lain";
  if (m.includes("already been registered") || (m.includes("duplicate") && m.includes("email"))) {
    return "Email ini sudah terdaftar untuk anggota lain";
  }
  return message;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const { data, error } = await ctx.supabase
      .from("profiles")
      .select(
        "id,name,email,phone,gender,status,account_type,class,dorm,halaqoh,nis_nip,rfid_card,avatar,created_at",
      )
      .eq("id", ctx.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => profileSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { error } = await ctx.supabase
      .from("profiles")
      .update({
        name: data.name,
        display_name: data.name,
        email: data.email ?? null,
        phone: empty(data.phone),
        gender: (data.gender ?? null) as "L" | "P" | null,
        class: empty(data.class),
        dorm: empty(data.dorm),
        halaqoh: empty(data.halaqoh),
        nis_nip: empty(data.nis_nip),
        rfid_card: empty(data.rfid_card),
        avatar: empty(data.avatar),
      })
      .eq("id", ctx.userId);
    if (error) throw new Error(friendly(error.message));

    if (data.email || data.password) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const authUpdate: Record<string, unknown> = {
        user_metadata: { name: data.name, display_name: data.name },
      };
      if (data.email) {
        authUpdate["email"] = data.email;
        authUpdate["email_confirm"] = true;
      }
      if (data.password) authUpdate["password"] = data.password;
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        ctx.userId,
        authUpdate,
      );
      if (authError) throw new Error(friendly(authError.message));
    }

    return { ok: true };
  });
