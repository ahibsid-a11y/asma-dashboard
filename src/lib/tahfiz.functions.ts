import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  IQRO_STAGES,
  SURAH_LIST,
  TAHFIZ_TARGET_STANDARDS,
  getGradeCodeFromClassName,
} from "./quran-data";
import {
  deleteTahfizRecord,
  getAllTahfizStore,
  defaultLevelForGrade,
  getStudentTahfizHistory,
  saveIqroRecord,
  saveTahfizHafalanRecord,
  saveTilawahRecord,
  setStudentLevel,
  type TahfizHafalanRecord,
  type TahfizIqroRecord,
  type TahfizLevel,
  type TahfizTilawahRecord,
} from "./tahfiz.storage.server";

type Ctx = { supabase: any; userId: string };

/**
 * 1. Mengambil konteks halaqoh untuk Musyrif / Mudir / Admin
 */
export const getMusyrifHalaqohContext = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        selectedHalaqoh: z.string().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ambil profil musyrif / user yang login
    const { data: myProfile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,account_type,halaqoh")
      .eq("id", ctx.userId)
      .maybeSingle();

    // Ambil semua halaqoh
    const { data: halaqohList } = await (supabaseAdmin as any)
      .from("halaqohs")
      .select("id,name,musyrif_id")
      .order("name");

    const halaqohs = halaqohList || [];

    // Tentukan halaqoh aktif
    let activeHalaqoh = data.selectedHalaqoh || "";
    if (!activeHalaqoh) {
      if (myProfile?.halaqoh) {
        activeHalaqoh = myProfile.halaqoh;
      } else {
        const myHalaqoh = halaqohs.find((h: any) => h.musyrif_id === ctx.userId);
        if (myHalaqoh) {
          activeHalaqoh = myHalaqoh.name;
        } else if (halaqohs.length > 0) {
          activeHalaqoh = halaqohs[0].name;
        }
      }
    }

    // Ambil semua santri
    let query = (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,nis_nip,class,dorm,halaqoh,status")
      .eq("account_type", "santri")
      .order("name");

    const { data: santriList } = await query;
    const allStudents = santriList || [];

    const store = await getAllTahfizStore();
    const fallbackTarget = TAHFIZ_TARGET_STANDARDS["VII"]!;

    // Mapping santri dengan level dan setoran terakhir
    const formattedStudents = allStudents.map((s: any) => {
      const level = store.studentLevels[s.id]?.level ?? defaultLevelForGrade(s.class);
      const gradeCode = getGradeCodeFromClassName(s.class);
      const target = TAHFIZ_TARGET_STANDARDS[gradeCode] ?? fallbackTarget;

      // Cari setoran terakhir santri
      const lastIqro = store.iqroRecords.find((r) => r.student_id === s.id);
      const lastTilawah = store.tilawahRecords.find((r) => r.student_id === s.id);
      const lastHafalan = store.hafalanRecords.find((r) => r.student_id === s.id);

      const levelInfo = store.studentLevels[s.id];

      return {
        id: s.id,
        name: s.name,
        nis_nip: s.nis_nip,
        class: s.class,
        dorm: s.dorm,
        halaqoh: s.halaqoh,
        status: s.status,
        level,
        gradeCode,
        target,
        currentPosition: levelInfo?.current_position_desc || null,
        lastIqro: lastIqro || null,
        lastTilawah: lastTilawah || null,
        lastHafalan: lastHafalan || null,
      };
    });

    return {
      currentUser: myProfile,
      activeHalaqoh,
      halaqohs,
      students: formattedStudents,
      surahList: SURAH_LIST,
      iqroStages: IQRO_STAGES,
    };
  });

/**
 * 2. Mengambil riwayat detail tahfiz 1 santri
 */
export const getStudentTahfizDetail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        studentId: z.string().min(1),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: student } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,nis_nip,class,dorm,halaqoh")
      .eq("id", data.studentId)
      .maybeSingle();

    const history = await getStudentTahfizHistory(data.studentId);
    const gradeCode = getGradeCodeFromClassName(student?.class);
    const fallbackTarget = TAHFIZ_TARGET_STANDARDS["VII"]!;
    const target = TAHFIZ_TARGET_STANDARDS[gradeCode] ?? fallbackTarget;

    return {
      student,
      gradeCode,
      target,
      history,
      surahList: SURAH_LIST,
      iqroStages: IQRO_STAGES,
    };
  });

/**
 * 3. Mengambil riwayat tahfiz santri yang sedang login
 */
export const getMyTahfizData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: student } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,nis_nip,class,dorm,halaqoh")
      .eq("id", ctx.userId)
      .maybeSingle();

    const history = await getStudentTahfizHistory(ctx.userId);
    const gradeCode = getGradeCodeFromClassName(student?.class);
    const fallbackTarget = TAHFIZ_TARGET_STANDARDS["VII"]!;
    const target = TAHFIZ_TARGET_STANDARDS[gradeCode] ?? fallbackTarget;

    return {
      student,
      gradeCode,
      target,
      history,
      surahList: SURAH_LIST,
      iqroStages: IQRO_STAGES,
    };
  });

/**
 * 4. Simpan Setoran Tingkat Iqro (Metode Itqon)
 */
export const saveIqroEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        student_id: z.string().min(1),
        date: z.string().min(1),
        halaman: z.coerce.number().min(1),
        tahap: z.string().min(1),
        nilai: z.union([z.number(), z.string()]),
        catatan: z.string().default(""),
        murojaah_harian: z.string().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const record = await saveIqroRecord({
      student_id: data.student_id,
      date: data.date,
      halaman: data.halaman,
      tahap: data.tahap,
      nilai: data.nilai,
      catatan: data.catatan,
      murojaah_harian: data.murojaah_harian,
      musyrif_id: ctx.userId,
      id: data.id,
    });
    return { success: true, record };
  });

/**
 * 5. Simpan Setoran Tingkat Tilawah
 */
export const saveTilawahEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        student_id: z.string().min(1),
        date: z.string().min(1),
        juz: z.coerce.number().min(1).max(30),
        surah_name: z.string().min(1),
        ayat_start: z.coerce.number().min(1),
        ayat_end: z.coerce.number().min(1),
        halaman: z.coerce.number().optional(),
        nilai_kelancaran: z.string().min(1),
        nilai_tajwid: z.string().optional(),
        catatan: z.string().default(""),
        murojaah_harian: z.string().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const record = await saveTilawahRecord({
      student_id: data.student_id,
      date: data.date,
      juz: data.juz,
      surah_name: data.surah_name,
      ayat_start: data.ayat_start,
      ayat_end: data.ayat_end,
      halaman: data.halaman,
      nilai_kelancaran: data.nilai_kelancaran,
      nilai_tajwid: data.nilai_tajwid,
      catatan: data.catatan,
      murojaah_harian: data.murojaah_harian,
      musyrif_id: ctx.userId,
      id: data.id,
    });
    return { success: true, record };
  });

/**
 * 6. Simpan Setoran Tahfiz (Sabq, Sabqy, Manzil)
 */
export const saveTahfizHafalanEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        student_id: z.string().min(1),
        date: z.string().min(1),
        type: z.enum(["sabq", "sabqy", "manzil"]),
        juz: z.coerce.number().min(1).max(30),
        surah_name: z.string().min(1),
        ayat_start: z.coerce.number().min(1),
        ayat_end: z.coerce.number().min(1),
        nilai: z.union([z.number(), z.string()]),
        predikat: z.string().optional(),
        catatan: z.string().default(""),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const record = await saveTahfizHafalanRecord({
      student_id: data.student_id,
      date: data.date,
      type: data.type,
      juz: data.juz,
      surah_name: data.surah_name,
      ayat_start: data.ayat_start,
      ayat_end: data.ayat_end,
      nilai: data.nilai,
      predikat: data.predikat,
      catatan: data.catatan,
      musyrif_id: ctx.userId,
      id: data.id,
    });
    return { success: true, record };
  });

/**
 * 7. Hapus Catatan Setoran
 */
export const deleteTahfizEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        category: z.enum(["iqro", "tilawah", "hafalan"]),
        id: z.string().min(1),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const deleted = await deleteTahfizRecord(data.category, data.id);
    return { success: deleted };
  });

/**
 * 8. Ubah Level Aktif Santri (Iqro / Tilawah / Tahfiz)
 */
export const updateStudentLevelFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        student_id: z.string().min(1),
        level: z.enum(["iqro", "tilawah", "tahfiz"]),
        positionDesc: z.string().optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const updated = await setStudentLevel(data.student_id, data.level, data.positionDesc);
    return { success: true, updated };
  });

/**
 * 9. Rekapitulasi Lengkap Tahfiz untuk Laporan & Cetak Buku Kontrol
 */
export const getTahfizRecap = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        halaqoh: z.string().optional(),
        className: z.string().optional(),
        level: z.string().optional(),
        semester: z.string().default("1"),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ambil data santri
    let query = (supabaseAdmin as any)
      .from("profiles")
      .select("id,name,nis_nip,class,dorm,halaqoh,status")
      .eq("account_type", "santri")
      .order("name");

    if (data.halaqoh && data.halaqoh !== "all") {
      query = query.eq("halaqoh", data.halaqoh);
    }
    if (data.className && data.className !== "all") {
      query = query.eq("class", data.className);
    }

    const { data: santriList } = await query;
    const students = santriList || [];

    const store = await getAllTahfizStore();

    // Rekap per santri
    const recapRows = students.map((s: any) => {
      const level = store.studentLevels[s.id]?.level ?? defaultLevelForGrade(s.class);
      const gradeCode = getGradeCodeFromClassName(s.class);
      const fallbackStandard = TAHFIZ_TARGET_STANDARDS["VII"]!;
      const targetStandard = TAHFIZ_TARGET_STANDARDS[gradeCode] ?? fallbackStandard;
      const targetSemester =
        data.semester === "2" ? targetStandard.semesterGenap : targetStandard.semesterGasal;

      const iqroList = store.iqroRecords.filter((r) => r.student_id === s.id);
      const tilawahList = store.tilawahRecords.filter((r) => r.student_id === s.id);
      const hafalanList = store.hafalanRecords.filter((r) => r.student_id === s.id);

      const sabqList = hafalanList.filter((r) => r.type === "sabq");
      const sabqyList = hafalanList.filter((r) => r.type === "sabqy");
      const manzilList = hafalanList.filter((r) => r.type === "manzil");

      const levelInfo = store.studentLevels[s.id];

      // Ambil capaian terakhir
      const lastIqro = iqroList[0] || null;
      const lastTilawah = tilawahList[0] || null;
      const lastSabq = sabqList[0] || null;

      return {
        student: s,
        level,
        gradeCode,
        targetSemester,
        currentPosition: levelInfo?.current_position_desc || "-",
        totalIqroCount: iqroList.length,
        lastIqroPage: lastIqro ? lastIqro.halaman : null,
        lastIqroTahap: lastIqro ? lastIqro.tahap : null,
        lastIqroNilai: lastIqro ? lastIqro.nilai : null,

        totalTilawahCount: tilawahList.length,
        lastTilawahSurah: lastTilawah
          ? `${lastTilawah.surah_name} (Ayat ${lastTilawah.ayat_start}-${lastTilawah.ayat_end})`
          : null,
        lastTilawahJuz: lastTilawah ? lastTilawah.juz : null,

        totalSabqCount: sabqList.length,
        totalSabqyCount: sabqyList.length,
        totalManzilCount: manzilList.length,
        lastSabqSurah: lastSabq
          ? `${lastSabq.surah_name} (Ayat ${lastSabq.ayat_start}-${lastSabq.ayat_end})`
          : null,
        lastSabqJuz: lastSabq ? lastSabq.juz : null,
      };
    });

    // Filter level jika dipilih
    const filteredRows =
      data.level && data.level !== "all"
        ? recapRows.filter((r: any) => r.level === data.level)
        : recapRows;

    return {
      semester: data.semester,
      totalStudents: filteredRows.length,
      rows: filteredRows,
    };
  });

// ──────────────────────────────────────────────────────────────
// 6. UJIAN TAHFIZ & PENILAIAN PER SOAL (RAPOR TAHFIZ)
// ──────────────────────────────────────────────────────────────

export const saveTahfizExamFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        student_id: z.string(),
        student_name: z.string(),
        nis_nip: z.string().default("-"),
        class_name: z.string().default("-"),
        halaqoh_name: z.string().default("-"),
        musyrif_name: z.string().default("-"),
        examiner_name: z.string().default("Penguji Tahfiz"),
        exam_title: z.string().default("Ujian Tasmi' Tahfiz"),
        target_juz: z.string().default("Juz 30"),
        date: z.string(),
        semester: z.string().default("1"),
        academic_year: z.string().default("2026/2027"),
        questions: z.array(
          z.object({
            question_number: z.number(),
            surah_ayat: z.string(),
            tajwid_score: z.number().min(0).max(100),
            hafalan_score: z.number().min(0).max(100),
            notes: z.string().optional(),
          })
        ),
        notes: z.string().optional(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { saveOrUpdateTahfizExam } = await import("./tahfiz.exams.server");
    const exam = saveOrUpdateTahfizExam(data as any);
    return { success: true, exam, message: "Ujian Tahfiz berhasil disimpan!" };
  });

export const getTahfizExamsListFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        semester: z.string().optional(),
        academicYear: z.string().optional(),
        studentId: z.string().optional(),
        halaqoh: z.string().optional(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { loadTahfizExamsStore } = await import("./tahfiz.exams.server");
    const store = loadTahfizExamsStore();
    let exams = store.exams;

    if (data.studentId) {
      exams = exams.filter((e) => e.student_id === data.studentId);
    }
    if (data.semester && data.semester !== "all") {
      exams = exams.filter((e) => e.semester === data.semester);
    }
    if (data.academicYear && data.academicYear !== "all") {
      exams = exams.filter((e) => e.academic_year === data.academicYear);
    }
    if (data.halaqoh && data.halaqoh !== "all") {
      exams = exams.filter((e) => e.halaqoh_name === data.halaqoh);
    }

    return { exams };
  });

export const deleteTahfizExamFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        examId: z.string(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { deleteTahfizExam } = await import("./tahfiz.exams.server");
    const deleted = deleteTahfizExam(data.examId);
    return { success: deleted, message: "Data ujian berhasil dihapus" };
  });

export const getStudentTahfizExamsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        studentId: z.string(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { loadTahfizExamsStore } = await import("./tahfiz.exams.server");
    const store = loadTahfizExamsStore();
    const exams = store.exams.filter((e) => e.student_id === data.studentId);
    return { exams };
  });
