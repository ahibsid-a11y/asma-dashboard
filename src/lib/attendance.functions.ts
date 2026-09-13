import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

export const ATTENDANCE_OFFICER_TYPES = [
  "super_admin",
  "mudir",
  "kepala_sekolah",
  "kepala_tu",
  "waka_kurikulum",
  "kabid_kesantrian",
  "musyrif_asrama",
  "musyrif_halaqoh",
  "wali_kelas",
  "guru_mapel",
  "tendik",
] as const;

const SESSION_SELECT =
  "id,session_name,target_role,on_time_deadline,late_cutoff_time,is_exit,is_active,auto_violation_on_late,auto_violation_on_absent,violation_points_late,violation_points_absent,sort_order";

async function officerProfile(context: Ctx) {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("id,name,account_type,class,dorm,halaqoh")
    .eq("id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !(ATTENDANCE_OFFICER_TYPES as readonly string[]).includes(data.account_type)) {
    throw new Error("Anda tidak memiliki akses untuk mencatat presensi");
  }
  return data as { id: string; name: string | null; account_type: string };
}

/** Waktu lokal Jakarta dalam menit sejak tengah malam. */
function jakartaMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  const [h = 0, m = 0] = parts.split(":").map(Number);
  return h * 60 + m;
}

function jakartaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

export const listScanSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await officerProfile(ctx);
    const { data, error } = await ctx.supabase
      .from("attendance_sessions")
      .select(SESSION_SELECT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const now = jakartaMinutes();
    return (data ?? []).map((s: any) => {
      const start = toMinutes(s.on_time_deadline) - 120;
      const end = toMinutes(s.late_cutoff_time) + 120;
      return { ...s, is_current: now >= start && now <= end };
    });
  });

const MEMBER_ADMIN_TYPES = ["super_admin", "mudir", "kepala_sekolah", "kepala_tu"] as const;

/** Cari anggota berdasarkan nomor kartu RFID, dengan cadangan nomor induk (NIS/NIP). */
async function findMemberByCode(ctx: Ctx, code: string) {
  const clean = code.trim();
  const MEMBER_SELECT = "id,name,nis_nip,account_type,class,dorm,halaqoh,status,rfid_card";
  const byCard = await ctx.supabase
    .from("profiles")
    .select(MEMBER_SELECT)
    .ilike("rfid_card", clean)
    .limit(1)
    .maybeSingle();
  if (byCard.error) throw new Error(byCard.error.message);
  if (byCard.data) return byCard.data as any;

  const byNis = await ctx.supabase
    .from("profiles")
    .select(MEMBER_SELECT)
    .ilike("nis_nip", clean)
    .limit(1)
    .maybeSingle();
  if (byNis.error) throw new Error(byNis.error.message);
  return (byNis.data ?? null) as any;
}

export const searchMembersForCard = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ session_id: z.string().uuid(), q: z.string().trim().max(80).optional() }).parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await officerProfile(ctx);
    const { data: session, error: sErr } = await ctx.supabase
      .from("attendance_sessions")
      .select("target_role")
      .eq("id", data.session_id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Sesi presensi tidak ditemukan");

    let query = ctx.supabase
      .from("profiles")
      .select("id,name,nis_nip,account_type,class,dorm,rfid_card")
      .eq("status", "Aktif")
      .in("account_type", session.target_role)
      .order("name", { ascending: true })
      .limit(50);
    if (data.q) query = query.or(`name.ilike.%${data.q}%,nis_nip.ilike.%${data.q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Kaitkan nomor kartu RFID ke satu anggota (hanya admin anggota). */
export const assignRfidCard = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        rfid_card: z.string().trim().min(1).max(60),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const officer = await officerProfile(ctx);
    if (!(MEMBER_ADMIN_TYPES as readonly string[]).includes(officer.account_type)) {
      throw new Error("Hanya admin anggota yang boleh mendaftarkan kartu RFID");
    }
    const existing = await findMemberByCode(ctx, data.rfid_card);
    if (existing && existing.rfid_card && existing.id !== data.user_id) {
      throw new Error(`Kartu ini sudah terdaftar untuk ${existing.name ?? "anggota lain"}`);
    }
    const { error } = await ctx.supabase
      .from("profiles")
      .update({ rfid_card: data.rfid_card })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const scanAttendance = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        session_id: z.string().uuid(),
        rfid_card: z.string().trim().min(1, "Nomor kartu wajib diisi").max(60),
        notes: z.string().trim().max(300).optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const officer = await officerProfile(ctx);

    const { data: session, error: sessionError } = await ctx.supabase
      .from("attendance_sessions")
      .select(SESSION_SELECT)
      .eq("id", data.session_id)
      .maybeSingle();
    if (sessionError) throw new Error(sessionError.message);
    if (!session) throw new Error("Sesi presensi tidak ditemukan");

    const member = await findMemberByCode(ctx, data.rfid_card);
    if (!member) {
      return {
        ok: false as const,
        reason: "unknown_card" as const,
        code: data.rfid_card,
        message: `Kartu "${data.rfid_card}" belum terdaftar pada anggota mana pun. Daftarkan kartu ini terlebih dahulu, atau ketik nomor induk (NIS/NIP) anggota.`,
      };
    }
    if (member.status !== "Aktif") {
      return {
        ok: false as const,
        reason: "inactive" as const,
        code: data.rfid_card,
        message: `${member.name ?? "Anggota"} berstatus Nonaktif`,
      };
    }
    if (!session.target_role.includes(member.account_type)) {
      return {
        ok: false as const,
        reason: "wrong_session" as const,
        code: data.rfid_card,
        message: `${member.name ?? "Anggota"} tidak termasuk dalam sesi "${session.session_name}". Pilih sesi yang sesuai.`,
      };
    }

    const now = new Date();
    const minutes = jakartaMinutes(now);
    const onTime = toMinutes(session.on_time_deadline);
    const cutoff = toMinutes(session.late_cutoff_time);
    const pastCutoff = minutes > cutoff;
    const status = minutes <= onTime ? "Hadir" : pastCutoff ? "Alfa" : "Telat";

    const { data: record, error } = await ctx.supabase
      .from("attendance_records")
      .upsert(
        {
          user_id: member.id,
          session_id: session.id,
          attendance_date: jakartaDate(now),
          scan_time: now.toISOString(),
          status,
          recorded_by: officer.id,
          notes: data.notes ?? (pastCutoff ? "Scan setelah batas telat" : null),
        },
        { onConflict: "user_id,session_id,attendance_date" },
      )
      .select("id,status,scan_time")
      .single();
    if (error) throw new Error(error.message);

    let violation = false;
    const violationTitle =
      status === "Telat"
        ? `Terlambat ${session.session_name}`
        : status === "Alfa"
          ? `Alfa ${session.session_name}`
          : null;
    const autoOn =
      status === "Telat"
        ? session.auto_violation_on_late
        : status === "Alfa"
          ? session.auto_violation_on_absent
          : false;

    if (violationTitle && autoOn) {
      // Hindari pelanggaran ganda saat kartu discan berulang di hari yang sama.
      const { data: dup } = await ctx.supabase
        .from("violation_records")
        .select("id")
        .eq("user_id", member.id)
        .eq("date", jakartaDate(now))
        .eq("violation_title", violationTitle)
        .maybeSingle();
      if (!dup) {
        const { error: vError } = await ctx.supabase.from("violation_records").insert({
          user_id: member.id,
          date: jakartaDate(now),
          violation_title: violationTitle,
          category: "Kedisiplinan",
          points:
            status === "Telat" ? session.violation_points_late : session.violation_points_absent,
          notes: `Otomatis dari scan presensi (${new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit",
          }).format(now)})`,
          recorded_by: officer.id,
          source: "auto_presensi",
        });
        if (!vError) violation = true;
      }
    }

    return {
      ok: true as const,
      member: {
        id: member.id,
        name: member.name,
        nis_nip: member.nis_nip,
        account_type: member.account_type,
        class: member.class,
        dorm: member.dorm,
      },
      status: record.status as "Hadir" | "Telat" | "Alfa",
      scan_time: record.scan_time as string,
      violation_created: violation,
      session_name: session.session_name as string,
    };
  });


export const listTodayAttendance = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ session_id: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await officerProfile(ctx);
    const { data: rows, error } = await ctx.supabase
      .from("attendance_records")
      .select("id,status,scan_time,notes,user_id,profiles:user_id(name,nis_nip,class,dorm)")
      .eq("session_id", data.session_id)
      .eq("attendance_date", jakartaDate())
      .order("scan_time", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const processAbsentToday = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ session_id: z.string().uuid().optional() }).parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const officer = await officerProfile(ctx);
    const today = jakartaDate();
    const nowMinutes = jakartaMinutes();

    let query = ctx.supabase
      .from("attendance_sessions")
      .select(SESSION_SELECT)
      .eq("is_active", true);
    if (data.session_id) query = query.eq("id", data.session_id);
    const { data: sessions, error } = await query;
    if (error) throw new Error(error.message);

    let marked = 0;
    let violations = 0;
    let skipped = 0;

    for (const session of sessions ?? []) {
      if (nowMinutes <= toMinutes(session.late_cutoff_time)) {
        skipped += 1;
        continue;
      }
      // Anggota yang terlihat oleh petugas ini (dibatasi RLS unit binaan).
      const { data: members, error: memberError } = await ctx.supabase
        .from("profiles")
        .select("id")
        .eq("status", "Aktif")
        .in("account_type", session.target_role);
      if (memberError) throw new Error(memberError.message);
      if (!members?.length) continue;

      const { data: existing, error: existingError } = await ctx.supabase
        .from("attendance_records")
        .select("user_id")
        .eq("session_id", session.id)
        .eq("attendance_date", today);
      if (existingError) throw new Error(existingError.message);
      const done = new Set((existing ?? []).map((r: any) => r.user_id));
      const missing = members.filter((m: any) => !done.has(m.id));
      if (!missing.length) continue;

      const { data: inserted, error: insertError } = await ctx.supabase
        .from("attendance_records")
        .insert(
          missing.map((m: any) => ({
            user_id: m.id,
            session_id: session.id,
            attendance_date: today,
            status: "Alfa",
            recorded_by: officer.id,
            notes: "Otomatis: tidak ada scan sampai batas telat",
          })),
        )
        .select("user_id");
      if (insertError) throw new Error(insertError.message);
      marked += inserted?.length ?? 0;

      if (session.auto_violation_on_absent && inserted?.length) {
        const { error: vError } = await ctx.supabase.from("violation_records").insert(
          inserted.map((r: any) => ({
            user_id: r.user_id,
            date: today,
            violation_title: `Alfa ${session.session_name}`,
            category: "Kedisiplinan",
            points: session.violation_points_absent,
            notes: "Otomatis dari proses alfa harian",
            recorded_by: officer.id,
            source: "auto_presensi",
          })),
        );
        if (!vError) violations += inserted.length;
      }
    }

    return { marked, violations, skipped };
  });
