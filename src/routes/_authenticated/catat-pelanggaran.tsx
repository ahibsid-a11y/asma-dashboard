import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Filter,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  Trash2,
  User,
  Users,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import {
  deleteViolationRecord,
  getViolationInputContext,
  getViolationSummary,
  manageViolationType,
  recordViolation,
  type ViolationCategory,
  type ViolationType,
} from "@/lib/violations.functions";

export const Route = createFileRoute("/_authenticated/catat-pelanggaran")({
  head: () => ({
    meta: [
      { title: "Catat Pelanggaran Santri | ASMA" },
      {
        name: "description",
        content: "Pencatatan pelanggaran, penentuan sanksi pembinaan, dan akumulasi poin kedisiplinan santri AHIBS.",
      },
      { property: "og:title", content: "Catat Pelanggaran Santri | ASMA" },
      {
        property: "og:description",
        content: "Pencatatan pelanggaran, penentuan sanksi pembinaan, dan akumulasi poin kedisiplinan santri AHIBS.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CatatPelanggaranPage,
});

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function CatatPelanggaranPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchContext = useServerFn(getViolationInputContext);
  const saveViolationFn = useServerFn(recordViolation);
  const deleteRecordFn = useServerFn(deleteViolationRecord);
  const manageCatalogFn = useServerFn(manageViolationType);
  const fetchRecentFn = useServerFn(getViolationSummary);

  const todayStr = useMemo(() => toDateStr(new Date()), []);

  // Form states
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [date, setDate] = useState<string>(todayStr);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [violationTitle, setViolationTitle] = useState<string>("");
  const [category, setCategory] = useState<ViolationCategory>("Ringan");
  const [points, setPoints] = useState<number>(3);
  const [penalty, setPenalty] = useState<string>("");
  const [status, setStatus] = useState<"Perlu Pembinaan" | "Dalam Pembinaan" | "Selesai">("Selesai");
  const [notes, setNotes] = useState<string>("");

  // Student filter states
  const [dormFilter, setDormFilter] = useState<string>("semua");
  const [classFilter, setClassFilter] = useState<string>("semua");
  const [studentSearch, setStudentSearch] = useState<string>("");

  // Preset filter & Catalog management dialog states
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<string>("semua");
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<ViolationCategory>("Ringan");
  const [newPoints, setNewPoints] = useState<number>(5);
  const [newPenalty, setNewPenalty] = useState("");

  // 1. Fetch initial context (students, dorms, classes, catalog)
  const contextQuery = useQuery({
    queryKey: ["violation-input-context"],
    queryFn: () => fetchContext(),
  });

  // 2. Fetch today's recent records for quick verification
  const recentQuery = useQuery({
    queryKey: ["violations-today", todayStr],
    queryFn: () =>
      fetchRecentFn({
        data: {
          period: "hari_ini",
          startDate: todayStr,
          endDate: todayStr,
        },
      }),
  });

  const students = contextQuery.data?.students ?? [];
  const dorms = contextQuery.data?.dorms ?? [];
  const classes = contextQuery.data?.classes ?? [];
  const catalog = contextQuery.data?.catalog ?? [];
  const canManageCatalog = contextQuery.data?.canManageCatalog ?? false;

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      if (dormFilter !== "semua" && s.dorm !== dormFilter) return false;
      if (classFilter !== "semua" && s.class !== classFilter) return false;
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchDisplay = s.display_name?.toLowerCase().includes(q);
        const matchNis = s.nis_nip?.toLowerCase().includes(q);
        if (!matchName && !matchDisplay && !matchNis) return false;
      }
      return true;
    });
  }, [students, dormFilter, classFilter, studentSearch]);

  // Filter presets catalog
  const filteredCatalog = useMemo(() => {
    if (presetCategoryFilter === "semua") return catalog;
    return catalog.filter((c: ViolationType) => c.category === presetCategoryFilter);
  }, [catalog, presetCategoryFilter]);

  // Handle student selection toggle
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredStudents.map((s: any) => s.id);
    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAll = () => {
    setSelectedStudentIds([]);
  };

  // When a preset is chosen, auto-fill fields
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const chosen = catalog.find((c: ViolationType) => c.id === presetId);
    if (chosen) {
      setViolationTitle(chosen.title);
      setCategory(chosen.category);
      setPoints(chosen.points);
      if (chosen.default_penalty) {
        setPenalty(chosen.default_penalty);
      }
      if (chosen.category === "Berat") {
        setStatus("Perlu Pembinaan");
      }
    }
  };

  const handleResetForm = () => {
    setSelectedStudentIds([]);
    setViolationTitle("");
    setSelectedPresetId("");
    setCategory("Ringan");
    setPoints(3);
    setPenalty("");
    setStatus("Selesai");
    setNotes("");
    setDate(todayStr);
  };

  // Mutation: Submit violation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (selectedStudentIds.length === 0) {
        throw new Error("Pilih minimal satu santri yang melanggar");
      }
      if (!violationTitle.trim()) {
        throw new Error("Nama pelanggaran wajib diisi");
      }
      return saveViolationFn({
        data: {
          student_ids: selectedStudentIds,
          violation_title: violationTitle.trim(),
          category,
          points: Number(points) || 1,
          date,
          penalty: penalty.trim() || undefined,
          notes: notes.trim() || undefined,
          status,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Berhasil mencatat pelanggaran untuk ${res.count} santri!`);
      handleResetForm();
      queryClient.invalidateQueries({ queryKey: ["violations-today"] });
      queryClient.invalidateQueries({ queryKey: ["violation-summary"] });
      queryClient.invalidateQueries({ queryKey: ["my-violations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mencatat pelanggaran");
    },
  });

  // Mutation: Delete recent record
  const deleteMutation = useMutation({
    mutationFn: (recordId: string) =>
      deleteRecordFn({
        data: { record_id: recordId },
      }),
    onSuccess: () => {
      toast.success("Catatan pelanggaran berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["violations-today"] });
      queryClient.invalidateQueries({ queryKey: ["violation-summary"] });
      queryClient.invalidateQueries({ queryKey: ["my-violations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus catatan pelanggaran");
    },
  });

  // Mutation: Add new catalog preset
  const addCatalogMutation = useMutation({
    mutationFn: () =>
      manageCatalogFn({
        data: {
          action: "create",
          title: newTitle.trim(),
          category: newCategory,
          points: Number(newPoints) || 5,
          default_penalty: newPenalty.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Jenis pelanggaran baru berhasil ditambahkan ke katalog");
      setNewTitle("");
      setNewPenalty("");
      setNewPoints(5);
      queryClient.invalidateQueries({ queryKey: ["violation-input-context"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menambahkan ke katalog");
    },
  });

  // Mutation: Delete catalog item
  const deleteCatalogMutation = useMutation({
    mutationFn: (id: string) =>
      manageCatalogFn({
        data: {
          action: "delete",
          id,
        },
      }),
    onSuccess: () => {
      toast.success("Preset pelanggaran berhasil dihapus dari katalog");
      queryClient.invalidateQueries({ queryKey: ["violation-input-context"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus dari katalog");
    },
  });

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case "Berat":
        return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900";
      case "Sedang":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900";
    }
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Catat Pelanggaran & Pembinaan
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Pencatatan pelanggaran santri dengan katalog preset poin kedisiplinan dan sanksi edukatif.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManageCatalog && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setIsCatalogOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                Kelola Katalog
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleResetForm}
            >
              <RotateCcw className="h-4 w-4" />
              Reset Form
            </Button>
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* KOLOM KIRI: Pemilihan Santri (5 Kolom) */}
          <div className="space-y-4 lg:col-span-5">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    1. Pilih Santri
                  </CardTitle>
                  <Badge variant={selectedStudentIds.length > 0 ? "default" : "outline"}>
                    {selectedStudentIds.length} Terpilih
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Pilih satu atau beberapa santri yang terlibat dalam pelanggaran ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* Filter Asrama & Kelas */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Kamar / Asrama</Label>
                    <Select value={dormFilter} onValueChange={setDormFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Semua Asrama" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semua">Semua Asrama</SelectItem>
                        {dorms.map((d: string) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Kelas</Label>
                    <Select value={classFilter} onValueChange={setClassFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Semua Kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semua">Semua Kelas</SelectItem>
                        {classes.map((c: string) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau NIS santri..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch("")}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Bulk Select Buttons */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    {filteredStudents.length} santri ditemukan
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={selectAllFiltered}
                    >
                      Pilih Semua
                    </Button>
                    {selectedStudentIds.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
                        onClick={deselectAll}
                      >
                        Hapus Pilihan
                      </Button>
                    )}
                  </div>
                </div>

                {/* Selected Student Chips */}
                {selectedStudentIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2 max-h-24 overflow-y-auto">
                    {selectedStudentIds.map((id) => {
                      const std = students.find((s: any) => s.id === id);
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="gap-1 pl-2 pr-1 text-[11px] bg-background border shadow-xs"
                        >
                          <span className="max-w-[120px] truncate">{std?.name || "Santri"}</span>
                          <button
                            type="button"
                            onClick={() => toggleStudent(id)}
                            className="rounded p-0.5 hover:bg-destructive/20 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Students Scrollable List */}
                <div className="max-h-[360px] space-y-1 overflow-y-auto rounded-lg border bg-muted/20 p-1.5">
                  {contextQuery.isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <p className="mt-2 text-xs">Memuat daftar santri...</p>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Tidak ada santri yang sesuai filter.
                    </div>
                  ) : (
                    filteredStudents.map((s: any) => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleStudent(s.id)}
                          className={`flex cursor-pointer items-center justify-between rounded-md p-2 text-xs transition-colors ${
                            isSelected
                              ? "bg-primary/10 font-medium text-foreground border border-primary/30"
                              : "hover:bg-muted/70 text-muted-foreground border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              {isSelected ? <Check className="h-3.5 w-3.5" /> : s.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-foreground">
                                {s.name}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {s.dorm || "Tanpa Kamar"} • {s.class || "Tanpa Kelas"} •{" "}
                                {s.nis_nip || "-"}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={isSelected ? "default" : "outline"}
                            className="text-[10px] shrink-0"
                          >
                            {isSelected ? "Dipilih" : "Pilih"}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KOLOM KANAN: Detail Pelanggaran, Poin & Sanksi (7 Kolom) */}
          <div className="space-y-4 lg:col-span-7">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  2. Detail Pelanggaran & Sanksi Pembinaan
                </CardTitle>
                <CardDescription className="text-xs">
                  Pilih dari katalog preset atau ketik manual pelanggaran serta sanksi edukatifnya.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* 1. Pilih Preset Katalog */}
                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      Pilih Cepat dari Katalog Pelanggaran
                    </Label>
                    {/* Filter Kategori Preset */}
                    <div className="flex items-center gap-1">
                      {(["semua", "Ringan", "Sedang", "Berat"] as const).map((catTab) => (
                        <Button
                          key={catTab}
                          type="button"
                          variant={presetCategoryFilter === catTab ? "default" : "outline"}
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => setPresetCategoryFilter(catTab)}
                        >
                          {catTab === "semua" ? "Semua" : catTab}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Select value={selectedPresetId} onValueChange={handleSelectPreset}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="-- Pilih jenis pelanggaran dari katalog --" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {filteredCatalog.map((c: ViolationType) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-rose-600">[{c.points} Poin]</span>
                            <span>{c.title}</span>
                            <span className="text-muted-foreground text-[10px]">({c.category})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Judul Pelanggaran, Kategori, & Poin */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-7 space-y-1">
                    <Label className="text-xs font-medium">
                      Nama Pelanggaran <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Contoh: Terlambat shalat berjamaah..."
                      value={violationTitle}
                      onChange={(e) => setViolationTitle(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs font-medium">Tingkat / Kategori</Label>
                    <Select
                      value={category}
                      onValueChange={(val: ViolationCategory) => {
                        setCategory(val);
                        if (val === "Ringan" && points > 10) setPoints(3);
                        if (val === "Sedang" && (points < 10 || points > 40)) setPoints(15);
                        if (val === "Berat" && points < 50) setPoints(50);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ringan">Ringan (2-5 Poin)</SelectItem>
                        <SelectItem value="Sedang">Sedang (10-25 Poin)</SelectItem>
                        <SelectItem value="Berat">Berat (50-100 Poin)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-medium">Poin</Label>
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      value={points}
                      onChange={(e) => setPoints(Number(e.target.value))}
                      className="h-9 text-xs font-bold text-rose-600"
                    />
                  </div>
                </div>

                {/* 3. Tanggal & Status Pembinaan */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      Tanggal Kejadian
                    </Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Status Tindak Lanjut</Label>
                    <Select
                      value={status}
                      onValueChange={(v: "Perlu Pembinaan" | "Dalam Pembinaan" | "Selesai") =>
                        setStatus(v)
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Selesai">
                          <span className="flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Selesai (Sanksi Selesai)
                          </span>
                        </SelectItem>
                        <SelectItem value="Perlu Pembinaan">
                          <span className="flex items-center gap-1.5 text-rose-600">
                            <AlertCircle className="h-3.5 w-3.5" /> Perlu Pembinaan / Pemanggilan
                          </span>
                        </SelectItem>
                        <SelectItem value="Dalam Pembinaan">
                          <span className="flex items-center gap-1.5 text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" /> Dalam Pembinaan Berjalan
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 4. Sanksi / Tindakan Edukatif */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Sanksi / Tindakan Edukatif yang Diberikan
                  </Label>
                  <Input
                    placeholder="Contoh: Piket kebersihan asrama 1 hari / Hafalan doa / Nasihat musyrif..."
                    value={penalty}
                    onChange={(e) => setPenalty(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Sanksi bersifat mendidik dan memperbaiki akhlak santri.
                  </p>
                </div>

                {/* 5. Catatan / Kronologi Singkat */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Catatan / Kronologi Singkat (Opsional)</Label>
                  <Textarea
                    placeholder="Tuliskan tempat kejadian, kronologi, atau catatan pengasuh..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => saveMutation.mutate()}
                    disabled={
                      selectedStudentIds.length === 0 ||
                      !violationTitle.trim() ||
                      saveMutation.isPending
                    }
                    className="w-full gap-2 font-medium"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan Catatan Pelanggaran...
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4" />
                        Simpan Catatan Pelanggaran ({selectedStudentIds.length} Santri Terpilih)
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIWAYAT PENCATATAN HARI INI */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Catatan Pelanggaran Hari Ini ({todayStr})
                </CardTitle>
                <CardDescription className="text-xs">
                  Daftar pelanggaran yang dicatat pada hari ini. Anda dapat menghapus data jika terjadi kesalahan input.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {recentQuery.data?.totalViolations ?? 0} Pelanggaran Hari Ini
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentQuery.isLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat riwayat hari ini...
              </div>
            ) : (recentQuery.data?.records ?? []).length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Belum ada pelanggaran yang dicatat hari ini. Alhamdulillah kedisiplinan terjaga!
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="p-2.5">Santri</th>
                      <th className="p-2.5">Kamar / Kelas</th>
                      <th className="p-2.5">Pelanggaran</th>
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5 text-center">Poin</th>
                      <th className="p-2.5">Sanksi / Tindakan</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Pencatat</th>
                      <th className="p-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentQuery.data?.records.map((r: any) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 font-medium text-foreground">
                          {r.student_name}
                          <span className="block text-[10px] text-muted-foreground">
                            NIS: {r.student_nis}
                          </span>
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {r.student_dorm} • {r.student_class}
                        </td>
                        <td className="p-2.5">
                          <span className="font-medium text-foreground">{r.violation_title}</span>
                          {r.notes && (
                            <span className="block text-[10px] text-muted-foreground truncate max-w-[180px]">
                              {r.notes}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${getCategoryBadgeClass(r.category)}`}
                          >
                            {r.category}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center font-bold text-rose-600">
                          +{r.points}
                        </td>
                        <td className="p-2.5 text-muted-foreground max-w-[160px] truncate">
                          {r.penalty || "-"}
                        </td>
                        <td className="p-2.5">
                          <Badge
                            variant={
                              r.status === "Selesai"
                                ? "outline"
                                : r.status === "Perlu Pembinaan"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-muted-foreground text-[11px]">
                          {r.recorder_name}
                        </td>
                        <td className="p-2.5 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Hapus catatan pelanggaran untuk ${r.student_name}?`,
                                )
                              ) {
                                deleteMutation.mutate(r.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL KELOLA KATALOG PELANGGARAN (ADMIN) */}
      <Dialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-5 w-5 text-primary" />
              Kelola Katalog Jenis Pelanggaran
            </DialogTitle>
            <DialogDescription className="text-xs">
              Atur daftar preset pelanggaran, bobot poin standar, serta rekomendasi sanksi edukatif pesantren.
            </DialogDescription>
          </DialogHeader>

          {/* Form Tambah Item Katalog */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <h4 className="text-xs font-semibold flex items-center gap-1">
              <Plus className="h-3.5 w-3.5 text-primary" /> Tambah Jenis Pelanggaran Baru
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <div className="sm:col-span-6 space-y-1">
                <Label className="text-[11px]">Nama Pelanggaran</Label>
                <Input
                  placeholder="Contoh: Merusak fasilitas asrama..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px]">Kategori</Label>
                <Select
                  value={newCategory}
                  onValueChange={(v: ViolationCategory) => setNewCategory(v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ringan">Ringan</SelectItem>
                    <SelectItem value="Sedang">Sedang</SelectItem>
                    <SelectItem value="Berat">Berat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px]">Bobot Poin</Label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={newPoints}
                  onChange={(e) => setNewPoints(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-9 space-y-1">
                <Label className="text-[11px]">Rekomendasi Sanksi / Tindakan Edukatif</Label>
                <Input
                  placeholder="Contoh: Hafalan doa & piket kebersihan..."
                  value={newPenalty}
                  onChange={(e) => setNewPenalty(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-3 flex items-end">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 w-full text-xs"
                  onClick={() => addCatalogMutation.mutate()}
                  disabled={!newTitle.trim() || addCatalogMutation.isPending}
                >
                  {addCatalogMutation.isPending ? "Menyimpan..." : "Tambah Preset"}
                </Button>
              </div>
            </div>
          </div>

          {/* Tabel Daftar Katalog */}
          <div className="max-h-72 overflow-y-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase sticky top-0">
                <tr>
                  <th className="p-2">Pelanggaran</th>
                  <th className="p-2">Kategori</th>
                  <th className="p-2 text-center">Poin</th>
                  <th className="p-2">Rekomendasi Sanksi</th>
                  <th className="p-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {catalog.map((item: ViolationType) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="p-2 font-medium text-foreground">{item.title}</td>
                    <td className="p-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${getCategoryBadgeClass(item.category)}`}
                      >
                        {item.category}
                      </Badge>
                    </td>
                    <td className="p-2 text-center font-bold text-rose-600">
                      {item.points}
                    </td>
                    <td className="p-2 text-muted-foreground max-w-[180px] truncate">
                      {item.default_penalty || "-"}
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (window.confirm(`Hapus preset "${item.title}" dari katalog?`)) {
                            deleteCatalogMutation.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCatalogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
