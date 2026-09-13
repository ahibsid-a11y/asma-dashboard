import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACCOUNT_TYPES, MEMBER_ADMIN_TYPES } from "./roles";

const accountTypeSchema = z.enum(ACCOUNT_TYPES);

/** Ubah string kosong / null menjadi undefined agar field opsional tidak gagal validasi. */
const blankToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const memberSchema = z.object({
  id: z.preprocess(blankToUndefined, z.string().uuid().optional()),
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.preprocess(blankToUndefined, z.string().trim().email("Email tidak valid").optional()),
  password: z.preprocess(
    blankToUndefined,
    z.string().min(8, "Password minimal 8 karakter").optional(),
  ),
  phone: optionalText(30),
  gender: z.preprocess(blankToUndefined, z.enum(["L", "P"]).optional()),
  status: z.enum(["Aktif", "Nonaktif"]).default("Aktif"),
  account_type: accountTypeSchema.optional().default("santri"),
  class: optionalText(80),
  dorm: optionalText(120),
  halaqoh: optionalText(120),
  nis_nip: optionalText(60),
  rfid_card: optionalText(60),
  avatar: z.preprocess(
    blankToUndefined,
    z.string().trim().url("URL foto tidak valid").optional(),
  ),
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

/** Terjemahkan pesan teknis database menjadi pesan yang dimengerti pengguna. */
function friendlyDbError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("nis_nip")) return "Nomor induk ini sudah dipakai anggota lain";
  if (m.includes("rfid")) return "Nomor kartu RFID ini sudah dipakai anggota lain";
  if (m.includes("already been registered") || m.includes("duplicate key") && m.includes("email")) {
    return "Email ini sudah terdaftar untuk anggota lain";
  }
  return message;
}

const empty = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;

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
    // Email bersifat opsional: bila kosong, sistem membuat alamat internal otomatis.
    const email =
      data.email ??
      `${
        (data.nis_nip ?? data.name).toLowerCase().replace(/[^a-z0-9]/g, "") || "anggota"
      }${Math.floor(1000 + Math.random() * 9000)}@ahibs.local`;

    const profileFields = {
      name: data.name,
      display_name: data.name,
      email,
      phone: empty(data.phone),
      gender: (data.gender ?? null) as "L" | "P" | null,
      status: data.status,
      account_type: data.account_type,
      class: isSantri ? empty(data.class) : null,
      dorm: isSantri ? empty(data.dorm) : null,
      halaqoh: empty(data.halaqoh),
      nis_nip: empty(data.nis_nip),
      rfid_card: empty(data.rfid_card),
      avatar: empty(data.avatar),
    };

    if (data.id) {
      const { email: newEmail, ...rest } = profileFields;
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(data.email ? { ...rest, email: newEmail } : rest)
        .eq("id", data.id);
      if (error) throw new Error(friendlyDbError(error.message));
      const authUpdate: Record<string, unknown> = {
        email_confirm: true,
        user_metadata: {
          name: data.name,
          display_name: data.name,
          account_type: data.account_type,
        },
      };
      if (data.email) authUpdate["email"] = data.email;
      if (data.password) authUpdate["password"] = data.password;
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        data.id,
        authUpdate,
      );
      if (authError) throw new Error(friendlyDbError(authError.message));
      return { id: data.id };
    }

    if (!data.password) throw new Error("Password wajib diisi untuk anggota baru");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, display_name: data.name, account_type: data.account_type },
    });
    if (createError || !created?.user) {
      throw new Error(friendlyDbError(createError?.message ?? "Gagal membuat akun"));
    }

    const { error } = await supabaseAdmin.from("profiles").upsert({ id: created.user.id, ...profileFields });
    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(friendlyDbError(error.message));
    }
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

const importRowSchema = z.object({
  name: z.string().trim().min(2),
  nis_nip: z.string().trim().min(1),
  account_type: accountTypeSchema,
  class: z.string().trim().max(80).optional().default(""),
  dorm: z.string().trim().max(120).optional().default(""),
  halaqoh: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  gender: z.enum(["L", "P"]).optional().nullable(),
  rfid_card: z.string().trim().max(60).optional().default(""),
});

export const importMembers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ rows: z.array(importRowSchema).min(1).max(1000) }).parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let created = 0;
    const failures: { nis_nip: string; message: string }[] = [];

    for (const row of data.rows) {
      const email = `${row.nis_nip.toLowerCase().replace(/[^a-z0-9]/g, "")}@ahibs.local`;
      const isSantri = row.account_type === "santri";
      try {
        const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: "Ahibs1234",
          email_confirm: true,
          user_metadata: {
            name: row.name,
            display_name: row.name,
            account_type: row.account_type,
          },
        });
        if (authError || !user?.user) throw new Error(authError?.message ?? "Gagal membuat akun");

        const { error } = await supabaseAdmin.from("profiles").upsert({
          id: user.user.id,
          name: row.name,
          display_name: row.name,
          email,
          phone: empty(row.phone),
          gender: (row.gender ?? null) as "L" | "P" | null,
          status: "Aktif" as const,
          account_type: row.account_type,
          class: isSantri ? empty(row.class) : null,
          dorm: isSantri ? empty(row.dorm) : null,
          halaqoh: empty(row.halaqoh),
          nis_nip: row.nis_nip,
          rfid_card: empty(row.rfid_card),
        });
        if (error) throw new Error(error.message);
        created += 1;
      } catch (error) {
        failures.push({ nis_nip: row.nis_nip, message: (error as Error).message });
      }
    }

    return { created, failures };
  });

export const deleteMember = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    if (data.id === ctx.userId) throw new Error("Anda tidak dapat menghapus akun Anda sendiri");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Data terkait (presensi, pelanggaran, kegiatan) ikut terhapus lewat ON DELETE CASCADE.
    const { error } = await supabaseAdmin.from("profiles").delete().eq("id", data.id);
    if (error) throw new Error(friendlyDbError(error.message));
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (authError) throw new Error(friendlyDbError(authError.message));
    return { ok: true };
  });
