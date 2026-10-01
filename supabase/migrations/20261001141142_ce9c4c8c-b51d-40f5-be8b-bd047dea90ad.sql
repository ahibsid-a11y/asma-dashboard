CREATE TABLE public.tahfiz_exams (
  id text PRIMARY KEY DEFAULT ('exam-' || substr(gen_random_uuid()::text, 1, 8)),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name text NOT NULL DEFAULT '',
  nis_nip text NOT NULL DEFAULT '-',
  class_name text NOT NULL DEFAULT '-',
  halaqoh_name text NOT NULL DEFAULT '-',
  musyrif_name text NOT NULL DEFAULT '-',
  examiner_name text NOT NULL DEFAULT '',
  exam_title text NOT NULL DEFAULT '',
  target_juz text NOT NULL DEFAULT '',
  date date NOT NULL,
  semester text NOT NULL DEFAULT '1',
  academic_year text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  tajwid_avg numeric NOT NULL DEFAULT 0,
  hafalan_avg numeric NOT NULL DEFAULT 0,
  final_score numeric NOT NULL DEFAULT 0,
  predicate text NOT NULL DEFAULT '',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tahfiz_exams_student_idx ON public.tahfiz_exams(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tahfiz_exams TO authenticated;
GRANT ALL ON public.tahfiz_exams TO service_role;
ALTER TABLE public.tahfiz_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff or owner can view tahfiz exams" ON public.tahfiz_exams FOR SELECT TO authenticated
  USING (public.is_not_santri(auth.uid()) OR student_id = auth.uid());
CREATE POLICY "Staff can add tahfiz exams" ON public.tahfiz_exams FOR INSERT TO authenticated
  WITH CHECK (public.is_not_santri(auth.uid()));
CREATE POLICY "Staff can edit tahfiz exams" ON public.tahfiz_exams FOR UPDATE TO authenticated
  USING (public.is_not_santri(auth.uid())) WITH CHECK (public.is_not_santri(auth.uid()));
CREATE POLICY "Staff can delete tahfiz exams" ON public.tahfiz_exams FOR DELETE TO authenticated
  USING (public.is_not_santri(auth.uid()));
CREATE TRIGGER update_tahfiz_exams_updated_at BEFORE UPDATE ON public.tahfiz_exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();