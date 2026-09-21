# Perapihan Rapor F4: Layar, Cetak/PDF, dan Word

## Tujuan
Membuat rapor memakai satu tata letak dokumen F4 yang konsisten untuk pratinjau, cetak/simpan PDF, dan hasil Word, sekaligus nyaman dilihat dari HP.

## Perbaikan
1. **Satu kanvas dokumen F4**
   - Jadikan tiga jenis rapor memakai ukuran isi, tipografi, tabel, kop, biodata, dan tanda tangan yang sama.
   - Pratinjau desktop menampilkan lembar F4; HP menampilkan lembar yang bisa digeser horizontal tanpa kolom atau teks terpotong.

2. **Cetak dan PDF yang rapi**
   - Isolasi hanya rapor aktif saat mencetak agar halaman aplikasi tidak ikut tercetak.
   - Terapkan ukuran F4 215 × 330 mm, margin aman, warna cetak, dan skala 100%.
   - Hapus aturan yang melarang seluruh tabel terbelah; pertahankan judul tabel bersama baris pertama, ulangi kepala tabel di halaman berikutnya, dan cegah pemotongan per baris.
   - Jaga biodata, catatan, dan blok tanda tangan tetap utuh; pindahkan blok utuh ke halaman berikutnya hanya bila ruang tidak cukup.
   - Hilangkan halaman kosong dan ruang kosong besar akibat pemindahan tabel penuh.

3. **Word selaras dengan hasil cetak**
   - Bersihkan HTML hasil ekspor dari kelas dan gaya layar yang tidak didukung Word.
   - Terapkan ukuran F4, margin, lebar kolom, font, ukuran logo, kepala tabel berulang, pemisahan baris, dan blok tanda tangan dengan aturan khusus Word.
   - Gunakan struktur isi rapor aktif yang sama sehingga urutan dan isi Word sama dengan PDF.

4. **Tampilan HP**
   - Susun tombol aksi agar tidak melebar keluar layar.
   - Buat tab tetap terbaca dan dapat digeser bila ruang sempit.
   - Tampilkan dokumen dalam area gulir yang stabil dengan skala baca yang layak, tanpa tabel menyempit hingga teks bertumpuk.

5. **Pemeriksaan hasil**
   - Periksa tiga jenis rapor pada desktop dan HP.
   - Periksa pratinjau cetak F4 untuk pemotongan halaman, pengulangan kepala tabel, dan tanda tangan.
   - Unduh Word dan pastikan ukuran halaman, tabel, logo, serta urutan isi konsisten dengan versi cetak.

## Catatan teknis
- Perubahan dipusatkan pada tampilan dialog rapor, aturan cetak global, dan utilitas ekspor Word.
- Jumlah halaman tetap mengikuti panjang data; fokusnya bukan memaksa jumlah halaman tertentu, tetapi membuat pemotongan otomatis terjadi pada batas bagian/baris yang aman.
