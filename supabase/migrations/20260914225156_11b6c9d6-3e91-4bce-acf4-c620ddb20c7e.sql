CREATE TABLE public.curriculum_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id text NOT NULL,
  class_name text NOT NULL,
  academic_year text NOT NULL,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  phase text NOT NULL DEFAULT 'D',
  jp_per_week integer NOT NULL DEFAULT 2,
  total_tp_count integer NOT NULL DEFAULT 0,
  completion_percentage numeric NOT NULL DEFAULT 0,
  realization_ganjil_percentage numeric NOT NULL DEFAULT 0,
  realization_genap_percentage numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, class_name, academic_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_plans TO authenticated;
GRANT ALL ON public.curriculum_plans TO service_role;
ALTER TABLE public.curriculum_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage curriculum plans" ON public.curriculum_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.curriculum_elements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.curriculum_plans(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  cp_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_curriculum_elements_plan ON public.curriculum_elements(plan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_elements TO authenticated;
GRANT ALL ON public.curriculum_elements TO service_role;
ALTER TABLE public.curriculum_elements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage curriculum elements" ON public.curriculum_elements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.learning_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid REFERENCES public.curriculum_plans(id) ON DELETE CASCADE,
  subject_id text NOT NULL,
  class_name text NOT NULL,
  academic_year text NOT NULL,
  semester text NOT NULL DEFAULT '1',
  code text NOT NULL,
  description text NOT NULL,
  cp_code text,
  element_name text,
  cognitive_level text NOT NULL DEFAULT 'C2 - Memahami',
  dimension text NOT NULL DEFAULT 'Pengetahuan',
  atp_order integer NOT NULL DEFAULT 1,
  atp_flow text,
  alokasi_jp numeric NOT NULL DEFAULT 2,
  assessment_method text NOT NULL DEFAULT 'Tes Tertulis',
  status_tp boolean NOT NULL DEFAULT true,
  status_atp boolean NOT NULL DEFAULT true,
  status_asesmen boolean NOT NULL DEFAULT true,
  status_realisasi text NOT NULL DEFAULT 'Belum Terlaksana',
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, class_name, academic_year, code)
);
CREATE INDEX idx_learning_objectives_lookup ON public.learning_objectives(subject_id, class_name, academic_year);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_objectives TO authenticated;
GRANT ALL ON public.learning_objectives TO service_role;
ALTER TABLE public.learning_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage learning objectives" ON public.learning_objectives FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.curriculum_time_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.curriculum_plans(id) ON DELETE CASCADE,
  semester text NOT NULL,
  month_name text NOT NULL,
  month_order integer NOT NULL DEFAULT 1,
  calendar_weeks numeric NOT NULL DEFAULT 0,
  non_effective_weeks numeric NOT NULL DEFAULT 0,
  effective_weeks numeric NOT NULL DEFAULT 0,
  effective_jp numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, semester, month_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_time_allocations TO authenticated;
GRANT ALL ON public.curriculum_time_allocations TO service_role;
ALTER TABLE public.curriculum_time_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage time allocations" ON public.curriculum_time_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.curriculum_promes_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.curriculum_plans(id) ON DELETE CASCADE,
  tp_id uuid NOT NULL,
  semester text NOT NULL,
  month_name text NOT NULL,
  week_number integer NOT NULL,
  allocated_jp numeric NOT NULL DEFAULT 0,
  activity_type text NOT NULL DEFAULT 'kbm',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, tp_id, semester, month_name, week_number)
);
CREATE INDEX idx_promes_plan ON public.curriculum_promes_entries(plan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_promes_entries TO authenticated;
GRANT ALL ON public.curriculum_promes_entries TO service_role;
ALTER TABLE public.curriculum_promes_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage promes entries" ON public.curriculum_promes_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_curriculum_plans_updated BEFORE UPDATE ON public.curriculum_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_curriculum_elements_updated BEFORE UPDATE ON public.curriculum_elements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_learning_objectives_updated BEFORE UPDATE ON public.learning_objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_time_allocations_updated BEFORE UPDATE ON public.curriculum_time_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_promes_updated BEFORE UPDATE ON public.curriculum_promes_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();