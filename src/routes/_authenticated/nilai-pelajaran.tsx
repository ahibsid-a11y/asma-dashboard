import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  FileText,
  GraduationCap,
  Info,
  Layers,
  Loader2,
  Printer,
  Sparkles,
  Star,
  Target,
  Trophy,
  User,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StudentReportCardDialog } from "@/components/student-report-card-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getMyGrades } from "@/lib/grades.functions";

export const Route = createFileRoute("/_authenticated/nilai-pelajaran")({
  head: () => ({
    meta: [
      { title: "Nilai Pelajaran Santri | SIM-AHIBS" },
      {
        name: "description",
        content: "Lihat capaian nilai hasil belajar santri, rincian per-TP, STS, SAS, dan cetak rapor.",
      },
      { property: "og:title", content: "Nilai Pelajaran Santri | SIM-AHIBS" },
    ],
  }),
  component: NilaiPelajaranPage,
});

function NilaiPelajaranPage() {
  const { data: profile } = useCurrentProfile();
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const fetchMyGradesFn = useServerFn(getMyGrades);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-academic-grades"],
    queryFn: () => fetchMyGradesFn(),
  });

  const student = data?.student ?? profile;
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const overallAverage = data?.overallAverage ?? 0;

  // Filtered items by group
  const filteredItems = useMemo(() => {
    if (selectedGroup === "all") return items;
    return items.filter((it) => it.subject.group === selectedGroup);
  }, [items, selectedGroup]);

  // Statistics
  const stats = useMemo(() => {
    const totalSubjects = items.length;
    let tuntasCount = 0;
    let remedialCount = 0;
    let highestScore = 0;
    let highestSubjectName = "-";

    for (const it of items) {
      if (it.final_score > 0) {
        if (it.final_score >= it.subject.kkm) {
          tuntasCount++;
        } else {
          remedialCount++;
        }

        if (it.final_score > highestScore) {
          highestScore = it.final_score;
          highestSubjectName = it.subject.name;
        }
      }
    }

    return {
      totalSubjects,
      tuntasCount,
      remedialCount,
      highestScore,
      highestSubjectName,
    };
  }, [items]);

  const toggleExpand = (id: string) => {
    setExpandedSubjectId((prev) => (prev === id ? null : id));
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6 pb-12">
        {/* Banner / Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 md:p-7 relative overflow-hidden shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 ring-4 ring-background shadow-md">
                <AvatarImage src={student?.avatar || undefined} />
                <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                  {(student?.name || "S").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-primary/90 hover:bg-primary font-semibold text-xs">
                    Santri Aktif
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Kelas {student?.class || "7A"} • Kamar {student?.dorm || "-"}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                  {student?.name || student?.display_name || "Nama Santri"}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 font-mono">
                  NIS / NISN: {student?.nis_nip || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setReportModalOpen(true)}
                className="gap-2 shadow-md hover:shadow-lg transition-all font-semibold"
                disabled={!student?.id}
              >
                <Printer className="w-4 h-4" />
                Cetak Rapor Digital
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Rata-rata Nilai (IPK)</p>
                <p className="text-2xl font-black tracking-tight text-primary">
                  {overallAverage}
                </p>
                <p className="text-[11px] text-muted-foreground">Skala 0 - 100</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Mata Pelajaran Tuntas</p>
                <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {stats.tuntasCount}
                </p>
                <p className="text-[11px] text-muted-foreground">Nilai ≥ KKM (75)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  stats.remedialCount > 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Perlu Perbaikan</p>
                <p
                  className={`text-2xl font-black tracking-tight ${
                    stats.remedialCount > 0 ? "text-destructive" : ""
                  }`}
                >
                  {stats.remedialCount}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {stats.remedialCount > 0 ? "Jadwal remedial" : "Tidak ada remedial"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Nilai Tertinggi</p>
                <p className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                  {stats.highestScore > 0 ? stats.highestScore : "-"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate" title={stats.highestSubjectName}>
                  {stats.highestSubjectName}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter per Group Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <Tabs
            value={selectedGroup}
            onValueChange={setSelectedGroup}
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="all" className="text-xs md:text-sm font-medium">
                Semua Mapel ({items.length})
              </TabsTrigger>
              <TabsTrigger value="Umum" className="text-xs md:text-sm font-medium">
                Umum (Kemendikdasmen)
              </TabsTrigger>
              <TabsTrigger value="Diniyyah" className="text-xs md:text-sm font-medium">
                Diniyyah Kepesantrenan
              </TabsTrigger>
              <TabsTrigger value="Bahasa Arab" className="text-xs md:text-sm font-medium">
                Bahasa Arab
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <p className="text-xs text-muted-foreground">
            Klik mata pelajaran untuk melihat rincian capaian per-TP
          </p>
        </div>

        {/* List of Subjects */}
        {isLoading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Memuat rincian nilai santri...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="min-h-[220px] flex flex-col items-center justify-center text-center p-8">
              <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-foreground">Tidak Ada Mata Pelajaran</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Belum ada data mata pelajaran pada kelompok ini.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3.5">
            {filteredItems.map((item) => {
              const isExpanded = expandedSubjectId === item.subject.id;
              const hasScore = item.final_score > 0;
              const isRemedial = hasScore && item.final_score < item.subject.kkm;

              return (
                <Card
                  key={item.subject.id}
                  className={`border transition-all duration-200 shadow-xs hover:border-primary/40 ${
                    isExpanded ? "ring-1 ring-primary/20 shadow-sm" : ""
                  }`}
                >
                  <CardHeader
                    className="p-4 md:p-5 cursor-pointer select-none"
                    onClick={() => toggleExpand(item.subject.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            item.subject.group === "Umum"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : item.subject.group === "Diniyyah"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {item.subject.code}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                              {item.subject.group}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              KKM: {item.subject.kkm}
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-foreground truncate mt-0.5">
                            {item.subject.name}
                          </h3>
                        </div>
                      </div>

                      {/* Right side: Score badges and toggle */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        {hasScore ? (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span
                                  className={`text-xl font-black font-mono ${
                                    isRemedial
                                      ? "text-destructive"
                                      : item.final_score >= 85
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-foreground"
                                  }`}
                                >
                                  {item.final_score}
                                </span>
                                <Badge
                                  className={`font-bold text-xs ${
                                    isRemedial
                                      ? "bg-destructive text-destructive-foreground"
                                      : item.letter_grade === "A"
                                      ? "bg-emerald-600 text-white"
                                      : "bg-primary text-primary-foreground"
                                  }`}
                                >
                                  {item.letter_grade}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {isRemedial ? "Belum Tuntas (Remedial)" : "Tuntas Kompetensi"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-muted-foreground font-normal">
                            Belum Dinilai
                          </Badge>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <CardContent className="pt-0 pb-5 px-4 md:px-5 border-t bg-muted/20">
                      <div className="space-y-4 pt-4">
                        {/* Bobot Components */}
                        <div className="grid grid-cols-3 gap-2.5 text-center">
                          <div className="bg-card border rounded-lg p-2.5 shadow-2xs">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                              Rata-rata TP (50%)
                            </span>
                            <span className="text-base font-bold font-mono text-primary">
                              {item.tpList && item.tpList.length > 0
                                ? Math.round(
                                    (item.tpList.reduce((acc, c) => acc + c.score, 0) /
                                      item.tpList.length) *
                                      10,
                                  ) / 10
                                : "-"}
                            </span>
                          </div>
                          <div className="bg-card border rounded-lg p-2.5 shadow-2xs">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                              Nilai STS / UTS (25%)
                            </span>
                            <span className="text-base font-bold font-mono">
                              {item.sts_score > 0 ? item.sts_score : "-"}
                            </span>
                          </div>
                          <div className="bg-card border rounded-lg p-2.5 shadow-2xs">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                              Nilai SAS / UAS (25%)
                            </span>
                            <span className="text-base font-bold font-mono">
                              {item.sas_score > 0 ? item.sas_score : "-"}
                            </span>
                          </div>
                        </div>

                        {/* Rincian Formatif TP Table */}
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-primary" />
                            Rincian Capaian per Tujuan Pembelajaran (TP)
                          </h4>

                          {item.tpList && item.tpList.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden bg-card text-xs">
                              <table className="w-full text-left">
                                <thead className="bg-muted/60 text-muted-foreground font-semibold">
                                  <tr>
                                    <th className="px-3 py-2 w-14 text-center">Kode</th>
                                    <th className="px-3 py-2">Deskripsi Tujuan Pembelajaran</th>
                                    <th className="px-3 py-2 w-20 text-center">Nilai TP</th>
                                    <th className="px-3 py-2 w-24 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {item.tpList.map((tp, idx) => {
                                    const passed = tp.score >= item.subject.kkm;
                                    return (
                                      <tr key={idx} className="hover:bg-muted/20">
                                        <td className="px-3 py-2 font-bold font-mono text-center text-primary">
                                          {tp.code}
                                        </td>
                                        <td className="px-3 py-2 text-foreground font-medium">
                                          {tp.desc}
                                        </td>
                                        <td className="px-3 py-2 text-center font-bold font-mono">
                                          {tp.score}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          {passed ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                              <CheckCircle2 className="w-3 h-3" /> Tuntas
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] text-destructive font-semibold">
                                              <AlertCircle className="w-3 h-3" /> Remedial
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic p-2 border rounded-md bg-card">
                              Belum ada nilai TP formatif yang diinput oleh pengampu mata pelajaran.
                            </p>
                          )}
                        </div>

                        {/* Deskripsi Kurikulum Merdeka */}
                        {(item.highest_desc || item.lowest_desc) && (
                          <div className="p-3 bg-card border rounded-lg space-y-2 text-xs">
                            <h4 className="font-bold text-foreground flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              Deskripsi Capaian Kompetensi (Kurikulum Merdeka)
                            </h4>
                            {item.highest_desc && (
                              <p className="text-emerald-700 dark:text-emerald-400">
                                • {item.highest_desc}
                              </p>
                            )}
                            {item.lowest_desc && (
                              <p className="text-amber-700 dark:text-amber-400">
                                • {item.lowest_desc}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Official Printable Report Card Dialog */}
      <StudentReportCardDialog
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        studentId={student?.id || null}
      />
    </AppShell>
  );
}
