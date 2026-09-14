-- Migration: 20260914220500_perizinan.sql
-- Modul Perizinan Santri (3-Tier & UKS Approval Matrix)

-- 1. Tabel Kategori Perizinan
CREATE TABLE IF NOT EXISTS public.permit_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  max_days integer NOT NULL DEFAULT 3,
  requires_uks boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tabel Pengajuan Perizinan Santri
CREATE TABLE IF NOT EXISTS public.student_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.permit_categories(id) ON DELETE SET NULL,
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
  rejected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Approval Kurikulum
  approved_kurikulum boolean NOT NULL DEFAULT false,
  approved_kurikulum_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_kurikulum_at timestamptz,
  notes_kurikulum text,

  -- Approval Kesantrian
  approved_kesantrian boolean NOT NULL DEFAULT false,
  approved_kesantrian_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_kesantrian_at timestamptz,
  notes_kesantrian text,

  -- Approval UKS
  approved_uks boolean NOT NULL DEFAULT false,
  approved_uks_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_uks_at timestamptz,
  notes_uks text,

  -- Approval Kepala Sekolah / Mudir
  approved_kepsek boolean NOT NULL DEFAULT false,
  approved_kepsek_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_kepsek_at timestamptz,
  notes_kepsek text,

  -- Gate Check-out & Check-in
  actual_checkout_at timestamptz,
  checkout_officer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actual_checkin_at timestamptz,
  checkin_officer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_overdue boolean NOT NULL DEFAULT false,

  submitted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexing for high-performance filtering
CREATE INDEX IF NOT EXISTS idx_student_permits_student ON public.student_permits(student_id);
CREATE INDEX IF NOT EXISTS idx_student_permits_status ON public.student_permits(status);
CREATE INDEX IF NOT EXISTS idx_student_permits_dates ON public.student_permits(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_student_permits_created ON public.student_permits(created_at DESC);

-- Grants & RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permit_categories TO authenticated;
GRANT ALL ON public.permit_categories TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_permits TO authenticated;
GRANT ALL ON public.student_permits TO service_role;

ALTER TABLE public.permit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_permits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view permit categories"
ON public.permit_categories FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Manage permit categories"
ON public.permit_categories FOR ALL TO authenticated
USING (public.is_member_admin(auth.uid()))
WITH CHECK (public.is_member_admin(auth.uid()));

CREATE POLICY "View student permits"
ON public.student_permits FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR submitted_by = auth.uid()
  OR public.is_member_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_type IN (
        'kepala_sekolah', 'mudir', 'waka_kurikulum', 'kabid_kesantrian',
        'musyrif_asrama', 'musyrif_halaqoh', 'wali_kelas', 'guru_mapel', 'tendik', 'kepala_tu'
      )
  )
);

CREATE POLICY "Insert student permits"
ON public.student_permits FOR INSERT TO authenticated
WITH CHECK (
  student_id = auth.uid()
  OR submitted_by = auth.uid()
  OR public.is_member_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_type IN (
        'musyrif_asrama', 'wali_kelas', 'kabid_kesantrian', 'waka_kurikulum', 'kepala_sekolah', 'mudir'
      )
  )
);

CREATE POLICY "Update student permits"
ON public.student_permits FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Seed Initial Categories
INSERT INTO public.permit_categories (name, description, max_days, requires_uks, is_active)
VALUES
  ('Izin Sakit (Rawat Jalan / Pulang)', 'Izin untuk santri yang membutuhkan pengobatan intensif di rumah atau kontrol klinik/RS.', 7, true, true),
  ('Keperluan Keluarga Mendesak', 'Izin untuk acara keluarga inti mendesak (pernikahan saudara kandung, musibah/takziyah).', 3, false, true),
  ('Utusan Madrasah / Lomba / Dinas', 'Izin dispensasi mewakili AHIBS dalam kompetisi, olimpiade, atau kegiatan resmi.', 5, false, true),
  ('Pulang Terjadwal / Libur Resmi', 'Izin kepulangan berkala semester atau libur resmi yang ditetapkan pesantren.', 14, false, true),
  ('Izin Keluar Sebentar (Day Pass)', 'Izin keluar area pondok tanpa bermalam (membeli keperluan/apotek, max beberapa jam).', 1, false, true)
ON CONFLICT DO NOTHING;
