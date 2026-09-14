import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  BookMarked,
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Layers,
  Loader2,
  Printer,
  Sparkles,
  Trophy,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getMyTahfizData } from "@/lib/tahfiz.functions";

export const Route = createFileRoute("/_authenticated/nilai-tahfiz-saya")({
  head: () => ({
    meta: [
      { title: "Nilai & Capaian Tahfiz Saya | SIM-AHIBS" },
      {
        name: "description",
        content: "Capaian hafalan Al-Qur'an, tilawah, dan iqro pribadi santri AHIBS.",
      },
      { property: "og:title", content: "Nilai & Capaian Tahfiz Saya | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Capaian hafalan Al-Qur'an, tilawah, dan iqro pribadi santri AHIBS.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: NilaiTahfizSayaPage,
});

function NilaiTahfizSayaPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;

  const fetchMyData = useServerFn(getMyTahfizData);

  const [printModalOpen, setPrintModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-tahfiz-data", profile?.id],
    queryFn: () => fetchMyData(),
  });

  const student = data?.student || profile;
  const history = data?.history;
  const levelInfo = history?.levelInfo;
  const target = data?.target;
  const gradeCode = data?.gradeCode || "VII";

  const currentLevel = levelInfo?.level || "tahfiz";

  const hafalanList = history?.hafalan || [];
  const tilawahList = history?.tilawah || [];
  const iqroList = history?.iqro || [];

  const sabqList = hafalanList.filter((r: any) => r.type === "sabq");
  const sabqyList = hafalanList.filter((r: any) => r.type === "sabqy");
  const manzilList = hafalanList.filter((r: any) => r.type === "manzil");

  const latestSabq = sabqList[0];
  const latestTilawah = tilawahList[0];
  const latestIqro = iqroList[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Tahfiz Al-Qur'an
              </span>
              <span className="text-xs text-muted-foreground">• Buku Kontrol 2025</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Capaian & Mutaba'ah Tahfiz Saya
            </h1>
            <p className="text-sm text-muted-foreground">
              Pantau riwayat setoran ziyadah (Sabq), murojaah (Sabqy & Manzil), tilawah, serta
              target mustawa kelas Anda.
            </p>
          </div>

          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setPrintModalOpen(true)}
          >
            <Printer className="h-4 w-4" />
            Cetak Buku Kontrol Saya
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm">Memuat capaian tahfiz...</p>
          </div>
        ) : error ? (
          <Card className="p-8 text-center text-destructive">
            Gagal memuat data capaian tahfiz.
          </Card>
        ) : (
          <>
            {/* Student & Target Mustawa Hero Card */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Profile Card */}
              <Card className="border-border/60 bg-card shadow-sm lg:col-span-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Identitas Santri</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        currentLevel === "iqro"
                          ? "border-emerald-500 text-emerald-600"
                          : currentLevel === "tilawah"
                            ? "border-sky-500 text-sky-600"
                            : "border-amber-500 text-amber-600"
                      }
                    >
                      {currentLevel === "iqro"
                        ? "Iqro (Metode Itqon)"
                        : currentLevel === "tilawah"
                          ? "Tilawah Al-Qur'an"
                          : "Tahfiz 3 Pilar"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{student?.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      NIS: {student?.nis_nip || "-"} • Kelas: {student?.class || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Halaqoh: {student?.halaqoh || "-"} • Asrama: {student?.dorm || "-"}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Posisi Terakhir:</p>
                    <p className="text-sm font-semibold text-foreground">
                      {levelInfo?.current_position_desc || "Belum ada catatan posisi"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Target Mustawa Card (from user's Buku Kontrol 2025 document) */}
              <Card className="border-border/60 bg-gradient-to-br from-emerald-500/5 via-background to-primary/5 shadow-sm lg:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      <CardTitle className="text-base font-semibold">
                        Standar Target Mustawa (Kelas {gradeCode})
                      </CardTitle>
                    </div>
                    <Badge variant="secondary">Buku Kontrol 2025</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Target pencapaian tilawah dan hafalan berdasarkan kurikulum AHIBS.
                  </CardDescription>
                </CardHeader>

                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-0">
                  {/* Semester Gasal */}
                  <div className="rounded-lg border border-border/80 bg-background/80 p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">Semester I (Gasal)</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <p className="mt-1 font-bold text-sm text-foreground">
                      {target?.semesterGasal.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {target?.semesterGasal.detail}
                    </p>
                  </div>

                  {/* Semester Genap */}
                  <div className="rounded-lg border border-border/80 bg-background/80 p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">Semester II (Genap)</span>
                      <Sparkles className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="mt-1 font-bold text-sm text-foreground">
                      {target?.semesterGenap.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {target?.semesterGenap.detail}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ⭐ Sabq (Ziyadah)
                  </span>
                  <p className="mt-1 text-2xl font-bold">{sabqList.length} Kali</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {latestSabq
                      ? `Terakhir: ${latestSabq.surah_name}:${latestSabq.ayat_start}-${latestSabq.ayat_end}`
                      : "Belum ada setoran"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-4">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    🔄 Sabqy (Murojaah)
                  </span>
                  <p className="mt-1 text-2xl font-bold">{sabqyList.length} Kali</p>
                  <p className="text-[11px] text-muted-foreground">Murojaah surat berjalan</p>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-4">
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                    🏰 Manzil (Seluruh)
                  </span>
                  <p className="mt-1 text-2xl font-bold">{manzilList.length} Kali</p>
                  <p className="text-[11px] text-muted-foreground">Murojaah mutqin keseluruhan</p>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-4">
                  <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
                    📜 Tilawah / Iqro
                  </span>
                  <p className="mt-1 text-2xl font-bold">
                    {tilawahList.length + iqroList.length} Kali
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {latestTilawah
                      ? `Tilawah Juz ${latestTilawah.juz}`
                      : latestIqro
                        ? `Iqro Hal ${latestIqro.halaman}`
                        : "Lancar"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Riwayat Lengkap Tabs */}
            <Card className="border-border/60">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg font-semibold">Riwayat Setoran Lengkap</CardTitle>
                <CardDescription className="text-xs">
                  Daftar seluruh setoran hafalan, murojaah, dan tilawah Anda yang dicatat oleh
                  musyrif halaqoh.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4">
                <Tabs defaultValue="hafalan" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="hafalan" className="text-xs font-semibold">
                      ✨ Tahfiz 3 Pilar ({hafalanList.length})
                    </TabsTrigger>
                    <TabsTrigger value="tilawah" className="text-xs font-semibold">
                      📜 Tilawah Al-Qur'an ({tilawahList.length})
                    </TabsTrigger>
                    <TabsTrigger value="iqro" className="text-xs font-semibold">
                      📖 Iqro Metode Itqon ({iqroList.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB HAFALAN */}
                  <TabsContent value="hafalan" className="mt-4 space-y-3">
                    {hafalanList.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">
                        Belum ada riwayat setoran tahfiz yang tercatat.
                      </p>
                    ) : (
                      <div className="divide-y rounded-lg border">
                        {hafalanList.map((r) => (
                          <div
                            key={r.id}
                            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/20"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    r.type === "sabq"
                                      ? "border-emerald-500 text-emerald-600"
                                      : r.type === "sabqy"
                                        ? "border-blue-500 text-blue-600"
                                        : "border-purple-500 text-purple-600"
                                  }
                                >
                                  {r.type === "sabq"
                                    ? "SABQ (BARU)"
                                    : r.type === "sabqy"
                                      ? "SABQY (MUROJAAH)"
                                      : "MANZIL (SELURUH)"}
                                </Badge>
                                <span className="font-semibold text-foreground">
                                  Juz {r.juz} • {r.surah_name} (Ayat {r.ayat_start}-{r.ayat_end})
                                </span>
                              </div>
                              {r.catatan && (
                                <p className="mt-1 text-xs italic text-muted-foreground">
                                  Catatan Musyrif: "{r.catatan}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="font-bold text-sm text-foreground">
                                  Nilai: {r.nilai}
                                </span>
                                <p className="text-[11px] text-muted-foreground">
                                  {r.predikat || "Mutqin"}
                                </p>
                              </div>
                              <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground whitespace-nowrap">
                                {r.date}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB TILAWAH */}
                  <TabsContent value="tilawah" className="mt-4 space-y-3">
                    {tilawahList.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">
                        Belum ada riwayat setoran tilawah yang tercatat.
                      </p>
                    ) : (
                      <div className="divide-y rounded-lg border">
                        {tilawahList.map((r) => (
                          <div
                            key={r.id}
                            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/20"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-sky-500 text-sky-600">
                                  TILAWAH
                                </Badge>
                                <span className="font-semibold text-foreground">
                                  Juz {r.juz} • {r.surah_name} (Ayat {r.ayat_start}-{r.ayat_end})
                                </span>
                                {r.halaman && (
                                  <span className="text-xs text-muted-foreground">
                                    • Hal {r.halaman}
                                  </span>
                                )}
                              </div>
                              {r.catatan && (
                                <p className="mt-1 text-xs italic text-muted-foreground">
                                  Catatan Musyrif: "{r.catatan}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right text-xs">
                                <span className="font-medium text-foreground">
                                  Kelancaran: {r.nilai_kelancaran}
                                </span>
                                <p className="text-muted-foreground">Tajwid: {r.nilai_tajwid}</p>
                              </div>
                              <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground whitespace-nowrap">
                                {r.date}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB IQRO */}
                  <TabsContent value="iqro" className="mt-4 space-y-3">
                    {iqroList.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">
                        Belum ada riwayat setoran Iqro yang tercatat.
                      </p>
                    ) : (
                      <div className="divide-y rounded-lg border">
                        {iqroList.map((r) => (
                          <div
                            key={r.id}
                            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/20"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500 text-emerald-600"
                                >
                                  ITQON
                                </Badge>
                                <span className="font-semibold text-foreground">
                                  Halaman {r.halaman}
                                </span>
                                <span className="text-xs text-muted-foreground">({r.tahap})</span>
                              </div>
                              {r.catatan && (
                                <p className="mt-1 text-xs italic text-muted-foreground">
                                  Catatan Musyrif: "{r.catatan}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right text-xs">
                                <span className="font-bold text-foreground">Nilai: {r.nilai}</span>
                                <p className="text-muted-foreground">
                                  Murojaah: {r.murojaah_harian || "-"}
                                </p>
                              </div>
                              <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground whitespace-nowrap">
                                {r.date}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}

        {/* Dialog Cetak Buku Kontrol Pribadi */}
        <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Pratinjau Buku Kontrol Tahfidz Pribadi</span>
                <Button size="sm" onClick={handlePrint} className="print:hidden">
                  <Printer className="mr-1.5 h-4 w-4" /> Cetak Sekarang
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 rounded-md border p-6 bg-white text-black font-sans text-xs">
              {/* Header Dokumen */}
              <div className="text-center border-b pb-4">
                <h2 className="text-base font-bold uppercase tracking-wider">
                  SMPIT PUTRA AL-HANIF (AHIBS)
                </h2>
                <h3 className="text-sm font-semibold">BUKU KONTROL TAHFIDZ & MUTABA'AH QUR'AN</h3>
                <p className="text-[11px] text-gray-600">Tahun Ajaran 2026/2027</p>
              </div>

              {/* Biodata */}
              <div className="grid grid-cols-2 gap-4 border-b pb-3 text-xs">
                <div>
                  <p>
                    <span className="font-semibold w-24 inline-block">Nama Santri</span>:{" "}
                    {student?.name}
                  </p>
                  <p>
                    <span className="font-semibold w-24 inline-block">NIS</span>:{" "}
                    {student?.nis_nip || "-"}
                  </p>
                  <p>
                    <span className="font-semibold w-24 inline-block">Kelas</span>:{" "}
                    {student?.class || "-"}
                  </p>
                </div>
                <div>
                  <p>
                    <span className="font-semibold w-24 inline-block">Halaqoh</span>:{" "}
                    {student?.halaqoh || "-"}
                  </p>
                  <p>
                    <span className="font-semibold w-24 inline-block">Tingkatan</span>:{" "}
                    {currentLevel.toUpperCase()}
                  </p>
                  <p>
                    <span className="font-semibold w-24 inline-block">Target Gasal</span>:{" "}
                    {target?.semesterGasal.title}
                  </p>
                </div>
              </div>

              {/* Tabel Ringkasan Setoran */}
              <div>
                <h4 className="font-bold text-xs mb-2">Catatan Setoran Terbaru (10 Terakhir):</h4>
                <table className="w-full border-collapse border border-gray-300 text-left text-[11px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-1.5 w-8 text-center">No</th>
                      <th className="border border-gray-300 p-1.5">Tanggal</th>
                      <th className="border border-gray-300 p-1.5">Jenis/Materi</th>
                      <th className="border border-gray-300 p-1.5">Surat / Halaman</th>
                      <th className="border border-gray-300 p-1.5 text-center">Nilai</th>
                      <th className="border border-gray-300 p-1.5">Catatan Musyrif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hafalanList.slice(0, 10).map((r, i) => (
                      <tr key={r.id}>
                        <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                        <td className="border border-gray-300 p-1">{r.date}</td>
                        <td className="border border-gray-300 p-1 font-semibold">
                          {r.type.toUpperCase()}
                        </td>
                        <td className="border border-gray-300 p-1">
                          Juz {r.juz} • {r.surah_name}: {r.ayat_start}-{r.ayat_end}
                        </td>
                        <td className="border border-gray-300 p-1 text-center font-bold">
                          {r.nilai}
                        </td>
                        <td className="border border-gray-300 p-1">{r.catatan || "-"}</td>
                      </tr>
                    ))}
                    {hafalanList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="border border-gray-300 p-3 text-center text-gray-500">
                          Belum ada setoran hafalan tercatat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tanda Tangan */}
              <div className="pt-6 grid grid-cols-2 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-medium">Wali Santri</p>
                  <div className="h-16" />
                  <p className="border-t border-dashed w-40 mx-auto pt-1">( ........................... )</p>
                </div>
                <div>
                  <p>Cilegon, {new Date().toLocaleDateString("id-ID")}</p>
                  <p className="font-medium">Musyrif Halaqoh</p>
                  <div className="h-16" />
                  <p className="border-t border-dashed w-40 mx-auto pt-1">( ........................... )</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
