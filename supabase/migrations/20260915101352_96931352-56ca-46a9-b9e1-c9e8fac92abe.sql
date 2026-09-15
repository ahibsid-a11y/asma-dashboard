CREATE TABLE public.ekskuls (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'pilihan',
  fee INTEGER NOT NULL DEFAULT 0,
  fee_period TEXT NOT NULL DEFAULT 'per_bulan',
  coach_name TEXT NOT NULL DEFAULT 'Belum Ditentukan',
  coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  schedule_day TEXT NOT NULL DEFAULT 'Sabtu',
  schedule_time TEXT NOT NULL DEFAULT '16:00 - 17:30',
  location TEXT NOT NULL DEFAULT 'Pesantren',
  quota INTEGER,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ekskuls TO authenticated;
GRANT ALL ON public.ekskuls TO service_role;
ALTER TABLE public.ekskuls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ekskuls_read" ON public.ekskuls FOR SELECT TO authenticated USING (true);

CREATE TABLE public.ekskul_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ekskul_id TEXT NOT NULL REFERENCES public.ekskuls(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester TEXT NOT NULL DEFAULT '1',
  academic_year TEXT NOT NULL DEFAULT '2026/2027',
  status TEXT NOT NULL DEFAULT 'aktif',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ekskul_id, student_id, semester, academic_year)
);
GRANT SELECT ON public.ekskul_enrollments TO authenticated;
GRANT ALL ON public.ekskul_enrollments TO service_role;
ALTER TABLE public.ekskul_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ekskul_enrollments_read" ON public.ekskul_enrollments FOR SELECT TO authenticated USING (true);

CREATE TABLE public.ekskul_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES public.ekskul_enrollments(id) ON DELETE CASCADE,
  ekskul_id TEXT NOT NULL REFERENCES public.ekskuls(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL DEFAULT 'Tagihan Awal Masuk',
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'belum_bayar',
  payment_date DATE,
  payment_method TEXT,
  receipt_no TEXT,
  notes TEXT,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ekskul_payments TO authenticated;
GRANT ALL ON public.ekskul_payments TO service_role;
ALTER TABLE public.ekskul_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ekskul_payments_read" ON public.ekskul_payments FOR SELECT TO authenticated USING (true);

CREATE TABLE public.ekskul_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ekskul_id TEXT NOT NULL REFERENCES public.ekskuls(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  topic TEXT NOT NULL DEFAULT 'Latihan / Pertemuan Rutin',
  semester TEXT NOT NULL DEFAULT '1',
  academic_year TEXT NOT NULL DEFAULT '2026/2027',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ekskul_sessions TO authenticated;
GRANT ALL ON public.ekskul_sessions TO service_role;
ALTER TABLE public.ekskul_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ekskul_sessions_read" ON public.ekskul_sessions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.ekskul_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ekskul_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'hadir',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);
GRANT SELECT ON public.ekskul_attendances TO authenticated;
GRANT ALL ON public.ekskul_attendances TO service_role;
ALTER TABLE public.ekskul_attendances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ekskul_attendances_read" ON public.ekskul_attendances FOR SELECT TO authenticated USING (true);

CREATE TABLE public.ekskul_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ekskul_id TEXT NOT NULL REFERENCES public.ekskuls(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester TEXT NOT NULL DEFAULT '1',
  academic_year TEXT NOT NULL DEFAULT '2026/2027',
  grade TEXT NOT NULL DEFAULT 'B',
  predicate TEXT NOT NULL DEFAULT 'Baik',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ekskul_id, student_id, semester, academic_year)
);
GRANT SELECT ON public.ekskul_grades TO authenticated;
GRANT ALL ON public.ekskul_grades TO service_role;
ALTER TABLE public.ekskul_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ekskul_grades_read" ON public.ekskul_grades FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_ekskuls_updated_at BEFORE UPDATE ON public.ekskuls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ekskul_enrollments_updated_at BEFORE UPDATE ON public.ekskul_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ekskul_payments_updated_at BEFORE UPDATE ON public.ekskul_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ekskul_grades_updated_at BEFORE UPDATE ON public.ekskul_grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ekskul_enrollments_lookup ON public.ekskul_enrollments (ekskul_id, semester, academic_year, status);
CREATE INDEX idx_ekskul_enrollments_student ON public.ekskul_enrollments (student_id);
CREATE INDEX idx_ekskul_sessions_lookup ON public.ekskul_sessions (ekskul_id, semester, academic_year);
CREATE INDEX idx_ekskul_attendances_student ON public.ekskul_attendances (student_id);
CREATE INDEX idx_ekskul_payments_student ON public.ekskul_payments (student_id, ekskul_id);

INSERT INTO public.ekskuls (id, name, category, fee, fee_period, coach_name, schedule_day, schedule_time, location, quota, description) VALUES
('ekskul-pramuka','Praja Muda Karana (Pramuka)','wajib',0,'sekali','Kak Rahmat Hidayat','Sabtu','14:00 - 15:30','Lapangan Utama Pesantren',200,'Kegiatan kepanduan, kepemimpinan, kemandirian, dan kedisiplinan santri.'),
('ekskul-tapak-suci','Seni Bela Diri Tapak Suci','wajib',0,'sekali','Ust. Supriyadi, S.Pd.I','Ahad','08:00 - 10:00','Aula Serbaguna / Lapangan Olahraga',200,'Seni bela diri, kebugaran fisik, ketangkasan, dan pembentukan mental tangguh.'),
('ekskul-panahan','Panahan Tradisional & Horsebow','pilihan',75000,'per_bulan','Coach Farhan Al-Fatih','Sabtu','16:00 - 17:30','Area Panahan Terbuka',25,'Olahraga sunnah memanah melatih fokus, kesabaran, dan ketenangan jiwa.'),
('ekskul-futsal','Futsal & Sepak Bola Santri','pilihan',50000,'per_bulan','Coach Dedi Kurniawan','Kamis','16:00 - 17:30','Lapangan Futsal AHIBS',30,'Pembinaan teknik sepak bola mini, kerja sama tim, stamina, dan sportivitas santri.'),
('ekskul-robotik','Robotik & Coding Arduino','pilihan',100000,'per_bulan','Eng. Teguh Prasetyo, S.T','Sabtu','09:00 - 11:00','Lab Komputer & Multimedia',20,'Pengenalan teknologi IoT, perakitan mikrokontroler, algoritma logika, dan robot cerdas.'),
('ekskul-english-club','English Conversation Club','pilihan',50000,'per_bulan','Miss Nurul Fauziyah, M.Pd','Rabu','16:00 - 17:15','Ruang Diskusi Perpustakaan',25,'Praktik percakapan bahasa Inggris aktif, storytelling, pidato, dan debat santri.'),
('ekskul-desain-multimedia','Desain Grafis & Multimedia Dakwah','pilihan',65000,'per_bulan','Ust. M. Rizky Pratama','Ahad','10:30 - 12:00','Lab Komputer',20,'Kreativitas pembuatan poster dakwah, editing video dasar, tipografi, dan media islami.');