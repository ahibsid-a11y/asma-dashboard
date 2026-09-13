import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACCOUNT_TYPES, MEMBER_ADMIN_TYPES } from "./roles";

const accountTypeSchema = z.enum(ACCOUNT_TYPES);

const memberSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.string().trim().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter").optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  gender: z.enum(["L", "P"]).optional().nullable(),
  status: z.enum(["Aktif", "Nonaktif"]).default("Aktif"),
  account_type: accountTypeSchema,
  class: z.string().trim().max(80).optional().nullable(),
  dorm: z.string().trim().max(120).optional().nullable(),
  halaqoh: z.string().trim().max(120).optional().nullable(),
  nis_nip: z.string().trim().min(1, "Nomor induk wajib diisi"),
  rfid_card: z.string().trim().max(60).optional().nullable(),
  avatar: z.string().trim().url("URL foto tidak valid").optional().nullable(),
});

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("account_type")
    .eq("id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !MEMBER_ADMIN_TYPES.includes(data.account_type)) {
    throw new Error("Anda tidak memiliki akses ke Manajemen Anggota");
  }
}

const empty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : (v ?? null));

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { data, error } = await (context as Ctx).supabase
      .from("profiles")
      .select(
        "id,name,email,phone,gender,status,account_type,class,dorm,halaqoh,nis_nip,rfid_card,avatar,created_at",
      )
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveMember = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => memberSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const isSantri = data.account_type === "santri";
    const profileFields = {
      name: data.name,
      display_name: data.name,
      email: data.email,
      phone: empty(data.phone),
      gender: empty(data.gender),
      status: data.status,
      account_type: data.account_type,
      class: isSantri ? empty(data.class) : null,
      dorm: isSantri ? empty(data.dorm) : null,
      halaqoh: empty(data.halaqoh),
      nis_nip: data.nis_nip,
      rfid_card: empty(data.rfid_card),
      avatar: empty(data.avatar),
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("profiles").update(profileFields).eq("id", data.id);
      if (error) throw new Error(error.message);
      if (data.password) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
          password: data.password,
        });
        if (authError) throw new Error(authError.message);
      }
      return { id: data.id };
    }

    if (!data.password) throw new Error("Password wajib diisi untuk anggota baru");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, display_name: data.name, account_type: data.account_type },
    });
    if (createError || !created?.user) throw new Error(createError?.message ?? "Gagal membuat akun");

    const { error } = await supabaseAdmin.from("profiles").upsert({ id: created.user.id, ...profileFields });
    if (error) throw new Error(error.message);
    return { id: created.user.id };
  });

export const setMemberStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["Aktif", "Nonaktif"]) }).parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.status === "Nonaktif") {
      await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: "876000h" });
    } else {
      await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: "none" });
    }
    return { ok: true };
  });
