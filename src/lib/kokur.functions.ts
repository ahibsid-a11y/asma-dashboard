import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_KOKUR_THEMES,
  generateKokurNarrative,
  getStudentKokurRecord,
  loadKokurStore,
  saveStudentKokurRecord,
  type KokurPredicate,
  type StudentKokurGrade,
} from "./kokur.storage.server";

const predicateSchema = z.enum(["SB", "BSH", "MB", "BB"]);

/**
 * 1. Ambil Semua Tema Kokurikuler (P5 / P5RA)
 */
export const getKokurThemesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const store = loadKokurStore();
    return store.themes || DEFAULT_KOKUR_THEMES;
  });

/**
 * 2. Ambil Data Santri per Kelas beserta Nilai Kokurikuler
 */
export const getKokurClassDataFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        className: z.string(),
        semester: z.string().default("1"),
        academicYear: z.string().default("2026/2027"),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ambil daftar kelas yang tersedia dari database
    const { data: classRows } = await (supabaseAdmin as any)
      .from("classes")
      .select("name")
      .order("grade", { ascending: true })
      .order("name", { ascending: true });

    let availableClasses = (classRows || []).map((c: any) => c.name);
    if (availableClasses.length === 0) {
      const { data: distinctClasses } = await (supabaseAdmin as any)
        .from("profiles")
        .select("class")
        .eq("account_type", "santri")
        .not("class", "is", null);
      availableClasses = Array.from(
        new Set((distinctClasses || []).map((d: any) => d.class).filter(Boolean))
      ).sort();
    }
    if (availableClasses.length === 0) {
      availableClasses = ["7A", "7B", "8A", "8B", "9A", "9B"];
    }

    const targetClass = data.className || availableClasses[0] || "7A";

    // Ambil murid di kelas tersebut dengan kolom yang sesuai di tabel profiles
    const { data: students, error: studentsErr } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, name, display_name, nis_nip, class, dorm")
      .eq("account_type", "santri")
      .eq("class", targetClass)
      .order("name", { ascending: true });

    if (studentsErr) {
      console.error("Error fetching students:", studentsErr);
    }

    const studentList = (students || []).map((s: any) => ({
      ...s,
      full_name: s.name || s.display_name || "Santri",
      class_name: s.class || "-",
    }));
    const store = loadKokurStore();

    // Map setiap santri dengan record nilai jika ada
    const result = studentList.map((s: any) => {
      const key = `${s.id}_${data.semester}_${data.academicYear}`;
      const record = store.records[key] || null;
      return {
        student: s,
        record,
      };
    });

    return {
      themes: store.themes || DEFAULT_KOKUR_THEMES,
      students: result,
      availableClasses,
      selectedClass: targetClass,
    };
  });

/**
 * 3. Ambil Nilai Kokurikuler 1 Santri
 */
export const getStudentKokurFn = createServerFn({ method: "POST" })
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
    const store = loadKokurStore();
    const record = getStudentKokurRecord(data.studentId, data.semester, data.academicYear);
    return {
      themes: store.themes || DEFAULT_KOKUR_THEMES,
      record,
    };
  });

/**
 * 4. Simpan Nilai Kokurikuler Santri
 */
export const saveStudentKokurFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        studentId: z.string(),
        studentName: z.string().optional(),
        semester: z.string().default("1"),
        academicYear: z.string().default("2026/2027"),
        grades: z.record(
          z.object({
            predicate: predicateSchema,
            notes: z.string().optional(),
          })
        ),
        narrative: z.string().optional(),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const store = loadKokurStore();
    const themes = store.themes || DEFAULT_KOKUR_THEMES;

    // Jika user tidak menulis custom narrative, otomatis generate dari predikat
    let narrative = data.narrative?.trim();
    if (!narrative) {
      narrative = generateKokurNarrative(
        data.studentName || "Santri",
        data.grades as Record<string, StudentKokurGrade>,
        themes
      );
    }

    const saved = saveStudentKokurRecord({
      student_id: data.studentId,
      semester: data.semester,
      academic_year: data.academicYear,
      grades: data.grades as Record<string, StudentKokurGrade>,
      narrative,
    });

    return {
      success: true,
      record: saved,
    };
  });

/**
 * 5. Preview Generate Narasi (Helper untuk UI)
 */
export const previewKokurNarrativeFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        studentName: z.string(),
        grades: z.record(
          z.object({
            predicate: predicateSchema,
            notes: z.string().optional(),
          })
        ),
      })
      .parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const store = loadKokurStore();
    const narrative = generateKokurNarrative(
      data.studentName,
      data.grades as Record<string, StudentKokurGrade>,
      store.themes || DEFAULT_KOKUR_THEMES
    );
    return { narrative };
  });
