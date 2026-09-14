-- Migration: 20260914223000_academic_grades.sql
-- Modul Penilaian Berbasis CP & TP dan Rapor Digital SIM-AHIBS

-- 1. Tabel Mata Pelajaran (Academic Subjects)
CREATE TABLE IF NOT EXISTS public.academic_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  "group" text NOT NULL CHECK ("group" IN ('Umum', 'Diniyyah', 'Bahasa Arab', 'Muatan Lokal')),
  kkm integer NOT NULL DEFAULT 75,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tabel Guru Pengampu Mapel per Kelas (Subject Teachers)
CREATE TABLE IF NOT EXISTS public.subject_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_year text NOT NULL DEFAULT '2026/2027',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_subject_class_teacher UNIQUE (subject_id, class_name, academic_year)
);

-- 3. Tabel Tujuan Pembelajaran (Learning Objectives - TP & CP)
CREATE TABLE IF NOT EXISTS public.learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  semester text NOT NULL DEFAULT '1',
  academic_year text NOT NULL DEFAULT '2026/2027',
  code text NOT NULL, -- misal: 'TP 1', 'TP 2'
  description text NOT NULL, -- ringkasan materi/kompetensi
  cp_code text,
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_subject_tp UNIQUE (subject_id, class_name, semester, academic_year, code)
);

-- 4. Tabel Nilai Formatif per-TP (Student TP Grades)
CREATE TABLE IF NOT EXISTS public.student_tp_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tp_id uuid NOT NULL REFERENCES public.learning_objectives(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score numeric(5,2) NOT NULL DEFAULT 0,
  graded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_tp_student_grade UNIQUE (tp_id, student_id)
);

-- 5. Tabel Rekap Nilai Akhir Mapel, STS, SAS & Deskripsi Rapor (Student Subject Summaries)
CREATE TABLE IF NOT EXISTS public.student_subject_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  semester text NOT NULL DEFAULT '1',
  academic_year text NOT NULL DEFAULT '2026/2027',
  avg_tp_score numeric(5,2) NOT NULL DEFAULT 0,
  sts_score numeric(5,2) NOT NULL DEFAULT 0, -- Sumatif Tengah Semester / UTS
  sas_score numeric(5,2) NOT NULL DEFAULT 0, -- Sumatif Akhir Semester / UAS
  final_score numeric(5,2) NOT NULL DEFAULT 0,
  letter_grade text NOT NULL DEFAULT 'C',
  highest_tp_desc text,
  lowest_tp_desc text,
  teacher_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_subject_summary UNIQUE (student_id, subject_id, semester, academic_year)
);

-- 6. Tabel Pengaturan Bobot Penilaian
CREATE TABLE IF NOT EXISTS public.grading_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL DEFAULT '2026/2027',
  semester text NOT NULL DEFAULT '1',
  weight_tp integer NOT NULL DEFAULT 50, -- 50%
  weight_sts integer NOT NULL DEFAULT 25, -- 25%
  weight_sas integer NOT NULL DEFAULT 25, -- 25%
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_grading_settings UNIQUE (academic_year, semester)
);

-- Grants & RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_subjects TO authenticated;
GRANT ALL ON public.academic_subjects TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_teachers TO authenticated;
GRANT ALL ON public.subject_teachers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_objectives TO authenticated;
GRANT ALL ON public.learning_objectives TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_tp_grades TO authenticated;
GRANT ALL ON public.student_tp_grades TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_subject_summaries TO authenticated;
GRANT ALL ON public.student_subject_summaries TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grading_settings TO authenticated;
GRANT ALL ON public.grading_settings TO service_role;

ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tp_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subject_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view academic subjects"
ON public.academic_subjects FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Manage academic subjects"
ON public.academic_subjects FOR ALL TO authenticated
USING (public.is_member_admin(auth.uid()))
WITH CHECK (public.is_member_admin(auth.uid()));

CREATE POLICY "Anyone view learning objectives"
ON public.learning_objectives FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Manage learning objectives"
ON public.learning_objectives FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "View student tp grades"
ON public.student_tp_grades FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Manage student tp grades"
ON public.student_tp_grades FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "View student subject summaries"
ON public.student_subject_summaries FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Manage student subject summaries"
ON public.student_subject_summaries FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "View grading settings"
ON public.grading_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Manage grading settings"
ON public.grading_settings FOR ALL TO authenticated
USING (public.is_member_admin(auth.uid()))
WITH CHECK (public.is_member_admin(auth.uid()));

-- Pre-seed Standar Mata Pelajaran
INSERT INTO public.academic_subjects (code, name, "group", kkm, order_index, is_active)
VALUES
  -- Kelompok Umum (Kemendikdasmen)
  ('PAI', 'Pendidikan Agama Islam & Budi Pekerti', 'Umum', 75, 1, true),
  ('PPKN', 'Pendidikan Pancasila', 'Umum', 75, 2, true),
  ('BIN', 'Bahasa Indonesia', 'Umum', 75, 3, true),
  ('MAT', 'Matematika', 'Umum', 75, 4, true),
  ('IPA', 'Ilmu Pengetahuan Alam (IPA)', 'Umum', 75, 5, true),
  ('IPS', 'Ilmu Pengetahuan Sosial (IPS)', 'Umum', 75, 6, true),
  ('BIG', 'Bahasa Inggris', 'Umum', 75, 7, true),
  ('INF', 'Informatika', 'Umum', 75, 8, true),
  ('PJK', 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)', 'Umum', 75, 9, true),
  ('SNB', 'Seni dan Prakarya', 'Umum', 75, 10, true),

  -- Kelompok Diniyyah (Kepesantrenan)
  ('FQH', 'Fiqih Ibadah', 'Diniyyah', 75, 11, true),
  ('THD', 'Tauhid & Aqidah', 'Diniyyah', 75, 12, true),
  ('SRH', 'Siroh Nabawiyah & Tarikh', 'Diniyyah', 75, 13, true),
  ('HDS', 'Hadits & Adab', 'Diniyyah', 75, 14, true),

  -- Kelompok Bahasa Arab
  ('ABA', 'Al-Arobiyyah Lil Aulad (ABA)', 'Bahasa Arab', 75, 15, true),
  ('IML', 'Imla & Khot', 'Bahasa Arab', 75, 16, true),
  ('NHW', 'Nahwu & Shorof Dasar', 'Bahasa Arab', 75, 17, true)
ON CONFLICT (code) DO NOTHING;

-- Default Grading Settings
INSERT INTO public.grading_settings (academic_year, semester, weight_tp, weight_sts, weight_sas)
VALUES ('2026/2027', '1', 50, 25, 25)
ON CONFLICT (academic_year, semester) DO NOTHING;
