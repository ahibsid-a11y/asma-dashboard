import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMemberAdmin } from "@/lib/roles";

type Ctx = { supabase: any; userId: string };

export type ViolationCategory = "Ringan" | "Sedang" | "Berat";

export type ViolationType = {
  id: string;
  title: string;
  category: ViolationCategory;
  points: number;
  default_penalty: string | null;
  is_active: boolean;
};

export type SpTier = "Aman" | "SP 1" | "SP 2" | "SP 3";

export type SpStatusInfo = {
  tier: SpTier;
  label: string;
  colorClass: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  bgClass: string;
  description: string;
};

export function getSpStatusTier(points: number): SpStatusInfo {
  if (points >= 76) {
    return {
      tier: "SP 3",
      label: "SP 3 (Kritis / Sidang)",
      colorClass: "text-rose-700 dark:text-rose-400",
      badgeVariant: "destructive",
      bgClass: "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900",
      description: "Poin akumulasi ≥ 76. Terancam sidang pleno / dikembalikan ke orang tua.",
    };
  }
  if (points >= 51) {
    return {
      tier: "SP 2",
      label: "SP 2 (Peringatan Keras)",
      colorClass: "text-amber-700 dark:text-amber-400",
      badgeVariant: "destructive",
      bgClass: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900",
      description: "Poin akumulasi 51–75. Surat Peringatan 2 & skorsing bertahap.",
    };
  }
  if (points >= 26) {
    return {
      tier: "SP 1",
      label: "SP 1 (Peringatan Pertama)",
      colorClass: "text-yellow-700 dark:text-yellow-500",
      badgeVariant: "secondary",
      bgClass: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/40 dark:border-yellow-900",
      description: "Poin akumulasi 26–50. Surat Peringatan 1 & pemanggilan wali.",
    };
  }
  return {
    tier: "Aman",
    label: "Aman (Disiplin)",
    colorClass: "text-emerald-700 dark:text-emerald-400",
    badgeVariant: "outline",
    bgClass: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900",
    description: "Poin akumulasi 0–25. Status kedisiplinan terjaga dengan baik.",
  };
}

export const DEFAULT_VIOLATION_TYPES: Omit<ViolationType, "id">[] = [
  // Ringan (2 - 5 poin)
  {
    title: "Terlambat shalat berjamaah / halaqoh",
    category: "Ringan",
    points: 3,
    default_penalty: "Nasihat & hafalan doa setelah shalat",
    is_active: true,
  },
  {
    title: "Pakaian / seragam tidak rapi atau tidak sesuai ketentuan",
    category: "Ringan",
    points: 2,
    default_penalty: "Teguran lisan & merapikan pakaian",
    is_active: true,
  },
  {
    title: "Membuang sampah sembarangan di asrama / sekolah",
    category: "Ringan",
    points: 3,
    default_penalty: "Piket kebersihan area selama 1 hari",
    is_active: true,
  },
  {
    title: "Keluar kamar asrama melebihi jam malam tanpa izin",
    category: "Ringan",
    points: 5,
    default_penalty: "Piket kebersihan asrama",
    is_active: true,
  },
  {
    title: "Berbicara tidak sopan atau berteriak di asrama",
    category: "Ringan",
    points: 3,
    default_penalty: "Membaca istighfar 100x & nasihat musyrif",
    is_active: true,
  },
  {
    title: "Kamar tidur atau ranjang tidak dirapikan saat inspeksi",
    category: "Ringan",
    points: 3,
    default_penalty: "Merapikan kamar & pembersihan ranjang mandiri",
    is_active: true,
  },

  // Sedang (10 - 25 poin)
  {
    title: "Tidak mengikuti shalat berjamaah tanpa uzur syari",
    category: "Sedang",
    points: 10,
    default_penalty: "Hafalan surat pendek & piket masjid",
    is_active: true,
  },
  {
    title: "Membawa alat elektronik / HP tanpa izin resmi",
    category: "Sedang",
    points: 15,
    default_penalty: "Penyitaan barang 1 pekan & penandatanganan surat janji",
    is_active: true,
  },
  {
    title: "Bolos / meninggalkan kegiatan KBM atau tahfidz",
    category: "Sedang",
    points: 15,
    default_penalty: "Menambah jam halaqoh mandiri & tugas resume materi",
    is_active: true,
  },
  {
    title: "Merusak fasilitas pondok atau sarana asrama",
    category: "Sedang",
    points: 20,
    default_penalty: "Mengganti/memperbaiki kerusakan & kerja bakti fasilitas",
    is_active: true,
  },
  {
    title: "Berkelahi atau intimidasi / bullying ringan",
    category: "Sedang",
    points: 25,
    default_penalty: "Konseling kesiswaan & surat pernyataan bermaterai",
    is_active: true,
  },
  {
    title: "Membeli makanan di luar area pondok tanpa izin",
    category: "Sedang",
    points: 10,
    default_penalty: "Nasihat kesiswaan & piket dapur",
    is_active: true,
  },

  // Berat (50 - 100 poin)
  {
    title: "Membawa, menyimpan, atau merokok / rokok elektrik (vape)",
    category: "Berat",
    points: 50,
    default_penalty: "Surat Peringatan 1 (SP 1) & pemanggilan orang tua / wali",
    is_active: true,
  },
  {
    title: "Kabur / keluar dari lingkungan pesantren tanpa izin resmi",
    category: "Berat",
    points: 50,
    default_penalty: "Surat Peringatan 1 (SP 1) & masa pemantauan ketat",
    is_active: true,
  },
  {
    title: "Tindak kekerasan fisik atau perundungan (bullying) berat",
    category: "Berat",
    points: 75,
    default_penalty: "Surat Peringatan 2 (SP 2) & skorsing 1 pekan",
    is_active: true,
  },
  {
    title: "Tindakan asusila, pencurian, atau pelanggaran hukum pidana",
    category: "Berat",
    points: 100,
    default_penalty: "Surat Peringatan 3 (SP 3) & sidang dewan guru pengasuh",
    is_active: true,
  },
];

async function ensureViolationCatalog(supabaseAdmin: any): Promise<ViolationType[]> {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("violation_types")
      .select("id,title,category,points,default_penalty,is_active")
      .order("points", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as ViolationType[];
    }

    // Jika tabel kosong, semaikan data preset
    const { data: inserted, error: insertError } = await (supabaseAdmin as any)
      .from("violation_types")
      .insert(DEFAULT_VIOLATION_TYPES)
      .select("id,title,category,points,default_penalty,is_active");

    if (!insertError && inserted && inserted.length > 0) {
      return inserted as ViolationType[];
    }
  } catch (err) {
    console.warn("ensureViolationCatalog fallback to static list:", err);
  }

  return DEFAULT_VIOLATION_TYPES.map((item, idx) => ({
    id: `vt_${idx + 1}`,
    title: item.title,
    category: item.category as ViolationCategory,
    points: item.points,
    default_penalty: item.default_penalty,
    is_active: item.is_active,
  }));
}

/** 1. Ambil katalog jenis pelanggaran */
export const getViolationTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return ensureViolationCatalog(supabaseAdmin);
  });

/** 2. Kelola katalog jenis pelanggaran (tambah / ubah / hapus / aktifkan) */
export const manageViolationType = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        action: z.enum(["create", "update", "delete", "toggle"]),
        id: z.string().optional(),
        title: z.string().trim().min(3, "Nama pelanggaran minimal 3 karakter").optional(),
        category: z.enum(["Ringan", "Sedang", "Berat"]).optional(),
        points: z.number().int().min(1).max(200).optional(),
        default_penalty: z.string().trim().optional().nullable(),
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
      throw new Error("Hanya admin atau pimpinan yang berhak mengelola katalog pelanggaran");
    }

    const table = (supabaseAdmin as any).from("violation_types");

    if (data.action === "create") {
      const { data: created, error } = await table
        .insert({
          title: data.title,
          category: data.category || "Ringan",
          points: data.points || 5,
          default_penalty: data.default_penalty || null,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { success: true, created };
    }

    if (!data.id) throw new Error("ID pelanggaran wajib diisi");

    if (data.action === "update") {
      const updates: Record<string, any> = {};
      if ("title" in data && data.title !== undefined) updates["title"] = data.title;
      if ("category" in data && data.category !== undefined) updates["category"] = data.category;
      if ("points" in data && data.points !== undefined) updates["points"] = data.points;
      if ("default_penalty" in data && data.default_penalty !== undefined) updates["default_penalty"] = data.default_penalty;
      if ("is_active" in data && data.is_active !== undefined) updates["is_active"] = data.is_active;

      const { data: updated, error } = await table
        .update(updates)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { success: true, updated };
    }

    if (data.action === "toggle") {
      const { data: existing } = await table.select("is_active").eq("id", data.id).single();
      const nextActive = !existing?.is_active;
      const { error } = await table.update({ is_active: nextActive }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true, is_active: nextActive };
    }

    if (data.action === "delete") {
      const { error } = await table.delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true, deletedId: data.id };
    }

    return { success: false };
  });

/** 3. Data konteks awal untuk form pencatatan pelanggaran */
export const getViolationInputContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me, error: meError } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,account_type,dorm,class")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (meError || !me) {
      throw new Error("Pengguna tidak terautentikasi atau data profil tidak ditemukan");
    }

    if (me.account_type === "santri") {
      throw new Error("Santri tidak memiliki akses untuk mencatat pelanggaran");
    }

    // Ambil semua santri aktif
    const { data: students, error: stdError } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,display_name,nis_nip,dorm,class,avatar")
      .eq("account_type", "santri")
      .eq("status", "Aktif")
      .order("name", { ascending: true });

    if (stdError) throw new Error(stdError.message);

    // Ambil daftar asrama dan kelas unik
    const dormSet = new Set<string>();
    const classSet = new Set<string>();

    for (const s of students ?? []) {
      if (s.dorm) dormSet.add(s.dorm);
      if (s.class) classSet.add(s.class);
    }

    const { data: dormRows } = await (supabaseAdmin as any)
      .from("dorms")
      .select("name")
      .order("name", { ascending: true });
    for (const d of dormRows ?? []) {
      if (d.name) dormSet.add(d.name);
    }

    const catalog = await ensureViolationCatalog(supabaseAdmin);
    const activeCatalog = catalog.filter((c) => c.is_active);

    return {
      me,
      students: students ?? [],
      dorms: Array.from(dormSet).sort(),
      classes: Array.from(classSet).sort(),
      catalog: activeCatalog,
      canManageCatalog: isMemberAdmin(me.account_type),
    };
  });

/** 4. Catat pelanggaran santri (mendukung multi-santri sekaligus) */
export const recordViolation = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        student_ids: z.array(z.string().uuid()).min(1, "Pilih minimal 1 santri"),
        violation_title: z.string().trim().min(3, "Nama pelanggaran wajib diisi"),
        category: z.enum(["Ringan", "Sedang", "Berat"]),
        points: z.number().int().min(1, "Poin minimal 1"),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
        penalty: z.string().trim().optional(),
        notes: z.string().trim().optional(),
        status: z.enum(["Perlu Pembinaan", "Dalam Pembinaan", "Selesai"]).default("Selesai"),
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
      throw new Error("Anda tidak memiliki wewenang untuk mencatat pelanggaran");
    }

    const nowIso = new Date().toISOString();
    const rowsToInsert = data.student_ids.map((studentId) => ({
      user_id: studentId,
      date: data.date,
      violation_title: data.violation_title,
      category: data.category,
      points: data.points,
      notes: data.notes || null,
      penalty: data.penalty || null,
      status: data.status,
      recorded_by: me.id,
      source: "manual",
      created_at: nowIso,
      updated_at: nowIso,
    }));

    try {
      const { data: inserted, error } = await (supabaseAdmin as any)
        .from("violation_records")
        .insert(rowsToInsert)
        .select();

      if (error) {
        // Jika kolom penalty atau status belum tersedia di remote DB, fallback tanpa kolom tersebut
        if (error.message.includes("penalty") || error.message.includes("status")) {
          const fallbackRows = rowsToInsert.map((r) => {
            const combinedNotes = [
              r.notes,
              r.penalty ? `[Tindakan: ${r.penalty}]` : null,
              `[Status: ${r.status}]`,
            ]
              .filter(Boolean)
              .join(" | ");

            return {
              user_id: r.user_id,
              date: r.date,
              violation_title: r.violation_title,
              category: r.category,
              points: r.points,
              notes: combinedNotes || null,
              recorded_by: r.recorded_by,
              source: r.source,
              created_at: r.created_at,
              updated_at: r.updated_at,
            };
          });

          const { error: fallbackError } = await (supabaseAdmin as any)
            .from("violation_records")
            .insert(fallbackRows);

          if (fallbackError) throw new Error(fallbackError.message);
          return { success: true, count: fallbackRows.length };
        }
        throw new Error(error.message);
      }

      return { success: true, count: inserted?.length ?? rowsToInsert.length };
    } catch (err: any) {
      throw new Error(err.message || "Gagal mencatat pelanggaran santri");
    }
  });

/** 5. Hapus catatan pelanggaran */
export const deleteViolationRecord = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        record_id: z.string().uuid("ID catatan tidak valid"),
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
      throw new Error("Tidak memiliki wewenang untuk menghapus pelanggaran");
    }

    const { data: record, error: recError } = await (supabaseAdmin as any)
      .from("violation_records")
      .select("id,recorded_by")
      .eq("id", data.record_id)
      .maybeSingle();

    if (recError || !record) {
      throw new Error("Catatan pelanggaran tidak ditemukan");
    }

    const canDelete = isMemberAdmin(me.account_type) || record.recorded_by === me.id;
    if (!canDelete) {
      throw new Error("Hanya admin atau pencatat pelanggaran yang dapat menghapus data ini");
    }

    const { error: delError } = await (supabaseAdmin as any)
      .from("violation_records")
      .delete()
      .eq("id", data.record_id);

    if (delError) throw new Error(delError.message);
    return { success: true };
  });

/** 6. Perbarui status tindak lanjut pembinaan santri */
export const updateViolationStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        record_id: z.string().uuid(),
        status: z.enum(["Perlu Pembinaan", "Dalam Pembinaan", "Selesai"]),
        penalty: z.string().trim().optional(),
        notes: z.string().trim().optional(),
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
      throw new Error("Santri tidak dapat mengubah status pembinaan");
    }

    const updates: Record<string, any> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if ("penalty" in data && data.penalty !== undefined) updates["penalty"] = data.penalty;
    if ("notes" in data && data.notes !== undefined) updates["notes"] = data.notes;

    try {
      const { error } = await (supabaseAdmin as any)
        .from("violation_records")
        .update(updates)
        .eq("id", data.record_id);

      if (error) {
        // Fallback jika status column belum ada
        if (error.message.includes("status")) {
          const appendNote = ` [Status: ${data.status}]`;
          const { error: fErr } = await (supabaseAdmin as any)
            .from("violation_records")
            .update({ notes: (data.notes || "") + appendNote })
            .eq("id", data.record_id);
          if (fErr) throw new Error(fErr.message);
          return { success: true };
        }
        throw new Error(error.message);
      }
      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Gagal memperbarui status pembinaan");
    }
  });

/** 7. Rekapitulasi pelanggaran santri (analitik, grafik, dan daftar terperinci) */
export const getViolationSummary = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        period: z.enum(["hari_ini", "pekan_ini", "bulan_ini", "semester", "semua", "custom"]).default("bulan_ini"),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        dorm: z.string().optional(),
        class: z.string().optional(),
        category: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Validasi profil pengguna
    const { data: me } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,account_type,dorm")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (!me) throw new Error("Akses tidak sah");

    // Ambil profil seluruh santri aktif
    let stdQuery = (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,display_name,nis_nip,dorm,class,avatar")
      .eq("account_type", "santri");

    // Jika musyrif asrama, batasi santri default ke asramanya
    let activeDorm = data.dorm || null;
    if (me.account_type === "musyrif_asrama" && me.dorm && !activeDorm) {
      activeDorm = me.dorm;
    }

    if (activeDorm && activeDorm !== "semua") {
      stdQuery = stdQuery.eq("dorm", activeDorm);
    }
    if (data.class && data.class !== "semua") {
      stdQuery = stdQuery.eq("class", data.class);
    }

    const { data: studentList, error: stdError } = await stdQuery;
    if (stdError) throw new Error(stdError.message);

    const studentMap = new Map<string, any>();
    const studentIds: string[] = [];
    for (const s of studentList ?? []) {
      studentMap.set(s.id, s);
      studentIds.push(s.id);
    }

    // Ambil daftar asrama & kelas untuk filter
    const { data: dormList } = await (supabaseAdmin as any)
      .from("dorms")
      .select("name")
      .order("name", { ascending: true });

    const availableDorms = (dormList ?? []).map((d: any) => d.name);

    // Filter tanggal
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    let start = data.startDate;
    let end = data.endDate;

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
      const semStartMonth = month <= 6 ? 1 : 7;
      start = `${now.getFullYear()}-${pad(semStartMonth)}-01`;
      end = todayStr;
    }

    // Query catatan pelanggaran
    let recQuery = (supabaseAdmin as any)
      .from("violation_records")
      .select(
        `
        id,
        user_id,
        date,
        violation_title,
        category,
        points,
        notes,
        penalty,
        status,
        recorded_by,
        created_at
      `,
      )
      .order("date", { ascending: false });

    if (start) recQuery = recQuery.gte("date", start);
    if (end) recQuery = recQuery.lte("date", end);

    if (studentIds.length > 0) {
      recQuery = recQuery.in("user_id", studentIds);
    } else if (activeDorm || data.class) {
      // Tidak ada santri yang cocok dengan filter dorm/class
      return {
        totalViolations: 0,
        totalPoints: 0,
        totalStudentsWithViolations: 0,
        sp1Count: 0,
        sp2Count: 0,
        sp3Count: 0,
        categoryStats: [
          { category: "Ringan", count: 0, points: 0, color: "#10b981" },
          { category: "Sedang", count: 0, points: 0, color: "#f59e0b" },
          { category: "Berat", count: 0, points: 0, color: "#ef4444" },
        ],
        monthlyTrend: [],
        topViolations: [],
        studentRankings: [],
        records: [],
        availableDorms,
      };
    }

    if (data.category && data.category !== "semua") {
      recQuery = recQuery.eq("category", data.category);
    }
    if (data.status && data.status !== "semua") {
      recQuery = recQuery.eq("status", data.status);
    }

    const { data: records, error: recError } = await recQuery;
    if (recError) throw new Error(recError.message);

    // Ambil nama pencatat (recorded_by)
    const recorderIds = Array.from(
      new Set(
        (records ?? [])
          .map((r: any) => r.recorded_by)
          .filter((id: any): id is string => Boolean(id)),
      ),
    );

    const recorderMap = new Map<string, string>();
    if (recorderIds.length > 0) {
      const { data: recProfiles } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id,name")
        .in("id", recorderIds);

      for (const p of recProfiles ?? []) {
        recorderMap.set(p.id, p.name);
      }
    }

    // Olah data agregasi
    let totalPoints = 0;
    const categoryCount: Record<string, { count: number; points: number }> = {
      Ringan: { count: 0, points: 0 },
      Sedang: { count: 0, points: 0 },
      Berat: { count: 0, points: 0 },
    };

    const monthlyPoints: Record<string, { month: string; count: number; points: number }> = {};
    const violationOccurrences: Record<string, { title: string; category: string; count: number; points: number }> = {};
    const studentAggregates: Record<
      string,
      {
        student: any;
        totalPoints: number;
        violationCount: number;
        lastDate: string;
        records: any[];
      }
    > = {};

    const formattedRecords: any[] = [];

    const searchKeyword = data.search?.trim().toLowerCase() || "";

    for (const r of records ?? []) {
      const student = studentMap.get(r.user_id) || {
        id: r.user_id,
        name: "Santri",
        dorm: "-",
        class: "-",
      };

      const recorderName = r.recorded_by ? recorderMap.get(r.recorded_by) || "Petugas" : "Petugas";

      // Filter search
      if (searchKeyword) {
        const matchTitle = r.violation_title?.toLowerCase().includes(searchKeyword);
        const matchName = student.name?.toLowerCase().includes(searchKeyword);
        const matchNis = student.nis_nip?.toLowerCase().includes(searchKeyword);
        const matchDorm = student.dorm?.toLowerCase().includes(searchKeyword);
        if (!matchTitle && !matchName && !matchNis && !matchDorm) {
          continue;
        }
      }

      const pts = Number(r.points) || 0;
      totalPoints += pts;

      const cat = (r.category || "Ringan") as "Ringan" | "Sedang" | "Berat";
      if (!categoryCount[cat]) categoryCount[cat] = { count: 0, points: 0 };
      const catStat = categoryCount[cat]!;
      catStat.count += 1;
      catStat.points += pts;

      // Tren bulanan (YYYY-MM)
      const mKey = (r.date || todayStr).substring(0, 7);
      if (!monthlyPoints[mKey]) {
        const [y, m] = mKey.split("-");
        const monthNames = [
          "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
          "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
        ];
        const label = `${monthNames[Number(m) - 1]} ${y}`;
        monthlyPoints[mKey] = { month: label, count: 0, points: 0 };
      }
      const mStat = monthlyPoints[mKey]!;
      mStat.count += 1;
      mStat.points += pts;

      // Top Pelanggaran
      const titleKey = r.violation_title;
      if (!violationOccurrences[titleKey]) {
        violationOccurrences[titleKey] = {
          title: r.violation_title,
          category: cat,
          count: 0,
          points: 0,
        };
      }
      const vOcc = violationOccurrences[titleKey]!;
      vOcc.count += 1;
      vOcc.points += pts;

      // Agregasi per santri
      if (!studentAggregates[r.user_id]) {
        studentAggregates[r.user_id] = {
          student,
          totalPoints: 0,
          violationCount: 0,
          lastDate: r.date,
          records: [],
        };
      }
      const studentAgg = studentAggregates[r.user_id]!;
      studentAgg.totalPoints += pts;
      studentAgg.violationCount += 1;
      if (r.date > studentAgg.lastDate) {
        studentAgg.lastDate = r.date;
      }

      const fullRecord = {
        id: r.id,
        user_id: r.user_id,
        date: r.date,
        violation_title: r.violation_title,
        category: cat,
        points: pts,
        notes: r.notes || "",
        penalty: r.penalty || "",
        status: r.status || "Selesai",
        recorded_by: r.recorded_by,
        recorder_name: recorderName,
        student_name: student.name,
        student_display_name: student.display_name || student.name,
        student_nis: student.nis_nip || "-",
        student_dorm: student.dorm || "-",
        student_class: student.class || "-",
        student_avatar: student.avatar || null,
        created_at: r.created_at,
      };

      studentAgg.records.push(fullRecord);
      formattedRecords.push(fullRecord);
    }

    // Ranking santri dengan akumulasi poin terbanyak
    const studentRankings = Object.values(studentAggregates)
      .map((item) => ({
        ...item,
        spInfo: getSpStatusTier(item.totalPoints),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // Hitung berapa santri dalam masing-masing level SP
    let sp1Count = 0;
    let sp2Count = 0;
    let sp3Count = 0;

    for (const s of studentRankings) {
      if (s.spInfo.tier === "SP 3") sp3Count++;
      else if (s.spInfo.tier === "SP 2") sp2Count++;
      else if (s.spInfo.tier === "SP 1") sp1Count++;
    }

    // Urutkan tren bulanan
    const monthlyTrend = Object.keys(monthlyPoints)
      .sort()
      .slice(-6)
      .map((k) => monthlyPoints[k]!);

    // Top 5 jenis pelanggaran yang paling sering terjadi
    const topViolations = Object.values(violationOccurrences)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const categoryStats = [
      {
        category: "Ringan",
        count: categoryCount["Ringan"]?.count || 0,
        points: categoryCount["Ringan"]?.points || 0,
        color: "#10b981",
      },
      {
        category: "Sedang",
        count: categoryCount["Sedang"]?.count || 0,
        points: categoryCount["Sedang"]?.points || 0,
        color: "#f59e0b",
      },
      {
        category: "Berat",
        count: categoryCount["Berat"]?.count || 0,
        points: categoryCount["Berat"]?.points || 0,
        color: "#ef4444",
      },
    ];

    return {
      totalViolations: formattedRecords.length,
      totalPoints,
      totalStudentsWithViolations: studentRankings.length,
      sp1Count,
      sp2Count,
      sp3Count,
      categoryStats,
      monthlyTrend,
      topViolations,
      studentRankings,
      records: formattedRecords,
      availableDorms,
    };
  });

/** 8. Ambil data pelanggaran untuk profil santri yang sedang login */
export const getMyViolations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me, error: meError } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,display_name,nis_nip,dorm,class,avatar,account_type")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (meError || !me) {
      throw new Error("Pengguna tidak ditemukan");
    }

    const { data: records, error: recError } = await (supabaseAdmin as any)
      .from("violation_records")
      .select(
        `
        id,
        date,
        violation_title,
        category,
        points,
        notes,
        penalty,
        status,
        recorded_by,
        created_at
      `,
      )
      .eq("user_id", me.id)
      .order("date", { ascending: false });

    if (recError) throw new Error(recError.message);

    // Ambil nama pencatat
    const recorderIds = Array.from(
      new Set(
        (records ?? [])
          .map((r: any) => r.recorded_by)
          .filter((id: any): id is string => Boolean(id)),
      ),
    );

    const recorderMap = new Map<string, string>();
    if (recorderIds.length > 0) {
      const { data: recProfiles } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id,name")
        .in("id", recorderIds);

      for (const p of recProfiles ?? []) {
        recorderMap.set(p.id, p.name);
      }
    }

    let totalPoints = 0;
    const formattedRecords = (records ?? []).map((r: any) => {
      const pts = Number(r.points) || 0;
      totalPoints += pts;
      return {
        id: r.id,
        date: r.date,
        violation_title: r.violation_title,
        category: r.category || "Ringan",
        points: pts,
        notes: r.notes || "",
        penalty: r.penalty || "",
        status: r.status || "Selesai",
        recorder_name: r.recorded_by ? recorderMap.get(r.recorded_by) || "Petugas" : "Petugas",
        created_at: r.created_at,
      };
    });

    const spInfo = getSpStatusTier(totalPoints);

    return {
      student: me,
      totalPoints,
      spInfo,
      records: formattedRecords,
    };
  });
