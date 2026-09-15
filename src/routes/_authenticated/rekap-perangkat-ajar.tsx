import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useRef } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getCurriculumSupervisionRecap } from "@/lib/curriculum.functions";


const ACADEMIC_YEARS = ["2026/2027", "2025/2026"];

export const Route = createFileRoute("/_authenticated/rekap-perangkat-ajar")({
  head: () => ({
    meta: [
      { title: "Rekap Supervisi Perangkat Ajar | SIM-AHIBS" },
      {
        name: "description",
        content: "Rekapitulasi kelengkapan dan supervisi perangkat ajar guru SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Rekap Supervisi Perangkat Ajar | SIM-AHIBS" },
    ],
  }),
  component: RekapPerangkatAjarPage,
});

function RekapPerangkatAjarPage() {
  const { data: profile } = useCurrentProfile();
  const navigate = useNavigate();

  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedYear, setSelectedYear] = useState("2026/2027");
  const [searchQuery, setSearchQuery] = useState("");
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  const fetchRecapFn = useServerFn(getCurriculumSupervisionRecap);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["curriculum-supervision-recap", selectedClass, selectedYear],
    queryFn: () =>
      fetchRecapFn({
        data: {
          class_name: selectedClass,
          academic_year: selectedYear,
        },
      }),
  });

  const auditList = useMemo(() => data?.auditList ?? [], [data?.auditList]);
  const kpi = data?.kpi ?? { completed: 0, draft: 0, empty: 0 };

  // Filter list by search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return auditList;
    const q = searchQuery.toLowerCase();
    return auditList.filter(
      (item: any) =>
        item.subject.name.toLowerCase().includes(q) ||
        item.subject.code.toLowerCase().includes(q) ||
        (item.teacher && item.teacher.name.toLowerCase().includes(q)),
    );
  }, [auditList, searchQuery]);

  const handlePrintAuditSheet = () => {
    window.print();
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6 pb-16">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 bg-primary/5 text-primary border-primary/20">
                Supervisi Kurikulum & Audit
              </Badge>
              <span className="text-xs text-muted-foreground">• SMPIT Putra Al-Hanif</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Rekap Kelengkapan Perangkat Ajar Guru
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pantau status penyusunan CP, TP, ATP, Alokasi Waktu, Prota, dan keterlaksanaan Promes seluruh mata pelajaran.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuditModalOpen(true)}
              className="gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4 text-primary" />
              Cetak Rekap Supervisi
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                  Pilih Kelas / Rombel
                </label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full font-medium">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas (7, 8, 9)</SelectItem>
                    {classOptions.map((cls: string) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                  Tahun Ajaran
                </label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tahun Ajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map((yr) => (
                      <SelectItem key={yr} value={yr}>
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                  Cari Mapel / Guru
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Ketik nama mapel atau guru..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Mata Pelajaran</p>
                <p className="text-xl font-bold tracking-tight">{auditList.length} Mapel</p>
                <p className="text-[11px] text-muted-foreground">Tercakup dalam kurikulum</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Lengkap (100% Siap)</p>
                <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {kpi.completed} Mapel
                </p>
                <p className="text-[11px] text-muted-foreground">CP, TP, ATP & Promes tuntas</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sedang Berproses</p>
                <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                  {kpi.draft} Mapel
                </p>
                <p className="text-[11px] text-muted-foreground">Draf belum lengkap 100%</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Belum Mengisi</p>
                <p className="text-xl font-bold tracking-tight text-destructive">
                  {kpi.empty} Mapel
                </p>
                <p className="text-[11px] text-muted-foreground">Perlu diingatkan pimpinan</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monitoring Table */}
        <Card className="border-border/60 shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-5 border-b">
            <CardTitle className="text-base font-semibold">
              Matriks Supervisi Perangkat Ajar Tahun Ajaran {selectedYear}
            </CardTitle>
            <CardDescription className="text-xs">
              Status kelengkapan dokumen administrasi ajar dan persentase keterlaksanaan jam mengajar
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b font-semibold text-muted-foreground text-center">
                  <th className="px-3 py-3 w-10">No</th>
                  <th className="px-3 py-3 text-left min-w-[200px]">Mata Pelajaran</th>
                  <th className="px-2 py-3 w-16">Kelas</th>
                  <th className="px-3 py-3 text-left min-w-[180px]">Guru Pengampu</th>
                  <th className="px-2 py-3 w-16">Beban JP</th>
                  <th className="px-2 py-3 w-20">Jumlah TP</th>
                  <th className="px-3 py-3 w-40 text-left">% Kelengkapan</th>
                  <th className="px-2 py-3 w-24">Realisasi</th>
                  <th className="px-3 py-3 w-28">Status</th>
                  <th className="px-3 py-3 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Memuat data supervisi kurikulum...
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground italic">
                      Tidak ada data perangkat ajar yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item: any, idx: number) => {
                    const isComplete = item.status === "Lengkap";
                    const isDraft = item.status === "Proses";

                    return (
                      <tr key={`${item.subject.id}_${item.className}`} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5 text-center font-medium text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-foreground">
                          <div>{item.subject.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                              {item.subject.group}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {item.subject.code}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-center font-bold font-mono">
                          {item.className}
                        </td>
                        <td className="px-3 py-2.5">
                          {item.teacher ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6 shrink-0">
                                <AvatarFallback className="text-[10px] font-bold">
                                  {item.teacher.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="truncate">
                                <p className="font-medium text-foreground truncate">
                                  {item.teacher.name || item.teacher.display_name}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {item.teacher.nis_nip || "-"}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 italic">Belum ditentukan</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-center font-mono font-medium">
                          {item.jpPerWeek} JP
                        </td>
                        <td className="px-2 py-2.5 text-center font-bold font-mono">
                          {item.tpCount} TP
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Progress value={item.completionPercentage} className="h-1.5 flex-1" />
                            <span className="text-[11px] font-bold font-mono w-9 text-right">
                              {item.completionPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-center font-mono text-[11px]">
                          <span className="text-blue-600 font-semibold">{item.realizationGanjil}%</span> /{" "}
                          <span className="text-purple-600 font-semibold">{item.realizationGenap}%</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge
                            className={`text-[10px] font-bold ${
                              isComplete
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                                : isDraft
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                                : "bg-destructive/15 text-destructive hover:bg-destructive/20"
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1 px-2 hover:bg-primary hover:text-primary-foreground shadow-2xs"
                            onClick={() => {
                              navigate({
                                to: "/perangkat-ajar",
                              });
                            }}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Buka
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Official Audit Sheet Print Dialog */}
      <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
          <div className="no-print flex items-center justify-between px-6 py-3.5 border-b bg-muted/40 shrink-0">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <div>
                <DialogTitle className="text-base font-semibold leading-none">
                  Pratinjau Lembar Supervisi Kurikulum
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Format resmi pengesahan kelengkapan perangkat ajar guru SMPIT Putra Al-Hanif
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePrintAuditSheet} className="gap-1.5">
                <Printer className="w-4 h-4 text-primary" />
                Cetak / Simpan PDF
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setAuditModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50 dark:bg-slate-950/40">
            <div
              id="official-report-card"
              className="max-w-[850px] mx-auto bg-white text-slate-900 dark:bg-card dark:text-card-foreground p-8 rounded-xl shadow-md print:shadow-none print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black"
            >
              {/* Kop Surat */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-slate-900 print:border-black">
                <img src="/logo-alhanif.png" alt="Logo" className="w-16 h-16 object-contain" />
                <div className="flex-1 text-center">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 print:text-slate-600">
                    Yayasan Al-Hanif Cilegon
                  </h3>
                  <h1 className="text-lg font-black tracking-tight leading-tight">
                    AL-HANIF ISLAMIC BOARDING SCHOOL (AHIBS)
                  </h1>
                  <h2 className="text-sm font-bold text-primary print:text-black">
                    SMPIT PUTRA AL-HANIF CILEGON
                  </h2>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    NPSN: 69989823 • Terakreditasi A • Jl. Al-Hanif, Cibeber, Kota Cilegon, Banten
                  </p>
                </div>
                <div className="w-16" />
              </div>
              <div className="h-0.5 bg-slate-900 print:bg-black mt-0.5 mb-6" />

              <div className="text-center mb-6">
                <h3 className="text-base font-black uppercase tracking-wide underline underline-offset-4">
                  Lembar Rekapitulasi & Verifikasi Perangkat Ajar Guru
                </h3>
                <p className="text-xs font-semibold text-slate-600 mt-1">
                  Tahun Ajaran {selectedYear} • Kurikulum Merdeka & Terpadu Kepesantrenan
                </p>
              </div>

              {/* Ringkasan Status */}
              <div className="grid grid-cols-3 gap-3 text-center mb-6 text-xs">
                <div className="p-2.5 border rounded">
                  <span className="text-muted-foreground block text-[10px] uppercase">Lengkap (100%)</span>
                  <span className="text-base font-bold text-emerald-700">{kpi.completed} Mapel</span>
                </div>
                <div className="p-2.5 border rounded">
                  <span className="text-muted-foreground block text-[10px] uppercase">Dalam Proses</span>
                  <span className="text-base font-bold text-amber-700">{kpi.draft} Mapel</span>
                </div>
                <div className="p-2.5 border rounded">
                  <span className="text-muted-foreground block text-[10px] uppercase">Belum Mengisi</span>
                  <span className="text-base font-bold text-red-700">{kpi.empty} Mapel</span>
                </div>
              </div>

              {/* Tabel Verifikasi */}
              <table className="w-full text-[11px] border-collapse border border-slate-300 print:border-black mb-8">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-200 text-slate-900 font-bold text-center">
                    <th className="border border-slate-300 p-1.5 w-8">No</th>
                    <th className="border border-slate-300 p-1.5 text-left">Mata Pelajaran</th>
                    <th className="border border-slate-300 p-1.5 w-12">Kelas</th>
                    <th className="border border-slate-300 p-1.5 text-left">Guru Pengampu</th>
                    <th className="border border-slate-300 p-1.5 w-16">Total TP</th>
                    <th className="border border-slate-300 p-1.5 w-20">Kelengkapan</th>
                    <th className="border border-slate-300 p-1.5 w-24">Status Verifikasi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="border border-slate-300 p-1.5 text-center font-medium">{idx + 1}</td>
                      <td className="border border-slate-300 p-1.5 font-semibold">{item.subject.name}</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">{item.className}</td>
                      <td className="border border-slate-300 p-1.5">{item.teacher?.name || "-"}</td>
                      <td className="border border-slate-300 p-1.5 text-center">{item.tpCount} TP</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">{item.completionPercentage}%</td>
                      <td className="border border-slate-300 p-1.5 text-center font-semibold">
                        {item.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="pt-4 text-xs">
                <div className="text-right mb-4">
                  <span>Cilegon, 14 September 2026</span>
                </div>
                <div className="grid grid-cols-2 gap-8 text-center">
                  <div>
                    <p className="font-medium">Mengetahui,</p>
                    <p className="font-medium">Kepala Sekolah SMPIT Putra Al-Hanif</p>
                    <div className="h-20" />
                    <p className="font-bold uppercase underline">( Mudir / Kepala Sekolah )</p>
                    <p className="text-[10px] text-slate-500">NIY. 201801002</p>
                  </div>

                  <div>
                    <p className="font-medium">Diverifikasi Oleh,</p>
                    <p className="font-medium">Waka Bidang Kurikulum</p>
                    <div className="h-20" />
                    <p className="font-bold uppercase underline">( Waka Kurikulum )</p>
                    <p className="text-[10px] text-slate-500">NIY. 202001015</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
