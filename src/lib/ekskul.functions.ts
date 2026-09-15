import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createBillingForStudent,
  createSessionAndAttendance,
  deleteEkskulItem,
  enrollStudentToEkskul,
  loadEkskulStore,
  recordPaymentUpdate,
  saveOrUpdateEkskul,
  saveStudentEkskulGrade,
  unenrollStudentFromEkskul,
  type EkskulCategory,
  type EkskulFeePeriod,
  type EkskulGrade,
} from "./ekskul.storage.server";


/** Samakan bentuk data santri agar tampilan selalu mendapat nama & kelas. */
function normalizeStudent(s: any) {
  return {
    ...s,
    full_name: s.name || s.display_name || "Santri",
    class_name: s.class || "-",
  };
}

// ──────────────────────────────────────────────────────────────
// 1. MASTER EKSKUL
// ──────────────────────────────────────────────────────────────

export const getMasterEkskulListFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const store = await loadEkskulStore();
    return store.ekskuls;
  });

export const manageEkskulItemFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        action: z.enum(["save", "delete"]),
        item: z
          .object({
            id: z.string().optional(),
            name: z.string().min(1),
            category: z.enum(["wajib", "pilihan"]),
            fee: z.number().default(0),
            fee_period: z.enum(["per_bulan", "per_semester", "sekali"]).default("per_bulan"),
            coach_name: z.string().default("Belum Ditentukan"),
            coach_id: z.string().optional(),
            schedule_day: z.string().default("Sabtu"),
            schedule_time: z.string().default("16:00 - 17:30"),
            location: z.string().default("Pesantren"),
            quota: z.number().optional(),
            description: z.string().default(""),
            is_active: z.boolean().default(true),
          })
          .optional(),
        deleteId: z.string().optional(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    if (data.action === "delete" && data.deleteId) {
      await deleteEkskulItem(data.deleteId);
      return { success: true, message: "Ekskul berhasil dihapus" };
    }

    if (data.action === "save" && data.item) {
      const saved = await saveOrUpdateEkskul(data.item as any);
      return { success: true, item: saved, message: "Ekskul berhasil disimpan" };
    }

    throw new Error("Invalid request");
  });

// ──────────────────────────────────────────────────────────────
// 2. PENDAFTARAN & ENROLLMENT
// ──────────────────────────────────────────────────────────────

export const getEkskulEnrollmentDataFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        ekskulId: z.string(),
        semester: z.string().default("1"),
        academicYear: z.string().default("2026/2027"),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const supabaseAdmin = (context as any).supabase;
    const store = await loadEkskulStore();

    // 1. Ambil ekskul
    const ekskul = store.ekskuls.find((e) => e.id === data.ekskulId);
    if (!ekskul) throw new Error("Ekskul tidak ditemukan");

    // 2. Ambil enrollments untuk ekskul ini
    const enrollments = store.enrollments.filter(
      (enr) =>
        enr.ekskul_id === data.ekskulId &&
        enr.semester === data.semester &&
        enr.academic_year === data.academicYear &&
        enr.status === "aktif"
    );

    // 3. Ambil profil santri
    const studentIds = enrollments.map((e) => e.student_id);
    let studentsMap = new Map<string, any>();

    if (studentIds.length > 0) {
      const { data: students } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id, name, display_name, nis_nip, class, dorm, avatar")
        .in("id", studentIds);

      for (const s of students || []) {
        studentsMap.set(s.id, normalizeStudent(s));
      }
    }

    // Gabungkan data
    const memberList = enrollments.map((enr) => {
      const profile = studentsMap.get(enr.student_id);
      return {
        enrollment: enr,
        student: profile || {
          id: enr.student_id,
          full_name: "Santri",
          nis_nip: "-",
          class_name: "-",
        },
      };
    });

    return {
      ekskul,
      members: memberList,
      totalMembers: memberList.length,
    };
  });

export const enrollStudentFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        ekskulId: z.string(),
        studentId: z.string(),
        semester: z.string().default("1"),
        academicYear: z.string().default("2026/2027"),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const enrollment = await enrollStudentToEkskul({
      ekskul_id: data.ekskulId,
      student_id: data.studentId,
      semester: data.semester,
      academic_year: data.academicYear,
    });

    return { success: true, enrollment };
  });

export const unenrollStudentFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        enrollmentId: z.string(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const success = await unenrollStudentFromEkskul(data.enrollmentId);
    return { success };
  });

export const autoEnrollWajibFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        semester: z.string().default("1"),
        academicYear: z.string().default("2026/2027"),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const supabaseAdmin = (context as any).supabase;
    const store = await loadEkskulStore();

    // 1. Ambil ekskul wajib
    const wajibEkskuls = store.ekskuls.filter((e) => e.category === "wajib" && e.is_active);
    if (wajibEkskuls.length === 0) return { count: 0 };

    // 2. Ambil seluruh santri
    const { data: students } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id")
      .eq("account_type", "santri");

    let count = 0;
    for (const std of students || []) {
      for (const w of wajibEkskuls) {
        await enrollStudentToEkskul({
          ekskul_id: w.id,
          student_id: std.id,
          semester: data.semester,
          academic_year: data.academicYear,
        });
        count++;
      }
    }

    return { success: true, count };
  });

// ──────────────────────────────────────────────────────────────
// 3. KEGIATAN SESI & PRESENSI (ABSENSI CEPAT)
// ──────────────────────────────────────────────────────────────

export const recordEkskulAttendanceSessionFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        ekskulId: z.string(),
        date: z.string(),
        topic: z.string().default("Latihan / Pertemuan Rutin"),
        semester: z.string().default("1"),
        academicYear: z.string().default("2026/2027"),
        records: z.array(
          z.object({
            student_id: z.string(),
            status: z.enum(["hadir", "izin", "sakit", "alpa"]),
            notes: z.string().optional(),
          })
        ),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const session = await createSessionAndAttendance({
      ekskul_id: data.ekskulId,
      date: data.date,
      topic: data.topic,
      academic_year: data.academicYear,
      semester: data.semester,
      records: data.records,
    });

    return { success: true, session };
  });

export const getEkskulSessionsAndGradesFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        ekskulId: z.string(),
        semester: z.string().default("1"),
        academicYear: z.string().default("2026/2027"),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const supabaseAdmin = (context as any).supabase;
    const store = await loadEkskulStore();

    // 1. Ambil ekskul
    const ekskul = store.ekskuls.find((e) => e.id === data.ekskulId);
    if (!ekskul) throw new Error("Ekskul tidak ditemukan");

    // 2. Ambil sesi
    const sessions = store.sessions.filter(
      (s) =>
        s.ekskul_id === data.ekskulId &&
        s.semester === data.semester &&
        s.academic_year === data.academicYear
    );

    // 3. Ambil santri terdaftar
    const enrollments = store.enrollments.filter(
      (enr) =>
        enr.ekskul_id === data.ekskulId &&
        enr.semester === data.semester &&
        enr.academic_year === data.academicYear &&
        enr.status === "aktif"
    );

    const studentIds = enrollments.map((e) => e.student_id);
    let studentsMap = new Map<string, any>();

    if (studentIds.length > 0) {
      const { data: students } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id, name, display_name, nis_nip, class")
        .in("id", studentIds);

      for (const s of students || []) {
        studentsMap.set(s.id, normalizeStudent(s));
      }
    }

    // 4. Hitung rekap presensi per santri
    const sessionIds = new Set(sessions.map((s) => s.id));
    const attendanceRecords = store.attendances.filter((a) => sessionIds.has(a.session_id));

    const gradesMap = new Map<string, EkskulGrade>();
    for (const g of store.grades) {
      if (
        g.ekskul_id === data.ekskulId &&
        g.semester === data.semester &&
        g.academic_year === data.academicYear
      ) {
        gradesMap.set(g.student_id, g);
      }
    }

    const studentStats = enrollments.map((enr) => {
      const s = studentsMap.get(enr.student_id) || {
        id: enr.student_id,
        full_name: "Santri",
        nis_nip: "-",
        class_name: "-",
      };

      const myAtt = attendanceRecords.filter((a) => a.student_id === enr.student_id);
      const hadir = myAtt.filter((a) => a.status === "hadir").length;
      const izin = myAtt.filter((a) => a.status === "izin").length;
      const sakit = myAtt.filter((a) => a.status === "sakit").length;
      const alpa = myAtt.filter((a) => a.status === "alpa").length;
      const totalRecorded = hadir + izin + sakit + alpa;
      const percentage = totalRecorded > 0 ? Math.round((hadir / totalRecorded) * 100) : 100;

      const grade = gradesMap.get(enr.student_id) || null;

      return {
        student: s,
        hadir,
        izin,
        sakit,
        alpa,
        percentage,
        grade,
      };
    });

    return {
      ekskul,
      sessions,
      totalSessions: sessions.length,
      studentStats,
    };
  });

// ──────────────────────────────────────────────────────────────
// 4. INPUT NILAI RAPOR EKSKUL
// ──────────────────────────────────────────────────────────────

export const saveEkskulStudentGradeFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        ekskulId: z.string(),
        studentId: z.string(),
        semester: z.string().default("1"),
        academicYear: z.string().default("2026/2027"),
        grade: z.enum(["A", "B", "C", "D"]),
        predicate: z.enum(["Sangat Baik", "Baik", "Cukup", "Kurang"]),
        description: z.string(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const saved = await saveStudentEkskulGrade({
      ekskul_id: data.ekskulId,
      student_id: data.studentId,
      semester: data.semester,
      academic_year: data.academicYear,
      grade: data.grade,
      predicate: data.predicate,
      description: data.description,
    });
    return { success: true, grade: saved };
  });

// ──────────────────────────────────────────────────────────────
// 5. PEMBAYARAN & KEUANGAN IURAN EKSKUL
// ──────────────────────────────────────────────────────────────

export const getEkskulPaymentsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        ekskulId: z.string().optional(),
        semester: z.string().default("1"),
        academicYear: z.string().default("2026/2027"),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const supabaseAdmin = (context as any).supabase;
    const store = await loadEkskulStore();

    let payments = store.payments;
    if (data.ekskulId && data.ekskulId !== "all") {
      payments = payments.filter((p) => p.ekskul_id === data.ekskulId);
    }

    const studentIds = Array.from(new Set(payments.map((p) => p.student_id)));
    let studentsMap = new Map<string, any>();

    if (studentIds.length > 0) {
      const { data: students } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id, name, display_name, nis_nip, class")
        .in("id", studentIds);

      for (const s of students || []) {
        studentsMap.set(s.id, normalizeStudent(s));
      }
    }

    const ekskulMap = new Map(store.ekskuls.map((e) => [e.id, e]));

    const result = payments.map((p) => {
      const student = studentsMap.get(p.student_id) || {
        id: p.student_id,
        full_name: "Santri",
        nis_nip: "-",
        class_name: "-",
      };
      const ekskul = ekskulMap.get(p.ekskul_id);
      return {
        payment: p,
        student,
        ekskul,
      };
    });

    const totalBilled = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPaid = payments
      .filter((p) => p.status === "lunas")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalUnpaid = totalBilled - totalPaid;

    return {
      payments: result,
      summary: {
        totalBilled,
        totalPaid,
        totalUnpaid,
        paidCount: payments.filter((p) => p.status === "lunas").length,
        unpaidCount: payments.filter((p) => p.status === "belum_bayar").length,
      },
    };
  });

export const updateEkskulPaymentStatusFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        paymentId: z.string(),
        status: z.enum(["lunas", "belum_bayar"]),
        payment_method: z.enum(["tunai", "transfer", "potong_tabungan"]).optional(),
        notes: z.string().optional(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const updated = await recordPaymentUpdate(data);
    if (!updated) throw new Error("Tagihan pembayaran tidak ditemukan");
    return { success: true, payment: updated };
  });

export const createStudentBillingFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        enrollmentId: z.string(),
        studentId: z.string(),
        ekskulId: z.string(),
        periodLabel: z.string(),
        amount: z.number().min(1),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const payment = await createBillingForStudent({
      enrollment_id: data.enrollmentId,
      student_id: data.studentId,
      ekskul_id: data.ekskulId,
      period_label: data.periodLabel,
      amount: data.amount,
    });
    return { success: true, payment };
  });

// ──────────────────────────────────────────────────────────────
// 6. PORTAL SISWA ("EKSKUL SAYA")
// ──────────────────────────────────────────────────────────────

export const getStudentEkskulPortalDataFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        studentId: z.string(),
        semester: z.string().default("1"),
        academicYear: z.string().default("2026/2027"),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const store = await loadEkskulStore();

    // 1. Ambil pendaftaran santri
    const enrollments = store.enrollments.filter(
      (enr) =>
        enr.student_id === data.studentId &&
        enr.semester === data.semester &&
        enr.academic_year === data.academicYear &&
        enr.status === "aktif"
    );

    const ekskulMap = new Map(store.ekskuls.map((e) => [e.id, e]));

    // 2. Untuk setiap ekskul yang diikuti, kumpulkan:
    // - Info ekskul
    // - Sesi & riwayat presensi
    // - Nilai capaian rapor
    // - Tagihan & status pembayaran
    const myEkskuls = enrollments.map((enr) => {
      const ekskul = ekskulMap.get(enr.ekskul_id);

      // Sesi kegiatan ekskul ini
      const sessions = store.sessions.filter(
        (s) =>
          s.ekskul_id === enr.ekskul_id &&
          s.semester === data.semester &&
          s.academic_year === data.academicYear
      );

      const sessionIds = new Set(sessions.map((s) => s.id));
      const myAttendances = store.attendances.filter(
        (a) => sessionIds.has(a.session_id) && a.student_id === data.studentId
      );

      const hadir = myAttendances.filter((a) => a.status === "hadir").length;
      const izin = myAttendances.filter((a) => a.status === "izin").length;
      const sakit = myAttendances.filter((a) => a.status === "sakit").length;
      const alpa = myAttendances.filter((a) => a.status === "alpa").length;
      const totalSesi = sessions.length;
      const attendanceRate = totalSesi > 0 ? Math.round((hadir / totalSesi) * 100) : 100;

      // Nilai
      const grade =
        store.grades.find(
          (g) =>
            g.ekskul_id === enr.ekskul_id &&
            g.student_id === data.studentId &&
            g.semester === data.semester &&
            g.academic_year === data.academicYear
        ) || null;

      // Pembayaran
      const payments = store.payments.filter(
        (p) => p.ekskul_id === enr.ekskul_id && p.student_id === data.studentId
      );

      const totalFee = payments.reduce((sum, p) => sum + p.amount, 0);
      const paidFee = payments
        .filter((p) => p.status === "lunas")
        .reduce((sum, p) => sum + p.amount, 0);
      const isAllPaid = payments.length > 0 ? payments.every((p) => p.status === "lunas") : true;

      return {
        enrollment: enr,
        ekskul,
        attendance: {
          totalSesi,
          hadir,
          izin,
          sakit,
          alpa,
          attendanceRate,
          records: myAttendances,
        },
        grade,
        payments,
        paymentSummary: {
          totalFee,
          paidFee,
          isAllPaid,
        },
      };
    });

    return {
      studentId: data.studentId,
      myEkskuls,
      totalEnrolled: myEkskuls.length,
    };
  });

// ──────────────────────────────────────────────────────────────
// 7. REKAP EKSKUL (ADMIN / REKAP)
// ──────────────────────────────────────────────────────────────

export const getEkskulRecapDataFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        semester: z.string().default("1"),
        academicYear: z.string().default("2026/2027"),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const supabaseAdmin = (context as any).supabase;
    const store = await loadEkskulStore();

    // 1. Profil santri
    const { data: students } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, name, display_name, nis_nip, class")
      .eq("account_type", "santri")
      .order("name");

    const studentsMap = new Map((students || []).map((s: any) => [s.id, normalizeStudent(s)]));

    // 2. Rekap per Ekskul
    const ekskulStats = store.ekskuls.map((ekskul) => {
      const enrollments = store.enrollments.filter(
        (enr) =>
          enr.ekskul_id === ekskul.id &&
          enr.semester === data.semester &&
          enr.academic_year === data.academicYear &&
          enr.status === "aktif"
      );

      const sessions = store.sessions.filter(
        (s) =>
          s.ekskul_id === ekskul.id &&
          s.semester === data.semester &&
          s.academic_year === data.academicYear
      );

      const payments = store.payments.filter((p) => p.ekskul_id === ekskul.id);
      const totalBilled = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalPaid = payments
        .filter((p) => p.status === "lunas")
        .reduce((sum, p) => sum + p.amount, 0);

      const grades = store.grades.filter(
        (g) =>
          g.ekskul_id === ekskul.id &&
          g.semester === data.semester &&
          g.academic_year === data.academicYear
      );

      return {
        ekskul,
        totalMembers: enrollments.length,
        totalSessions: sessions.length,
        totalGrades: grades.length,
        finance: {
          totalBilled,
          totalPaid,
          unpaid: totalBilled - totalPaid,
        },
      };
    });

    return {
      ekskulStats,
      totalEkskuls: store.ekskuls.length,
      activeEkskuls: store.ekskuls.filter((e) => e.is_active).length,
    };
  });

// ──────────────────────────────────────────────────────────────
// 8. OPSI PEMBINA / PENGAJAR EKSKUL DARI MANAJEMEN ANGGOTA
// ──────────────────────────────────────────────────────────────

export const getCoachOptionsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const supabaseAdmin = (context as any).supabase;

    // Ambil guru, pembina ekskul, wali kelas, atau tendik
    const { data: coaches, error } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, name, display_name, account_type, nis_nip")
      .neq("account_type", "santri")
      .order("name");

    if (error) {
      console.error("Error fetching coach options:", error);
      return [];
    }

    return (coaches || []).map((c: any) => ({
      id: c.id,
      name: c.name || c.display_name,
      account_type: c.account_type,
      nis_nip: c.nis_nip,
    }));
  });

