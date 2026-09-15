import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileText,
  HeartHandshake,
  HelpCircle,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getKokurClassDataFn,
  previewKokurNarrativeFn,
  saveStudentKokurFn,
} from "@/lib/kokur.functions";
import type {
  KokurPredicate,
  KokurTheme,
  StudentKokurGrade,
} from "@/lib/kokur.storage.server";

export const Route = createFileRoute("/_authenticated/input-kokur")({
  head: () => ({
    meta: [
      { title: "Input Nilai Kokurikuler (P5) | SIM-AHIBS" },
      {
        name: "description",
        content: "Penilaian Projek Penguatan Profil Pelajar Pancasila dan Profil Pelajar Rahmatan Lil 'Alamin (P5RA) SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Input Nilai Kokurikuler (P5) | SIM-AHIBS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: InputKokurPage,
});

const PREDICATE_LABELS: Record<KokurPredicate, { code: string; label: string; tone: string }> = {
  SB: {
    code: "SB",
    label: "Sangat Berkembang",
    tone: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  },
  BSH: {
    code: "BSH",
    label: "Berkembang Sesuai Harapan",
    tone: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800",
  },
  MB: {
    code: "MB",
    label: "Mulai Berkembang",
    tone: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  },
  BB: {
    code: "BB",
    label: "Belum Berkembang",
    tone: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800",
  },
};

function InputKokurPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchClassData = useServerFn(getKokurClassDataFn);
  const saveStudentFn = useServerFn(saveStudentKokurFn);
  const previewNarrativeFn = useServerFn(previewKokurNarrativeFn);

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>("7A");
  const [selectedSemester, setSelectedSemester] = useState<string>("1");
  const [selectedYear, setSelectedYear] = useState<string>("2026/2027");

  // State nilai yang diedit di halaman: studentId -> { grades: Record<themeId, StudentKokurGrade>, narrative: string }
  const [localGrades, setLocalGrades] = useState<
    Record<string, { grades: Record<string, StudentKokurGrade>; narrative: string }>
  >({});

  // Active student for detail modal
  const [selectedStudentModal, setSelectedStudentModal] = useState<any | null>(null);

  // Query Data Kelas
  const classDataQuery = useQuery({
    queryKey: ["kokur-class-data", selectedClass, selectedSemester, selectedYear],
    queryFn: async () => {
      const res = await fetchClassData({
        data: {
          className: selectedClass,
          semester: selectedSemester,
          academicYear: selectedYear,
        },
      });

      // Inisialisasi local state
      const init: Record<
        string,
        { grades: Record<string, StudentKokurGrade>; narrative: string }
      > = {};

      for (const item of res.students) {
        const studentId = item.student.id;
        const rec = item.record;
        const grades: Record<string, StudentKokurGrade> = {};

        for (const t of res.themes) {
          if (rec?.grades && rec.grades[t.id]) {
            grades[t.id] = rec.grades[t.id];
          } else {
            grades[t.id] = { predicate: "BSH" }; // default BSH
          }
        }

        init[studentId] = {
          grades,
          narrative: rec?.narrative || "",
        };
      }

      setLocalGrades(init);
      return res;
    },
  });

  const themes = classDataQuery.data?.themes || [];
  const studentList = classDataQuery.data?.students || [];

  // Mutation: Simpan Nilai Santri
  const saveMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const current = localGrades[studentId];
      if (!current) return;

      const studentItem = studentList.find((s: any) => s.student.id === studentId);
      const studentName = studentItem?.student.full_name || "Santri";

      return saveStudentFn({
        data: {
          studentId,
          studentName,
          semester: selectedSemester,
          academicYear: selectedYear,
          grades: current.grades,
          narrative: current.narrative,
        },
      });
    },
    onSuccess: (_, studentId) => {
      const studentItem = studentList.find((s: any) => s.student.id === studentId);
      toast.success(`Nilai kokurikuler ${studentItem?.student.full_name || ""} berhasil disimpan!`);
      queryClient.invalidateQueries({ queryKey: ["kokur-class-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-card-dinas"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menyimpan nilai kokurikuler");
    },
  });

  // Mutation: Generate Narasi Otomatis
  const generateNarrativeMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const current = localGrades[studentId];
      if (!current) return;

      const studentItem = studentList.find((s: any) => s.student.id === studentId);
      const studentName = studentItem?.student.full_name || "Santri";

      const res = await previewNarrativeFn({
        data: {
          studentName,
          grades: current.grades,
        },
      });

      return { studentId, narrative: res.narrative };
    },
    onSuccess: (data) => {
      if (!data) return;
      setLocalGrades((prev) => ({
        ...prev,
        [data.studentId]: {
          ...prev[data.studentId]!,
          narrative: data.narrative,
        },
      }));
      toast.info("Narasi capaian berhasil di-generate secara otomatis!");
    },
  });

  // Handler update predikat per tema
  const handlePredicateChange = (studentId: string, themeId: string, predicate: KokurPredicate) => {
    setLocalGrades((prev) => {
      const current = prev[studentId] || { grades: {}, narrative: "" };
      const updatedGrades = {
        ...current.grades,
        [themeId]: {
          ...current.grades[themeId],
          predicate,
        },
      };
      return {
        ...prev,
        [studentId]: {
          ...current,
          grades: updatedGrades,
        },
      };
    });
  };

  // Handler update narasi teks manual
  const handleNarrativeChange = (studentId: string, narrative: string) => {
    setLocalGrades((prev) => {
      const current = prev[studentId] || { grades: {}, narrative: "" };
      return {
        ...prev,
        [studentId]: {
          ...current,
          narrative,
        },
      };
    });
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header Title */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Compass className="h-6 w-6 text-primary" />
              Penilaian Kokurikuler (P5 / P5RA)
            </h1>
            <p className="text-sm text-muted-foreground">
              Projek Penguatan Profil Pelajar Pancasila & Rahmatan Lil 'Alamin (Nilai HEBAT)
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-xs font-semibold px-3 py-1 bg-primary/5 text-primary border-primary/20">
            Output: 1 Paragraf Rapor Dinas
          </Badge>
        </div>

        {/* Info & Tema Referensi Kurikulum */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Struktur Tema Kokurikuler (P5RA AHIBS)
            </CardTitle>
            <CardDescription className="text-xs">
              Nilai diinput berdasarkan 5 tema profil. Sistem otomatis menyusun 1 paragraf narasi deskripsi capaian untuk Rapor Dinas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {themes.map((theme: KokurTheme, idx: number) => (
                <div
                  key={theme.id}
                  className="p-2.5 rounded-lg border border-border/80 bg-muted/20 flex flex-col justify-between text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      Tema {idx + 1}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[100px]">
                      {theme.nilai_hebat}
                    </span>
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground">{theme.title}</h5>
                    <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">
                      {theme.activities}
                    </p>
                  </div>
                  <div className="pt-1 text-[10px] text-primary/80 font-medium border-t border-border/50">
                    Fokus: {theme.focus_dimension}
                  </div>
                </div>
              ))}
            </div>

            {/* Skala Penilaian */}
            <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-muted-foreground">Kriteria Predikat:</span>
              {Object.entries(PREDICATE_LABELS).map(([code, item]) => (
                <span key={code} className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${item.tone}`}>
                  {item.code} — {item.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filter Bar: Kelas, Semester, Tahun Ajaran */}
        <Card className="border-border shadow-xs bg-muted/10">
          <CardContent className="p-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Kelas */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Kelas / Rombel</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["7A", "7B", "8A", "8B", "9A", "9B", "10", "11", "12"].map((c) => (
                      <SelectItem key={c} value={c}>
                        Kelas {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Semester */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Semester</Label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1 (Ganjil)</SelectItem>
                    <SelectItem value="2">Semester 2 (Genap)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tahun Ajaran */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Tahun Pelajaran</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025/2026">2025/2026</SelectItem>
                    <SelectItem value="2026/2027">2026/2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daftar Santri & Input Nilai Kokurikuler */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Daftar Santri Kelas {selectedClass} ({studentList.length} Santri)
            </h3>
          </div>

          {classDataQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-2">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs">Memuat data santri kelas {selectedClass}...</p>
            </div>
          ) : studentList.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">
                Tidak ada santri yang terdaftar di kelas {selectedClass}.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {studentList.map((item: any, sIdx: number) => {
                const s = item.student;
                const state = localGrades[s.id] || { grades: {}, narrative: "" };
                const isSaving = saveMutation.isPending && saveMutation.variables === s.id;
                const isGenerating =
                  generateNarrativeMutation.isPending &&
                  generateNarrativeMutation.variables === s.id;

                return (
                  <Card key={s.id} className="border-border shadow-xs overflow-hidden">
                    <CardHeader className="p-4 bg-muted/20 border-b border-border/60">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {sIdx + 1}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-foreground">
                              {s.full_name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              NIS: {s.nis_nip || "-"} • Kelas {s.class_name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => generateNarrativeMutation.mutate(s.id)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            Generate Narasi
                          </Button>

                          <Button
                            size="sm"
                            className="h-8 text-xs font-bold gap-1.5"
                            onClick={() => saveMutation.mutate(s.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            Simpan
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4">
                      {/* Grid 5 Tema Predikat */}
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                          Predikat Capaian per Tema:
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                          {themes.map((theme: KokurTheme) => {
                            const currentPred = state.grades[theme.id]?.predicate || "BSH";
                            return (
                              <div
                                key={theme.id}
                                className="p-2.5 rounded-lg border border-border bg-card flex flex-col justify-between space-y-2"
                              >
                                <div>
                                  <div className="font-bold text-xs text-foreground truncate">
                                    {theme.title}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {theme.activities}
                                  </div>
                                </div>

                                <div className="grid grid-cols-4 gap-1">
                                  {(["SB", "BSH", "MB", "BB"] as KokurPredicate[]).map((p) => {
                                    const isSelected = currentPred === p;
                                    return (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => handlePredicateChange(s.id, theme.id, p)}
                                        className={`py-1 text-[11px] font-bold rounded transition-colors text-center border ${
                                          isSelected
                                            ? PREDICATE_LABELS[p].tone
                                            : "bg-muted/40 text-muted-foreground hover:bg-muted border-transparent"
                                        }`}
                                        title={`${theme.title}: ${PREDICATE_LABELS[p].label}`}
                                      >
                                        {p}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Narasi 1 Paragraf untuk Rapor */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            Narasi Deskripsi Capaian Rapor (1 Paragraf)
                          </Label>
                          <span className="text-[11px] text-muted-foreground">
                            Otomatis tampil di Rapor Dinas (Seksi B)
                          </span>
                        </div>
                        <Textarea
                          rows={3}
                          value={state.narrative}
                          onChange={(e) => handleNarrativeChange(s.id, e.target.value)}
                          placeholder="Klik 'Generate Narasi' untuk mengisi otomatis berdasarkan predikat tema di atas, atau tulis narasi custom deskripsi capaian siswa..."
                          className="text-xs leading-relaxed resize-y"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
