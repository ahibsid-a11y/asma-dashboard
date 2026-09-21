import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ACCOUNT_TYPES,
  CATEGORY_DEFAULT_ACCOUNT_TYPE,
  CATEGORY_POSITIONS,
  MEMBER_CATEGORIES,
  categoryOf,
  type AccountType,
  type MemberCategory,
} from "./roles";

const blankToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const profileSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi"),
  display_name: optionalText(100),
  email: z.preprocess(blankToUndefined, z.string().trim().email("Email tidak valid").optional()),
  password: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  phone: optionalText(30),
  gender: z.preprocess(blankToUndefined, z.enum(["L", "P"]).optional()),
  category: z.preprocess(blankToUndefined, z.enum(MEMBER_CATEGORIES).optional()),
  positions: z.array(z.enum(ACCOUNT_TYPES)).optional(),
  account_type: z.preprocess(blankToUndefined, z.enum(ACCOUNT_TYPES).optional()),
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
    const [{ data, error }, { data: posData }] = await Promise.all([
      ctx.supabase
        .from("profiles")
        .select(
          "id,name,display_name,email,phone,gender,status,account_type,category,class,dorm,halaqoh,nis_nip,rfid_card,avatar,created_at",
        )
        .eq("id", ctx.userId)
        .maybeSingle(),
      ctx.supabase
        .from("profile_positions")
        .select("position")
        .eq("user_id", ctx.userId),
    ]);
    if (error) throw new Error(error.message);
    if (!data) return null;
    const positions = (posData ?? []).map((p: any) => p.position as AccountType);
    const category = (data.category as MemberCategory) ?? categoryOf(data.account_type);
    return {
      ...data,
      category,
      positions:
        positions.length > 0
          ? positions
          : data.account_type
            ? [data.account_type as AccountType]
            : [],
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .validator((data: unknown) => profileSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const updatePayload: Record<string, unknown> = {
      name: data.name,
      email: data.email ?? null,
      phone: empty(data.phone),
      gender: (data.gender ?? null) as "L" | "P" | null,
      class: empty(data.class),
      dorm: empty(data.dorm),
      halaqoh: empty(data.halaqoh),
      nis_nip: empty(data.nis_nip),
      rfid_card: empty(data.rfid_card),
      avatar: empty(data.avatar),
    };
    if (data.display_name !== undefined) {
      updatePayload["display_name"] = empty(data.display_name);
    }

    const { data: curProfile } = await (ctx.supabase as any)
      .from("profiles")
      .select("account_type,category")
      .eq("id", ctx.userId)
      .maybeSingle();

    const isSantri =
      curProfile?.account_type === "santri" || curProfile?.category === "siswa";

    if (!isSantri && (data.category || data.positions || data.account_type)) {
      const category: MemberCategory =
        data.category ??
        curProfile?.category ??
        categoryOf(curProfile?.account_type);
      const allowed = CATEGORY_POSITIONS[category] || [];
      const positions = (
        data.positions ?? (data.account_type ? [data.account_type] : [])
      ).filter((p) => allowed.includes(p as AccountType));
      const primary =
        positions[0] ??
        data.account_type ??
        CATEGORY_DEFAULT_ACCOUNT_TYPE[category];

      updatePayload["category"] = category;
      updatePayload["account_type"] = primary;

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      await supabaseAdmin
        .from("profile_positions")
        .delete()
        .eq("user_id", ctx.userId);
      if (positions.length > 0) {
        const rows = positions.map((p) => ({
          user_id: ctx.userId,
          position: p,
        }));
        await supabaseAdmin.from("profile_positions").upsert(rows, {
          onConflict: "user_id,position",
          ignoreDuplicates: true,
        });
      }
    }

    const { error } = await (ctx.supabase
      .from("profiles") as any)
      .update(updatePayload)
      .eq("id", ctx.userId);
    if (error) throw new Error(friendly(error.message));

    if (data.email || data.password) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const displayName = empty(data.display_name) ?? data.name;
      const authUpdate: Record<string, unknown> = {
        user_metadata: { name: data.name, display_name: displayName },
      };
      if (data.email) {
        authUpdate["email"] = data.email;
        authUpdate["email_confirm"] = true;
      }
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        ctx.userId,
        authUpdate,
      );
      if (authError) throw new Error(friendly(authError.message));
      if (data.password) {
        const { setUserPassword } = await import("./password.server");
        await setUserPassword(supabaseAdmin, ctx.userId, data.password);

        const { data: cur } = await supabaseAdmin
          .from("profiles")
          .select("preferences")
          .eq("id", ctx.userId)
          .maybeSingle();
        await supabaseAdmin
          .from("profiles")
          .update({
            preferences: {
              ...((cur?.preferences as Record<string, unknown>) || {}),
              password_hint: data.password,
            },
          })
          .eq("id", ctx.userId);
      }
    }

    return { ok: true };
  });
