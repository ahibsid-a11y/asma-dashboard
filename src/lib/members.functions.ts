import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ACCOUNT_TYPES,
  CATEGORY_DEFAULT_ACCOUNT_TYPE,
  CATEGORY_POSITIONS,
  MEMBER_ADMIN_TYPES,
  MEMBER_CATEGORIES,
  categoryOf,
  type AccountType,
  type MemberCategory,
} from "./roles";

const accountTypeSchema = z.enum(ACCOUNT_TYPES);

/** Ubah string kosong / null menjadi undefined agar field opsional tidak gagal validasi. */
const blankToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const memberSchema = z.object({
  id: z.preprocess(blankToUndefined, z.string().uuid().optional()),
  name: z.string().trim().min(1, "Nama wajib diisi"),
  email: z.preprocess(blankToUndefined, z.string().trim().email("Email tidak valid").optional()),
  password: z.preprocess(
    blankToUndefined,
    z.string().min(1, "Password wajib diisi").optional(),
  ),

  phone: optionalText(30),
  gender: z.preprocess(blankToUndefined, z.enum(["L", "P"]).optional()),
  status: z.enum(["Aktif", "Nonaktif"]).default("Aktif"),
  category: z.enum(MEMBER_CATEGORIES).optional(),
  positions: z.array(accountTypeSchema).optional().default([]),
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

/** Tentukan kategori akun dan jabatan utama yang tersimpan pada profil. */
function resolveRole(data: {
  category?: MemberCategory | undefined;
  positions?: AccountType[];
  account_type?: AccountType;
}) {
  const category: MemberCategory = data.category ?? categoryOf(data.account_type);
  const allowed = CATEGORY_POSITIONS[category];
  const positions = (data.positions ?? []).filter((p) => allowed.includes(p));
  const primary = positions[0] ?? CATEGORY_DEFAULT_ACCOUNT_TYPE[category];
  return { category, positions, primary };
}


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
    const ctx = context as Ctx;
    const [{ data, error }, { data: positions }] = await Promise.all([
      ctx.supabase
        .from("profiles")
        .select(
          "id,name,email,phone,gender,status,account_type,category,class,dorm,halaqoh,nis_nip,rfid_card,avatar,created_at",
        )
        .order("created_at", { ascending: true }),
      ctx.supabase.from("profile_positions").select("user_id,position"),
    ]);
    if (error) throw new Error(error.message);
    const byUser = new Map<string, string[]>();
    for (const row of (positions ?? []) as { user_id: string; position: string }[]) {
      byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row.position]);
    }
    return ((data ?? []) as any[]).map((m) => ({
      ...m,
      positions: byUser.get(m.id) ?? (m.account_type ? [m.account_type] : []),
    }));
  });

export const saveMember = createServerFn({ method: "POST" })
  .validator((data: unknown) => memberSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { category, positions, primary } = resolveRole(data);
    const isSantri = category === "siswa";
    // Alamat login internal dipakai bila email tidak diisi, disimpan di profil agar bisa dicari saat login
    const cleanId =
      (data.nis_nip ?? data.name).toLowerCase().replace(/[^a-z0-9]/g, "") || "anggota";
    const email = data.email ?? `${cleanId}@ahibs.local`;

    const profileFields = {
      name: data.name,
      display_name: data.name,
      email,
      phone: empty(data.phone),
      gender: (data.gender ?? null) as "L" | "P" | null,
      status: data.status,
      category,
      account_type: primary,
      class: isSantri ? empty(data.class) : null,
      dorm: isSantri ? empty(data.dorm) : null,
      halaqoh: empty(data.halaqoh),
      nis_nip: empty(data.nis_nip),
      rfid_card: empty(data.rfid_card),
      avatar: empty(data.avatar),
    };

    async function syncPositions(userId: string) {
      await supabaseAdmin.from("profile_positions").delete().eq("user_id", userId);
      const rows = (positions.length > 0 ? positions : isSantri ? [] : [primary]).map((p) => ({
        user_id: userId,
        position: p,
      }));
      if (rows.length > 0) {
        await supabaseAdmin.from("profile_positions").upsert(rows, {
          onConflict: "user_id,position",
        });
      }
    }

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profileFields)
        .eq("id", data.id);
      if (error) throw new Error(friendlyDbError(error.message));
      await syncPositions(data.id);
      const authUpdate: Record<string, unknown> = {
        email_confirm: true,
        user_metadata: {
          name: data.name,
          display_name: data.name,
          account_type: primary,
        },
      };
      if (data.email) authUpdate["email"] = data.email;
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        data.id,
        authUpdate,
      );
      if (authError) throw new Error(friendlyDbError(authError.message));
      if (data.password) {
        const { setUserPassword } = await import("./password.server");
        await setUserPassword(supabaseAdmin, data.id, data.password);
      }
      return { id: data.id };
    }

    if (!data.password) throw new Error("Password wajib diisi untuk anggota baru");
    const { createAuthUser } = await import("./password.server");
    const createdUser = await createAuthUser(supabaseAdmin, {
      email,
      password: data.password,
      user_metadata: { name: data.name, display_name: data.name, account_type: primary },
    });
    const created = { user: createdUser };

    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, ...profileFields });
    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(friendlyDbError(error.message));
    }
    await syncPositions(created.user.id);
    return { id: created.user.id };
  });



export const setMemberStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
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
  name: z.string().trim().min(1),
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
  .validator((data: unknown) =>
    z.object({ rows: z.array(importRowSchema).min(1).max(1000) }).parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createAuthUser } = await import("./password.server");

    let created = 0;
    const failures: { nis_nip: string; message: string }[] = [];

    for (const row of data.rows) {
      const email = `${row.nis_nip.toLowerCase().replace(/[^a-z0-9]/g, "")}@ahibs.local`;
      const isSantri = row.account_type === "santri";
      try {
        const user = await createAuthUser(supabaseAdmin, {
          email,
          password: "Ahibs1234",
          user_metadata: {
            name: row.name,
            display_name: row.name,
            account_type: row.account_type,
          },
        });

        const { error } = await supabaseAdmin.from("profiles").upsert({
          id: user.id,
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
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
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
