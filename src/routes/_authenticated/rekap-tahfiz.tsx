import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Printer,
  Search,
  Sparkles,
  Trophy,
  Users,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { TAHFIZ_TARGET_STANDARDS } from "@/lib/quran-data";
import { getMusyrifHalaqohContext, getTahfizRecap } from "@/lib/tahfiz.functions";

export const Route = createFileRoute("/_authenticated/rekap-tahfiz")({
  head: () => ({
    meta: [
      { title: "Rekap Capaian Tahfiz | SIM-AHIBS" },
      {
        name: "description",
        content: "Rekapitulasi capaian hafalan Al-Qur'an, tilawah, dan iqro santri SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Rekap Capaian Tahfiz | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Rekapitulasi capaian hafalan Al-Qur'an, tilawah, dan iqro santri SMPIT Putra Al-Hanif.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RekapTahfizPage,
});

function RekapTahfizPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;

  const fetchRecap = useServerFn(getTahfizRecap);
  const fetchContext = useServerFn(getMusyrifHalaqohContext);

  const [semester, setSemester] = useState<string>("1");
  const [selectedHalaqoh, setSelectedHalaqoh] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Ambil data halaqoh & santri untuk filter dropdown
  const contextQuery = useQuery({
    queryKey: ["tahfiz-context-rekap"],
    queryFn: () => fetchContext({ data: {} }),
  });

  const recapQuery = useQuery({
    queryKey: ["tahfiz-rekap-data", semester, selectedHalaqoh, selectedClass, selectedLevel],
    queryFn: () =>
      fetchRecap({
        data: {
          semester,
          halaqoh: selectedHalaqoh === "all" ? undefined : selectedHalaqoh,
          className: selectedClass === "all" ? undefined : selectedClass,
          level: selectedLevel === "all" ? undefined : selectedLevel,
        },
      }),
  });

  const halaqohs = contextQuery.data?.halaqohs || [];
  const rows = recapQuery.data?.rows || [];

  // Filter pencarian nama / NIS
  const filteredRows = useMemo(() => {
    return rows.filter((r: any) => {
      const matchSearch =
        !searchQuery ||
        r.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.student.nis_nip && r.student.nis_nip.includes(searchQuery)) ||
        (r.student.class && r.student.class.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [rows, searchQuery]);

  // Statistik Agregat
  const countIqro = rows.filter((r: any) => r.level === "iqro").length;
  const countTilawah = rows.filter((r: any) => r.level === "tilawah").length;
  const countTahfiz = rows.filter((r: any) => r.level === "tahfiz").length;

  const totalSabq = rows.reduce((acc: number, r: any) => acc + (r.totalSabqCount || 0), 0);
  const totalMurojaah = rows.reduce(
    (acc: number, r: any) => acc + (r.totalSabqyCount || 0) + (r.totalManzilCount || 0),
    0,
  );

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
                Rekapitulasi Tahfiz
              </span>
              <span className="text-xs text-muted-foreground">• Standar Buku Kontrol 2025</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Rekapitulasi Capaian Tahfiz Santri
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitoring komprehensif capaian hafalan, tilawah, dan iqro santri per halaqoh dan
              mustawa kelas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setPrintDialogOpen(true)}
            >
              <Printer className="h-4 w-4" />
              Cetak Buku Rekap Tahfidz
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {/* Semester */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Semester:</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester I (Gasal)</SelectItem>
                    <SelectItem value="2">Semester II (Genap)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Halaqoh */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Halaqoh:</Label>
                <Select value={selectedHalaqoh} onValueChange={setSelectedHalaqoh}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Halaqoh</SelectItem>
                    {halaqohs.map((h: any) => (
                      <SelectItem key={h.id} value={h.name}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tingkatan */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tingkatan:</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tingkat</SelectItem>
                    <SelectItem value="iqro">Iqro (Metode Itqon)</SelectItem>
                    <SelectItem value="tilawah">Tilawah Al-Qur'an</SelectItem>
                    <SelectItem value="tahfiz">Tahfiz 3 Pilar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Kelas */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Kelas:</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    <SelectItem value="VII A">Kelas VII A</SelectItem>
                    <SelectItem value="VII B">Kelas VII B</SelectItem>
                    <SelectItem value="VIII A">Kelas VIII A</SelectItem>
                    <SelectItem value="VIII B">Kelas VIII B</SelectItem>
                    <SelectItem value="IX A">Kelas IX A</SelectItem>
                    <SelectItem value="IX B">Kelas IX B</SelectItem>
                    <SelectItem value="X">Kelas X</SelectItem>
                    <SelectItem value="XI">Kelas XI</SelectItem>
                    <SelectItem value="XII">Kelas XII</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cari Santri:</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Nama / NIS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Santri</p>
                <p className="text-xl font-bold">{rows.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Iqro Itqon</p>
                <p className="text-xl font-bold">{countIqro}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tilawah</p>
                <p className="text-xl font-bold">{countTilawah}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tahfiz 3 Pilar</p>
                <p className="text-xl font-bold">{countTahfiz}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sabq/Murojaah</p>
                <p className="text-xl font-bold">{totalSabq + totalMurojaah}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Target Mustawa Reference Accordion/Summary */}
        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm font-semibold">
                  Panduan Target Mustawa Kurikulum Tahfiz 2025 ({semester === "1" ? "Gasal" : "Genap"})
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[11px]">
                Target Resmi AHIBS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-6">
              {["VII", "VIII", "IX", "X", "XI", "XII"].map((grade) => {
                const targetInfo = TAHFIZ_TARGET_STANDARDS[grade];
                const targetText =
                  semester === "2"
                    ? targetInfo?.semesterGenap.title
                    : targetInfo?.semesterGasal.title;
                return (
                  <div key={grade} className="rounded border bg-background/80 p-2 text-center">
                    <span className="font-bold text-primary">Kelas {grade}</span>
                    <p className="mt-0.5 text-[11px] font-medium line-clamp-2 text-foreground">
                      {targetText}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Table Card */}
        <Card className="border-border/60">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Daftar Capaian Tahfiz Santri ({filteredRows.length} Santri)
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Diperbarui secara real-time dari input musyrif halaqoh
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {recapQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="mt-2 text-xs">Memuat rekap tahfiz...</p>
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">
                Tidak ada data santri yang cocok dengan filter yang dipilih.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-y bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium w-10 text-center">No</th>
                      <th className="p-3 font-medium">Nama Santri</th>
                      <th className="p-3 font-medium">Kelas / Halaqoh</th>
                      <th className="p-3 font-medium">Tingkat Aktif</th>
                      <th className="p-3 font-medium">Target Mustawa</th>
                      <th className="p-3 font-medium">Posisi / Capaian Terakhir</th>
                      <th className="p-3 font-medium text-center">Sabq (Ziyadah)</th>
                      <th className="p-3 font-medium text-center">Murojaah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRows.map((r: any, idx: number) => {
                      const levelBadge =
                        r.level === "iqro" ? (
                          <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            Iqro Itqon
                          </span>
                        ) : r.level === "tilawah" ? (
                          <span className="rounded bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                            Tilawah
                          </span>
                        ) : (
                          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            Tahfiz 3 Pilar
                          </span>
                        );

                      return (
                        <tr key={r.student.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-center text-muted-foreground font-medium">
                            {idx + 1}
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-foreground">{r.student.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              NIS: {r.student.nis_nip || "-"}
                            </p>
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-foreground">
                              {r.student.class || "-"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {r.student.halaqoh || "-"}
                            </p>
                          </td>
                          <td className="p-3">{levelBadge}</td>
                          <td className="p-3">
                            <p className="font-semibold text-foreground">
                              {r.targetSemester.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {r.targetSemester.detail}
                            </p>
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-foreground">
                              {r.currentPosition}
                            </p>
                            {r.lastIqroNilai && (
                              <p className="text-[10px] text-emerald-600">
                                Nilai: {r.lastIqroNilai} ({r.lastIqroTahap})
                              </p>
                            )}
                            {r.lastSabqSurah && (
                              <p className="text-[10px] text-amber-600">
                                Sabq: {r.lastSabqSurah}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="secondary" className="font-bold">
                              {r.totalSabqCount} Kali
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="font-bold">
                              {r.totalSabqyCount + r.totalManzilCount} Kali
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Cetak Buku Rekap Tahfidz Resmi */}
        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Pratinjau Cetak Rekapitulasi Tahfidz SIM-AHIBS</span>
                <Button size="sm" onClick={handlePrint} className="print:hidden">
                  <Printer className="mr-1.5 h-4 w-4" /> Cetak Laporan
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 rounded-md border p-6 bg-white text-black font-sans text-xs">
              {/* Kop Surat SIM-AHIBS */}
              <div className="border-b-2 border-black pb-3 text-center">
                <h2 className="text-base font-bold uppercase tracking-wider">
                  SMPIT PUTRA AL-HANIF (AHIBS)
                </h2>
                <h3 className="text-sm font-semibold">
                  BUKU KONTROL & REKAPITULASI TAHFIDZ AL-QUR'AN
                </h3>
                <p className="text-[11px] text-gray-600">
                  Tahun Ajaran 2026/2027 • Semester {semester === "1" ? "Gasal" : "Genap"}
                </p>
                <div className="mt-2 flex justify-center gap-4 text-[11px] text-gray-700">
                  <span>Halaqoh: {selectedHalaqoh === "all" ? "Semua Halaqoh" : selectedHalaqoh}</span>
                  <span>•</span>
                  <span>Kelas: {selectedClass === "all" ? "Semua Kelas" : selectedClass}</span>
                </div>
              </div>

              {/* Tabel Cetak */}
              <table className="w-full border-collapse border border-gray-400 text-left text-[10px]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 p-1.5 w-7 text-center">No</th>
                    <th className="border border-gray-400 p-1.5">Nama Santri</th>
                    <th className="border border-gray-400 p-1.5 w-16">Kelas</th>
                    <th className="border border-gray-400 p-1.5">Halaqoh</th>
                    <th className="border border-gray-400 p-1.5">Tingkat</th>
                    <th className="border border-gray-400 p-1.5">Target Mustawa</th>
                    <th className="border border-gray-400 p-1.5">Capaian Terakhir</th>
                    <th className="border border-gray-400 p-1.5 text-center w-12">Sabq</th>
                    <th className="border border-gray-400 p-1.5 text-center w-14">Murojaah</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r: any, i: number) => (
                    <tr key={r.student.id}>
                      <td className="border border-gray-400 p-1 text-center">{i + 1}</td>
                      <td className="border border-gray-400 p-1 font-semibold">{r.student.name}</td>
                      <td className="border border-gray-400 p-1">{r.student.class || "-"}</td>
                      <td className="border border-gray-400 p-1">{r.student.halaqoh || "-"}</td>
                      <td className="border border-gray-400 p-1 capitalize">{r.level}</td>
                      <td className="border border-gray-400 p-1">{r.targetSemester.title}</td>
                      <td className="border border-gray-400 p-1">{r.currentPosition}</td>
                      <td className="border border-gray-400 p-1 text-center font-bold">
                        {r.totalSabqCount}
                      </td>
                      <td className="border border-gray-400 p-1 text-center font-bold">
                        {r.totalSabqyCount + r.totalManzilCount}
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="border border-gray-400 p-3 text-center text-gray-500">
                        Tidak ada data santri.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Tanda Tangan Pengesahan */}
              <div className="pt-8 grid grid-cols-3 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-semibold">Mudir Ma'had</p>
                  <div className="h-16" />
                  <p className="border-t border-dashed w-36 mx-auto pt-1">( ........................... )</p>
                </div>
                <div>
                  <p>Menyetujui,</p>
                  <p className="font-semibold">Waka Kesantrian / Tahfiz</p>
                  <div className="h-16" />
                  <p className="border-t border-dashed w-36 mx-auto pt-1">( ........................... )</p>
                </div>
                <div>
                  <p>Cilegon, {new Date().toLocaleDateString("id-ID")}</p>
                  <p className="font-semibold">Koordinator Halaqoh</p>
                  <div className="h-16" />
                  <p className="border-t border-dashed w-36 mx-auto pt-1">( ........................... )</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
