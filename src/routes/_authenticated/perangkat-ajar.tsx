import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Sparkles,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import {
  CurriculumCpTpAtpPrintDialog,
  CurriculumProtaPromesPrintDialog,
} from "@/components/curriculum-print-dialogs";
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
import { Progress } from "@/components/ui/progress";
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
  getCurriculumPlan,
  saveCurriculumElement,
  saveCurriculumPromesGrid,
  saveCurriculumTimeAllocations,
  saveCurriculumTpBatch,
  updateCurriculumPlanMeta,
  DEFAULT_MONTHS_GANJIL,
  DEFAULT_MONTHS_GENAP,
  type CurriculumElement,
  type CurriculumPlan,
  type CurriculumPromesEntry,
  type CurriculumTimeAllocation,
  type CurriculumTp,
} from "@/lib/curriculum.functions";
import { getAcademicSubjects, listClassOptions, type AcademicSubject } from "@/lib/grades.functions";

const ACADEMIC_YEARS = ["2026/2027", "2025/2026"];
const COGNITIVE_LEVELS = [
  "C1 - Mengingat",
  "C2 - Memahami",
  "C3 - Menerapkan",
  "C4 - Menganalisis",
  "C5 - Mengevaluasi",
  "C6 - Mencipta",
];
const DIMENSIONS = ["Pengetahuan", "Keterampilan", "Sikap"];
const ASSESSMENT_METHODS = [
  "Tes Tertulis",
  "Unjuk Kerja / Praktik",
  "Observasi Sikap",
  "Portofolio",
  "Penugasan Mandiri",
];

export const Route = createFileRoute("/_authenticated/perangkat-ajar")({
  head: () => ({
    meta: [
      { title: "Perangkat Ajar (CP, TP, ATP, Prota, Promes) | SIM-AHIBS" },
      {
        name: "description",
        content: "Penyusunan dan pencetakan Capaian Pembelajaran, TP, ATP, Alokasi Waktu, Prota, dan Promes resmi SIM-AHIBS.",
      },
      { property: "og:title", content: "Perangkat Ajar (CP, TP, ATP, Prota, Promes) | SIM-AHIBS" },
    ],
  }),
  component: PerangkatAjarPage,
});

function PerangkatAjarPage() {
  const { data: profile } = useCurrentProfile();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedYear, setSelectedYear] = useState("2026/2027");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // Print Dialog States
  const [printDialogCpOpen, setPrintDialogCpOpen] = useState(false);
  const [printDialogProtaOpen, setPrintDialogProtaOpen] = useState(false);

  // Element Dialog State
  const [elementDialogOpen, setElementDialogOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<CurriculumElement | null>(null);
  const [elementNameInput, setElementNameInput] = useState("");
  const [elementCpInput, setElementCpInput] = useState("");

  // Promes Tab active semester
  const [promesSemester, setPromesSemester] = useState<"1" | "2">("1");

  // Server functions
  const fetchSubjectsFn = useServerFn(getAcademicSubjects);
  const fetchPlanFn = useServerFn(getCurriculumPlan);
  const savePlanMetaFn = useServerFn(updateCurriculumPlanMeta);
  const saveElementFn = useServerFn(saveCurriculumElement);
  const saveTpBatchFn = useServerFn(saveCurriculumTpBatch);
  const saveTimeAllocFn = useServerFn(saveCurriculumTimeAllocations);
  const savePromesFn = useServerFn(saveCurriculumPromesGrid);

  // 1. Ambil daftar mata pelajaran
  const { data: subjects = [] } = useQuery({
    queryKey: ["academic-subjects"],
    queryFn: () => fetchSubjectsFn(),
  });

  // Daftar kelas resmi (master Manajemen Kelas)
  const fetchClassesFn = useServerFn(listClassOptions);
  const { data: classOptions = [] } = useQuery({
    queryKey: ["class-options"],
    queryFn: () => fetchClassesFn(),
  });

  useEffect(() => {
    if (!selectedClass && classOptions.length > 0) {
      setSelectedClass(classOptions[0]!);
    }
  }, [classOptions, selectedClass]);

  // Set default subject when loaded
  const currentSubjectId = selectedSubjectId || (subjects.length > 0 ? (subjects[0]?.id ?? "") : "");

  // 2. Ambil data perangkat ajar lengkap
  const { data: planData, isLoading, isFetching } = useQuery({
    queryKey: ["curriculum-plan", currentSubjectId, selectedClass, selectedYear],
    queryFn: () => {
      if (!currentSubjectId) return null;
      return fetchPlanFn({
        data: {
          subject_id: currentSubjectId,
          class_name: selectedClass,
          academic_year: selectedYear,
        },
      });
    },
    enabled: Boolean(currentSubjectId),
  });

  const plan = planData?.plan;
  const elements = useMemo(() => planData?.elements ?? [], [planData?.elements]);
  const serverTps = useMemo(() => planData?.tps ?? [], [planData?.tps]);
  const timeAllocations = useMemo(() => planData?.timeAllocations ?? [], [planData?.timeAllocations]);
  const promesEntries = useMemo(() => planData?.promesEntries ?? [], [planData?.promesEntries]);

  // ID Plan persisten dan aman
  const activePlanId = useMemo(() => {
    if (plan?.id) return plan.id;
    const cleanYear = selectedYear.replace(/[^a-zA-Z0-9]/g, "_");
    return `plan_${currentSubjectId || "sbj"}_${selectedClass}_${cleanYear}`;
  }, [plan?.id, currentSubjectId, selectedClass, selectedYear]);

  // Local state for editable TP list
  const [localTps, setLocalTps] = useState<CurriculumTp[]>([]);
  const [hasUnsavedTp, setHasUnsavedTp] = useState(false);

  // Sync serverTps to localTps when loaded
  useMemo(() => {
    if (serverTps) {
      setLocalTps(serverTps);
      setHasUnsavedTp(false);
    }
  }, [serverTps]);

  const activePlan: CurriculumPlan = useMemo(() => {
    if (plan) return plan;
    const now = new Date().toISOString();
    return {
      id: activePlanId,
      subject_id: currentSubjectId,
      class_name: selectedClass,
      academic_year: selectedYear,
      teacher_id: profile?.id ?? null,
      phase: "D",
      jp_per_week: 2,
      total_tp_count: localTps.length,
      completion_percentage: 0,
      realization_ganjil_percentage: 0,
      realization_genap_percentage: 0,
      created_at: now,
      updated_at: now,
    };
  }, [plan, activePlanId, currentSubjectId, selectedClass, selectedYear, profile?.id, localTps.length]);

  // 12 Bulan Alokasi Waktu Default
  const defaultAllocations = useMemo(() => {
    const list: CurriculumTimeAllocation[] = [];
    DEFAULT_MONTHS_GANJIL.forEach((m) => {
      list.push({
        id: `alloc_${activePlanId}_1_${m.order}`,
        plan_id: activePlanId,
        semester: "1",
        month_name: m.name,
        month_order: m.order,
        calendar_weeks: m.calendar,
        non_effective_weeks: m.nonEffective,
        effective_weeks: m.effective,
        effective_jp: Math.round((m.effective ?? 0) * (activePlan.jp_per_week || 2) * 10) / 10,
        notes: null,
      });
    });
    DEFAULT_MONTHS_GENAP.forEach((m) => {
      list.push({
        id: `alloc_${activePlanId}_2_${m.order}`,
        plan_id: activePlanId,
        semester: "2",
        month_name: m.name,
        month_order: m.order,
        calendar_weeks: m.calendar,
        non_effective_weeks: m.nonEffective,
        effective_weeks: m.effective,
        effective_jp: Math.round((m.effective ?? 0) * (activePlan.jp_per_week || 2) * 10) / 10,
        notes: null,
      });
    });
    return list;
  }, [activePlanId, activePlan.jp_per_week]);

  // Local state for time allocations
  const [localTimeAlloc, setLocalTimeAlloc] = useState<CurriculumTimeAllocation[]>([]);
  useMemo(() => {
    if (timeAllocations && timeAllocations.length > 0) {
      setLocalTimeAlloc(timeAllocations);
    } else {
      setLocalTimeAlloc(defaultAllocations);
    }
  }, [timeAllocations, defaultAllocations]);

  // Local state for promes cell entries: key = `${tp_id}_${month_name}_${week_number}` -> value: number
  const [localPromesGrid, setLocalPromesGrid] = useState<Record<string, number>>({});
  const [localTpStatuses, setLocalTpStatuses] = useState<Record<string, string>>({});
  useMemo(() => {
    if (promesEntries) {
      const map: Record<string, number> = {};
      for (const e of promesEntries) {
        map[`${e.tp_id}_${e.month_name}_${e.week_number}`] = e.allocated_jp;
      }
      setLocalPromesGrid(map);

      const statusMap: Record<string, string> = {};
      for (const t of serverTps) {
        statusMap[t.id] = t.status_realisasi || "Belum Terlaksana";
      }
      setLocalTpStatuses(statusMap);
    }
  }, [promesEntries, serverTps]);

  // Handle Meta Change (JP per minggu)
  const handleJpPerWeekChange = async (valStr: string) => {
    const num = Number(valStr) || 2;
    try {
      await savePlanMetaFn({
        data: {
          plan_id: activePlanId,
          jp_per_week: num,
          phase: activePlan.phase || "D",
        },
      });
      toast.success("Beban JP per pekan diperbarui");
      queryClient.invalidateQueries({ queryKey: ["curriculum-plan"] });
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui JP");
    }
  };

  // Element Save Mutation
  const elementMutation = useMutation({
    mutationFn: async (action: "create" | "update" | "delete") => {
      if (action !== "delete" && !elementNameInput.trim()) {
        throw new Error("Nama elemen materi wajib diisi");
      }
      return saveElementFn({
        data: {
          action,
          id: editingElement?.id,
          plan_id: activePlanId,
          name: elementNameInput.trim(),
          cp_description: elementCpInput.trim(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Elemen & Capaian Pembelajaran (CP) berhasil disimpan");
      setElementDialogOpen(false);
      setEditingElement(null);
      setElementNameInput("");
      setElementCpInput("");
      queryClient.invalidateQueries({ queryKey: ["curriculum-plan"] });
    },
    onError: (err: any) => toast.error(err.message || "Gagal menyimpan elemen"),
  });

  const openAddElement = () => {
    setEditingElement(null);
    setElementNameInput("");
    setElementCpInput("");
    setElementDialogOpen(true);
  };

  const openEditElement = (el: CurriculumElement) => {
    setEditingElement(el);
    setElementNameInput(el.name);
    setElementCpInput(el.cp_description);
    setElementDialogOpen(true);
  };

  const handleDeleteElement = async (id: string) => {
    if (!confirm("Hapus elemen ini?")) return;
    try {
      await saveElementFn({
        data: { action: "delete", id, plan_id: activePlanId },
      });
      toast.success("Elemen dihapus");
      queryClient.invalidateQueries({ queryKey: ["curriculum-plan"] });
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus elemen");
    }
  };

  // TP Management
  const handleAddTpRow = (semester: "1" | "2" = "1") => {
    const nextOrder = localTps.length + 1;
    const defaultElem = elements.length > 0 && elements[0] ? elements[0].name : "Materi Pokok";
    const classPrefix = (selectedClass.match(/\d+/)?.[0] ?? "7").charAt(0);
    const newTp: CurriculumTp = {
      id: `temp_${Date.now()}_${Math.random()}`,
      plan_id: plan?.id || null,
      subject_id: currentSubjectId,
      class_name: selectedClass,
      semester,
      academic_year: selectedYear,
      code: `TP-${classPrefix}.${nextOrder}`,
      description: "",
      cp_code: null,
      element_name: defaultElem,
      cognitive_level: "C2 - Memahami",
      dimension: "Pengetahuan",
      atp_order: nextOrder,
      atp_flow: "Materi dasar pembelajaran",
      alokasi_jp: 2,
      assessment_method: "Tes Tertulis",
      status_tp: true,
      status_atp: true,
      status_asesmen: true,
      status_realisasi: "Belum Terlaksana",
      order_index: nextOrder,
    };
    setLocalTps((prev) => [...prev, newTp]);
    setHasUnsavedTp(true);
  };

  const handleUpdateTpField = (index: number, field: keyof CurriculumTp, value: any) => {
    setLocalTps((prev) => {
      const copy = [...prev];
      const item = copy[index];
      if (item) {
        copy[index] = { ...item, [field]: value };
      }
      return copy;
    });
    setHasUnsavedTp(true);
  };

  const handleDeleteTpRow = (index: number) => {
    setLocalTps((prev) => prev.filter((_, i) => i !== index));
    setHasUnsavedTp(true);
  };

  // Save TP Batch Mutation
  const saveTpMutation = useMutation({
    mutationFn: async () => {
      const payload = localTps.map((tp, idx) => ({
        id: tp.id && !tp.id.startsWith("temp_") ? tp.id : undefined,
        code: tp.code.trim() || `TP-${idx + 1}`,
        description: tp.description.trim() || "Tujuan pembelajaran",
        semester: tp.semester || "1",
        element_name: tp.element_name,
        cognitive_level: tp.cognitive_level,
        dimension: tp.dimension,
        atp_order: idx + 1,
        atp_flow: tp.atp_flow,
        alokasi_jp: Number(tp.alokasi_jp) || 2,
        assessment_method: tp.assessment_method,
        status_tp: tp.status_tp,
        status_atp: tp.status_atp,
        status_asesmen: tp.status_asesmen,
        status_realisasi: tp.status_realisasi,
        order_index: idx + 1,
      }));

      return saveTpBatchFn({
        data: {
          plan_id: activePlanId,
          subject_id: currentSubjectId,
          class_name: selectedClass,
          academic_year: selectedYear,
          tps: payload,
        },
      });
    },
    onSuccess: () => {
      toast.success("Tujuan Pembelajaran (TP & ATP) berhasil disimpan dan disinkronkan!");
      setHasUnsavedTp(false);
      queryClient.invalidateQueries({ queryKey: ["curriculum-plan"] });
      queryClient.invalidateQueries({ queryKey: ["input-grades-sheet"] });
    },
    onError: (err: any) => toast.error(err.message || "Gagal menyimpan TP"),
  });

  // Time Allocations Change Handler
  const handleTimeAllocChange = (
    semester: "1" | "2",
    monthName: string,
    field: "calendar_weeks" | "non_effective_weeks",
    valStr: string
  ) => {
    const val = Math.max(0, Number(valStr) || 0);
    setLocalTimeAlloc((prev) =>
      prev.map((item) => {
        if (item.semester === semester && item.month_name === monthName) {
          const cal = field === "calendar_weeks" ? val : Number(item.calendar_weeks) || 0;
          const nonEff = field === "non_effective_weeks" ? val : Number(item.non_effective_weeks) || 0;
          const effWeeks = Math.max(0, cal - nonEff);
          const jpRate = activePlan.jp_per_week || 2;
          const effJp = Math.round(effWeeks * jpRate * 10) / 10;
          return {
            ...item,
            [field]: val,
            effective_weeks: effWeeks,
            effective_jp: effJp,
          };
        }
        return item;
      })
    );
  };

  const saveTimeAllocMutation = useMutation({
    mutationFn: async () => {
      const payload = (localTimeAlloc.length > 0 ? localTimeAlloc : defaultAllocations).map((a) => ({
        id: a.id,
        semester: a.semester,
        month_name: a.month_name,
        month_order: a.month_order,
        calendar_weeks: Number(a.calendar_weeks) || 0,
        non_effective_weeks: Number(a.non_effective_weeks) || 0,
        effective_weeks: Number(a.effective_weeks) || 0,
        effective_jp: Number(a.effective_jp) || 0,
        notes: a.notes || null,
      }));

      return saveTimeAllocFn({
        data: {
          plan_id: activePlanId,
          allocations: payload,
        },
      });
    },
    onSuccess: () => {
      toast.success("Analisis alokasi waktu efektif berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["curriculum-plan"] });
    },
    onError: (err: any) => toast.error(err.message || "Gagal menyimpan alokasi waktu"),
  });

  // Promes Grid Save
  const handlePromesCellChange = (tpId: string, month: string, week: number, valStr: string) => {
    const val = Math.min(20, Math.max(0, Number(valStr) || 0));
    setLocalPromesGrid((prev) => ({
      ...prev,
      [`${tpId}_${month}_${week}`]: val,
    }));
  };

  const handleTpStatusChange = (tpId: string, status: string) => {
    setLocalTpStatuses((prev) => ({ ...prev, [tpId]: status }));
  };

  const savePromesMutation = useMutation({
    mutationFn: async () => {
      const entriesPayload: any[] = [];
      const activeMonths =
        promesSemester === "1"
          ? ["Juli", "Agustus", "September", "Oktober", "November", "Desember"]
          : ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];

      const targetTps = localTps.filter((t) => t.semester === promesSemester);

      for (const t of targetTps) {
        for (const m of activeMonths) {
          for (const w of [1, 2, 3, 4, 5]) {
            const val = localPromesGrid[`${t.id}_${m}_${w}`] || 0;
            if (val > 0) {
              entriesPayload.push({
                tp_id: t.id,
                month_name: m,
                week_number: w,
                allocated_jp: val,
                activity_type: "kbm" as const,
              });
            }
          }
        }
      }

      return savePromesFn({
        data: {
          plan_id: activePlanId,
          semester: promesSemester,
          entries: entriesPayload,
          tpStatuses: localTpStatuses,
        },
      });
    },
    onSuccess: () => {
      toast.success("Matriks Program Semester (PROMES) berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["curriculum-plan"] });
    },
    onError: (err: any) => toast.error(err.message || "Gagal menyimpan PROMES"),
  });

  const activeSubject = subjects.find((s) => s.id === currentSubjectId);

  // Active Print Data (Pastikan selalu memiliki fallback lengkap jika data baru / lokal)
  const activePrintData = useMemo(() => {
    if (!activeSubject) return null;
    return {
      plan: activePlan,
      subject: activeSubject,
      teacher: planData?.teacher || (profile ? {
        id: profile.id,
        name: profile.name,
        display_name: (profile as any).display_name || profile.name || "Ustadz Pengampu",
        nis_nip: (profile as any).nis_nip || null,
      } : null),
      headmasterName: planData?.headmasterName || "Mudir / Kepala Sekolah SMPIT Putra Al-Hanif",
      elements: elements.length > 0 ? elements : (planData?.elements ?? []),
      tps: localTps.length > 0 ? localTps : (planData?.tps ?? []),
      timeAllocations: localTimeAlloc.length > 0 ? localTimeAlloc : (planData?.timeAllocations ?? defaultAllocations),
      promesEntries: promesEntries.length > 0 ? promesEntries : (planData?.promesEntries ?? []),
    };
  }, [
    activeSubject,
    activePlan,
    planData,
    profile,
    elements,
    localTps,
    localTimeAlloc,
    defaultAllocations,
    promesEntries,
  ]);

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6 pb-16">
        {/* Header & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 bg-primary/5 text-primary border-primary/20">
                Perangkat Ajar Terpadu
              </Badge>
              <span className="text-xs text-muted-foreground">• Kurikulum Merdeka & AHIBS</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Perangkat Ajar: CP, TP, ATP, Prota & Promes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Penyusunan administrasi pembelajaran terpadu yang tersinkronisasi otomatis dengan Input Nilai dan Rapor Siswa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrintDialogCpOpen(true)}
              disabled={!activeSubject}
              className="gap-1.5 font-medium shadow-xs"
            >
              <Printer className="w-4 h-4 text-primary" />
              Cetak CP, TP & ATP
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrintDialogProtaOpen(true)}
              disabled={!activeSubject}
              className="gap-1.5 font-medium shadow-xs"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              Cetak Prota & Promes
            </Button>
          </div>
        </div>

        {/* Global Filter & Selector Bar */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                  Mata Pelajaran
                </label>
                <Select
                  value={currentSubjectId}
                  onValueChange={(val) => setSelectedSubjectId(val)}
                >
                  <SelectTrigger className="w-full font-semibold">
                    <SelectValue placeholder="Pilih Mata Pelajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((sbj) => (
                      <SelectItem key={sbj.id} value={sbj.id}>
                        {sbj.name} ({sbj.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                  Kelas / Rombel
                </label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full font-medium">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((cls) => (
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
                  Beban JP / Minggu
                </label>
                <Select
                  value={String(plan?.jp_per_week || 2)}
                  onValueChange={handleJpPerWeekChange}
                >
                  <SelectTrigger className="w-full font-mono font-semibold">
                    <SelectValue placeholder="Pilih Jam" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((jp) => (
                      <SelectItem key={jp} value={String(jp)}>
                        {jp} Jam Pelajaran (JP) / Pekan
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress & KPI Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total TP Dirumuskan</p>
                <p className="text-xl font-bold tracking-tight">
                  {localTps.length} Tujuan Pembelajaran
                </p>
                <p className="text-[11px] text-muted-foreground">Fase {plan?.phase || "D"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-medium text-muted-foreground">% Lengkap Dokumen</p>
                  <span className="text-xs font-bold text-emerald-600 font-mono">
                    {plan?.completion_percentage || 0}%
                  </span>
                </div>
                <Progress value={plan?.completion_percentage || 0} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">CP, TP, ATP & Alokasi</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-medium text-muted-foreground">Realisasi Ganjil</p>
                  <span className="text-xs font-bold text-blue-600 font-mono">
                    {plan?.realization_ganjil_percentage || 0}%
                  </span>
                </div>
                <Progress value={plan?.realization_ganjil_percentage || 0} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">Promes Semester 1</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-medium text-muted-foreground">Realisasi Genap</p>
                  <span className="text-xs font-bold text-purple-600 font-mono">
                    {plan?.realization_genap_percentage || 0}%
                  </span>
                </div>
                <Progress value={plan?.realization_genap_percentage || 0} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">Promes Semester 2</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="tp" className="space-y-4">
          <TabsList className="bg-muted/60 p-1 flex-wrap h-auto">
            <TabsTrigger value="element" className="gap-2 text-xs md:text-sm font-medium">
              <BookOpen className="w-4 h-4" />
              1. Elemen & CP ({elements.length})
            </TabsTrigger>
            <TabsTrigger value="tp" className="gap-2 text-xs md:text-sm font-medium relative">
              <Sparkles className="w-4 h-4 text-amber-500" />
              2. TP & ATP ({localTps.length})
              {hasUnsavedTp && (
                <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5" />
              )}
            </TabsTrigger>
            <TabsTrigger value="alokasi" className="gap-2 text-xs md:text-sm font-medium">
              <Clock className="w-4 h-4" />
              3. Alokasi Waktu Efektif
            </TabsTrigger>
            <TabsTrigger value="prota" className="gap-2 text-xs md:text-sm font-medium">
              <Calendar className="w-4 h-4" />
              4. Program Tahunan (PROTA)
            </TabsTrigger>
            <TabsTrigger value="promes" className="gap-2 text-xs md:text-sm font-medium">
              <TableIcon className="w-4 h-4" />
              5. Program Semester (PROMES)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ELEMEN & CP */}
          <TabsContent value="element" className="space-y-4 mt-0">
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="py-4 px-5 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Elemen & Capaian Pembelajaran (CP)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tentukan ruang lingkup materi/elemen dan teks Capaian Pembelajaran mata pelajaran {activeSubject?.name}.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={openAddElement} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Tambah Elemen
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {elements.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-foreground">Belum Ada Elemen CP</p>
                    <p className="text-xs mt-1 max-w-sm mx-auto">
                      Silakan tambahkan elemen materi dan salin deskripsi Capaian Pembelajaran (CP) resmi.
                    </p>
                    <Button size="sm" variant="outline" onClick={openAddElement} className="mt-4 gap-1.5">
                      <Plus className="w-4 h-4" />
                      Tambah Elemen Pertama
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {elements.map((el, idx) => (
                      <div key={el.id} className="p-4 sm:px-6 hover:bg-muted/20 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="space-y-1">
                            <h3 className="font-bold text-base text-foreground">{el.name}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                              {el.cp_description || <span className="italic text-muted-foreground/60">Belum ada narasi CP</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => openEditElement(el)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteElement(el.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: TP & ATP (SINKRON DENGAN INPUT NILAI) */}
          <TabsContent value="tp" className="space-y-4 mt-0">
            {/* Notice Callout */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Tersinkronisasi Otomatis:</strong> Setiap Tujuan Pembelajaran (TP) yang Anda simpan di sini akan langsung muncul pada kolom penilaian di menu <strong>Input Nilai Siswa</strong> dan menjadi kalimat deskripsi Rapor resmi.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddTpRow("1")}
                  className="gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + TP Ganjil
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddTpRow("2")}
                  className="gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + TP Genap
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveTpMutation.mutate()}
                  disabled={saveTpMutation.isPending}
                  className="gap-1.5 text-xs shadow-xs"
                >
                  {saveTpMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Simpan Perubahan TP
                </Button>
              </div>
            </div>

            {/* Editable Spreadsheet Table */}
            <Card className="border-border/60 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/60 border-b text-muted-foreground font-semibold">
                      <th className="px-2 py-3 w-8 text-center">No</th>
                      <th className="px-2 py-3 w-20 text-center">Sem.</th>
                      <th className="px-2 py-3 w-32">Elemen Materi</th>
                      <th className="px-2 py-3 w-20 text-center">Kode TP</th>
                      <th className="px-3 py-3 min-w-[280px]">Rumusan Tujuan Pembelajaran (TP)</th>
                      <th className="px-2 py-3 w-32 text-center">Taksonomi Bloom</th>
                      <th className="px-2 py-3 w-24 text-center">Dimensi</th>
                      <th className="px-2 py-3 min-w-[180px]">Keterkaitan Alur (ATP)</th>
                      <th className="px-2 py-3 w-16 text-center">JP</th>
                      <th className="px-2 py-3 w-28">Asesmen</th>
                      <th className="px-2 py-3 w-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {localTps.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-muted-foreground">
                          Belum ada Tujuan Pembelajaran. Klik tombol "+ TP Ganjil" atau "+ TP Genap" di atas untuk mulai merumuskan materi.
                        </td>
                      </tr>
                    ) : (
                      localTps.map((tp, idx) => (
                        <tr key={tp.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-2 py-2 text-center font-semibold text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="px-1.5 py-2">
                            <Select
                              value={tp.semester}
                              onValueChange={(val) => handleUpdateTpField(idx, "semester", val)}
                            >
                              <SelectTrigger className="h-8 text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Ganjil</SelectItem>
                                <SelectItem value="2">Genap</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-1.5 py-2">
                            <Select
                              value={tp.element_name || (elements[0]?.name ?? "")}
                              onValueChange={(val) => handleUpdateTpField(idx, "element_name", val)}
                            >
                              <SelectTrigger className="h-8 text-[11px] truncate">
                                <SelectValue placeholder="Pilih Elemen" />
                              </SelectTrigger>
                              <SelectContent>
                                {elements.map((el) => (
                                  <SelectItem key={el.id} value={el.name}>
                                    {el.name}
                                  </SelectItem>
                                ))}
                                {elements.length === 0 && (
                                  <SelectItem value="Materi Inti">Materi Inti</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-1.5 py-2">
                            <Input
                              value={tp.code}
                              onChange={(e) => handleUpdateTpField(idx, "code", e.target.value)}
                              className="h-8 text-center font-bold font-mono text-xs"
                              placeholder="TP-7.1"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Textarea
                              value={tp.description}
                              onChange={(e) => handleUpdateTpField(idx, "description", e.target.value)}
                              className="min-h-[44px] text-xs resize-none py-1.5"
                              placeholder="Peserta didik mampu..."
                            />
                          </td>
                          <td className="px-1.5 py-2">
                            <Select
                              value={tp.cognitive_level}
                              onValueChange={(val) => handleUpdateTpField(idx, "cognitive_level", val)}
                            >
                              <SelectTrigger className="h-8 text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COGNITIVE_LEVELS.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-1.5 py-2">
                            <Select
                              value={tp.dimension}
                              onValueChange={(val) => handleUpdateTpField(idx, "dimension", val)}
                            >
                              <SelectTrigger className="h-8 text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DIMENSIONS.map((d) => (
                                  <SelectItem key={d} value={d}>
                                    {d}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-1.5 py-2">
                            <Input
                              value={tp.atp_flow || ""}
                              onChange={(e) => handleUpdateTpField(idx, "atp_flow", e.target.value)}
                              className="h-8 text-xs"
                              placeholder="Prasyarat materi..."
                            />
                          </td>
                          <td className="px-1.5 py-2 text-center">
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={tp.alokasi_jp}
                              onChange={(e) => handleUpdateTpField(idx, "alokasi_jp", Number(e.target.value) || 2)}
                              className="h-8 w-16 text-center font-bold font-mono text-xs mx-auto"
                            />
                          </td>
                          <td className="px-1.5 py-2">
                            <Select
                              value={tp.assessment_method}
                              onValueChange={(val) => handleUpdateTpField(idx, "assessment_method", val)}
                            >
                              <SelectTrigger className="h-8 text-[11px] truncate">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ASSESSMENT_METHODS.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-1.5 py-2 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTpRow(idx)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {localTps.length > 0 && (
                <div className="p-3 border-t bg-muted/30 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    Total {localTps.length} TP ({localTps.filter((t) => t.semester === "1").length} Ganjil, {localTps.filter((t) => t.semester === "2").length} Genap) • Total Alokasi:{" "}
                    <strong className="text-foreground">
                      {localTps.reduce((acc, curr) => acc + Number(curr.alokasi_jp), 0)} JP
                    </strong>
                  </span>
                  <Button
                    size="sm"
                    onClick={() => saveTpMutation.mutate()}
                    disabled={saveTpMutation.isPending}
                    className="gap-1.5 text-xs shadow-xs"
                  >
                    {saveTpMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Simpan Perubahan TP
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 3: ALOKASI WAKTU EFEKTIF */}
          <TabsContent value="alokasi" className="space-y-4 mt-0">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Sesuaikan jumlah pekan kalender dan pekan tidak efektif (libur, MOS, ujian) untuk menghitung otomatis total jam pelajaran efektif.
              </p>
              <Button
                size="sm"
                onClick={() => saveTimeAllocMutation.mutate()}
                disabled={saveTimeAllocMutation.isPending}
                className="gap-1.5 shadow-xs"
              >
                {saveTimeAllocMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Simpan Alokasi Waktu
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Semester Ganjil */}
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="py-3.5 px-4 border-b bg-muted/40">
                  <CardTitle className="text-sm font-semibold">
                    Semester Ganjil (Juli - Desember)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-muted/20 border-b font-semibold text-muted-foreground">
                        <th className="px-3 py-2">Bulan</th>
                        <th className="px-2 py-2 text-center">Pekan Kalender</th>
                        <th className="px-2 py-2 text-center">Non-Efektif</th>
                        <th className="px-2 py-2 text-center">Pekan Efektif</th>
                        <th className="px-3 py-2 text-center">Jam Efektif (JP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {localTimeAlloc
                        .filter((a) => a.semester === "1")
                        .map((alloc, idx) => (
                          <tr key={alloc.id || `alloc_1_${idx}`}>
                            <td className="px-3 py-2 font-medium">{alloc.month_name}</td>
                            <td className="px-2 py-2 text-center">
                              <Input
                                type="number"
                                step="0.5"
                                min={0}
                                value={alloc.calendar_weeks}
                                onChange={(e) =>
                                  handleTimeAllocChange("1", alloc.month_name, "calendar_weeks", e.target.value)
                                }
                                className="h-7 w-16 text-center text-xs mx-auto"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Input
                                type="number"
                                step="0.5"
                                min={0}
                                value={alloc.non_effective_weeks}
                                onChange={(e) =>
                                  handleTimeAllocChange("1", alloc.month_name, "non_effective_weeks", e.target.value)
                                }
                                className="h-7 w-16 text-center text-xs mx-auto text-amber-600 font-semibold"
                              />
                            </td>
                            <td className="px-2 py-2 text-center font-bold">
                              {alloc.effective_weeks}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-primary">
                              {alloc.effective_jp} JP
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t-2 border-border/80 font-semibold text-xs">
                      <tr>
                        <td className="px-3 py-2 font-bold">Total Ganjil</td>
                        <td className="px-2 py-2 text-center">
                          {localTimeAlloc
                            .filter((a) => a.semester === "1")
                            .reduce((acc, c) => acc + Number(c.calendar_weeks || 0), 0)}
                        </td>
                        <td className="px-2 py-2 text-center text-amber-600">
                          {localTimeAlloc
                            .filter((a) => a.semester === "1")
                            .reduce((acc, c) => acc + Number(c.non_effective_weeks || 0), 0)}
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-foreground">
                          {localTimeAlloc
                            .filter((a) => a.semester === "1")
                            .reduce((acc, c) => acc + Number(c.effective_weeks || 0), 0)}
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-primary">
                          {Math.round(
                            localTimeAlloc
                              .filter((a) => a.semester === "1")
                              .reduce((acc, c) => acc + Number(c.effective_jp || 0), 0) * 10
                          ) / 10}{" "}
                          JP
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>

              {/* Semester Genap */}
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="py-3.5 px-4 border-b bg-muted/40">
                  <CardTitle className="text-sm font-semibold">
                    Semester Genap (Januari - Juni)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-muted/20 border-b font-semibold text-muted-foreground">
                        <th className="px-3 py-2">Bulan</th>
                        <th className="px-2 py-2 text-center">Pekan Kalender</th>
                        <th className="px-2 py-2 text-center">Non-Efektif</th>
                        <th className="px-2 py-2 text-center">Pekan Efektif</th>
                        <th className="px-3 py-2 text-center">Jam Efektif (JP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {localTimeAlloc
                        .filter((a) => a.semester === "2")
                        .map((alloc, idx) => (
                          <tr key={alloc.id || `alloc_2_${idx}`}>
                            <td className="px-3 py-2 font-medium">{alloc.month_name}</td>
                            <td className="px-2 py-2 text-center">
                              <Input
                                type="number"
                                step="0.5"
                                min={0}
                                value={alloc.calendar_weeks}
                                onChange={(e) =>
                                  handleTimeAllocChange("2", alloc.month_name, "calendar_weeks", e.target.value)
                                }
                                className="h-7 w-16 text-center text-xs mx-auto"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Input
                                type="number"
                                step="0.5"
                                min={0}
                                value={alloc.non_effective_weeks}
                                onChange={(e) =>
                                  handleTimeAllocChange("2", alloc.month_name, "non_effective_weeks", e.target.value)
                                }
                                className="h-7 w-16 text-center text-xs mx-auto text-amber-600 font-semibold"
                              />
                            </td>
                            <td className="px-2 py-2 text-center font-bold">
                              {alloc.effective_weeks}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-primary">
                              {alloc.effective_jp} JP
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t-2 border-border/80 font-semibold text-xs">
                      <tr>
                        <td className="px-3 py-2 font-bold">Total Genap</td>
                        <td className="px-2 py-2 text-center">
                          {localTimeAlloc
                            .filter((a) => a.semester === "2")
                            .reduce((acc, c) => acc + Number(c.calendar_weeks || 0), 0)}
                        </td>
                        <td className="px-2 py-2 text-center text-amber-600">
                          {localTimeAlloc
                            .filter((a) => a.semester === "2")
                            .reduce((acc, c) => acc + Number(c.non_effective_weeks || 0), 0)}
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-foreground">
                          {localTimeAlloc
                            .filter((a) => a.semester === "2")
                            .reduce((acc, c) => acc + Number(c.effective_weeks || 0), 0)}
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-primary">
                          {Math.round(
                            localTimeAlloc
                              .filter((a) => a.semester === "2")
                              .reduce((acc, c) => acc + Number(c.effective_jp || 0), 0) * 10
                          ) / 10}{" "}
                          JP
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: PROGRAM TAHUNAN (PROTA) */}
          <TabsContent value="prota" className="space-y-4 mt-0">
            <Card className="border-border/60 shadow-xs overflow-hidden">
              <CardHeader className="py-3.5 px-5 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Program Tahunan (PROTA)</CardTitle>
                  <CardDescription className="text-xs">
                    Rangkuman alokasi waktu tahunan seluruh materi pokok semester ganjil dan genap
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPrintDialogProtaOpen(true)}
                  className="gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  Cetak Dokumen PROTA
                </Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-muted/60 border-b font-semibold text-muted-foreground text-center">
                      <th className="px-3 py-2.5 w-10">No</th>
                      <th className="px-3 py-2.5 w-20">Semester</th>
                      <th className="px-3 py-2.5 w-20">Kode TP</th>
                      <th className="px-4 py-2.5 text-left">Tujuan Pembelajaran Pokok</th>
                      <th className="px-3 py-2.5 w-24">Alokasi JP</th>
                      <th className="px-4 py-2.5 text-left w-40">Elemen Materi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {localTps.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Belum ada Tujuan Pembelajaran yang dirumuskan pada Tab 2.
                        </td>
                      </tr>
                    ) : (
                      localTps.map((tp, idx) => (
                        <tr key={tp.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2.5 text-center font-medium">{idx + 1}</td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge variant="outline" className="text-[10px]">
                              {tp.semester === "1" ? "Ganjil" : "Genap"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold font-mono text-primary">
                            {tp.code}
                          </td>
                          <td className="px-4 py-2.5 leading-relaxed">{tp.description}</td>
                          <td className="px-3 py-2.5 text-center font-bold font-mono">
                            {tp.alokasi_jp} JP
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {tp.element_name || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/70 font-bold border-t text-center">
                      <td colSpan={4} className="p-3 text-right pr-6">
                        Total Alokasi Waktu PROTA:
                      </td>
                      <td className="p-3 font-mono text-primary font-black text-sm">
                        {localTps.reduce((acc, curr) => acc + Number(curr.alokasi_jp), 0)} JP
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 5: PROGRAM SEMESTER (PROMES) MATRIX */}
          <TabsContent value="promes" className="space-y-4 mt-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Pilih Semester:</span>
                <div className="flex rounded-md border p-1 bg-muted/40">
                  <Button
                    size="sm"
                    variant={promesSemester === "1" ? "default" : "ghost"}
                    className="h-7 text-xs px-3"
                    onClick={() => setPromesSemester("1")}
                  >
                    Semester Ganjil (Juli - Des)
                  </Button>
                  <Button
                    size="sm"
                    variant={promesSemester === "2" ? "default" : "ghost"}
                    className="h-7 text-xs px-3"
                    onClick={() => setPromesSemester("2")}
                  >
                    Semester Genap (Jan - Jun)
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPrintDialogProtaOpen(true)}
                  className="gap-1.5 text-xs shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  Cetak PROMES
                </Button>
                <Button
                  size="sm"
                  onClick={() => savePromesMutation.mutate()}
                  disabled={savePromesMutation.isPending}
                  className="gap-1.5 text-xs shadow-xs"
                >
                  {savePromesMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Simpan Matriks PROMES
                </Button>
              </div>
            </div>

            {/* Matriks Promes */}
            <Card className="border-border/60 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/70 border-b text-muted-foreground font-bold text-center">
                      <th rowSpan={2} className="px-2 py-2 border-r w-8">
                        No
                      </th>
                      <th rowSpan={2} className="px-2 py-2 border-r w-16">
                        Kode
                      </th>
                      <th rowSpan={2} className="px-3 py-2 border-r text-left min-w-[200px]">
                        Tujuan Pembelajaran
                      </th>
                      <th rowSpan={2} className="px-2 py-2 border-r w-12">
                        JP
                      </th>

                      {/* Bulan-bulan */}
                      {(promesSemester === "1"
                        ? ["Juli", "Agustus", "September", "Oktober", "November", "Desember"]
                        : ["Januari", "Februari", "Maret", "April", "Mei", "Juni"]
                      ).map((m) => (
                        <th key={m} colSpan={5} className="px-1 py-1 border-r text-foreground">
                          {m}
                        </th>
                      ))}

                      <th rowSpan={2} className="px-3 py-2 w-32">
                        Status Keterlaksanaan
                      </th>
                    </tr>
                    <tr className="bg-muted/40 border-b text-[10px] text-center font-semibold text-muted-foreground">
                      {(promesSemester === "1"
                        ? ["Juli", "Agustus", "September", "Oktober", "November", "Desember"]
                        : ["Januari", "Februari", "Maret", "April", "Mei", "Juni"]
                      ).map((m) =>
                        [1, 2, 3, 4, 5].map((w) => (
                          <th key={`${m}_${w}`} className="px-1 py-1 border-r w-7">
                            P{w}
                          </th>
                        )),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {localTps.filter((t) => t.semester === promesSemester).length === 0 ? (
                      <tr>
                        <td colSpan={35} className="p-8 text-center text-muted-foreground">
                          Belum ada TP pada Semester {promesSemester === "1" ? "Ganjil" : "Genap"}.
                        </td>
                      </tr>
                    ) : (
                      localTps
                        .filter((t) => t.semester === promesSemester)
                        .map((tp, idx) => {
                          const months =
                            promesSemester === "1"
                              ? ["Juli", "Agustus", "September", "Oktober", "November", "Desember"]
                              : ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];

                          return (
                            <tr key={tp.id} className="hover:bg-muted/20">
                              <td className="px-2 py-2 text-center font-medium border-r">{idx + 1}</td>
                              <td className="px-2 py-2 text-center font-bold font-mono border-r text-primary">
                                {tp.code}
                              </td>
                              <td className="px-3 py-2 border-r line-clamp-2">{tp.description}</td>
                              <td className="px-2 py-2 text-center font-bold border-r font-mono">
                                {tp.alokasi_jp}
                              </td>

                              {/* 5 Pekan per Bulan Input */}
                              {months.map((m) =>
                                [1, 2, 3, 4, 5].map((w) => {
                                  const cellVal = localPromesGrid[`${tp.id}_${m}_${w}`] || "";
                                  return (
                                    <td key={`${m}_${w}`} className="p-0.5 border-r text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={10}
                                        value={cellVal}
                                        onChange={(e) =>
                                          handlePromesCellChange(tp.id, m, w, e.target.value)
                                        }
                                        className={`w-6 h-7 text-center rounded text-[11px] font-bold font-mono outline-none transition-colors ${
                                          Number(cellVal) > 0
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-transparent hover:bg-muted/40"
                                        }`}
                                      />
                                    </td>
                                  );
                                }),
                              )}

                              {/* Status Keterlaksanaan */}
                              <td className="px-2 py-2">
                                <Select
                                  value={localTpStatuses[tp.id] || "Belum Terlaksana"}
                                  onValueChange={(val) => handleTpStatusChange(tp.id, val)}
                                >
                                  <SelectTrigger className="h-7 text-[10px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Belum Terlaksana">Belum Terlaksana</SelectItem>
                                    <SelectItem value="Sedang Berjalan">Sedang Berjalan</SelectItem>
                                    <SelectItem value="Terlaksana">✅ Terlaksana</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Tambah/Edit Elemen */}
      <Dialog open={elementDialogOpen} onOpenChange={setElementDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingElement ? "Edit Elemen & CP" : "Tambah Elemen & CP Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan nama elemen materi dan teks Capaian Pembelajaran (CP) resmi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Nama Elemen Materi</Label>
              <Input
                placeholder="Contoh: Hukum Bacaan, Bilangan, Aljabar, dll."
                value={elementNameInput}
                onChange={(e) => setElementNameInput(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Deskripsi Capaian Pembelajaran (CP)</Label>
              <Textarea
                placeholder="Salin teks narasi Capaian Pembelajaran (CP)..."
                rows={5}
                value={elementCpInput}
                onChange={(e) => setElementCpInput(e.target.value)}
                className="mt-1 text-xs resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setElementDialogOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => elementMutation.mutate(editingElement ? "update" : "create")}
              disabled={elementMutation.isPending || !elementNameInput.trim()}
            >
              {elementMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Simpan Elemen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Official Print Dialog 1: CP, TP, ATP */}
      <CurriculumCpTpAtpPrintDialog
        open={printDialogCpOpen}
        onOpenChange={setPrintDialogCpOpen}
        data={activePrintData}
      />

      {/* Official Print Dialog 2: Alokasi Waktu, Prota, Promes */}
      <CurriculumProtaPromesPrintDialog
        open={printDialogProtaOpen}
        onOpenChange={setPrintDialogProtaOpen}
        data={activePrintData}
      />
    </AppShell>
  );
}
