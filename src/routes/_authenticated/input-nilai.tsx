import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Info,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  Table as TableIcon,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import {
  calculateLetterGrade,
  listClassSubjects,
  getInputGradesSheet,
  listClassOptions,
  manageLearningObjective,
  manageSubject,
  saveGradesBatch,
  type AcademicSubject,
  type LearningObjective,
  type SubjectGroup,
} from "@/lib/grades.functions";

export const Route = createFileRoute("/_authenticated/input-nilai")({
  head: () => ({
    meta: [
      { title: "Input Nilai Siswa | SIM-AHIBS" },
      {
        name: "description",
        content: "Pencatatan nilai berbasis Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP) kurikulum merdeka dan kepesantrenan AHIBS.",
      },
      { property: "og:title", content: "Input Nilai Siswa | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Pencatatan nilai berbasis Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP) kurikulum merdeka dan kepesantrenan AHIBS.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: InputNilaiPage,
});

function InputNilaiPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchSubjects = useServerFn(listClassSubjects);
  const fetchSheet = useServerFn(getInputGradesSheet);
  const saveBatchFn = useServerFn(saveGradesBatch);
  const manageTpFn = useServerFn(manageLearningObjective);
  const manageSubjectFn = useServerFn(manageSubject);

  // Filter selection states
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("1");
  const [selectedYear, setSelectedYear] = useState<string>("2026/2027");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // Sheet editable states: student_id -> { tp_scores: Record<tp_id, number>, sts_score: number, sas_score: number }
  const [localGrades, setLocalGrades] = useState<
    Record<string, { tp_scores: Record<string, number>; sts_score: number; sas_score: number; teacher_notes?: string }>
  >({});

  // TP Form states
  const [newTpCode, setNewTpCode] = useState("TP 1");
  const [newTpDesc, setNewTpDesc] = useState("");
  const [newTpCp, setNewTpCp] = useState("");

  // Mapel Form states (Kurikulum / Admin)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubGroup, setNewSubGroup] = useState<SubjectGroup>("Umum");
  const [newSubKkm, setNewSubKkm] = useState<number>(75);

  // 1. Ambil daftar mata pelajaran sesuai kelas terpilih (Manajemen Mapel)
  const subjectsQuery = useQuery({
    queryKey: ["class-subjects", selectedClass, selectedYear],
    queryFn: () => fetchSubjects({ data: { class_name: selectedClass, academic_year: selectedYear } }),
    enabled: Boolean(selectedClass),
  });


  // Daftar kelas resmi (master Manajemen Kelas)
  const fetchClasses = useServerFn(listClassOptions);
  const classesQuery = useQuery({
    queryKey: ["class-options"],
    queryFn: () => fetchClasses(),
  });
  const classOptions = classesQuery.data ?? [];

  useEffect(() => {
    if (!selectedClass && classOptions.length > 0) {
      setSelectedClass(classOptions[0]!);
    }
  }, [classOptions, selectedClass]);

  const subjects = subjectsQuery.data ?? [];

  // Auto-pilih mapel pertama / reset bila mapel tidak diajarkan di kelas ini
  useEffect(() => {
    if (subjects.length === 0) return;
    if (!selectedSubjectId || !subjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(subjects[0]!.id);
    }
  }, [subjects, selectedSubjectId]);


  // Mapel yang sedang dipilih
  const currentSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId);
  }, [subjects, selectedSubjectId]);

  // 2. Ambil lembar input nilai
  const sheetQuery = useQuery({
    queryKey: [
      "input-grades-sheet",
      selectedSubjectId,
      selectedClass,
      selectedSemester,
      selectedYear,
    ],
    queryFn: async () => {
      if (!selectedSubjectId) return null;
      const res = await fetchSheet({
        data: {
          subject_id: selectedSubjectId,
          class_name: selectedClass,
          semester: selectedSemester,
          academic_year: selectedYear,
        },
      });

      // Inisialisasi localGrades dari data DB
      const init: Record<
        string,
        { tp_scores: Record<string, number>; sts_score: number; sas_score: number; teacher_notes?: string }
      > = {};

      for (const s of res.students) {
        const tpScores: Record<string, number> = {};
        for (const t of res.tps) {
          const val = res.tpGradesMap[`${s.id}_${t.id}`];
          tpScores[t.id] = val !== undefined ? Number(val) : 0;
        }

        const summary = res.summariesMap[s.id];
        init[s.id] = {
          tp_scores: tpScores,
          sts_score: summary ? Number(summary.sts_score) : 0,
          sas_score: summary ? Number(summary.sas_score) : 0,
          teacher_notes: summary?.teacher_notes || "",
        };
      }

      setLocalGrades(init);
      return res;
    },
    enabled: Boolean(selectedSubjectId),
  });

  const tps = sheetQuery.data?.tps ?? [];
  const students = sheetQuery.data?.students ?? [];
  const settings = sheetQuery.data?.settings ?? { weight_tp: 50, weight_sts: 25, weight_sas: 25 };

  // Update skor TP
  const handleTpChange = (studentId: string, tpId: string, valStr: string) => {
    const val = Math.min(100, Math.max(0, Number(valStr) || 0));
    setLocalGrades((prev) => {
      const studentData = prev[studentId] || { tp_scores: {}, sts_score: 0, sas_score: 0 };
      return {
        ...prev,
        [studentId]: {
          ...studentData,
          tp_scores: {
            ...studentData.tp_scores,
            [tpId]: val,
          },
        },
      };
    });
  };

  // Update STS / SAS
  const handleScoreChange = (studentId: string, field: "sts_score" | "sas_score", valStr: string) => {
    const val = Math.min(100, Math.max(0, Number(valStr) || 0));
    setLocalGrades((prev) => {
      const studentData = prev[studentId] || { tp_scores: {}, sts_score: 0, sas_score: 0 };
      return {
        ...prev,
        [studentId]: {
          ...studentData,
          [field]: val,
        },
      };
    });
  };

  // Hitung preview Nilai Akhir real-time untuk 1 santri
  const calculateFinalPreview = (studentId: string) => {
    const data = localGrades[studentId];
    if (!data) return { avgTp: 0, final: 0, grade: "D" };

    const tpVals = Object.values(data.tp_scores);
    const avgTp = tpVals.length > 0 ? tpVals.reduce((a, b) => a + b, 0) / tpVals.length : 0;
    const wTp = settings.weight_tp / 100;
    const wSts = settings.weight_sts / 100;
    const wSas = settings.weight_sas / 100;

    const final = Math.round((avgTp * wTp + data.sts_score * wSts + data.sas_score * wSas) * 10) / 10;
    const { grade } = calculateLetterGrade(final);
    return { avgTp: Math.round(avgTp * 10) / 10, final, grade };
  };

  // Mutation: Simpan Batch Nilai
  const saveBatchMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubjectId) throw new Error("Pilih mata pelajaran");
      const gradesPayload = students.map((s: any) => {
        const d = localGrades[s.id] || { tp_scores: {}, sts_score: 0, sas_score: 0 };
        return {
          student_id: s.id,
          tp_scores: d.tp_scores,
          sts_score: d.sts_score,
          sas_score: d.sas_score,
          teacher_notes: d.teacher_notes,
        };
      });

      return saveBatchFn({
        data: {
          subject_id: selectedSubjectId,
          class_name: selectedClass,
          semester: selectedSemester,
          academic_year: selectedYear,
          grades: gradesPayload,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Berhasil menyimpan nilai untuk ${res.count} santri!`);
      queryClient.invalidateQueries({ queryKey: ["input-grades-sheet"] });
      queryClient.invalidateQueries({ queryKey: ["class-grades-recap"] });
      queryClient.invalidateQueries({ queryKey: ["my-grades"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menyimpan nilai");
    },
  });

  // Mutation: Tambah TP Baru
  const addTpMutation = useMutation({
    mutationFn: () =>
      manageTpFn({
        data: {
          action: "create",
          subject_id: selectedSubjectId,
          class_name: selectedClass,
          semester: selectedSemester,
          academic_year: selectedYear,
          code: newTpCode.trim(),
          description: newTpDesc.trim(),
          cp_code: newTpCp.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Tujuan Pembelajaran (TP) berhasil ditambahkan");
      setNewTpDesc("");
      setNewTpCode(`TP ${tps.length + 2}`);
      queryClient.invalidateQueries({ queryKey: ["input-grades-sheet"] });
      queryClient.invalidateQueries({ queryKey: ["curriculum-plan"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menambah TP");
    },
  });

  // Mutation: Hapus TP
  const deleteTpMutation = useMutation({
    mutationFn: (tpId: string) =>
      manageTpFn({
        data: { action: "delete", id: tpId },
      }),
    onSuccess: () => {
      toast.success("TP berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["input-grades-sheet"] });
      queryClient.invalidateQueries({ queryKey: ["curriculum-plan"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus TP");
    },
  });

  // Mutation: Tambah Mapel Baru
  const addSubjectMutation = useMutation({
    mutationFn: () =>
      manageSubjectFn({
        data: {
          action: "create",
          code: newSubCode.trim(),
          name: newSubName.trim(),
          group: newSubGroup,
          kkm: Number(newSubKkm) || 75,
        },
      }),
    onSuccess: () => {
      toast.success("Mata pelajaran baru berhasil ditambahkan");
      setNewSubCode("");
      setNewSubName("");
      queryClient.invalidateQueries({ queryKey: ["class-subjects"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menambah mapel");
    },
  });

  const getGradeBadgeClass = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300";
      case "B":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300";
      case "C":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300";
      default:
        return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300";
    }
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Input Nilai Siswa (Kurikulum Merdeka & Diniyyah)
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Penilaian berbasis Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP) per mata pelajaran.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setIsSubjectModalOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
              Kelola Mapel
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs font-bold"
              onClick={() => saveBatchMutation.mutate()}
              disabled={saveBatchMutation.isPending || students.length === 0}
            >
              {saveBatchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan Nilai...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Simpan Semua Nilai Kelas
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filter Bar: Kelas, Semester, Mapel */}
        <Card className="border-border shadow-xs bg-muted/10">
          <CardContent className="p-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {/* Kelas */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Kelas</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
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
                <Label className="text-[11px] text-muted-foreground font-semibold">Tahun Ajaran</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026/2027">2026/2027</SelectItem>
                    <SelectItem value="2025/2026">2025/2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mata Pelajaran */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">
                  Mata Pelajaran
                </Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue placeholder="Pilih Mapel" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {/* Kelompok Umum */}
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                      Kurikulum Umum (Kemendikdasmen)
                    </div>
                    {subjects
                      .filter((s) => s.group === "Umum")
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} (KKM {s.kkm})
                        </SelectItem>
                      ))}

                    {/* Kelompok Diniyyah */}
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase pt-2">
                      Diniyyah Kepesantrenan
                    </div>
                    {subjects
                      .filter((s) => s.group === "Diniyyah")
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} (KKM {s.kkm})
                        </SelectItem>
                      ))}

                    {/* Kelompok Bahasa Arab */}
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase pt-2">
                      Bahasa Arab
                    </div>
                    {subjects
                      .filter((s) => s.group === "Bahasa Arab")
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} (KKM {s.kkm})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Mapel Aktif & Bobot Formula */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border bg-card p-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30">
              {currentSubject?.code || "MAPEL"}
            </Badge>
            <span className="text-sm font-semibold text-foreground">
              {currentSubject?.name || "Mata Pelajaran"}
            </span>
            <span className="text-xs text-muted-foreground">
              • Kelompok: {currentSubject?.group} • KKM: {currentSubject?.kkm}
            </span>
          </div>
          <div className="text-xs text-muted-foreground font-mono bg-muted/40 px-2.5 py-1 rounded">
            Formula: ({settings.weight_tp}% Rata TP) + ({settings.weight_sts}% STS) + ({settings.weight_sas}% SAS)
          </div>
        </div>

        {/* Tab Penilaian vs Kelola TP */}
        <Tabs defaultValue="sheet" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sheet" className="text-xs gap-1.5">
              <TableIcon className="h-3.5 w-3.5" />
              Lembar Nilai Santri ({students.length})
            </TabsTrigger>
            <TabsTrigger value="tp" className="text-xs gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Tujuan Pembelajaran (TP: {tps.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: SPREADSHEET INPUT NILAI SANTRI */}
          <TabsContent value="sheet" className="space-y-4 m-0">
            <Card className="border-border shadow-sm">
              <CardContent className="p-0">
                {sheetQuery.isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="mt-2 text-xs">Menyiapkan lembar penilaian kelas {selectedClass}...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Belum ada data santri aktif di kelas {selectedClass}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted/60 text-[11px] font-semibold text-muted-foreground uppercase border-b">
                        <tr>
                          <th className="p-3 w-10 text-center">No</th>
                          <th className="p-3 min-w-[180px]">Nama Santri</th>
                          <th className="p-3 w-28">NIS</th>

                          {/* Dynamic TP Columns */}
                          {tps.map((t) => (
                            <th
                              key={t.id}
                              className="p-3 w-24 text-center bg-primary/5 border-l border-border"
                              title={t.description}
                            >
                              <span className="font-bold text-primary block">{t.code}</span>
                              <span className="text-[9px] font-normal text-muted-foreground block truncate max-w-[80px]">
                                {t.description}
                              </span>
                            </th>
                          ))}

                          {/* Rata-Rata TP */}
                          <th className="p-3 w-24 text-center bg-muted/40 border-l border-border">
                            Rata TP
                          </th>

                          {/* Sumatif STS & SAS */}
                          <th className="p-3 w-24 text-center bg-blue-50/50 dark:bg-blue-950/20 border-l border-border">
                            STS (UTS)
                          </th>
                          <th className="p-3 w-24 text-center bg-blue-50/50 dark:bg-blue-950/20 border-l border-border">
                            SAS (UAS)
                          </th>

                          {/* Nilai Akhir & Predikat */}
                          <th className="p-3 w-28 text-center bg-emerald-50/60 dark:bg-emerald-950/30 border-l border-border">
                            Nilai Akhir
                          </th>
                          <th className="p-3 w-20 text-center border-l border-border">
                            Predikat
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {students.map((s: any, idx: number) => {
                          const local = localGrades[s.id] || { tp_scores: {}, sts_score: 0, sas_score: 0 };
                          const preview = calculateFinalPreview(s.id);

                          return (
                            <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3 text-center text-muted-foreground font-mono">
                                {idx + 1}
                              </td>
                              <td className="p-3 font-medium text-foreground whitespace-nowrap">
                                {s.name}
                              </td>
                              <td className="p-3 text-muted-foreground font-mono">
                                {s.nis_nip || "-"}
                              </td>

                              {/* Input Kolom Tiap TP */}
                              {tps.map((t) => {
                                const val = local.tp_scores[t.id] ?? 0;
                                return (
                                  <td key={t.id} className="p-1.5 text-center border-l border-border">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={val === 0 ? "" : val}
                                      placeholder="0"
                                      onChange={(e) => handleTpChange(s.id, t.id, e.target.value)}
                                      className="h-8 text-xs text-center font-bold font-mono focus:ring-1"
                                    />
                                  </td>
                                );
                              })}

                              {/* Rata-Rata TP */}
                              <td className="p-3 text-center font-bold font-mono bg-muted/20 border-l border-border">
                                {preview.avgTp}
                              </td>

                              {/* STS */}
                              <td className="p-1.5 text-center border-l border-border">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={local.sts_score === 0 ? "" : local.sts_score}
                                  placeholder="0"
                                  onChange={(e) => handleScoreChange(s.id, "sts_score", e.target.value)}
                                  className="h-8 text-xs text-center font-bold font-mono text-blue-700 dark:text-blue-400"
                                />
                              </td>

                              {/* SAS */}
                              <td className="p-1.5 text-center border-l border-border">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={local.sas_score === 0 ? "" : local.sas_score}
                                  placeholder="0"
                                  onChange={(e) => handleScoreChange(s.id, "sas_score", e.target.value)}
                                  className="h-8 text-xs text-center font-bold font-mono text-blue-700 dark:text-blue-400"
                                />
                              </td>

                              {/* Nilai Akhir */}
                              <td className="p-3 text-center font-extrabold font-mono text-sm bg-emerald-50/40 dark:bg-emerald-950/20 border-l border-border text-emerald-700 dark:text-emerald-400">
                                {preview.final}
                              </td>

                              {/* Predikat */}
                              <td className="p-3 text-center border-l border-border">
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-bold ${getGradeBadgeClass(preview.grade)}`}
                                >
                                  {preview.grade}
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
          </TabsContent>

          {/* TAB 2: KELOLA CAPAIAN & TUJUAN PEMBELAJARAN (TP) */}
          <TabsContent value="tp" className="space-y-4 m-0">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Kelola Tujuan Pembelajaran (TP) — Mapel {currentSubject?.name} ({selectedClass})
                </CardTitle>
                <CardDescription className="text-xs">
                  Tujuan Pembelajaran ini menjadi materi ajar yang dinilai sepanjang semester dan menjadi dasar deskripsi capaian pada buku rapor santri.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Notice Callout & Direct Link to Perangkat Ajar */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Terhubung Dua Arah dengan Perangkat Ajar:</strong> Tujuan Pembelajaran (TP) di sini otomatis terhubung dengan modul <strong>Perangkat Ajar (CP, TP & ATP)</strong> dan buku rapor santri.
                    </p>
                  </div>
                  <Link
                    to="/perangkat-ajar"
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted/50 text-foreground transition-colors shrink-0 shadow-xs"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    Buka Perangkat Ajar (CP & TP)
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </Link>
                </div>

                {/* Form Tambah TP */}
                <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                  <h4 className="text-xs font-semibold flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5 text-primary" /> Tambah Tujuan Pembelajaran Baru
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px]">Kode TP</Label>
                      <Input
                        placeholder="TP 1"
                        value={newTpCode}
                        onChange={(e) => setNewTpCode(e.target.value)}
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                    <div className="sm:col-span-8 space-y-1">
                      <Label className="text-[11px]">Deskripsi Kompetensi / Materi TP</Label>
                      <Input
                        placeholder="Contoh: Memahami rukun dan syarat shalat fardhu..."
                        value={newTpDesc}
                        onChange={(e) => setNewTpDesc(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-end">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 w-full text-xs"
                        onClick={() => addTpMutation.mutate()}
                        disabled={!newTpDesc.trim() || addTpMutation.isPending}
                      >
                        {addTpMutation.isPending ? "Menyimpan..." : "Tambah TP"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Tabel Daftar TP */}
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase">
                      <tr>
                        <th className="p-3 w-16">Kode</th>
                        <th className="p-3">Deskripsi Materi Tujuan Pembelajaran</th>
                        <th className="p-3 text-right w-20">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tps.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-muted-foreground">
                            Belum ada TP yang dibuat untuk mapel ini. Silakan tambahkan di atas.
                          </td>
                        </tr>
                      ) : (
                        tps.map((t) => (
                          <tr key={t.id} className="hover:bg-muted/20">
                            <td className="p-3 font-bold text-primary font-mono">{t.code}</td>
                            <td className="p-3 text-foreground">{t.description}</td>
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (window.confirm(`Hapus ${t.code}? Nilai terkait akan terhapus.`)) {
                                    deleteTpMutation.mutate(t.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL KELOLA MATA PELAJARAN (ADMIN / KURIKULUM) */}
      <Dialog open={isSubjectModalOpen} onOpenChange={setIsSubjectModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Kelola Mata Pelajaran SIM-AHIBS
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftar mata pelajaran kurikulum umum Kemendikdasmen, Diniyyah, dan Bahasa Arab.
            </DialogDescription>
          </DialogHeader>

          {/* Form Tambah Mapel */}
          <div className="space-y-2.5 rounded-lg border bg-muted/30 p-3">
            <h4 className="text-xs font-semibold flex items-center gap-1">
              <Plus className="h-3.5 w-3.5 text-primary" /> Tambah Mata Pelajaran Baru
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px]">Kode Mapel</Label>
                <Input
                  placeholder="TAH"
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value.toUpperCase())}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
              <div className="sm:col-span-5 space-y-1">
                <Label className="text-[11px]">Nama Mata Pelajaran</Label>
                <Input
                  placeholder="Tahfidz Al-Qur'an..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-[11px]">Kelompok</Label>
                <Select value={newSubGroup} onValueChange={(v: SubjectGroup) => setNewSubGroup(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Umum">Umum</SelectItem>
                    <SelectItem value="Diniyyah">Diniyyah</SelectItem>
                    <SelectItem value="Bahasa Arab">B. Arab</SelectItem>
                    <SelectItem value="Muatan Lokal">Mulok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-[11px]">KKM</Label>
                <Input
                  type="number"
                  min={50}
                  max={100}
                  value={newSubKkm}
                  onChange={(e) => setNewSubKkm(Number(e.target.value))}
                  className="h-8 text-xs font-bold text-center"
                />
              </div>
              <div className="sm:col-span-12 flex justify-end">
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => addSubjectMutation.mutate()}
                  disabled={!newSubName.trim() || addSubjectMutation.isPending}
                >
                  {addSubjectMutation.isPending ? "Menyimpan..." : "Tambah Mapel"}
                </Button>
              </div>
            </div>
          </div>

          {/* Tabel Mapel */}
          <div className="max-h-64 overflow-y-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase sticky top-0">
                <tr>
                  <th className="p-2 w-16 font-mono">Kode</th>
                  <th className="p-2">Mata Pelajaran</th>
                  <th className="p-2">Kelompok</th>
                  <th className="p-2 text-center">KKM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="p-2 font-bold font-mono text-primary">{s.code}</td>
                    <td className="p-2 font-medium text-foreground">{s.name}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-[10px]">
                        {s.group}
                      </Badge>
                    </td>
                    <td className="p-2 text-center font-bold text-emerald-600">{s.kkm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSubjectModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
