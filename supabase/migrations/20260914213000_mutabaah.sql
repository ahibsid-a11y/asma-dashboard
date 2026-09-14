-- Migration: 20260914213000_mutabaah.sql
-- Modul Mutaba'ah Harian Santri (Amal Yaumi)

CREATE TABLE IF NOT EXISTS public.mutabaah_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Ibadah',
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mutabaah_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.mutabaah_activities(id) ON DELETE CASCADE,
  date date NOT NULL,
  status boolean NOT NULL DEFAULT true,
  notes text,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mutabaah_records_unique UNIQUE (student_id, activity_id, date)
);

CREATE INDEX IF NOT EXISTS idx_mutabaah_records_student_date ON public.mutabaah_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_mutabaah_records_date ON public.mutabaah_records(date);
CREATE INDEX IF NOT EXISTS idx_mutabaah_activities_order ON public.mutabaah_activities(order_index ASC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mutabaah_activities TO authenticated;
GRANT ALL ON public.mutabaah_activities TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mutabaah_records TO authenticated;
GRANT ALL ON public.mutabaah_records TO service_role;

ALTER TABLE public.mutabaah_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutabaah_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View mutabaah activities"
ON public.mutabaah_activities FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Manage mutabaah activities"
ON public.mutabaah_activities FOR ALL TO authenticated
USING (public.is_member_admin(auth.uid()))
WITH CHECK (public.is_member_admin(auth.uid()));

CREATE POLICY "View mutabaah records"
ON public.mutabaah_records FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR public.is_member_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p_me
    JOIN public.profiles p_student ON p_student.id = mutabaah_records.student_id
    WHERE p_me.id = auth.uid()
      AND p_me.account_type = 'musyrif_asrama'
      AND p_me.dorm IS NOT NULL
      AND p_me.dorm = p_student.dorm
  )
);

CREATE POLICY "Manage mutabaah records"
ON public.mutabaah_records FOR ALL TO authenticated
USING (
  public.is_member_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p_me
    JOIN public.profiles p_student ON p_student.id = mutabaah_records.student_id
    WHERE p_me.id = auth.uid()
      AND p_me.account_type = 'musyrif_asrama'
      AND p_me.dorm IS NOT NULL
      AND p_me.dorm = p_student.dorm
  )
)
WITH CHECK (
  public.is_member_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p_me
    JOIN public.profiles p_student ON p_student.id = mutabaah_records.student_id
    WHERE p_me.id = auth.uid()
      AND p_me.account_type = 'musyrif_asrama'
      AND p_me.dorm IS NOT NULL
      AND p_me.dorm = p_student.dorm
  )
);

-- Inisialisasi 24 kegiatan awal dari lembar pedoman fisik
INSERT INTO public.mutabaah_activities (title, category, order_index)
VALUES
  ('Salat malam', 'Ibadah', 1),
  ('Salat sunah qobliyah subuh', 'Ibadah', 2),
  ('Salat subuh berjama''ah', 'Ibadah', 3),
  ('Halaqoh tahfiz bada subuh', 'Tahfiz', 4),
  ('Zikir pagi', 'Ibadah', 5),
  ('Melaksanakan piket harian', 'Kedisiplinan', 6),
  ('Berangkat ke sekolah sblm 7.20', 'Kedisiplinan', 7),
  ('Salat sunah qobliyah zuhur', 'Ibadah', 8),
  ('Salat zuhur berjama''ah', 'Ibadah', 9),
  ('Salat sunah ba''diyah zuhur', 'Ibadah', 10),
  ('Tidur siang (qoilulah)', 'Sunnah', 11),
  ('Hadir di masjid sblm azan asar', 'Ibadah', 12),
  ('Salat asar berjama''ah', 'Ibadah', 13),
  ('Zikir sore', 'Ibadah', 14),
  ('Hadir dimasjid sblm azan maghrib', 'Ibadah', 15),
  ('Salat maghrib berjama''ah', 'Ibadah', 16),
  ('Salat sunah ba''diyah maghrib', 'Ibadah', 17),
  ('Halaqoh tahfiz bada maghrib', 'Tahfiz', 18),
  ('Salat isya berjama''ah', 'Ibadah', 19),
  ('Salat sunah ba''diyah isya', 'Ibadah', 20),
  ('Belajar malam', 'Akademik', 21),
  ('Setoran mufrodat harian', 'Bahasa', 22),
  ('Berbahasa Arab/Inggris', 'Bahasa', 23),
  ('Tidak berbicara kotor/kasar', 'Akhlak', 24)
ON CONFLICT DO NOTHING;
