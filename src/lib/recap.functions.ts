import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACCOUNT_TYPES } from "./roles";

type Ctx = { supabase: any; userId: string };

/** Peran yang boleh membuka Rekap Presensi. */
export const RECAP_VIEWER_TYPES = [
  "super_admin",
  "mudir",
  "kepala_sekolah",
  "waka_kurikulum",
  "kabid_kesantrian",
] as const;

/** Peran yang melihat rekap seluruh anggota (bukan hanya unit binaan). */
export const RECAP_FULL_ACCESS_TYPES = [
  "super_admin",
  "mudir",
  "kepala_sekolah",
  "waka_kurikulum",
  "kabid_kesantrian",
] as const;

export type RecapCounts = {
  hadir: number;
  telat: number;
  izin: number;
  sakit: number;
  alfa: number;
};

export type RecapRow = RecapCounts & {
  id: string;
  name: string | null;
  nis_nip: string | null;
  account_type: string | null;
  class: string | null;
  dorm: string | null;
  halaqoh: string | null;
  total: number;
  percent: number;
};

const emptyCounts = (): RecapCounts => ({ hadir: 0, telat: 0, izin: 0, sakit: 0, alfa: 0 });

const STATUS_KEY: Record<string, keyof RecapCounts> = {
  Hadir: "hadir",
  Telat: "telat",
  Izin: "izin",
  Sakit: "sakit",
  Alfa: "alfa",
};

const chunk = <T,>(items: T[], size = 200) => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

async function viewerProfile(ctx: Ctx) {
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("id,name,account_type,class,dorm,halaqoh")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !(RECAP_VIEWER_TYPES as readonly string[]).includes(data.account_type)) {
    throw new Error("Anda tidak memiliki akses ke Rekap Presensi");
  }
  return data as {
    id: string;
    account_type: string;
    class: string | null;
    dorm: string | null;
    halaqoh: string | null;
  };
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid");
const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(120).optional(),
);

const filterSchema = z.object({
  from: dateStr,
  to: dateStr,
  account_type: z.enum(ACCOUNT_TYPES).optional(),
  class: optionalText,
  dorm: optionalText,
  halaqoh: optionalText,
});

/** Ambil anggota yang boleh dilihat pemanggil (RLS profiles membatasi unit binaan). */
async function scopedMembers(ctx: Ctx, filters: z.infer<typeof filterSchema>) {
  let query = ctx.supabase
    .from("profiles")
    .select("id,name,nis_nip,account_type,class,dorm,halaqoh")
    .eq("status", "Aktif")
    .order("name", { ascending: true })
    .limit(2000);
  if (filters.account_type) query = query.eq("account_type", filters.account_type);
  if (filters.class) query = query.eq("class", filters.class);
  if (filters.dorm) query = query.eq("dorm", filters.dorm);
  if (filters.halaqoh) query = query.eq("halaqoh", filters.halaqoh);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as RecapRow[];
}

export const getRecapFilterOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const me = await viewerProfile(ctx);
    const { data, error } = await ctx.supabase
      .from("profiles")
      .select("account_type,class,dorm,halaqoh")
      .eq("status", "Aktif")
      .limit(2000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    const uniq = (key: string) =>
      [...new Set(rows.map((r) => r[key]).filter((v): v is string => Boolean(v)))].sort((a, b) =>
        a.localeCompare(b, "id"),
      );
    return {
      account_types: uniq("account_type"),
      classes: uniq("class"),
      dorms: uniq("dorm"),
      halaqohs: uniq("halaqoh"),
      full_access: (RECAP_FULL_ACCESS_TYPES as readonly string[]).includes(me.account_type),
      account_type: me.account_type,
    };
  });

export const getAttendanceRecap = createServerFn({ method: "GET" })
  .validator((data: unknown) => filterSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await viewerProfile(ctx);
    if (data.to < data.from) throw new Error("Rentang tanggal tidak valid");

    const members = await scopedMembers(ctx, data);
    const byId = new Map<string, RecapRow>(
      members.map((m) => [m.id, { ...m, ...emptyCounts(), total: 0, percent: 0 }]),
    );
    const ids = [...byId.keys()];

    const bump = (userId: string, status: string) => {
      const row = byId.get(userId);
      const key = STATUS_KEY[status];
      if (!row || !key) return;
      row[key] += 1;
    };

    for (const part of chunk(ids)) {
      const fixed = await ctx.supabase
        .from("attendance_records")
        .select("user_id,status")
        .in("user_id", part)
        .gte("attendance_date", data.from)
        .lte("attendance_date", data.to);
      if (fixed.error) throw new Error(fixed.error.message);
      for (const r of fixed.data ?? []) bump(r.user_id, r.status);
    }

    const events = await ctx.supabase
      .from("incidental_attendance_events")
      .select("id")
      .gte("event_date", data.from)
      .lte("event_date", data.to);
    if (events.error) throw new Error(events.error.message);
    const eventIds = (events.data ?? []).map((e: any) => e.id as string);
    if (eventIds.length && ids.length) {
      for (const part of chunk(ids)) {
        const incidental = await ctx.supabase
          .from("incidental_attendance_records")
          .select("user_id,status")
          .in("event_id", eventIds)
          .in("user_id", part);
        if (incidental.error) throw new Error(incidental.error.message);
        for (const r of incidental.data ?? []) bump(r.user_id, r.status);
      }
    }

    const rows = [...byId.values()].map((row) => {
      const total = row.hadir + row.telat + row.izin + row.sakit + row.alfa;
      return {
        ...row,
        total,
        percent: total ? Math.round(((row.hadir + row.telat) / total) * 1000) / 10 : 0,
      };
    });

    const group = (key: "class" | "dorm") => {
      const map = new Map<string, RecapCounts>();
      for (const row of rows) {
        const label = row[key] ?? "Tanpa " + (key === "class" ? "kelas" : "asrama");
        const current = map.get(label) ?? emptyCounts();
        current.hadir += row.hadir;
        current.telat += row.telat;
        current.izin += row.izin;
        current.sakit += row.sakit;
        current.alfa += row.alfa;
        map.set(label, current);
      }
      return [...map.entries()]
        .map(([label, counts]) => ({ label, ...counts }))
        .sort((a, b) => a.label.localeCompare(b.label, "id"));
    };

    const totals = rows.reduce<RecapCounts>((acc, row) => {
      acc.hadir += row.hadir;
      acc.telat += row.telat;
      acc.izin += row.izin;
      acc.sakit += row.sakit;
      acc.alfa += row.alfa;
      return acc;
    }, emptyCounts());
    const grandTotal =
      totals.hadir + totals.telat + totals.izin + totals.sakit + totals.alfa;

    return {
      rows: rows.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "id")),
      byClass: group("class"),
      byDorm: group("dorm"),
      totals,
      grandTotal,
      overallPercent: grandTotal
        ? Math.round(((totals.hadir + totals.telat) / grandTotal) * 1000) / 10
        : 0,
      memberCount: rows.length,
    };
  });

export const getMemberRecapDetail = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ user_id: z.string().uuid(), from: dateStr, to: dateStr }).parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await viewerProfile(ctx);

    const profile = await ctx.supabase
      .from("profiles")
      .select("id,name,nis_nip,account_type,class,dorm,halaqoh")
      .eq("id", data.user_id)
      .maybeSingle();
    if (profile.error) throw new Error(profile.error.message);
    if (!profile.data) throw new Error("Anggota tidak ditemukan atau di luar unit binaan Anda");

    const fixed = await ctx.supabase
      .from("attendance_records")
      .select("attendance_date,status,scan_time,notes,session_id,attendance_sessions(session_name)")
      .eq("user_id", data.user_id)
      .gte("attendance_date", data.from)
      .lte("attendance_date", data.to)
      .order("attendance_date", { ascending: false });
    if (fixed.error) throw new Error(fixed.error.message);

    const incidental = await ctx.supabase
      .from("incidental_attendance_records")
      .select("status,notes,incidental_attendance_events!inner(title,event_date)")
      .eq("user_id", data.user_id)
      .gte("incidental_attendance_events.event_date", data.from)
      .lte("incidental_attendance_events.event_date", data.to);
    if (incidental.error) throw new Error(incidental.error.message);

    const items = [
      ...(fixed.data ?? []).map((r: any) => ({
        date: r.attendance_date as string,
        kind: "Tetap" as const,
        label: r.attendance_sessions?.session_name ?? "Sesi presensi",
        status: r.status as string,
        notes: (r.notes as string | null) ?? null,
      })),
      ...(incidental.data ?? []).map((r: any) => ({
        date: r.incidental_attendance_events?.event_date as string,
        kind: "Insidental" as const,
        label: r.incidental_attendance_events?.title ?? "Kegiatan insidental",
        status: r.status as string,
        notes: (r.notes as string | null) ?? null,
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.label.localeCompare(b.label)));

    return { member: profile.data, items };
  });
