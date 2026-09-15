import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Medal,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  Trophy,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StudentReportCardDialog } from "@/components/student-report-card-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getClassGradesRecap, listClassOptions, type AcademicSubject } from "@/lib/grades.functions";
const SEMESTER_OPTIONS = [
  { value: "1", label: "Semester 1 (Ganjil)" },
  { value: "2", label: "Semester 2 (Genap)" },
];
const ACADEMIC_YEARS = ["2026/2027", "2025/2026"];

export const Route = createFileRoute("/_authenticated/rekap-nilai")({
  head: () => ({
    meta: [
      { title: "Rekap Nilai & Leger | SIM-AHIBS" },
      {
        name: "description",
        content: "Rekapitulasi nilai, leger kelas, peringkat, dan pencetakan rapor santri AHIBS.",
      },
      { property: "og:title", content: "Rekap Nilai & Leger | SIM-AHIBS" },
    ],
  }),
  component: RekapNilaiPage,
});

function RekapNilaiPage() {
  const { data: profile } = useCurrentProfile();

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("1");
  const [selectedYear, setSelectedYear] = useState("2026/2027");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");

  // Report Card Dialog State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  const fetchRecapFn = useServerFn(getClassGradesRecap);
  const fetchClassesFn = useServerFn(listClassOptions);
  const { data: classOptions = [] } = useQuery({
    queryKey: ["class-options"],
    queryFn: () => fetchClassesFn(),
  });
  useEffect(() => {
    if (!selectedClass && classOptions.length > 0) setSelectedClass(classOptions[0]!);
  }, [classOptions, selectedClass]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["class-grades-recap", selectedClass, selectedSemester, selectedYear],
    queryFn: () =>
      fetchRecapFn({
        data: {
          class_name: selectedClass,
          semester: selectedSemester,
          academic_year: selectedYear,
        },
      }),
  });

  const subjects = useMemo(() => data?.subjects ?? [], [data?.subjects]);
  const rankedStudents = useMemo(() => data?.studentsRanked ?? [], [data?.studentsRanked]);
  const gradesMatrix = useMemo(() => data?.gradesMatrix ?? {}, [data?.gradesMatrix]);
  const remedialList = useMemo(() => data?.remedialList ?? [], [data?.remedialList]);
  const subjectAverages = useMemo(() => data?.subjectAverages ?? {}, [data?.subjectAverages]);

  // Filtered students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return rankedStudents;
    const q = searchQuery.toLowerCase();
    return rankedStudents.filter(
      (item: any) =>
        item.student.name.toLowerCase().includes(q) ||
        (item.student.display_name && item.student.display_name.toLowerCase().includes(q)) ||
        (item.student.nis_nip && item.student.nis_nip.toLowerCase().includes(q)),
    );
  }, [rankedStudents, searchQuery]);

  // Filtered subjects by group
  const filteredSubjects = useMemo(() => {
    if (selectedGroupFilter === "all") return subjects;
    return subjects.filter((s) => s.group === selectedGroupFilter);
  }, [subjects, selectedGroupFilter]);

  // Class KPI calculations
  const totalStudents = rankedStudents.length;
  const overallClassAverage = useMemo(() => {
    if (rankedStudents.length === 0) return 0;
    const sum = rankedStudents.reduce((acc: number, curr: any) => acc + curr.overallAverage, 0);
    return Math.round((sum / rankedStudents.length) * 10) / 10;
  }, [rankedStudents]);

  const topStudent = rankedStudents.length > 0 ? rankedStudents[0] : null;

  const tuntasCount = useMemo(() => {
    const studentRemedialSet = new Set(remedialList.map((r: any) => r.student_id));
    return rankedStudents.filter((s: any) => !studentRemedialSet.has(s.student.id)).length;
  }, [rankedStudents, remedialList]);

  const openReportCard = (studentId: string) => {
    setActiveStudentId(studentId);
    setReportModalOpen(true);
  };

  const exportToCSV = () => {
    if (rankedStudents.length === 0 || subjects.length === 0) return;

    const headers = [
      "Peringkat",
      "NIS",
      "Nama Santri",
      ...subjects.map((s) => s.code),
      "Rata-rata",
      "Total Nilai",
    ];

    const rows = rankedStudents.map((item: any, idx: number) => {
      const subjectScores = subjects.map((s: any) => {
        const entry = gradesMatrix[`${item.student.id}_${s.id}`];
        return entry ? entry.final_score : "-";
      });

      return [
        idx + 1,
        `"${item.student.nis_nip || ""}"`,
        `"${item.student.name}"`,
        ...subjectScores,
        item.overallAverage,
        item.totalScore,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Leger_Nilai_${selectedClass}_Sem${selectedSemester}_${selectedYear.replace("/", "-")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScoreBadge = (score: number, kkm: number) => {
    if (score === 0 || !score) {
      return <span className="text-muted-foreground/40 font-mono text-xs">-</span>;
    }
    if (score < kkm) {
      return (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-destructive/15 text-destructive font-mono">
          {score}
        </span>
      );
    }
    if (score >= 88) {
      return (
        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
          {score}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary font-mono">
        {score}
      </span>
    );
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6 pb-12">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 bg-primary/5 text-primary border-primary/20">
                Kurikulum Merdeka & Diniyyah
              </Badge>
              <span className="text-xs text-muted-foreground">• SMPIT Putra Al-Hanif</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Rekap Nilai & Buku Leger Kelas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pantau rekapitulasi nilai seluruh mapel, peringkat santri, analisis remedial, dan cetak rapor resmi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={rankedStudents.length === 0}
              className="gap-1.5 shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Ekspor Leger CSV
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                  Pilih Kelas / Rombel
                </label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full font-medium">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((cls: string) => (
                      <SelectItem key={cls} value={cls} className="font-medium">
                        Kelas {cls} (Putra)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                  Semester
                </label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTER_OPTIONS.map((sem) => (
                      <SelectItem key={sem.value} value={sem.value}>
                        {sem.label}
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
                    <SelectValue placeholder="Pilih Tahun" />
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
                  Cari Nama / NIS
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Ketik nama santri..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Santri</p>
                <p className="text-xl font-bold tracking-tight">{totalStudents} Santri</p>
                <p className="text-[11px] text-muted-foreground">{selectedClass}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Rata-rata Kelas</p>
                <p className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                  {overallClassAverage}
                </p>
                <p className="text-[11px] text-muted-foreground">{subjects.length} Mata Pelajaran</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Peringkat 1</p>
                <p className="text-sm font-bold tracking-tight truncate">
                  {topStudent ? topStudent.student.name : "-"}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Rata-rata: {topStudent?.overallAverage || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  remedialList.length > 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {remedialList.length > 0 ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status Ketuntasan</p>
                <p className="text-xl font-bold tracking-tight">
                  {tuntasCount} / {totalStudents}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {remedialList.length > 0
                    ? `${remedialList.length} kasus < KKM`
                    : "100% Tuntas Belajar"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="leger" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="leger" className="gap-2 text-xs md:text-sm font-medium">
                <TableIcon className="w-4 h-4" />
                Buku Leger Nilai
              </TabsTrigger>
              <TabsTrigger value="ranking" className="gap-2 text-xs md:text-sm font-medium">
                <Medal className="w-4 h-4" />
                Peringkat Kelas
              </TabsTrigger>
              <TabsTrigger value="remedial" className="gap-2 text-xs md:text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                Analisis Remedial
                {remedialList.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-destructive text-destructive-foreground font-bold">
                    {remedialList.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Filter by subject group on leger */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden md:inline">Kelompok:</span>
              <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                <SelectTrigger className="h-8 text-xs w-[160px]">
                  <SelectValue placeholder="Semua Kelompok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Mata Pelajaran</SelectItem>
                  <SelectItem value="Umum">Umum (Kemendikdasmen)</SelectItem>
                  <SelectItem value="Diniyyah">Diniyyah Kepesantrenan</SelectItem>
                  <SelectItem value="Bahasa Arab">Bahasa Arab</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TAB 1: BUKU LEGER NILAI (MATRIX TABLE) */}
          <TabsContent value="leger" className="space-y-4 mt-0">
            {isLoading ? (
              <div className="min-h-[350px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">Memuat Buku Leger Nilai {selectedClass}...</p>
              </div>
            ) : rankedStudents.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="min-h-[250px] flex flex-col items-center justify-center text-center p-8">
                  <GraduationCap className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-foreground">Tidak Ada Santri Ditemukan</p>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Belum ada santri aktif yang terdaftar di {selectedClass}.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b text-muted-foreground font-semibold">
                        <th className="px-3 py-3 w-10 text-center sticky left-0 bg-muted/90 z-20">
                          Rank
                        </th>
                        <th className="px-3 py-3 min-w-[200px] sticky left-10 bg-muted/90 z-20">
                          Nama Santri
                        </th>
                        <th className="px-2 py-3 w-20 text-center">NIS</th>

                        {/* Subject Header Columns */}
                        {filteredSubjects.map((s) => (
                          <th
                            key={s.id}
                            className="px-2 py-3 text-center min-w-[56px] border-l border-border/40"
                            title={`${s.name} (KKM: ${s.kkm})`}
                          >
                            <div className="font-bold text-foreground">{s.code}</div>
                            <div className="text-[10px] text-muted-foreground font-normal">
                              {s.kkm}
                            </div>
                          </th>
                        ))}

                        <th className="px-3 py-3 text-center w-16 bg-primary/5 font-bold text-primary border-l">
                          Rata²
                        </th>
                        <th className="px-3 py-3 text-center w-16 bg-muted/40 font-semibold border-l">
                          Total
                        </th>
                        <th className="px-3 py-3 text-center w-28 border-l">Aksi Rapor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredStudents.map((item: any, idx: number) => {
                        const sId = item.student.id;
                        const rankNum = idx + 1;

                        return (
                          <tr
                            key={sId}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            {/* Rank */}
                            <td className="px-3 py-2.5 text-center font-bold sticky left-0 bg-card group-hover:bg-muted/30 z-10">
                              {rankNum === 1 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 font-black text-xs">
                                  1
                                </span>
                              ) : rankNum === 2 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-600 font-black text-xs">
                                  2
                                </span>
                              ) : rankNum === 3 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-600 font-black text-xs">
                                  3
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{rankNum}</span>
                              )}
                            </td>

                            {/* Student Info */}
                            <td className="px-3 py-2.5 sticky left-10 bg-card group-hover:bg-muted/30 z-10">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-7 h-7 shrink-0">
                                  <AvatarImage src={item.student.avatar || undefined} />
                                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                    {item.student.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="truncate">
                                  <div className="font-semibold text-foreground truncate">
                                    {item.student.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Kamar {item.student.dorm || "-"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* NIS */}
                            <td className="px-2 py-2.5 text-center text-muted-foreground font-mono">
                              {item.student.nis_nip || "-"}
                            </td>

                            {/* Scores for filtered subjects */}
                            {filteredSubjects.map((s) => {
                              const entry = gradesMatrix[`${sId}_${s.id}`];
                              const score = entry ? entry.final_score : 0;
                              return (
                                <td
                                  key={s.id}
                                  className="px-1.5 py-2.5 text-center border-l border-border/40"
                                >
                                  {getScoreBadge(score, s.kkm)}
                                </td>
                              );
                            })}

                            {/* Overall Average */}
                            <td className="px-2 py-2.5 text-center font-bold text-foreground bg-primary/5 border-l font-mono">
                              {item.overallAverage > 0 ? item.overallAverage : "-"}
                            </td>

                            {/* Total Score */}
                            <td className="px-2 py-2.5 text-center font-semibold text-muted-foreground bg-muted/20 border-l font-mono">
                              {item.totalScore > 0 ? item.totalScore : "-"}
                            </td>

                            {/* Action: Open Report Card */}
                            <td className="px-3 py-2.5 text-center border-l">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] gap-1 px-2.5 hover:bg-primary hover:text-primary-foreground transition-all shadow-2xs"
                                onClick={() => openReportCard(sId)}
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Rapor
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Footer Row: Average per Subject */}
                    <tfoot>
                      <tr className="bg-muted/70 font-semibold border-t-2 border-border text-foreground">
                        <td
                          colSpan={3}
                          className="px-3 py-3 text-right sticky left-0 bg-muted/70 z-10 font-bold"
                        >
                          Rata-rata Kelas:
                        </td>
                        {filteredSubjects.map((s) => {
                          const avg = subjectAverages[s.id] || 0;
                          return (
                            <td
                              key={s.id}
                              className="px-1.5 py-3 text-center border-l border-border/40 font-mono font-bold text-primary"
                            >
                              {avg > 0 ? avg : "-"}
                            </td>
                          );
                        })}
                        <td className="px-2 py-3 text-center font-bold text-primary border-l font-mono bg-primary/10">
                          {overallClassAverage}
                        </td>
                        <td className="border-l" colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: PERINGKAT KELAS (LEADERBOARD) */}
          <TabsContent value="ranking" className="space-y-6 mt-0">
            {rankedStudents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Belum ada data nilai untuk menghitung peringkat.
              </div>
            ) : (
              <>
                {/* Podium Top 3 */}
                {rankedStudents.length >= 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    {/* Rank 2 (Silver) */}
                    <Card className="border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 order-2 md:order-1 shadow-xs">
                      <CardContent className="p-5 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-black text-lg mb-2 shadow-xs">
                          2
                        </div>
                        <Avatar className="w-14 h-14 mb-2 ring-2 ring-slate-300">
                          <AvatarImage src={rankedStudents[1].student.avatar || undefined} />
                          <AvatarFallback className="font-bold">
                            {rankedStudents[1].student.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-base line-clamp-1">
                          {rankedStudents[1].student.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          NIS: {rankedStudents[1].student.nis_nip || "-"}
                        </p>
                        <div className="mt-3 px-3 py-1 bg-background rounded-full border text-sm font-bold text-slate-700 dark:text-slate-300">
                          Rata-rata: {rankedStudents[1].overallAverage}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-3 text-xs gap-1 h-7 text-primary"
                          onClick={() => openReportCard(rankedStudents[1].student.id)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Lihat Rapor
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Rank 1 (Gold) */}
                    <Card className="border-amber-400 bg-gradient-to-b from-amber-500/10 to-transparent order-1 md:order-2 shadow-md relative -translate-y-2">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-amber-950 font-black text-[11px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Juara Kelas
                      </div>
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-2xl mb-2 shadow-md">
                          1
                        </div>
                        <Avatar className="w-16 h-16 mb-2 ring-4 ring-amber-400 shadow-md">
                          <AvatarImage src={rankedStudents[0].student.avatar || undefined} />
                          <AvatarFallback className="font-bold text-lg bg-amber-200 text-amber-900">
                            {rankedStudents[0].student.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-lg line-clamp-1">
                          {rankedStudents[0].student.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          NIS: {rankedStudents[0].student.nis_nip || "-"}
                        </p>
                        <div className="mt-3 px-4 py-1.5 bg-amber-500/20 text-amber-900 dark:text-amber-300 rounded-full border border-amber-400/40 text-base font-extrabold">
                          Rata-rata: {rankedStudents[0].overallAverage}
                        </div>
                        <Button
                          size="sm"
                          className="mt-3 text-xs gap-1 h-8 shadow-xs"
                          onClick={() => openReportCard(rankedStudents[0].student.id)}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Cetak Rapor Santri
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Rank 3 (Bronze) */}
                    <Card className="border-orange-300 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-950/20 order-3 shadow-xs">
                      <CardContent className="p-5 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-orange-400 text-orange-950 flex items-center justify-center font-black text-lg mb-2 shadow-xs">
                          3
                        </div>
                        <Avatar className="w-14 h-14 mb-2 ring-2 ring-orange-300">
                          <AvatarImage src={rankedStudents[2].student.avatar || undefined} />
                          <AvatarFallback className="font-bold">
                            {rankedStudents[2].student.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-base line-clamp-1">
                          {rankedStudents[2].student.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          NIS: {rankedStudents[2].student.nis_nip || "-"}
                        </p>
                        <div className="mt-3 px-3 py-1 bg-background rounded-full border text-sm font-bold text-orange-700 dark:text-orange-300">
                          Rata-rata: {rankedStudents[2].overallAverage}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-3 text-xs gap-1 h-7 text-primary"
                          onClick={() => openReportCard(rankedStudents[2].student.id)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Lihat Rapor
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Complete Ranked List */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="py-4 px-5 border-b">
                    <CardTitle className="text-base font-semibold">
                      Daftar Lengkap Peringkat Santri {selectedClass}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Berdasarkan rata-rata nilai akhir seluruh mata pelajaran yang telah diinput
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/60">
                      {rankedStudents.map((item: any, idx: number) => (
                        <div
                          key={item.student.id}
                          className="flex items-center justify-between p-3.5 sm:px-5 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-8 text-center font-black text-sm text-muted-foreground shrink-0">
                              #{idx + 1}
                            </div>
                            <Avatar className="w-9 h-9 shrink-0">
                              <AvatarImage src={item.student.avatar || undefined} />
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                {item.student.name.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{item.student.name}</p>
                              <p className="text-xs text-muted-foreground">
                                NIS: {item.student.nis_nip || "-"} • Kamar {item.student.dorm || "-"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold font-mono text-primary">
                                {item.overallAverage}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.subjectCount} Mapel Terinput
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5 shadow-2xs"
                              onClick={() => openReportCard(item.student.id)}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Rapor
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* TAB 3: ANALISIS REMEDIAL */}
          <TabsContent value="remedial" className="space-y-4 mt-0">
            {remedialList.length === 0 ? (
              <Card className="border-border/60 shadow-xs">
                <CardContent className="min-h-[260px] flex flex-col items-center justify-center text-center p-8">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">Semua Nilai Mencapai KKM!</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-1">
                    Alhamdulillah, seluruh santri di {selectedClass} telah mencapai KKM (Kriteria
                    Ketuntasan Minimal) pada semua mata pelajaran yang telah dinilai.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 shadow-xs overflow-hidden">
                <CardHeader className="py-4 px-5 border-b bg-destructive/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Daftar Santri Memerlukan Bimbingan / Remedial
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Ditemukan {remedialList.length} capaian nilai di bawah batas KKM mata pelajaran
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-muted/50 border-b text-muted-foreground font-semibold">
                        <th className="px-4 py-3">Nama Santri</th>
                        <th className="px-4 py-3">Mata Pelajaran</th>
                        <th className="px-3 py-3 text-center">Nilai Santri</th>
                        <th className="px-3 py-3 text-center">KKM Target</th>
                        <th className="px-3 py-3 text-center">Defisit Skor</th>
                        <th className="px-4 py-3 text-center">Tindakan Rekomendasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {remedialList.map((rem: any, idx: number) => {
                        const student = rankedStudents.find((s: any) => s.student.id === rem.student_id);
                        const subject = subjects.find((s: any) => s.id === rem.subject_id);
                        const deficit = Math.round((rem.kkm - rem.score) * 10) / 10;

                        return (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-semibold">
                              {student?.student.name || "Santri"}
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">
                              {subject?.name || "Mata Pelajaran"}
                              <span className="text-[10px] text-muted-foreground block">
                                Kelompok {subject?.group}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Badge variant="destructive" className="font-mono text-xs">
                                {rem.score}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-center font-mono font-semibold text-muted-foreground">
                              {rem.kkm}
                            </td>
                            <td className="px-3 py-3 text-center font-mono font-bold text-destructive">
                              -{deficit} poin
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[11px] text-muted-foreground">
                                Pendampingan TP terendah & ujian remedial
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Official Printable Report Card Dialog */}
      <StudentReportCardDialog
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        studentId={activeStudentId}
        semester={selectedSemester}
        academicYear={selectedYear}
      />
    </AppShell>
  );
}
