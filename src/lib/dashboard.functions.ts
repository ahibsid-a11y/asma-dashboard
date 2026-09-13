import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DashboardStat = { label: string; value: string; hint?: string };

const GURU_TYPES = ["guru_mapel", "wali_kelas", "musyrif_asrama", "musyrif_halaqoh"];
const TENDIK_TYPES = ["tendik", "kepala_tu", "kepala_rt_sarpras"];
const OVERVIEW_TYPES = [
  "super_admin",
  "mudir",
  "kepala_sekolah",
  "kepala_tu",
  "waka_kurikulum",
  "kabid_kesantrian",
];

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardStat[]> => {
    const ctx = context as { supabase: any; userId: string };
    const { data: me, error } = await ctx.supabase
      .from("profiles")
      .select("account_type,class,dorm,halaqoh")
      .eq("id", ctx.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!me) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const countWhere = async (build: (q: any) => any) => {
      let query = supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
      query = build(query);
      const { count, error: countError } = await query;
      if (countError) throw new Error(countError.message);
      return count ?? 0;
    };

    const accountType = me.account_type as string | null;

    if (accountType && OVERVIEW_TYPES.includes(accountType)) {
      const [santri, guru, tendik, nonaktif] = await Promise.all([
        countWhere((q) => q.eq("account_type", "santri").eq("status", "Aktif")),
        countWhere((q) => q.in("account_type", GURU_TYPES).eq("status", "Aktif")),
        countWhere((q) => q.in("account_type", TENDIK_TYPES).eq("status", "Aktif")),
        countWhere((q) => q.eq("status", "Nonaktif")),
      ]);
      return [
        { label: "Total Santri Aktif", value: String(santri) },
        { label: "Total Guru & Musyrif", value: String(guru) },
        { label: "Total Tendik", value: String(tendik) },
        { label: "Akun Nonaktif", value: String(nonaktif) },
      ];
    }

    if (accountType === "wali_kelas") {
      const kelas = (me.class as string | null) ?? null;
      const santri = kelas
        ? await countWhere((q) =>
            q.eq("account_type", "santri").eq("status", "Aktif").eq("class", kelas),
          )
        : 0;
      return [
        { label: "Santri di Kelas Saya", value: String(santri), hint: kelas ?? "Kelas belum diatur" },
        { label: "Presensi Hari Ini", value: "—", hint: "Menunggu modul presensi" },
      ];
    }

    if (accountType === "musyrif_asrama" || accountType === "musyrif_halaqoh") {
      const isAsrama = accountType === "musyrif_asrama";
      const scope = (isAsrama ? (me.dorm as string | null) : (me.halaqoh as string | null)) ?? null;
      const santri = scope
        ? await countWhere((q) =>
            q
              .eq("account_type", "santri")
              .eq("status", "Aktif")
              .eq(isAsrama ? "dorm" : "halaqoh", scope),
          )
        : 0;
      return [
        {
          label: isAsrama ? "Santri di Asrama Saya" : "Santri di Halaqoh Saya",
          value: String(santri),
          hint: scope ?? "Belum diatur",
        },
        { label: "Absensi Diri Bulan Ini", value: "—", hint: "Menunggu modul absensi" },
      ];
    }

    if (accountType === "santri") {
      return [
        { label: "Kehadiran Saya", value: "—", hint: "Menunggu modul presensi" },
        { label: "Mutaba'ah Saya", value: "—", hint: "Menunggu modul mutaba'ah" },
        { label: "Pelanggaran Saya", value: "—", hint: "Menunggu modul kesiswaan" },
      ];
    }

    return [
      { label: "Absensi Diri Bulan Ini", value: "—", hint: "Menunggu modul absensi" },
      { label: "Agenda Pekan Ini", value: "—", hint: "Menunggu kalender pendidikan" },
    ];
  });
