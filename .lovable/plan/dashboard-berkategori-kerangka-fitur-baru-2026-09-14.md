# Dashboard berkategori + kerangka fitur baru

## Masukan saya atas tampilan di gambar

Arah kotak-kotak berkategori sudah bagus dan mudah dipakai di HP. Tiga hal yang saya sarankan diubah:

1. **Keterangan peran jangan ditulis di bawah nama fitur.** "(admin)", "(siswa)", "(semua user kecuali siswa)" bikin label jadi 3 baris dan tinggi kotak tidak rata. Setiap akun hanya melihat fitur yang memang boleh dia buka, jadi keterangan itu tidak dibutuhkan pengguna.
2. **Judul kategori perlu dibedakan jelas** dengan garis pemisah dan jarak, supaya "MANAJEMEN", "REKAP", "PRESENSI", dst. tidak menempel ke baris kotak di atasnya seperti sekarang.
3. **Warna ikon dipakai per kategori**, bukan bergantian acak. Jadi semua fitur Rekap satu warna, Tahfiz satu warna — lebih cepat dikenali dan terlihat rapi.

Selain itu jumlah fitur akan jadi banyak (±20). Di HP tetap 3 kolom, di layar lebar 6-8 kolom, dan tiap kategori bisa ditutup/dibuka bila terlalu panjang.

## Kategori final (termasuk Tahfiz)

| Kategori | Fitur | Boleh membuka |
|---|---|---|
| Manajemen | Anggota, Kelas, Asrama, Halaqoh | super admin & admin |
| Rekap | Presensi, Nilai, Pelanggaran, Mutaba'ah, **Tahfiz** | admin & pimpinan |
| Presensi | Scan Presensi, Presensi Insidental, Sesi Presensi, Absensi Diri | sesuai aturan yang sudah berjalan |
| Kesantrian | Input Mutaba'ah, Mutaba'ah Saya, Catat Pelanggaran, Perizinan | musyrif/admin; siswa hanya milik sendiri |
| **Tahfiz** | Input Nilai Tahfiz, Nilai Tahfiz Saya | musyrif input, siswa lihat miliknya |
| Pendidikan | Kalender Pendidikan, Input Nilai, Nilai Pelajaran | guru/admin; siswa lihat nilainya |

## Yang dikerjakan sekarang

- Semua fitur baru dibuat sebagai halaman kerangka: judul, penjelasan singkat, dan penanda "segera hadir". Isi kontennya kita bangun satu per satu di tahap berikutnya sesuai urutan yang Anda pilih.
- Fitur yang sudah jalan (Anggota, Kelas, Asrama, Halaqoh, Presensi, Rekap Presensi, Absensi Diri, Kalender, Profil) tidak diubah, hanya masuk ke kategori.
- Menu samping (desktop) dan menu garis tiga (HP) ikut memakai kategori yang sama.
- Menu "Kesiswaan" lama diganti oleh kategori Kesantrian yang lebih rinci.

## Catatan teknis

- `src/lib/nav.ts`: tambah tipe kategori, daftar fitur baru, dan pemetaan per peran; `navItemsFor` mengembalikan data terkelompok.
- `src/components/app-shell.tsx` dan `src/routes/_authenticated/dashboard.tsx`: render per kategori, warna ikon per kategori, hapus label peran.
- Route baru di `src/routes/_authenticated/`: `input-nilai-tahfiz`, `nilai-tahfiz-saya`, `rekap-tahfiz`, `rekap-nilai`, `rekap-pelanggaran`, `rekap-mutabaah`, `input-mutabaah`, `catat-pelanggaran`, `perizinan`, `input-nilai`, `nilai-pelajaran` — memakai `PlaceholderPage` + head metadata masing-masing.
- Belum ada perubahan basis data; tabel tahfiz/nilai dibuat saat fitur terkait diisi.
