-- Migration: 20260914214500_violations.sql
-- Modul Pelanggaran Santri & Pembinaan Karakter

-- 1. Katalog Jenis Pelanggaran (Presets)
CREATE TABLE IF NOT EXISTS public.violation_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('Ringan', 'Sedang', 'Berat')),
  points integer NOT NULL DEFAULT 5,
  default_penalty text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_violation_types_category ON public.violation_types(category);
CREATE INDEX IF NOT EXISTS idx_violation_types_active ON public.violation_types(is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.violation_types TO authenticated;
GRANT ALL ON public.violation_types TO service_role;

ALTER TABLE public.violation_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated view violation types"
ON public.violation_types FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Manage violation types"
ON public.violation_types FOR ALL TO authenticated
USING (public.is_member_admin(auth.uid()))
WITH CHECK (public.is_member_admin(auth.uid()));

-- 2. Tambah kolom penalty dan status pada violation_records jika belum ada
ALTER TABLE public.violation_records 
  ADD COLUMN IF NOT EXISTS penalty text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Selesai';

CREATE INDEX IF NOT EXISTS idx_violation_records_category ON public.violation_records(category);
CREATE INDEX IF NOT EXISTS idx_violation_records_status ON public.violation_records(status);

-- 3. Semaikan preset pelanggaran standar kepesantrenan
INSERT INTO public.violation_types (title, category, points, default_penalty, is_active)
VALUES
  -- Pelanggaran Ringan (2 - 5 poin)
  ('Terlambat shalat berjamaah / halaqoh', 'Ringan', 3, 'Nasihat & hafalan doa setelah shalat', true),
  ('Pakaian / seragam tidak rapi atau tidak sesuai ketentuan', 'Ringan', 2, 'Teguran lisan & merapikan pakaian', true),
  ('Membuang sampah sembarangan di asrama / sekolah', 'Ringan', 3, 'Piket kebersihan area selama 1 hari', true),
  ('Keluar kamar asrama melebihi jam malam tanpa izin musyrif', 'Ringan', 5, 'Piket kebersihan asrama', true),
  ('Berbicara tidak sopan atau berteriak di lingkungan asrama', 'Ringan', 3, 'Membaca istighfar 100x & nasihat musyrif', true),
  ('Kamar tidur atau ranjang tidak dirapikan saat inspeksi', 'Ringan', 3, 'Merapikan kamar & pembersihan ranjang mandiri', true),
  
  -- Pelanggaran Sedang (10 - 25 poin)
  ('Tidak mengikuti shalat berjamaah tanpa uzur syari', 'Sedang', 10, 'Hafalan surat pendek & piket masjid', true),
  ('Membawa alat elektronik / HP tanpa izin resmi', 'Sedang', 15, 'Penyitaan barang 1 pekan & penandatanganan surat janji', true),
  ('Bolos / meninggalkan kegiatan KBM atau tahfidz', 'Sedang', 15, 'Menambah jam halaqoh mandiri & tugas resume materi', true),
  ('Merusak fasilitas pondok atau sarana asrama', 'Sedang', 20, 'Mengganti/memperbaiki kerusakan & kerja bakti fasilitas', true),
  ('Berkelahi atau intimidasi / bullying ringan', 'Sedang', 25, 'Konseling kesiswaan & surat pernyataan bermaterai', true),
  ('Membeli makanan di luar area pondok tanpa izin', 'Sedang', 10, 'Nasihat kesiswaan & piket dapur', true),

  -- Pelanggaran Berat (50 - 100 poin)
  ('Membawa, menyimpan, atau merokok / rokok elektrik (vape)', 'Berat', 50, 'Surat Peringatan 1 (SP 1) & pemanggilan orang tua / wali', true),
  ('Kabur / keluar dari lingkungan pesantren tanpa izin resmi', 'Berat', 50, 'Surat Peringatan 1 (SP 1) & masa pemantauan ketat', true),
  ('Tindak kekerasan fisik atau perundungan (bullying) berat', 'Berat', 75, 'Surat Peringatan 2 (SP 2) & skorsing 1 pekan', true),
  ('Tindakan asusila, pencurian, atau pelanggaran hukum pidana', 'Berat', 100, 'Surat Peringatan 3 (SP 3) & sidang dewan guru pengasuh', true)
ON CONFLICT DO NOTHING;
