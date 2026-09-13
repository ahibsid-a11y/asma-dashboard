import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACCOUNT_TYPES } from "./roles";

type Ctx = { supabase: any; userId: string };

/** Peran yang boleh mengelola presensi insidental: semua kecuali santri. */
export const INCIDENTAL_MANAGER_TYPES = ACCOUNT_TYPES.filter((r) => r !== "santri");
const EVENT_LEADERS = ["super_admin", "mudir", "kepala_sekolah"];

const EVENT_SELECT =
  "id,title,description,event_date,created_by,target_type,target_roles,target_user_ids,created_at";
const MEMBER_SELECT = "id,name,nis_nip,account_type,class,dorm,halaqoh,status";

const STATUSES = ["Hadir", "Izin", "Sakit", "Alfa"] as const;

async function managerProfile(ctx: Ctx) {
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("id,name,account_type")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !data.account_type || data.account_type === "santri") {
    throw new Error("Anda tidak memiliki akses ke Presensi Insidental");
  }
  return data as { id: string; name: string | null; account_type: string };
}

/** Klien admin dipakai hanya setelah pemanggil terbukti bukan santri, agar daftar target lengkap. */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, "Judul kegiatan minimal 3 karakter").max(160),
  description: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(1000).optional(),
  ),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  target_type: z.enum(["ROLE", "USERS"]),
  target_roles: z.array(z.enum(ACCOUNT_TYPES)).default([]),
  target_user_ids: z.array(z.string().uuid()).default([]),
});

export const listIncidentalEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const me = await managerProfile(ctx);
    const db = await admin();
    const { data, error } = await db
      .from("incidental_attendance_events")
      .select(EVENT_SELECT)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const events = (data ?? []) as any[];
    const creatorIds = [...new Set(events.map((e) => e.created_by))];
    const creators = creatorIds.length
      ? ((await db.from("profiles").select("id,name").in("id", creatorIds)).data ?? [])
      : [];
    const nameById = new Map(creators.map((c: any) => [c.id, c.name]));
    const canManageAll = EVENT_LEADERS.includes(me.account_type);
    return events.map((e) => ({
      ...e,
      creator_name: nameById.get(e.created_by) ?? "—",
      can_manage: canManageAll || e.created_by === ctx.userId,
    }));
  });

export const saveIncidentalEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => eventSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const me = await managerProfile(ctx);
    if (data.target_type === "ROLE" && data.target_roles.length === 0) {
      throw new Error("Pilih minimal satu jabatan yang wajib ikut");
    }
    if (data.target_type === "USERS" && data.target_user_ids.length === 0) {
      throw new Error("Pilih minimal satu anggota");
    }

    const payload = {
      title: data.title,
      description: data.description ?? null,
      event_date: data.event_date,
      target_type: data.target_type,
      target_roles: data.target_type === "ROLE" ? data.target_roles : [],
      target_user_ids: data.target_type === "USERS" ? data.target_user_ids : [],
    };

    const db = await admin();
    if (data.id) {
      const { data: existing, error: readError } = await db
        .from("incidental_attendance_events")
        .select("created_by")
        .eq("id", data.id)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      if (!existing) throw new Error("Kegiatan tidak ditemukan");
      if (existing.created_by !== ctx.userId && !EVENT_LEADERS.includes(me.account_type)) {
        throw new Error("Hanya pembuat kegiatan atau pimpinan yang bisa mengubah kegiatan ini");
      }
      const { error } = await db
        .from("incidental_attendance_events")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: created, error } = await db
      .from("incidental_attendance_events")
      .insert({ ...payload, created_by: ctx.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const deleteIncidentalEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const me = await managerProfile(ctx);
    const db = await admin();
    const { data: existing, error: readError } = await db
      .from("incidental_attendance_events")
      .select("created_by")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) throw new Error("Kegiatan tidak ditemukan");
    if (existing.created_by !== ctx.userId && !EVENT_LEADERS.includes(me.account_type)) {
      throw new Error("Hanya pembuat kegiatan atau pimpinan yang bisa menghapus kegiatan ini");
    }
    const { error } = await db.from("incidental_attendance_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Daftar anggota aktif untuk memilih target kegiatan. */
export const listIncidentalCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await managerProfile(ctx);
    const db = await admin();
    const { data, error } = await db
      .from("profiles")
      .select(MEMBER_SELECT)
      .eq("status", "Aktif")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });

/** Daftar anggota target sebuah kegiatan beserta status kehadirannya. */
export const listIncidentalRoster = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ event_id: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await managerProfile(ctx);
    const db = await admin();
    const { data: event, error: eventError } = await db
      .from("incidental_attendance_events")
      .select(EVENT_SELECT)
      .eq("id", data.event_id)
      .maybeSingle();
    if (eventError) throw new Error(eventError.message);
    if (!event) throw new Error("Kegiatan tidak ditemukan");

    let query = db.from("profiles").select(MEMBER_SELECT).eq("status", "Aktif");
    if (event.target_type === "ROLE") {
      query = query.in("account_type", (event.target_roles ?? []).length ? event.target_roles : ["__none__"]);
    } else {
      query = query.in("id", (event.target_user_ids ?? []).length ? event.target_user_ids : [
        "00000000-0000-0000-0000-000000000000",
      ]);
    }
    const { data: members, error: memberError } = await query.order("name", { ascending: true });
    if (memberError) throw new Error(memberError.message);

    const { data: records, error: recordError } = await db
      .from("incidental_attendance_records")
      .select("user_id,status,notes")
      .eq("event_id", data.event_id);
    if (recordError) throw new Error(recordError.message);
    const byUser = new Map((records ?? []).map((r: any) => [r.user_id, r]));

    return {
      event,
      members: (members ?? []).map((m: any) => ({
        ...m,
        status: byUser.get(m.id)?.status ?? null,
        notes: byUser.get(m.id)?.notes ?? null,
      })),
    };
  });

export const saveIncidentalAttendance = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        event_id: z.string().uuid(),
        user_id: z.string().uuid(),
        status: z.enum(STATUSES),
        notes: z.preprocess(
          (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
          z.string().trim().max(500).optional(),
        ),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await managerProfile(ctx);
    const db = await admin();
    const { error } = await db.from("incidental_attendance_records").upsert(
      {
        event_id: data.event_id,
        user_id: data.user_id,
        status: data.status,
        notes: data.notes ?? null,
        recorded_by: ctx.userId,
      },
      { onConflict: "event_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
