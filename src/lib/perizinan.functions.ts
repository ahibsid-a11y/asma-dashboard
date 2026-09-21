import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMemberAdmin } from "@/lib/roles";

type Ctx = { supabase: any; userId: string };

export type PermitCategory = {
  id: string;
  name: string;
  description: string | null;
  max_days: number;
  requires_uks: boolean;
  is_active: boolean;
};

export type PermitStatus =
  | "Menunggu Persetujuan"
  | "Disetujui"
  | "Ditolak"
  | "Sedang di Luar"
  | "Telah Kembali"
  | "Terlambat Kembali"
  | "Dibatalkan";

export type StudentPermit = {
  id: string;
  student_id: string;
  category_id: string | null;
  category_name: string;
  requires_uks: boolean;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  reason: string;
  destination: string | null;
  pickup_by: string | null;
  pickup_phone: string | null;
  attachment_url: string | null;
  status: PermitStatus;
  rejection_reason: string | null;
  rejected_by: string | null;
  rejector_name?: string | null;

  // Approval matrix
  approved_kurikulum: boolean;
  approved_kurikulum_by: string | null;
  approved_kurikulum_at: string | null;
  notes_kurikulum: string | null;
  approver_kurikulum_name?: string | null;

  approved_kesantrian: boolean;
  approved_kesantrian_by: string | null;
  approved_kesantrian_at: string | null;
  notes_kesantrian: string | null;
  approver_kesantrian_name?: string | null;

  approved_uks: boolean;
  approved_uks_by: string | null;
  approved_uks_at: string | null;
  notes_uks: string | null;
  approver_uks_name?: string | null;

  approved_kepsek: boolean;
  approved_kepsek_by: string | null;
  approved_kepsek_at: string | null;
  notes_kepsek: string | null;
  approver_kepsek_name?: string | null;

  // Gate tracking
  actual_checkout_at: string | null;
  checkout_officer_id: string | null;
  checkout_officer_name?: string | null;
  actual_checkin_at: string | null;
  checkin_officer_id: string | null;
  checkin_officer_name?: string | null;
  is_overdue: boolean;

  submitted_by: string;
  submitter_name?: string | null;
  created_at: string;
  updated_at: string;

  // Student info
  student_name?: string;
  student_display_name?: string;
  student_nis?: string;
  student_dorm?: string;
  student_class?: string;
  student_avatar?: string | null;
};

export const DEFAULT_PERMIT_CATEGORIES: Omit<PermitCategory, "id">[] = [
  {
    name: "Izin Sakit (Rawat Jalan / Pulang)",
    description: "Izin pengobatan intensif di rumah atau kontrol dokter/klinik/RS.",
    max_days: 7,
    requires_uks: true,
    is_active: true,
  },
  {
    name: "Keperluan Keluarga Mendesak",
    description: "Izin acara keluarga inti (pernikahan saudara kandung, musibah/takziyah).",
    max_days: 3,
    requires_uks: false,
    is_active: true,
  },
  {
    name: "Utusan Madrasah / Lomba / Dinas",
    description: "Izin dispensasi mewakili AHIBS dalam kompetisi atau kegiatan resmi.",
    max_days: 5,
    requires_uks: false,
    is_active: true,
  },
  {
    name: "Pulang Terjadwal / Libur Resmi",
    description: "Izin kepulangan berkala semester atau libur resmi yang ditetapkan pesantren.",
    max_days: 14,
    requires_uks: false,
    is_active: true,
  },
  {
    name: "Izin Keluar Sebentar (Day Pass)",
    description: "Izin keluar area pondok tanpa bermalam (max beberapa jam).",
    max_days: 1,
    requires_uks: false,
    is_active: true,
  },
];

async function ensurePermitCategories(supabaseAdmin: any): Promise<PermitCategory[]> {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("permit_categories")
      .select("id,name,description,max_days,requires_uks,is_active")
      .order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as PermitCategory[];
    }

    // Jika tabel kosong, semaikan data preset
    const { data: inserted, error: insertError } = await (supabaseAdmin as any)
      .from("permit_categories")
      .insert(DEFAULT_PERMIT_CATEGORIES)
      .select("id,name,description,max_days,requires_uks,is_active");

    if (!insertError && inserted && inserted.length > 0) {
      return inserted as PermitCategory[];
    }
  } catch (err) {
    console.warn("ensurePermitCategories fallback to static list:", err);
  }

  return DEFAULT_PERMIT_CATEGORIES.map((c, idx) => ({
    id: `pc_${idx + 1}`,
    name: c.name,
    description: c.description,
    max_days: c.max_days,
    requires_uks: c.requires_uks,
    is_active: c.is_active,
  }));
}

/** 1. Ambil daftar kategori izin */
export const getPermitCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return ensurePermitCategories(supabaseAdmin);
  });

/** 2. Kelola kategori izin (Admin) */
export const managePermitCategory = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        action: z.enum(["create", "update", "delete", "toggle"]),
        id: z.string().optional(),
        name: z.string().trim().min(3, "Nama kategori minimal 3 karakter").optional(),
        description: z.string().trim().optional().nullable(),
        max_days: z.number().int().min(1).max(60).optional(),
        requires_uks: z.boolean().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await (supabaseAdmin as any)
      .from("profiles")
      .select("account_type")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (!me || !isMemberAdmin(me.account_type)) {
      throw new Error("Hanya admin atau pimpinan yang berhak mengelola kategori izin");
    }

    const table = (supabaseAdmin as any).from("permit_categories");

    if (data.action === "create") {
      const { data: created, error } = await table
        .insert({
          name: data.name,
          description: data.description || null,
          max_days: data.max_days || 3,
          requires_uks: Boolean(data.requires_uks),
          is_active: true,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { success: true, created };
    }

    if (!data.id) throw new Error("ID kategori wajib diisi");

    if (data.action === "update") {
      const updates: Record<string, any> = {};
      if ("name" in data && data.name !== undefined) updates["name"] = data.name;
      if ("description" in data && data.description !== undefined) updates["description"] = data.description;
      if ("max_days" in data && data.max_days !== undefined) updates["max_days"] = data.max_days;
      if ("requires_uks" in data && data.requires_uks !== undefined) updates["requires_uks"] = data.requires_uks;
      if ("is_active" in data && data.is_active !== undefined) updates["is_active"] = data.is_active;

      const { data: updated, error } = await table.update(updates).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return { success: true, updated };
    }

    if (data.action === "toggle") {
      const { data: existing } = await table.select("is_active").eq("id", data.id).single();
      const next = !existing?.is_active;
      const { error } = await table.update({ is_active: next }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true, is_active: next };
    }

    if (data.action === "delete") {
      const { error } = await table.delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true, deletedId: data.id };
    }

    return { success: false };
  });

/** 3. Data konteks awal untuk form perizinan */
export const getPermitInputContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me, error: meError } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,display_name,account_type,dorm,class")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (meError || !me) {
      throw new Error("Pengguna tidak terautentikasi atau data profil tidak ditemukan");
    }

    const isSantri = me.account_type === "santri";

    // Santri aktif
    let stdQuery = (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,display_name,nis_nip,dorm,class,avatar")
      .eq("account_type", "santri")
      .eq("status", "Aktif")
      .order("name", { ascending: true });

    if (isSantri) {
      stdQuery = stdQuery.eq("id", me.id);
    } else if (me.account_type === "musyrif_asrama" && me.dorm) {
      // Musyrif asrama default santri kamarnya
      stdQuery = stdQuery.eq("dorm", me.dorm);
    }

    const { data: students, error: stdError } = await stdQuery;
    if (stdError) throw new Error(stdError.message);

    // Ambil kategori aktif
    const allCategories = await ensurePermitCategories(supabaseAdmin);
    const categories = allCategories.filter((c) => c.is_active);

    // Daftar asrama & kelas
    const { data: dormList } = await (supabaseAdmin as any)
      .from("dorms")
      .select("name")
      .order("name", { ascending: true });
    const dorms = (dormList ?? []).map((d: any) => d.name);

    // Ambil semua posisi/jabatan yang dimiliki user
    const { data: posRows } = await (supabaseAdmin as any)
      .from("profile_positions")
      .select("position")
      .eq("user_id", me.id);
    const userPositions: string[] = (posRows ?? []).map((p: any) => p.position);
    if (me.account_type && !userPositions.includes(me.account_type)) {
      userPositions.push(me.account_type);
    }

    const isMusyrif =
      (me.account_type === "musyrif_asrama" || me.account_type === "musyrif_halaqoh") &&
      !userPositions.includes("wali_kelas") &&
      !userPositions.includes("super_admin") &&
      !userPositions.includes("kabid_kesantrian");

    const isSuper = userPositions.includes("super_admin") || isMemberAdmin(me.account_type);

    // Evaluasi peran approval (Wali Kelas memberikan akses izin)
    const isWaliKelasApprover =
      userPositions.includes("wali_kelas") ||
      me.account_type === "wali_kelas" ||
      isSuper;
    const isKesantrianApprover =
      userPositions.includes("kabid_kesantrian") ||
      me.account_type === "kabid_kesantrian" ||
      isSuper;
    const isUksApprover =
      userPositions.includes("tendik") ||
      me.account_type === "tendik" ||
      isSuper;
    const isKepsekApprover =
      userPositions.includes("kepala_sekolah") ||
      userPositions.includes("mudir") ||
      userPositions.includes("super_admin") ||
      me.account_type === "kepala_sekolah" ||
      me.account_type === "mudir" ||
      me.account_type === "super_admin";

    return {
      me,
      isSantri,
      isMusyrif,
      students: students ?? [],
      categories,
      dorms,
      approverRoles: {
        canApproveKurikulum: isMusyrif ? false : isWaliKelasApprover,
        canApproveWaliKelas: isMusyrif ? false : isWaliKelasApprover,
        canApproveKesantrian: isMusyrif ? false : isKesantrianApprover,
        canApproveUks: isMusyrif ? false : isUksApprover,
        canApproveKepsek: isMusyrif ? false : isKepsekApprover,
        canPerformGateCheck: isMusyrif ? false : !isSantri,
        canManageCategories: isSuper,
      },
    };
  });

/** 4. Ajukan perizinan santri baru */
export const submitPermit = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        student_id: z.string().uuid("Pilih santri yang sah"),
        category_id: z.string().optional().nullable(),
        category_name: z.string().min(2, "Pilih kategori izin"),
        requires_uks: z.boolean().default(false),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal awal harus YYYY-MM-DD"),
        start_time: z.string().default("08:00"),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal kembali harus YYYY-MM-DD"),
        end_time: z.string().default("17:00"),
        reason: z.string().trim().min(5, "Alasan izin minimal 5 karakter"),
        destination: z.string().trim().optional().nullable(),
        pickup_by: z.string().trim().optional().nullable(),
        pickup_phone: z.string().trim().optional().nullable(),
        attachment_url: z.string().trim().optional().nullable(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Cek batas tanggal
    if (data.end_date < data.start_date) {
      throw new Error("Tanggal kembali tidak boleh mendahului tanggal berangkat");
    }

    // Apabila izin sakit, WAJIB memerlukan approval pihak UKS
    const isSakit = data.category_name.toLowerCase().includes("sakit");
    const requiresUks = Boolean(data.requires_uks || isSakit);

    const { data: created, error } = await (supabaseAdmin as any)
      .from("student_permits")
      .insert({
        student_id: data.student_id,
        category_id: data.category_id || null,
        category_name: data.category_name,
        requires_uks: requiresUks,
        start_date: data.start_date,
        start_time: data.start_time,
        end_date: data.end_date,
        end_time: data.end_time,
        reason: data.reason,
        destination: data.destination || null,
        pickup_by: data.pickup_by || null,
        pickup_phone: data.pickup_phone || null,
        attachment_url: data.attachment_url || null,
        status: "Menunggu Persetujuan",
        submitted_by: ctx.userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, permit: created };
  });

/** 5. Persetujuan atau Penolakan Izin (Approval Matrix) */
export const approveOrRejectPermit = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        permit_id: z.string().uuid(),
        decision: z.enum(["approve", "reject"]),
        approval_type: z.enum(["kurikulum", "kesantrian", "uks", "kepsek", "all_in_one"]),
        notes: z.string().trim().optional(),
        rejection_reason: z.string().trim().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,account_type")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (!me || me.account_type === "santri") {
      throw new Error("Santri tidak memiliki wewenang menyetujui izin");
    }

    const { data: posRows } = await (supabaseAdmin as any)
      .from("profile_positions")
      .select("position")
      .eq("user_id", me.id);
    const userPositions: string[] = (posRows ?? []).map((p: any) => p.position);
    if (me.account_type && !userPositions.includes(me.account_type)) {
      userPositions.push(me.account_type);
    }
    const isOnlyMusyrif =
      (me.account_type === "musyrif_asrama" || me.account_type === "musyrif_halaqoh") &&
      !userPositions.includes("wali_kelas") &&
      !userPositions.includes("super_admin") &&
      !userPositions.includes("kabid_kesantrian");

    if (isOnlyMusyrif) {
      throw new Error("Akun musyrif hanya dapat melihat data santri yang izin");
    }

    const { data: permit, error: fetchErr } = await (supabaseAdmin as any)
      .from("student_permits")
      .select("*")
      .eq("id", data.permit_id)
      .maybeSingle();

    if (fetchErr || !permit) {
      throw new Error("Data perizinan tidak ditemukan");
    }

    const nowIso = new Date().toISOString();

    // Jika keputusan TOLAK
    if (data.decision === "reject") {
      if (!data.rejection_reason?.trim()) {
        throw new Error("Alasan penolakan wajib diisi");
      }
      const { error: rejectErr } = await (supabaseAdmin as any)
        .from("student_permits")
        .update({
          status: "Ditolak",
          rejection_reason: data.rejection_reason.trim(),
          rejected_by: me.id,
          updated_at: nowIso,
        })
        .eq("id", data.permit_id);

      if (rejectErr) throw new Error(rejectErr.message);
      return { success: true, status: "Ditolak" };
    }

    // Jika keputusan SETUJUI
    const updates: Record<string, any> = { updated_at: nowIso };

    // Tentukan flag persetujuan mana yang diaktifkan
    const isSuper = isMemberAdmin(me.account_type) || me.account_type === "mudir";

    if (data.approval_type === "all_in_one" && isSuper) {
      // Super admin / Mudir bisa sign-off penuh secara langsung
      updates["approved_kurikulum"] = true;
      updates["approved_kurikulum_by"] = me.id;
      updates["approved_kurikulum_at"] = nowIso;
      updates["notes_kurikulum"] = data.notes || "Disetujui pimpinan";

      updates["approved_kesantrian"] = true;
      updates["approved_kesantrian_by"] = me.id;
      updates["approved_kesantrian_at"] = nowIso;
      updates["notes_kesantrian"] = data.notes || "Disetujui pimpinan";

      if (permit.requires_uks) {
        updates["approved_uks"] = true;
        updates["approved_uks_by"] = me.id;
        updates["approved_uks_at"] = nowIso;
        updates["notes_uks"] = data.notes || "Disetujui pimpinan";
      }

      updates["approved_kepsek"] = true;
      updates["approved_kepsek_by"] = me.id;
      updates["approved_kepsek_at"] = nowIso;
      updates["notes_kepsek"] = data.notes || "Disetujui pimpinan";
    } else if (data.approval_type === "kurikulum" || (data.approval_type as string) === "wali_kelas") {
      updates["approved_kurikulum"] = true;
      updates["approved_kurikulum_by"] = me.id;
      updates["approved_kurikulum_at"] = nowIso;
      if (data.notes) updates["notes_kurikulum"] = data.notes;
    } else if (data.approval_type === "kesantrian") {
      updates["approved_kesantrian"] = true;
      updates["approved_kesantrian_by"] = me.id;
      updates["approved_kesantrian_at"] = nowIso;
      if (data.notes) updates["notes_kesantrian"] = data.notes;
    } else if (data.approval_type === "uks") {
      updates["approved_uks"] = true;
      updates["approved_uks_by"] = me.id;
      updates["approved_uks_at"] = nowIso;
      if (data.notes) updates["notes_uks"] = data.notes;
    } else if (data.approval_type === "kepsek") {
      updates["approved_kepsek"] = true;
      updates["approved_kepsek_by"] = me.id;
      updates["approved_kepsek_at"] = nowIso;
      if (data.notes) updates["notes_kepsek"] = data.notes;
    }

    // Evaluasi apakah SEMUA persetujuan wajib sudah lengkap
    const kurikulumDone = updates["approved_kurikulum"] ?? permit.approved_kurikulum;
    const kesantrianDone = updates["approved_kesantrian"] ?? permit.approved_kesantrian;
    const kepsekDone = updates["approved_kepsek"] ?? permit.approved_kepsek;

    // Apabila izin sakit atau requires_uks, UKS wajib approve sebelum berstatus 'Disetujui'
    const isSakit = (permit.category_name || "").toLowerCase().includes("sakit") || permit.requires_uks;
    const uksDone = isSakit
      ? (updates["approved_uks"] ?? permit.approved_uks)
      : true;

    if (kurikulumDone && kesantrianDone && kepsekDone && uksDone) {
      updates["status"] = "Disetujui";
    }

    const { error: updateErr } = await (supabaseAdmin as any)
      .from("student_permits")
      .update(updates)
      .eq("id", data.permit_id);

    if (updateErr) throw new Error(updateErr.message);

    return {
      success: true,
      status: updates["status"] || permit.status,
      isFullyApproved: Boolean(kurikulumDone && kesantrianDone && kepsekDone && uksDone),
    };
  });

/** 6. Catat Check-Out (Berangkat Keluar) & Check-In (Tiba Kembali) di Pos Gerbang */
export const recordGateCheck = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        permit_id: z.string().uuid(),
        action: z.enum(["checkout", "checkin"]),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,account_type")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (!me || me.account_type === "santri") {
      throw new Error("Santri tidak dapat mencatat check-in/check-out gerbang");
    }

    const { data: posRows } = await (supabaseAdmin as any)
      .from("profile_positions")
      .select("position")
      .eq("user_id", me.id);
    const userPositions: string[] = (posRows ?? []).map((p: any) => p.position);
    if (me.account_type && !userPositions.includes(me.account_type)) {
      userPositions.push(me.account_type);
    }
    const isOnlyMusyrif =
      (me.account_type === "musyrif_asrama" || me.account_type === "musyrif_halaqoh") &&
      !userPositions.includes("wali_kelas") &&
      !userPositions.includes("super_admin") &&
      !userPositions.includes("kabid_kesantrian");

    if (isOnlyMusyrif) {
      throw new Error("Akun musyrif hanya dapat melihat data santri yang izin");
    }

    const { data: permit, error: fetchErr } = await (supabaseAdmin as any)
      .from("student_permits")
      .select("*")
      .eq("id", data.permit_id)
      .maybeSingle();

    if (fetchErr || !permit) {
      throw new Error("Data perizinan tidak ditemukan");
    }

    const now = new Date();
    const nowIso = now.toISOString();

    if (data.action === "checkout") {
      if (permit.status !== "Disetujui") {
        throw new Error("Hanya izin yang berstatus 'Disetujui' yang dapat dicatat keluar");
      }

      const { error } = await (supabaseAdmin as any)
        .from("student_permits")
        .update({
          status: "Sedang di Luar",
          actual_checkout_at: nowIso,
          checkout_officer_id: me.id,
          updated_at: nowIso,
        })
        .eq("id", data.permit_id);

      if (error) throw new Error(error.message);
      return { success: true, status: "Sedang di Luar" };
    }

    if (data.action === "checkin") {
      // Periksa apakah waktu tiba melewati batas jadwal kembali
      const scheduledEndTime = new Date(
        `${permit.end_date}T${permit.end_time || "17:00"}:00+07:00`,
      );
      const isOverdue = now > scheduledEndTime;
      const nextStatus: PermitStatus = isOverdue ? "Terlambat Kembali" : "Telah Kembali";

      const { error } = await (supabaseAdmin as any)
        .from("student_permits")
        .update({
          status: nextStatus,
          actual_checkin_at: nowIso,
          checkin_officer_id: me.id,
          is_overdue: isOverdue,
          updated_at: nowIso,
        })
        .eq("id", data.permit_id);

      if (error) throw new Error(error.message);
      return { success: true, status: nextStatus, isOverdue };
    }

    return { success: false };
  });

/** 7. Rekapitulasi & Analitik Perizinan Santri */
export const getPermitSummary = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        period: z.enum(["hari_ini", "pekan_ini", "bulan_ini", "semester", "semua"]).default("bulan_ini"),
        status: z.string().optional(),
        category: z.string().optional(),
        dorm: z.string().optional(),
        class: z.string().optional(),
        search: z.string().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,account_type,dorm")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (!me) throw new Error("Akses tidak sah");

    // 1. Ambil seluruh profil santri
    let stdQuery = (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,display_name,nis_nip,dorm,class,avatar")
      .eq("account_type", "santri");

    if (me.account_type === "santri") {
      stdQuery = stdQuery.eq("id", me.id);
    } else if (me.account_type === "musyrif_asrama" && me.dorm && (!data.dorm || data.dorm === "semua")) {
      stdQuery = stdQuery.eq("dorm", me.dorm);
    } else if (data.dorm && data.dorm !== "semua") {
      stdQuery = stdQuery.eq("dorm", data.dorm);
    }

    if (data.class && data.class !== "semua") {
      stdQuery = stdQuery.eq("class", data.class);
    }

    const { data: students } = await stdQuery;
    const studentMap = new Map<string, any>();
    const studentIds: string[] = [];
    for (const s of students ?? []) {
      studentMap.set(s.id, s);
      studentIds.push(s.id);
    }

    if (studentIds.length === 0) {
      return {
        totalPermits: 0,
        pendingCount: 0,
        approvedCount: 0,
        currentlyOutCount: 0,
        returnedCount: 0,
        overdueCount: 0,
        rejectedCount: 0,
        categoryStats: [],
        monthlyTrend: [],
        frequentStudents: [],
        permits: [],
      };
    }

    // 2. Filter Tanggal
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    let start: string | undefined;
    let end: string | undefined;

    if (data.period === "hari_ini") {
      start = todayStr;
      end = todayStr;
    } else if (data.period === "pekan_ini") {
      const d = new Date(now);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day + 1);
      start = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      end = todayStr;
    } else if (data.period === "bulan_ini") {
      start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      end = todayStr;
    } else if (data.period === "semester") {
      const month = now.getMonth() + 1;
      const semStart = month <= 6 ? 1 : 7;
      start = `${now.getFullYear()}-${pad(semStart)}-01`;
      end = todayStr;
    }

    // 3. Query student_permits
    let permitQuery = (supabaseAdmin as any)
      .from("student_permits")
      .select("*")
      .in("student_id", studentIds)
      .order("created_at", { ascending: false });

    if (start) permitQuery = permitQuery.gte("start_date", start);
    if (end) permitQuery = permitQuery.lte("start_date", end);

    if (data.status && data.status !== "semua") {
      permitQuery = permitQuery.eq("status", data.status);
    }
    if (data.category && data.category !== "semua") {
      permitQuery = permitQuery.eq("category_name", data.category);
    }

    const { data: permitsRaw, error: pErr } = await permitQuery;
    if (pErr) throw new Error(pErr.message);

    // 4. Kumpulkan profil pejabat terkait (approver, submitter, officer)
    const officerIds = new Set<string>();
    for (const p of permitsRaw ?? []) {
      if (p.approved_kurikulum_by) officerIds.add(p.approved_kurikulum_by);
      if (p.approved_kesantrian_by) officerIds.add(p.approved_kesantrian_by);
      if (p.approved_uks_by) officerIds.add(p.approved_uks_by);
      if (p.approved_kepsek_by) officerIds.add(p.approved_kepsek_by);
      if (p.rejected_by) officerIds.add(p.rejected_by);
      if (p.checkout_officer_id) officerIds.add(p.checkout_officer_id);
      if (p.checkin_officer_id) officerIds.add(p.checkin_officer_id);
      if (p.submitted_by) officerIds.add(p.submitted_by);
    }

    const officerMap = new Map<string, string>();
    if (officerIds.size > 0) {
      const { data: officers } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id,name")
        .in("id", Array.from(officerIds));
      for (const o of officers ?? []) {
        officerMap.set(o.id, o.name);
      }
    }

    // 5. Olah data statistik
    let pendingCount = 0;
    let approvedCount = 0;
    let currentlyOutCount = 0;
    let returnedCount = 0;
    let overdueCount = 0;
    let rejectedCount = 0;

    const categoryCounts: Record<string, number> = {};
    const monthlyData: Record<string, { month: string; count: number }> = {};
    const studentPermitCounts: Record<string, { student: any; count: number; lastDate: string }> = {};

    const formattedPermits: StudentPermit[] = [];
    const searchKeyword = data.search?.trim().toLowerCase() || "";

    for (const p of permitsRaw ?? []) {
      const std = studentMap.get(p.student_id) || {
        id: p.student_id,
        name: "Santri",
        dorm: "-",
        class: "-",
      };

      // Filter search
      if (searchKeyword) {
        const matchName = std.name?.toLowerCase().includes(searchKeyword);
        const matchNis = std.nis_nip?.toLowerCase().includes(searchKeyword);
        const matchReason = p.reason?.toLowerCase().includes(searchKeyword);
        const matchCat = p.category_name?.toLowerCase().includes(searchKeyword);
        if (!matchName && !matchNis && !matchReason && !matchCat) {
          continue;
        }
      }

      // Hitung KPI
      if (p.status === "Menunggu Persetujuan") pendingCount++;
      else if (p.status === "Disetujui") approvedCount++;
      else if (p.status === "Sedang di Luar") currentlyOutCount++;
      else if (p.status === "Telah Kembali") returnedCount++;
      else if (p.status === "Terlambat Kembali") overdueCount++;
      else if (p.status === "Ditolak") rejectedCount++;

      // Sebaran kategori
      const catName = p.category_name || "Lainnya";
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;

      // Tren bulanan
      const mKey = (p.start_date || todayStr).substring(0, 7);
      if (!monthlyData[mKey]) {
        const [y, m] = mKey.split("-");
        const monthNames = [
          "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
          "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
        ];
        const label = `${monthNames[Number(m) - 1]} ${y}`;
        monthlyData[mKey] = { month: label, count: 0 };
      }
      monthlyData[mKey]!.count += 1;

      // Frekuensi santri
      if (!studentPermitCounts[p.student_id]) {
        studentPermitCounts[p.student_id] = {
          student: std,
          count: 0,
          lastDate: p.start_date,
        };
      }
      studentPermitCounts[p.student_id]!.count += 1;
      if (p.start_date > studentPermitCounts[p.student_id]!.lastDate) {
        studentPermitCounts[p.student_id]!.lastDate = p.start_date;
      }

      formattedPermits.push({
        ...p,
        student_name: std.name,
        student_display_name: std.display_name || std.name,
        student_nis: std.nis_nip || "-",
        student_dorm: std.dorm || "-",
        student_class: std.class || "-",
        student_avatar: std.avatar || null,
        submitter_name: officerMap.get(p.submitted_by) || "Pemohon",
        rejector_name: p.rejected_by ? officerMap.get(p.rejected_by) || null : null,
        approver_kurikulum_name: p.approved_kurikulum_by
          ? officerMap.get(p.approved_kurikulum_by) || null
          : null,
        approver_kesantrian_name: p.approved_kesantrian_by
          ? officerMap.get(p.approved_kesantrian_by) || null
          : null,
        approver_uks_name: p.approved_uks_by
          ? officerMap.get(p.approved_uks_by) || null
          : null,
        approver_kepsek_name: p.approved_kepsek_by
          ? officerMap.get(p.approved_kepsek_by) || null
          : null,
        checkout_officer_name: p.checkout_officer_id
          ? officerMap.get(p.checkout_officer_id) || null
          : null,
        checkin_officer_name: p.checkin_officer_id
          ? officerMap.get(p.checkin_officer_id) || null
          : null,
      });
    }

    const categoryColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
    const categoryStats = Object.keys(categoryCounts).map((cat, idx) => ({
      category: cat,
      count: categoryCounts[cat] || 0,
      color: categoryColors[idx % categoryColors.length],
    }));

    const monthlyTrend = Object.keys(monthlyData)
      .sort()
      .slice(-6)
      .map((k) => monthlyData[k]!);

    const frequentStudents = Object.values(studentPermitCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalPermits: formattedPermits.length,
      pendingCount,
      approvedCount,
      currentlyOutCount,
      returnedCount,
      overdueCount,
      rejectedCount,
      categoryStats,
      monthlyTrend,
      frequentStudents,
      permits: formattedPermits,
    };
  });

/** 8. Ambil data izin untuk akun santri yang sedang login */
export const getMyPermits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,display_name,nis_nip,dorm,class,avatar")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (!me) throw new Error("Santri tidak ditemukan");

    const { data: permits, error } = await (supabaseAdmin as any)
      .from("student_permits")
      .select("*")
      .eq("student_id", me.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return {
      student: me,
      permits: (permits ?? []) as StudentPermit[],
    };
  });

/** 9. Ambil jumlah notifikasi antrean approval untuk peran yang sedang login */
export const getPendingPermitApprovalsCountFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,account_type,class")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (!me || me.account_type === "santri") {
      return { count: 0, totalPending: 0 };
    }

    const { data: pendingPermits } = await (supabaseAdmin as any)
      .from("student_permits")
      .select("id,student_id,category_name,requires_uks,approved_kurikulum,approved_kesantrian,approved_uks,approved_kepsek,status")
      .eq("status", "Menunggu Persetujuan");

    const list = pendingPermits || [];
    let myActionNeeded = 0;
    const role = me.account_type;
    const isSuper = isMemberAdmin(role);

    for (const p of list) {
      const isSakit = (p.category_name || "").toLowerCase().includes("sakit") || p.requires_uks;
      if ((role === "wali_kelas" || isSuper) && !p.approved_kurikulum) {
        myActionNeeded++;
      } else if ((role === "kabid_kesantrian" || isSuper) && !p.approved_kesantrian) {
        myActionNeeded++;
      } else if ((role === "tendik" || isSuper) && isSakit && !p.approved_uks) {
        myActionNeeded++;
      } else if ((role === "kepala_sekolah" || role === "mudir" || isSuper) && !p.approved_kepsek) {
        myActionNeeded++;
      }
    }

    return {
      count: myActionNeeded,
      totalPending: list.length,
    };
  });
