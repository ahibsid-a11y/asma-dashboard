-- Migration: Curriculum Planning (CP, TP, ATP, Alokasi Waktu, PROTA, PROMES)
-- File: supabase/migrations/20260914232500_curriculum_plans.sql

-- 1. Tabel Header Perangkat Ajar per Mapel & Kelas
CREATE TABLE IF NOT EXISTS public.curriculum_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2026/2027',
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    phase TEXT NOT NULL DEFAULT 'D',
    jp_per_week INT NOT NULL DEFAULT 2,
    total_tp_count INT NOT NULL DEFAULT 0,
    completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    realization_ganjil_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    realization_genap_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_plan_subject_class_year UNIQUE (subject_id, class_name, academic_year)
);

-- 2. Tabel Elemen & Capaian Pembelajaran (CP)
CREATE TABLE IF NOT EXISTS public.curriculum_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.curriculum_plans(id) ON DELETE CASCADE,
    order_index INT NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    cp_description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Perluas tabel learning_objectives yang sudah ada agar terintegrasi penuh dengan ATP, Alokasi JP, dan Kurikulum Merdeka
ALTER TABLE public.learning_objectives 
ADD COLUMN IF NOT EXISTS element_name TEXT,
ADD COLUMN IF NOT EXISTS cognitive_level TEXT DEFAULT 'C2 - Memahami',
ADD COLUMN IF NOT EXISTS dimension TEXT DEFAULT 'Pengetahuan',
ADD COLUMN IF NOT EXISTS atp_order INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS atp_flow TEXT,
ADD COLUMN IF NOT EXISTS alokasi_jp INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS assessment_method TEXT DEFAULT 'Tes Tertulis',
ADD COLUMN IF NOT EXISTS status_tp BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS status_atp BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS status_asesmen BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS status_realisasi TEXT DEFAULT 'Belum Terlaksana',
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.curriculum_plans(id) ON DELETE SET NULL;

-- 4. Tabel Analisis Alokasi Waktu (Pekan Kalender & Pekan Efektif)
CREATE TABLE IF NOT EXISTS public.curriculum_time_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.curriculum_plans(id) ON DELETE CASCADE,
    semester TEXT NOT NULL CHECK (semester IN ('1', '2')),
    month_name TEXT NOT NULL,
    month_order INT NOT NULL DEFAULT 1,
    calendar_weeks NUMERIC(4,1) NOT NULL DEFAULT 4.0,
    non_effective_weeks NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    effective_weeks NUMERIC(4,1) NOT NULL DEFAULT 4.0,
    effective_jp NUMERIC(5,1) NOT NULL DEFAULT 8.0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_plan_sem_month UNIQUE (plan_id, semester, month_name)
);

-- 5. Tabel Matriks Sebaran Pekanan Program Semester (PROMES)
CREATE TABLE IF NOT EXISTS public.curriculum_promes_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.curriculum_plans(id) ON DELETE CASCADE,
    tp_id UUID NOT NULL REFERENCES public.learning_objectives(id) ON DELETE CASCADE,
    semester TEXT NOT NULL CHECK (semester IN ('1', '2')),
    month_name TEXT NOT NULL,
    week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 5),
    allocated_jp INT NOT NULL DEFAULT 0,
    activity_type TEXT NOT NULL DEFAULT 'kbm' CHECK (activity_type IN ('kbm', 'formatif', 'sts', 'sas', 'libur', 'remedial')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_plan_tp_sem_month_week UNIQUE (plan_id, tp_id, semester, month_name, week_number)
);

-- Indexes untuk performa query cepat
CREATE INDEX IF NOT EXISTS idx_curr_plans_subj_class ON public.curriculum_plans(subject_id, class_name, academic_year);
CREATE INDEX IF NOT EXISTS idx_curr_elements_plan ON public.curriculum_elements(plan_id);
CREATE INDEX IF NOT EXISTS idx_learning_obj_plan ON public.learning_objectives(plan_id);
CREATE INDEX IF NOT EXISTS idx_curr_time_alloc_plan ON public.curriculum_time_allocations(plan_id);
CREATE INDEX IF NOT EXISTS idx_curr_promes_plan ON public.curriculum_promes_entries(plan_id);

-- Enable RLS
ALTER TABLE public.curriculum_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_time_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_promes_entries ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can read
CREATE POLICY "Allow authenticated read curriculum_plans" ON public.curriculum_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage curriculum_plans" ON public.curriculum_plans FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read curriculum_elements" ON public.curriculum_elements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage curriculum_elements" ON public.curriculum_elements FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read curriculum_time_allocations" ON public.curriculum_time_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage curriculum_time_allocations" ON public.curriculum_time_allocations FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read curriculum_promes_entries" ON public.curriculum_promes_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage curriculum_promes_entries" ON public.curriculum_promes_entries FOR ALL TO authenticated USING (true);
