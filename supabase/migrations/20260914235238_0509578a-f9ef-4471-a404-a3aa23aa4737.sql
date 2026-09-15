-- 1. VIOLATION TYPES
CREATE TABLE public.violation_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Ringan',
  points integer NOT NULL DEFAULT 5,
  default_penalty text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.violation_types TO authenticated;
GRANT ALL ON public.violation_types TO service_role;
ALTER TABLE public.violation_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "violation_types_read" ON public.violation_types FOR SELECT TO authenticated USING (true);
CREATE TRIGGER violation_types_updated_at BEFORE UPDATE ON public.violation_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. MUTABAAH
CREATE TABLE public.mutabaah_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Ibadah',
  order_index integer NOT NULL DEFAULT 99,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mutabaah_activities TO authenticated;
GRANT ALL ON public.mutabaah_activities TO service_role;
ALTER TABLE public.mutabaah_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mutabaah_activities_read" ON public.mutabaah_activities FOR SELECT TO authenticated USING (true);
CREATE TRIGGER mutabaah_activities_updated_at BEFORE UPDATE ON public.mutabaah_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mutabaah_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.mutabaah_activities(id) ON DELETE CASCADE,
  date date NOT NULL,
  status boolean NOT NULL DEFAULT false,
  notes text,
  recorded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, activity_id, date)
);
CREATE INDEX mutabaah_records_date_idx ON public.mutabaah_records (date);
GRANT SELECT ON public.mutabaah_records TO authenticated;
GRANT ALL ON public.mutabaah_records TO service_role;
ALTER TABLE public.mutabaah_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mutabaah_records_read" ON public.mutabaah_records FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_not_santri(auth.uid()));
CREATE TRIGGER mutabaah_records_updated_at BEFORE UPDATE ON public.mutabaah_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. PERIZINAN
CREATE TABLE public.permit_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  max_days integer NOT NULL DEFAULT 3,
  requires_uks boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permit_categories TO authenticated;
GRANT ALL ON public.permit_categories TO service_role;
ALTER TABLE public.permit_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permit_categories_read" ON public.permit_categories FOR SELECT TO authenticated USING (true);
CREATE TRIGGER permit_categories_updated_at BEFORE UPDATE ON public.permit_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.permit_categories(id),
  category_name text NOT NULL,
  requires_uks boolean NOT NULL DEFAULT false,
  start_date date NOT NULL,
  start_time text NOT NULL DEFAULT '08:00',
  end_date date NOT NULL,
  end_time text NOT NULL DEFAULT '17:00',
  reason text NOT NULL,
  destination text,
  pickup_by text,
  pickup_phone text,
  attachment_url text,
  status text NOT NULL DEFAULT 'Menunggu Persetujuan',
  rejection_reason text,
  rejected_by uuid REFERENCES public.profiles(id),
  approved_kurikulum boolean NOT NULL DEFAULT false,
  approved_kurikulum_by uuid REFERENCES public.profiles(id),
  approved_kurikulum_at timestamptz,
  notes_kurikulum text,
  approved_kesantrian boolean NOT NULL DEFAULT false,
  approved_kesantrian_by uuid REFERENCES public.profiles(id),
  approved_kesantrian_at timestamptz,
  notes_kesantrian text,
  approved_uks boolean NOT NULL DEFAULT false,
  approved_uks_by uuid REFERENCES public.profiles(id),
  approved_uks_at timestamptz,
  notes_uks text,
  approved_kepsek boolean NOT NULL DEFAULT false,
  approved_kepsek_by uuid REFERENCES public.profiles(id),
  approved_kepsek_at timestamptz,
  notes_kepsek text,
  actual_checkout_at timestamptz,
  checkout_officer_id uuid REFERENCES public.profiles(id),
  actual_checkin_at timestamptz,
  checkin_officer_id uuid REFERENCES public.profiles(id),
  is_overdue boolean NOT NULL DEFAULT false,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX student_permits_student_idx ON public.student_permits (student_id);
CREATE INDEX student_permits_start_idx ON public.student_permits (start_date);
GRANT SELECT ON public.student_permits TO authenticated;
GRANT ALL ON public.student_permits TO service_role;
ALTER TABLE public.student_permits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_permits_read" ON public.student_permits FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_not_santri(auth.uid()));
CREATE TRIGGER student_permits_updated_at BEFORE UPDATE ON public.student_permits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. NILAI / AKADEMIK
CREATE TABLE public.academic_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  "group" text NOT NULL DEFAULT 'Umum',
  kkm integer NOT NULL DEFAULT 75,
  order_index integer NOT NULL DEFAULT 99,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academic_subjects TO authenticated;
GRANT ALL ON public.academic_subjects TO service_role;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academic_subjects_read" ON public.academic_subjects FOR SELECT TO authenticated USING (true);
CREATE TRIGGER academic_subjects_updated_at BEFORE UPDATE ON public.academic_subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_tp_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tp_id uuid NOT NULL REFERENCES public.learning_objectives(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  graded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tp_id, student_id)
);
GRANT SELECT ON public.student_tp_grades TO authenticated;
GRANT ALL ON public.student_tp_grades TO service_role;
ALTER TABLE public.student_tp_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_tp_grades_read" ON public.student_tp_grades FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_not_santri(auth.uid()));
CREATE TRIGGER student_tp_grades_updated_at BEFORE UPDATE ON public.student_tp_grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_subject_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id text NOT NULL,
  class_name text NOT NULL DEFAULT '',
  semester text NOT NULL DEFAULT '1',
  academic_year text NOT NULL DEFAULT '2026/2027',
  avg_tp_score numeric NOT NULL DEFAULT 0,
  sts_score numeric NOT NULL DEFAULT 0,
  sas_score numeric NOT NULL DEFAULT 0,
  final_score numeric NOT NULL DEFAULT 0,
  letter_grade text NOT NULL DEFAULT 'D',
  highest_tp_desc text,
  lowest_tp_desc text,
  teacher_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id, semester, academic_year)
);
CREATE INDEX student_subject_summaries_class_idx ON public.student_subject_summaries (class_name, semester, academic_year);
GRANT SELECT ON public.student_subject_summaries TO authenticated;
GRANT ALL ON public.student_subject_summaries TO service_role;
ALTER TABLE public.student_subject_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_subject_summaries_read" ON public.student_subject_summaries FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_not_santri(auth.uid()));
CREATE TRIGGER student_subject_summaries_updated_at BEFORE UPDATE ON public.student_subject_summaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.grading_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL,
  semester text NOT NULL,
  weight_tp integer NOT NULL DEFAULT 50,
  weight_sts integer NOT NULL DEFAULT 25,
  weight_sas integer NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academic_year, semester)
);
GRANT SELECT ON public.grading_settings TO authenticated;
GRANT ALL ON public.grading_settings TO service_role;
ALTER TABLE public.grading_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grading_settings_read" ON public.grading_settings FOR SELECT TO authenticated USING (true);
CREATE TRIGGER grading_settings_updated_at BEFORE UPDATE ON public.grading_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. TAHFIZ
CREATE TABLE public.tahfiz_student_levels (
  student_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'tahfiz',
  current_position_desc text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tahfiz_student_levels TO authenticated;
GRANT ALL ON public.tahfiz_student_levels TO service_role;
ALTER TABLE public.tahfiz_student_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tahfiz_levels_read" ON public.tahfiz_student_levels FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_not_santri(auth.uid()));
CREATE TRIGGER tahfiz_student_levels_updated_at BEFORE UPDATE ON public.tahfiz_student_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tahfiz_iqro_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  halaman integer NOT NULL DEFAULT 1,
  tahap text NOT NULL DEFAULT '',
  nilai text NOT NULL DEFAULT '',
  catatan text NOT NULL DEFAULT '',
  murojaah_harian text,
  musyrif_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tahfiz_iqro_student_idx ON public.tahfiz_iqro_records (student_id, date DESC);
GRANT SELECT ON public.tahfiz_iqro_records TO authenticated;
GRANT ALL ON public.tahfiz_iqro_records TO service_role;
ALTER TABLE public.tahfiz_iqro_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tahfiz_iqro_read" ON public.tahfiz_iqro_records FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_not_santri(auth.uid()));
CREATE TRIGGER tahfiz_iqro_updated_at BEFORE UPDATE ON public.tahfiz_iqro_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tahfiz_tilawah_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  juz integer NOT NULL DEFAULT 1,
  surah_name text NOT NULL DEFAULT '',
  ayat_start integer NOT NULL DEFAULT 1,
  ayat_end integer NOT NULL DEFAULT 1,
  halaman integer,
  nilai_kelancaran text NOT NULL DEFAULT '',
  nilai_tajwid text,
  catatan text NOT NULL DEFAULT '',
  murojaah_harian text,
  musyrif_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tahfiz_tilawah_student_idx ON public.tahfiz_tilawah_records (student_id, date DESC);
GRANT SELECT ON public.tahfiz_tilawah_records TO authenticated;
GRANT ALL ON public.tahfiz_tilawah_records TO service_role;
ALTER TABLE public.tahfiz_tilawah_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tahfiz_tilawah_read" ON public.tahfiz_tilawah_records FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_not_santri(auth.uid()));
CREATE TRIGGER tahfiz_tilawah_updated_at BEFORE UPDATE ON public.tahfiz_tilawah_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tahfiz_hafalan_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL DEFAULT 'sabq',
  juz integer NOT NULL DEFAULT 1,
  surah_name text NOT NULL DEFAULT '',
  ayat_start integer NOT NULL DEFAULT 1,
  ayat_end integer NOT NULL DEFAULT 1,
  nilai text NOT NULL DEFAULT '',
  predikat text,
  catatan text NOT NULL DEFAULT '',
  musyrif_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tahfiz_hafalan_student_idx ON public.tahfiz_hafalan_records (student_id, date DESC);
GRANT SELECT ON public.tahfiz_hafalan_records TO authenticated;
GRANT ALL ON public.tahfiz_hafalan_records TO service_role;
ALTER TABLE public.tahfiz_hafalan_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tahfiz_hafalan_read" ON public.tahfiz_hafalan_records FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_not_santri(auth.uid()));
CREATE TRIGGER tahfiz_hafalan_updated_at BEFORE UPDATE ON public.tahfiz_hafalan_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. JADWAL
CREATE TABLE public.class_subject_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL DEFAULT '2026/2027',
  class_name text NOT NULL,
  subject_id text NOT NULL,
  subject_code text NOT NULL DEFAULT '',
  subject_name text NOT NULL DEFAULT '',
  subject_group text NOT NULL DEFAULT 'Umum',
  teacher_id uuid REFERENCES public.profiles(id),
  teacher_name text,
  jp_per_week integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academic_year, class_name, subject_id)
);
GRANT SELECT ON public.class_subject_assignments TO authenticated;
GRANT ALL ON public.class_subject_assignments TO service_role;
ALTER TABLE public.class_subject_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class_subject_assignments_read" ON public.class_subject_assignments FOR SELECT TO authenticated USING (true);
CREATE TRIGGER class_subject_assignments_updated_at BEFORE UPDATE ON public.class_subject_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL DEFAULT '2026/2027',
  semester text NOT NULL DEFAULT '1',
  class_name text NOT NULL,
  day text NOT NULL,
  period integer NOT NULL,
  time_start text NOT NULL DEFAULT '',
  time_end text NOT NULL DEFAULT '',
  subject_id text NOT NULL DEFAULT '',
  subject_code text NOT NULL DEFAULT '',
  subject_name text NOT NULL DEFAULT '',
  teacher_id uuid REFERENCES public.profiles(id),
  teacher_name text,
  room text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academic_year, semester, class_name, day, period)
);
CREATE INDEX timetable_slots_teacher_idx ON public.timetable_slots (teacher_id);
GRANT SELECT ON public.timetable_slots TO authenticated;
GRANT ALL ON public.timetable_slots TO service_role;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timetable_slots_read" ON public.timetable_slots FOR SELECT TO authenticated USING (true);
CREATE TRIGGER timetable_slots_updated_at BEFORE UPDATE ON public.timetable_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();