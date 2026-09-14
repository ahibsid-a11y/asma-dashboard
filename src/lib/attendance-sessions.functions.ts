import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACCOUNT_TYPES } from "./roles";

const SESSION_ADMIN_TYPES = ["super_admin", "mudir", "kepala_sekolah"];

type Ctx = { supabase: any; userId: string };

async function assertSessionAdmin(context: Ctx) {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("account_type")
    .eq("id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !SESSION_ADMIN_TYPES.includes(data.account_type)) {
    throw new Error("Hanya Super Admin, Mudir, dan Kepala Sekolah yang dapat mengubah sesi presensi");
  }
}

const SELECT =
  "id,session_name,target_role,on_time_deadline,late_cutoff_time,is_exit,is_active,auto_violation_on_late,auto_violation_on_absent,violation_points_late,violation_points_absent,sort_order";

export const listAttendanceSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context as Ctx).supabase
      .from("attendance_sessions")
      .select(SELECT)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam harus HH:mm");

const sessionSchema = z.object({
  id: z.string().uuid().optional(),
  session_name: z.string().trim().min(3, "Nama sesi minimal 3 karakter"),
  target_role: z.array(z.enum(ACCOUNT_TYPES)).min(1, "Pilih minimal satu jabatan"),
  on_time_deadline: timeSchema,
  late_cutoff_time: timeSchema,
  is_exit: z.boolean().default(false),
  is_active: z.boolean().default(true),
  auto_violation_on_late: z.boolean().default(false),
  auto_violation_on_absent: z.boolean().default(false),
  violation_points_late: z.number().int().min(0).max(1000).default(0),
  violation_points_absent: z.number().int().min(0).max(1000).default(0),
});

export const saveAttendanceSession = createServerFn({ method: "POST" })
  .validator((data: unknown) => sessionSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertSessionAdmin(context as Ctx);
    const { id, ...fields } = data;
    const client = (context as Ctx).supabase;
    if (id) {
      const { error } = await client.from("attendance_sessions").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await client
      .from("attendance_sessions")
      .insert(fields)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const deleteAttendanceSession = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertSessionAdmin(context as Ctx);
    const { error } = await (context as Ctx).supabase
      .from("attendance_sessions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
