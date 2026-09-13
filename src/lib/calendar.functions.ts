import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

/** Jabatan Waka Kurikulum dan di atasnya boleh mengagendakan kegiatan. */
export const CALENDAR_ADMIN_TYPES = [
  "super_admin",
  "mudir",
  "kepala_sekolah",
  "waka_kurikulum",
  "kabid_kesantrian",
] as const;

export function isCalendarAdmin(accountType?: string | null) {
  return (CALENDAR_ADMIN_TYPES as readonly string[]).includes(accountType ?? "");
}

/** Daftar anggota aktif untuk memilih peserta agenda (hanya untuk pengagenda). */
export const listCalendarCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const { data: me, error: meError } = await ctx.supabase
      .from("profiles")
      .select("id,account_type")
      .eq("id", ctx.userId)
      .maybeSingle();
    if (meError) throw new Error(meError.message);
    if (!me || !isCalendarAdmin(me.account_type)) {
      throw new Error("Anda tidak berwenang mengagendakan kegiatan");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,name,nis_nip,account_type,class,dorm,halaqoh")
      .eq("status", "Aktif")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });
