import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MEMBER_ADMIN_TYPES } from "./roles";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("account_type")
    .eq("id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !MEMBER_ADMIN_TYPES.includes(data.account_type)) {
    throw new Error("Anda tidak memiliki akses ke pengaturan data induk");
  }
}

const groupKind = z.enum(["class", "dorm", "halaqoh"]);

export const listOrgData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [classes, dorms, halaqohs, people] = await Promise.all([
      supabaseAdmin.from("classes").select("id,grade,name,homeroom_teacher_id").order("grade").order("name"),
      supabaseAdmin.from("dorms").select("id,name,musyrif_id").order("name"),
      supabaseAdmin.from("halaqohs").select("id,name,musyrif_id").order("name"),
      supabaseAdmin
        .from("profiles")
        .select("id,name,nis_nip,account_type,category,class,dorm,halaqoh,status")
        .order("name"),
    ]);
    const err = classes.error ?? dorms.error ?? halaqohs.error ?? people.error;
    if (err) throw new Error(err.message);

    const all = people.data ?? [];
    return {
      classes: classes.data ?? [],
      dorms: dorms.data ?? [],
      halaqohs: halaqohs.data ?? [],
      students: all.filter((p: any) => p.account_type === "santri"),
      staff: all.filter((p: any) => p.account_type !== "santri"),
    };
  });

export const saveGroup = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        kind: groupKind,
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1, "Nama wajib diisi"),
        grade: z.coerce.number().int().min(7).max(12).optional(),
        leaderId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const table = data.kind === "class" ? "classes" : data.kind === "dorm" ? "dorms" : "halaqohs";
    const column = data.kind === "class" ? "class" : data.kind === "dorm" ? "dorm" : "halaqoh";

    const fields: Record<string, unknown> = { name: data.name };
    if (data.kind === "class") {
      fields["grade"] = data.grade ?? 7;
      fields["homeroom_teacher_id"] = data.leaderId ?? null;
    } else {
      fields["musyrif_id"] = data.leaderId ?? null;
    }

    if (data.id) {
      const { data: before } = await supabaseAdmin
        .from(table)
        .select("name")
        .eq("id", data.id)
        .maybeSingle();
      const { error } = await supabaseAdmin.from(table).update(fields).eq("id", data.id);
      if (error) throw new Error(error.message);
      const oldName = (before as any)?.name as string | undefined;
      if (oldName && oldName !== data.name) {
        await supabaseAdmin.from("profiles").update({ [column]: data.name }).eq(column, oldName);
      }
      return { id: data.id };
    }

    const { data: created, error } = await supabaseAdmin
      .from(table)
      .insert(fields as any)
      .select("id")
      .maybeSingle();
    if (error) {
      throw new Error(
        error.message.includes("duplicate") ? "Nama ini sudah terdaftar" : error.message,
      );
    }
    return { id: (created as any)?.id as string };
  });

export const deleteGroup = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ kind: groupKind, id: z.string().uuid() }).parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = data.kind === "class" ? "classes" : data.kind === "dorm" ? "dorms" : "halaqohs";
    const column = data.kind === "class" ? "class" : data.kind === "dorm" ? "dorm" : "halaqoh";

    const { data: row } = await supabaseAdmin
      .from(table)
      .select("name")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin.from(table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const name = (row as any)?.name as string | undefined;
    if (name) {
      await supabaseAdmin.from("profiles").update({ [column]: null }).eq(column, name);
    }
    return { ok: true };
  });

export const setGroupMembers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        kind: groupKind,
        name: z.string().trim().min(1).nullable(),
        memberIds: z.array(z.string().uuid()).max(2000),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    if (data.memberIds.length === 0) return { updated: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const column = data.kind === "class" ? "class" : data.kind === "dorm" ? "dorm" : "halaqoh";
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ [column]: data.name })
      .in("id", data.memberIds);
    if (error) throw new Error(error.message);
    return { updated: data.memberIds.length };
  });
