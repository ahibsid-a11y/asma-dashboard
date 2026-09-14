import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMemberAdmin } from "@/lib/roles";

type Ctx = { supabase: any; userId: string };

export const DEFAULT_MUTABAAH_ACTIVITIES = [
  { title: "Salat malam", category: "Ibadah", order_index: 1 },
  { title: "Salat sunah qobliyah subuh", category: "Ibadah", order_index: 2 },
  { title: "Salat subuh berjama'ah", category: "Ibadah", order_index: 3 },
  { title: "Halaqoh tahfiz bada subuh", category: "Tahfiz", order_index: 4 },
  { title: "Zikir pagi", category: "Ibadah", order_index: 5 },
  { title: "Melaksanakan piket harian", category: "Kedisiplinan", order_index: 6 },
  { title: "Berangkat ke sekolah sblm 7.20", category: "Kedisiplinan", order_index: 7 },
  { title: "Salat sunah qobliyah zuhur", category: "Ibadah", order_index: 8 },
  { title: "Salat zuhur berjama'ah", category: "Ibadah", order_index: 9 },
  { title: "Salat sunah ba'diyah zuhur", category: "Ibadah", order_index: 10 },
  { title: "Tidur siang (qoilulah)", category: "Sunnah", order_index: 11 },
  { title: "Hadir di masjid sblm azan asar", category: "Ibadah", order_index: 12 },
  { title: "Salat asar berjama'ah", category: "Ibadah", order_index: 13 },
  { title: "Zikir sore", category: "Ibadah", order_index: 14 },
  { title: "Hadir dimasjid sblm azan maghrib", category: "Ibadah", order_index: 15 },
  { title: "Salat maghrib berjama'ah", category: "Ibadah", order_index: 16 },
  { title: "Salat sunah ba'diyah maghrib", category: "Ibadah", order_index: 17 },
  { title: "Halaqoh tahfiz bada maghrib", category: "Tahfiz", order_index: 18 },
  { title: "Salat isya berjama'ah", category: "Ibadah", order_index: 19 },
  { title: "Salat sunah ba'diyah isya", category: "Ibadah", order_index: 20 },
  { title: "Belajar malam", category: "Akademik", order_index: 21 },
  { title: "Setoran mufrodat harian", category: "Bahasa", order_index: 22 },
  { title: "Berbahasa Arab/Inggris", category: "Bahasa", order_index: 23 },
  { title: "Tidak berbicara kotor/kasar", category: "Akhlak", order_index: 24 },
];

export type MutabaahActivity = {
  id: string;
  title: string;
  category: string;
  order_index: number;
  is_active: boolean;
};

/** Ambil profil pengguna saat ini beserta peran dan asrama binaannya */
async function getCurrentUserContext(ctx: Ctx) {
  const { data: me, error } = await ctx.supabase
    .from("profiles")
    .select("id,name,account_type,dorm")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!me) throw new Error("Pengguna tidak ditemukan");
  const canManage = isMemberAdmin(me.account_type);
  const isMusyrif = me.account_type === "musyrif_asrama";
  return { me, canManage, isMusyrif };
}

/** Pastikan daftar kegiatan mutaba'ah terisi di database */
async function ensureActivities(supabaseAdmin: any): Promise<MutabaahActivity[]> {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("mutabaah_activities")
      .select("id,title,category,order_index,is_active")
      .order("order_index", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as MutabaahActivity[];
    }

    // Bila tabel kosong, semaikan data default
    const toInsert = DEFAULT_MUTABAAH_ACTIVITIES.map((act) => ({
      title: act.title,
      category: act.category,
      order_index: act.order_index,
      is_active: true,
    }));

    const { data: inserted, error: insertError } = await (supabaseAdmin as any)
      .from("mutabaah_activities")
      .insert(toInsert)
      .select("id,title,category,order_index,is_active");

    if (!insertError && inserted) {
      return inserted as MutabaahActivity[];
    }
  } catch (err) {
    console.warn("ensureActivities fallback to default list:", err);
  }

  // Fallback virtual dengan id deterministik
  return DEFAULT_MUTABAAH_ACTIVITIES.map((a, idx) => ({
    id: `act_${idx + 1}`,
    title: a.title,
    category: a.category,
    order_index: a.order_index,
    is_active: true,
  }));
}

/** 1. Ambil daftar kegiatan mutaba'ah */
export const getMutabaahActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return ensureActivities(supabaseAdmin);
  });

/** 2. Tambah, ubah, atau hapus kegiatan mutaba'ah (khusus admin) */
export const manageMutabaahActivity = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        action: z.enum(["create", "update", "delete", "toggle"]),
        id: z.string().optional(),
        title: z.string().trim().min(2, "Nama kegiatan minimal 2 karakter").optional(),
        category: z.string().trim().optional().default("Ibadah"),
        order_index: z.number().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { canManage } = await getCurrentUserContext(ctx);
    if (!canManage) throw new Error("Hanya admin yang dapat mengelola daftar kegiatan");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = (supabaseAdmin as any).from("mutabaah_activities");

    if (data.action === "create") {
      const { data: existing } = await table
        .select("order_index")
        .order("order_index", { ascending: false })
        .limit(1);
      const nextIndex = (existing?.[0]?.order_index ?? 0) + 1;

      const { data: created, error } = await table
        .insert({
          title: data.title,
          category: data.category || "Ibadah",
          order_index: data.order_index ?? nextIndex,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, data: created };
    }

    if (data.action === "update") {
      if (!data.id) throw new Error("ID kegiatan wajib disertakan");
      const updateData: Record<string, unknown> = {};
      if (data.title) updateData["title"] = data.title;
      if (data.category) updateData["category"] = data.category;
      if (data.order_index !== undefined) updateData["order_index"] = data.order_index;
      if (data.is_active !== undefined) updateData["is_active"] = data.is_active;

      const { error } = await table.update(updateData).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (data.action === "toggle") {
      if (!data.id) throw new Error("ID kegiatan wajib disertakan");
      const { error } = await table
        .update({ is_active: data.is_active ?? false })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (data.action === "delete") {
      if (!data.id) throw new Error("ID kegiatan wajib disertakan");
      // Soft-delete (set is_active: false) agar riwayat ceklis santri di masa lalu tidak hilang
      const { error } = await table.update({ is_active: false }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    return { ok: true };
  });

/** 3. Mengambil lembar kerja mutaba'ah (daftar santri kamar terpilih & status ceklis hari itu) */
export const getMutabaahSheet = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
        dorm: z.string().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { me, canManage, isMusyrif } = await getCurrentUserContext(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Dapatkan seluruh daftar asrama yang tersedia
    const { data: dormRows } = await supabaseAdmin
      .from("dorms")
      .select("name")
      .order("name", { ascending: true });
    const availableDorms = (dormRows ?? []).map((d: any) => d.name);

    // Tentukan asrama/kamar target
    let selectedDorm = data.dorm || null;
    if (isMusyrif && me.dorm) {
      selectedDorm = me.dorm; // Musyrif dikunci hanya untuk asramanya sendiri
    } else if (!selectedDorm && availableDorms.length > 0) {
      selectedDorm = availableDorms[0] ?? null;
    }

    // Ambil santri di asrama tersebut
    let studentQuery = supabaseAdmin
      .from("profiles")
      .select("id,name,display_name,nis_nip,dorm,class,avatar")
      .eq("account_type", "santri")
      .eq("status", "Aktif")
      .order("name", { ascending: true });

    if (selectedDorm) {
      studentQuery = studentQuery.eq("dorm", selectedDorm);
    }
    const { data: students, error: studentError } = await studentQuery;
    if (studentError) throw new Error(studentError.message);

    // Ambil kegiatan aktif
    const allActivities = await ensureActivities(supabaseAdmin);
    const activities = allActivities.filter((a) => a.is_active);

    // Ambil records untuk tanggal dan santri tersebut
    const studentIds = (students ?? []).map((s: any) => s.id);
    const recordsMap: Record<string, { status: boolean; notes: string | null }> = {};

    if (studentIds.length > 0) {
      const { data: records, error: recError } = await (supabaseAdmin as any)
        .from("mutabaah_records")
        .select("student_id,activity_id,status,notes")
        .eq("date", data.date)
        .in("student_id", studentIds);

      if (!recError && records) {
        for (const r of records) {
          recordsMap[`${r.student_id}_${r.activity_id}`] = {
            status: Boolean(r.status),
            notes: r.notes || null,
          };
        }
      }
    }

    return {
      date: data.date,
      selectedDorm,
      availableDorms,
      canChangeDorm: canManage,
      canManageActivities: canManage,
      students: students ?? [],
      activities,
      records: recordsMap,
    };
  });

/** 4. Simpan status ceklis santri (Batch / Single) */
export const saveMutabaahChecklist = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
        updates: z.array(
          z.object({
            student_id: z.string().uuid(),
            activity_id: z.string(),
            status: z.boolean(),
            notes: z.string().nullable().optional(),
          }),
        ),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { me, canManage, isMusyrif } = await getCurrentUserContext(ctx);
    if (!canManage && !isMusyrif) {
      throw new Error("Anda tidak memiliki wewenang untuk mengisi mutaba'ah");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Jika musyrif, pastikan santri yang di-update berada di asrama musyrif tersebut
    if (isMusyrif && me.dorm) {
      const studentIds = [...new Set(data.updates.map((u) => u.student_id))];
      const { data: checkedStudents } = await supabaseAdmin
        .from("profiles")
        .select("id,dorm")
        .in("id", studentIds);

      const invalid = (checkedStudents ?? []).some((s: any) => s.dorm !== me.dorm);
      if (invalid) {
        throw new Error("Anda hanya dapat mengisi mutaba'ah untuk santri di kamar Anda");
      }
    }

    const rows = data.updates.map((u) => ({
      student_id: u.student_id,
      activity_id: u.activity_id,
      date: data.date,
      status: u.status,
      notes: u.notes ?? null,
      recorded_by: ctx.userId,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await (supabaseAdmin as any).from("mutabaah_records").upsert(rows, {
      onConflict: "student_id,activity_id,date",
    });

    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

/** 5. Mengambil data rekap dan analitik (Harian, Pekanan, Bulanan) */
export const getMutabaahSummary = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        view: z.enum(["hari", "pekan", "bulan"]).default("bulan"),
        anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dorm: z.string().optional(),
        studentId: z.string().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { me, canManage, isMusyrif } = await getCurrentUserContext(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: dormRows } = await supabaseAdmin
      .from("dorms")
      .select("name")
      .order("name", { ascending: true });
    const availableDorms = (dormRows ?? []).map((d: any) => d.name);

    let selectedDorm = data.dorm || null;
    if (isMusyrif && me.dorm) {
      selectedDorm = me.dorm;
    }

    // Tentukan rentang tanggal
    const anchor = new Date(`${data.anchorDate}T00:00:00`);
    let startDate: string;
    let endDate: string;
    let daysList: string[] = [];

    const pad = (n: number) => String(n).padStart(2, "0");
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (data.view === "hari") {
      startDate = data.anchorDate;
      endDate = data.anchorDate;
      daysList = [startDate];
    } else if (data.view === "pekan") {
      const dayOfWeek = (anchor.getDay() + 6) % 7; // 0 = Senin
      const mon = new Date(anchor);
      mon.setDate(anchor.getDate() - dayOfWeek);
      startDate = toDateStr(mon);

      for (let i = 0; i < 7; i++) {
        const cur = new Date(mon);
        cur.setDate(mon.getDate() + i);
        daysList.push(toDateStr(cur));
      }
      endDate = daysList[6] ?? startDate;
    } else {
      // Bulan
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      startDate = toDateStr(first);
      endDate = toDateStr(last);

      for (let d = 1; d <= last.getDate(); d++) {
        daysList.push(toDateStr(new Date(anchor.getFullYear(), anchor.getMonth(), d)));
      }
    }

    // Ambil santri yang sesuai filter
    let sQuery = supabaseAdmin
      .from("profiles")
      .select("id,name,display_name,nis_nip,dorm,class,avatar")
      .eq("account_type", "santri")
      .eq("status", "Aktif")
      .order("name", { ascending: true });

    if (selectedDorm) sQuery = sQuery.eq("dorm", selectedDorm);
    if (data.studentId) sQuery = sQuery.eq("id", data.studentId);

    const { data: students } = await sQuery;
    const studentList = students ?? [];
    const studentIds = studentList.map((s: any) => s.id);

    // Ambil kegiatan
    const allActivities = await ensureActivities(supabaseAdmin);
    const activities = allActivities.filter((a) => a.is_active);

    // Ambil catatan pada rentang tanggal
    let records: any[] = [];
    if (studentIds.length > 0) {
      const { data: recData } = await (supabaseAdmin.from("mutabaah_records" as any) as any)
        .select("student_id,activity_id,date,status")
        .in("student_id", studentIds)
        .gte("date", startDate)
        .lte("date", endDate);
      records = recData ?? [];
    }

    // Hitung statistik
    const totalExpected = studentList.length * activities.length * daysList.length;
    const completedCount = records.filter((r) => r.status).length;
    const overallCompliance =
      totalExpected > 0 ? Math.round((completedCount / totalExpected) * 100) : 0;

    // Per-santri compliance
    const studentStats = studentList.map((s: any) => {
      const sExpected = activities.length * daysList.length;
      const sCompleted = records.filter((r) => r.student_id === s.id && r.status).length;
      const pct = sExpected > 0 ? Math.round((sCompleted / sExpected) * 100) : 0;
      return {
        id: s.id,
        name: s.name,
        display_name: s.display_name,
        dorm: s.dorm,
        completed: sCompleted,
        expected: sExpected,
        percentage: pct,
      };
    });
    studentStats.sort((a, b) => b.percentage - a.percentage);

    // Per-activity compliance
    const activityStats = activities.map((act) => {
      const aExpected = studentList.length * daysList.length;
      const aCompleted = records.filter((r) => r.activity_id === act.id && r.status).length;
      const pct = aExpected > 0 ? Math.round((aCompleted / aExpected) * 100) : 0;
      return {
        id: act.id,
        title: act.title,
        category: act.category,
        order_index: act.order_index,
        completed: aCompleted,
        expected: aExpected,
        percentage: pct,
      };
    });

    // Tren harian untuk Recharts (Line Chart)
    const trendData = daysList.map((d) => {
      const dayDate = new Date(`${d}T00:00:00`);
      const dayExpected = studentList.length * activities.length;
      const dayCompleted = records.filter((r) => r.date === d && r.status).length;
      const pct = dayExpected > 0 ? Math.round((dayCompleted / dayExpected) * 100) : 0;
      return {
        date: d,
        dayNum: dayDate.getDate(),
        label: `${dayDate.getDate()} ${dayDate.toLocaleDateString("id-ID", { month: "short" })}`,
        compliance: pct,
        completed: dayCompleted,
      };
    });

    // Matriks bulanan (untuk format fisik santri terpilih)
    const targetStudentId = data.studentId || (studentList[0]?.id as string | undefined);
    const targetStudent = studentList.find((s: any) => s.id === targetStudentId) ?? null;

    // Matriks: activity_id -> { [dayOfMonth: number]: boolean }
    const matrixGrid: Record<string, Record<number, boolean>> = {};
    for (const act of activities) {
      matrixGrid[act.id] = {};
    }

    if (targetStudentId) {
      const targetRecords = records.filter((r) => r.student_id === targetStudentId && r.status);
      for (const r of targetRecords) {
        const parts = r.date.split("-");
        const dayNum = Number(parts[2] ?? 1);
        const targetAct = matrixGrid[r.activity_id];
        if (targetAct) {
          targetAct[dayNum] = true;
        }
      }
    }

    return {
      view: data.view,
      anchorDate: data.anchorDate,
      startDate,
      endDate,
      daysList,
      selectedDorm,
      availableDorms,
      overallCompliance,
      totalStudents: studentList.length,
      activities,
      students: studentList,
      studentStats,
      activityStats,
      trendData,
      targetStudent,
      matrixGrid,
      canChangeDorm: canManage,
    };
  });

/** 6. Mengambil mutaba'ah pribadi untuk akun santri */
export const getMyMutabaah = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        monthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { me } = await getCurrentUserContext(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const anchor = new Date(`${data.monthDate}T00:00:00`);
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

    const pad = (n: number) => String(n).padStart(2, "0");
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const startDate = toDateStr(first);
    const endDate = toDateStr(last);
    const today = toDateStr(new Date());

    const allActivities = await ensureActivities(supabaseAdmin);
    const activities = allActivities.filter((a) => a.is_active);

    const { data: records } = await (supabaseAdmin.from("mutabaah_records" as any) as any)
      .select("activity_id,date,status,notes")
      .eq("student_id", ctx.userId)
      .gte("date", startDate)
      .lte("date", endDate);

    const recList = records ?? [];

    // Skor hari ini
    const todayCompleted = recList.filter((r: any) => r.date === today && r.status).length;
    const todayPct = activities.length > 0 ? Math.round((todayCompleted / activities.length) * 100) : 0;

    // Matriks bulanan santri: activity_id -> [dayNum] -> boolean
    const matrix: Record<string, Record<number, boolean>> = {};
    for (const act of activities) {
      matrix[act.id] = {};
    }
    for (const r of recList) {
      if (r.status) {
        const parts = r.date.split("-");
        const dayNum = Number(parts[2] ?? 1);
        const targetAct = matrix[r.activity_id];
        if (targetAct) {
          targetAct[dayNum] = true;
        }
      }
    }

    // Skor bulanan
    const daysInMonth = last.getDate();
    const totalExpected = activities.length * daysInMonth;
    const totalCompleted = recList.filter((r: any) => r.status).length;
    const monthPct = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;

    return {
      student: me,
      monthDate: data.monthDate,
      daysInMonth,
      today,
      todayCompleted,
      todayTotal: activities.length,
      todayPct,
      monthPct,
      activities,
      matrix,
    };
  });
