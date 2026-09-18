import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  addLibraryVisit,
  checkOutLibraryVisit,
  loadLibraryStore,
  type LibraryVisit,
} from "./library.storage.server";

// ──────────────────────────────────────────────────────────────
// 1. ABSENSI MASUK (RFID / MANUAL)
// ──────────────────────────────────────────────────────────────

export const recordLibraryCheckInFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        rfidCard: z.string().optional(),
        studentId: z.string().optional(),
        purpose: z.string().default("Membaca Buku"),
        notes: z.string().optional(),
        academicYear: z.string().default("2026/2027"),
        semester: z.string().default("1"),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let student: any = null;

    // 1. Jika via RFID, cari santri berdasarkan nis_nip atau id
    if (data.rfidCard && data.rfidCard.trim().length > 0) {
      const code = data.rfidCard.trim();
      const { data: foundByNis } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id, name, display_name, full_name, nis_nip, class, dorm, account_type")
        .eq("account_type", "santri")
        .eq("nis_nip", code)
        .maybeSingle();

      if (foundByNis) {
        student = foundByNis;
      } else {
        // Coba cari jika code sama dengan prefix/id atau santri dengan nis yang mirip
        const { data: allStudents } = await (supabaseAdmin as any)
          .from("profiles")
          .select("id, name, display_name, full_name, nis_nip, class, dorm, account_type")
          .eq("account_type", "santri")
          .limit(200);

        student = (allStudents || []).find(
          (s: any) =>
            s.id === code ||
            (s.nis_nip && s.nis_nip.toLowerCase() === code.toLowerCase())
        );
      }

      if (!student) {
        throw new Error(`Kartu RFID [${code}] belum terdaftar pada data santri`);
      }
    } else if (data.studentId) {
      // 2. Jika via Manual Check-In
      const { data: foundById } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id, name, display_name, full_name, nis_nip, class, dorm, account_type")
        .eq("id", data.studentId)
        .maybeSingle();

      if (!foundById) {
        throw new Error("Data santri tidak ditemukan");
      }
      student = foundById;
    } else {
      throw new Error("Nomor kartu RFID atau Santri harus diisi");
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]!;

    const visit = addLibraryVisit({
      student_id: student.id,
      student_name: student.name || student.display_name || student.full_name || "Santri",
      nis_nip: student.nis_nip || "-",
      class_name: student.class || "-",
      dorm_name: student.dorm || "-",
      rfid_card: data.rfidCard?.trim() || undefined,
      check_in: now.toISOString(),
      method: data.rfidCard ? "rfid" : "manual",
      purpose: data.purpose,
      notes: data.notes || "",
      date: todayStr,
      academic_year: data.academicYear,
      semester: data.semester,
    });

    return {
      success: true,
      visit,
      message: `Selamat datang di Perpustakaan, ${visit.student_name}!`,
    };
  });

// ──────────────────────────────────────────────────────────────
// 2. CHECK OUT KUNJUNGAN
// ──────────────────────────────────────────────────────────────

export const recordLibraryCheckOutFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        visitId: z.string(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const checked = checkOutLibraryVisit(data.visitId);
    if (!checked) throw new Error("Kunjungan tidak ditemukan");
    return { success: true, visit: checked, message: "Kunjungan selesai. Terima kasih!" };
  });

// ──────────────────────────────────────────────────────────────
// 3. DAFTAR KUNJUNGAN HARI INI & STATISTIK
// ──────────────────────────────────────────────────────────────

export const getTodayLibraryVisitsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const store = loadLibraryStore();
    const today = new Date().toISOString().split("T")[0]!;

    const todayVisits = store.visits.filter((v) => v.date === today);
    const activeVisitors = todayVisits.filter((v) => !v.check_out);

    // Hitung statistik singkat
    const totalToday = todayVisits.length;
    const rfidCount = todayVisits.filter((v) => v.method === "rfid").length;
    const manualCount = todayVisits.filter((v) => v.method === "manual").length;

    return {
      date: today,
      visits: todayVisits,
      activeVisitorsCount: activeVisitors.length,
      totalTodayCount: totalToday,
      rfidCount,
      manualCount,
    };
  });

// ──────────────────────────────────────────────────────────────
// 4. REKAPITULASI KUNJUNGAN PERPUSTAKAAN (ADMIN / PETUGAS)
// ──────────────────────────────────────────────────────────────

export const getLibraryRecapFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        className: z.string().optional(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const store = loadLibraryStore();
    let visits = store.visits;

    if (data.startDate) {
      visits = visits.filter((v) => v.date >= data.startDate!);
    }
    if (data.endDate) {
      visits = visits.filter((v) => v.date <= data.endDate!);
    }
    if (data.className && data.className !== "all") {
      visits = visits.filter((v) => v.class_name === data.className);
    }

    // Top santri rajin berkunjung
    const studentVisitCount = new Map<string, { name: string; class_name: string; count: number }>();
    for (const v of visits) {
      const existing = studentVisitCount.get(v.student_id);
      if (existing) {
        existing.count++;
      } else {
        studentVisitCount.set(v.student_id, {
          name: v.student_name,
          class_name: v.class_name,
          count: 1,
        });
      }
    }

    const topReaders = Array.from(studentVisitCount.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      visits,
      totalVisits: visits.length,
      topReaders,
    };
  });

// ──────────────────────────────────────────────────────────────
// 5. PORTAL MAKTABAH UNTUK SISWA & WALI SANTRI
// ──────────────────────────────────────────────────────────────

export const getStudentMaktabahVisitsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        studentId: z.string(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const store = loadLibraryStore();
    const studentVisits = store.visits.filter((v) => v.student_id === data.studentId);

    // Hitung ringkasan literasi santri
    const totalVisits = studentVisits.length;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const thisMonthVisits = studentVisits.filter((v) => v.date.startsWith(currentMonth)).length;

    // Tingkat literasi / apresiasi
    let badgeTitle = "Pembaca Pemula";
    let badgeLevel = "Bronze";
    if (totalVisits >= 20) {
      badgeTitle = "Duta Literasi Maktabah";
      badgeLevel = "Gold";
    } else if (totalVisits >= 10) {
      badgeTitle = "Kutu Buku Teladan";
      badgeLevel = "Silver";
    }

    return {
      visits: studentVisits,
      totalVisits,
      thisMonthVisits,
      badgeTitle,
      badgeLevel,
    };
  });

// ──────────────────────────────────────────────────────────────
// 6. DAFTAR SANTRI UNTUK ABSENSI MANUAL
// ──────────────────────────────────────────────────────────────

export const getStudentsForManualCheckInFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: students, error } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, name, display_name, full_name, nis_nip, class, dorm")
      .eq("account_type", "santri")
      .order("name");

    if (error) {
      console.error("Error fetching students for manual library check-in:", error);
      return [];
    }

    return (students || []).map((s: any) => ({
      id: s.id,
      name: s.name || s.display_name || s.full_name || "Santri",
      nis_nip: s.nis_nip || "-",
      class_name: s.class || "-",
      dorm_name: s.dorm || "-",
    }));
  });
