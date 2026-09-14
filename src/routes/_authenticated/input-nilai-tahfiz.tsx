import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  History,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
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
  deleteTahfizEntry,
  getMusyrifHalaqohContext,
  getStudentTahfizDetail,
  saveIqroEntry,
  saveTahfizHafalanEntry,
  saveTilawahEntry,
  updateStudentLevelFn,
} from "@/lib/tahfiz.functions";
import type { IqroStage } from "@/lib/quran-data";
import type { TahfizHafalanType, TahfizLevel } from "@/lib/tahfiz.storage.server";

export const Route = createFileRoute("/_authenticated/input-nilai-tahfiz")({
  head: () => ({
    meta: [
      { title: "Input & Mutaba'ah Tahfiz | SIM-AHIBS" },
      {
        name: "description",
        content: "Pencatatan setoran Iqro Metode Itqon, Tilawah, dan Tahfiz Sabq/Sabqy/Manzil santri AHIBS.",
      },
      { property: "og:title", content: "Input & Mutaba'ah Tahfiz | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Pencatatan setoran Iqro Metode Itqon, Tilawah, dan Tahfiz Sabq/Sabqy/Manzil santri AHIBS.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: InputNilaiTahfizPage,
});

const pad = (n: number) => String(n).padStart(2, "0");
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function InputNilaiTahfizPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchContext = useServerFn(getMusyrifHalaqohContext);
  const fetchDetail = useServerFn(getStudentTahfizDetail);
  const saveIqro = useServerFn(saveIqroEntry);
  const saveTilawah = useServerFn(saveTilawahEntry);
  const saveTahfiz = useServerFn(saveTahfizHafalanEntry);
  const deleteRecord = useServerFn(deleteTahfizEntry);
  const updateLevel = useServerFn(updateStudentLevelFn);

  const [selectedHalaqoh, setSelectedHalaqoh] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Dialog Ubah Level
  const [changeLevelOpen, setChangeLevelOpen] = useState(false);
  const [newLevel, setNewLevel] = useState<TahfizLevel>("tahfiz");

  // Form states: Umum
  const [inputDate, setInputDate] = useState<string>(getTodayStr());

  // Form states: Iqro
  const [iqroHalaman, setIqroHalaman] = useState<number>(1);
  const [iqroTahap, setIqroTahap] = useState<string>("Makhroj & Sifat Huruf");
  const [iqroNilai, setIqroNilai] = useState<number>(85);
  const [iqroCatatan, setIqroCatatan] = useState<string>("");
  const [iqroMurojaah, setIqroMurojaah] = useState<string>("Lancar (Mutqin)");

  // Form states: Tilawah
  const [tilawahJuz, setTilawahJuz] = useState<number>(1);
  const [tilawahSurah, setTilawahSurah] = useState<string>("Al-Fatihah");
  const [tilawahAyatStart, setTilawahAyatStart] = useState<number>(1);
  const [tilawahAyatEnd, setTilawahAyatEnd] = useState<number>(7);
  const [tilawahHalaman, setTilawahHalaman] = useState<number | undefined>(undefined);
  const [tilawahKelancaran, setTilawahKelancaran] = useState<string>("Mumtaz");
  const [tilawahTajwid, setTilawahTajwid] = useState<string>("Jayyid Jiddan");
  const [tilawahCatatan, setTilawahCatatan] = useState<string>("");
  const [tilawahMurojaah, setTilawahMurojaah] = useState<string>("Lancar");

  // Form states: Tahfiz
  const [tahfizType, setTahfizType] = useState<TahfizHafalanType>("sabq");
  const [tahfizJuz, setTahfizJuz] = useState<number>(30);
  const [tahfizSurah, setTahfizSurah] = useState<string>("An-Naba'");
  const [tahfizAyatStart, setTahfizAyatStart] = useState<number>(1);
  const [tahfizAyatEnd, setTahfizAyatEnd] = useState<number>(10);
  const [tahfizNilai, setTahfizNilai] = useState<number>(90);
  const [tahfizCatatan, setTahfizCatatan] = useState<string>("");

  // Context Query
  const contextQuery = useQuery({
    queryKey: ["tahfiz-context", selectedHalaqoh],
    queryFn: () => fetchContext({ data: { selectedHalaqoh: selectedHalaqoh || undefined } }),
  });

  const activeHalaqohName = selectedHalaqoh || contextQuery.data?.activeHalaqoh || "";
  const allStudents = contextQuery.data?.students || [];
  const surahList = contextQuery.data?.surahList || [];
  const iqroStages = contextQuery.data?.iqroStages || [];

  // Filter students by halaqoh and search
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s: any) => {
      const matchHalaqoh =
        !activeHalaqohName || activeHalaqohName === "all" || s.halaqoh === activeHalaqohName;
      const matchSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nis_nip && s.nis_nip.includes(searchQuery)) ||
        (s.class && s.class.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchHalaqoh && matchSearch;
    });
  }, [allStudents, activeHalaqohName, searchQuery]);

  // If no student selected, pick first in list
  const activeStudent = useMemo(() => {
    if (!selectedStudentId && filteredStudents.length > 0) {
      return filteredStudents[0];
    }
    return (
      filteredStudents.find((s: any) => s.id === selectedStudentId) || filteredStudents[0] || null
    );
  }, [filteredStudents, selectedStudentId]);

  // Student Detail Query
  const detailQuery = useQuery({
    queryKey: ["tahfiz-student-detail", activeStudent?.id],
    queryFn: () => {
      if (!activeStudent?.id) return null;
      return fetchDetail({ data: { studentId: activeStudent.id } });
    },
    enabled: Boolean(activeStudent?.id),
  });

  // Default active tab based on student's current level
  const [activeTab, setActiveTab] = useState<string>("tahfiz");

  // Sync active tab when active student changes
  const currentStudentLevel = activeStudent?.level || "tahfiz";

  // Mutations
  const iqroMutation = useMutation({
    mutationFn: saveIqro,
    onSuccess: () => {
      toast.success("Setoran Iqro Metode Itqon berhasil disimpan!");
      setIqroCatatan("");
      queryClient.invalidateQueries({ queryKey: ["tahfiz-context"] });
      queryClient.invalidateQueries({ queryKey: ["tahfiz-student-detail", activeStudent?.id] });
    },
    onError: (err: any) => {
      toast.error(`Gagal menyimpan: ${err.message}`);
    },
  });

  const tilawahMutation = useMutation({
    mutationFn: saveTilawah,
    onSuccess: () => {
      toast.success("Setoran Tilawah Al-Qur'an berhasil disimpan!");
      setTilawahCatatan("");
      queryClient.invalidateQueries({ queryKey: ["tahfiz-context"] });
      queryClient.invalidateQueries({ queryKey: ["tahfiz-student-detail", activeStudent?.id] });
    },
    onError: (err: any) => {
      toast.error(`Gagal menyimpan: ${err.message}`);
    },
  });

  const tahfizMutation = useMutation({
    mutationFn: saveTahfiz,
    onSuccess: () => {
      const typeLabel =
        tahfizType === "sabq"
          ? "Sabq (Hafalan Baru)"
          : tahfizType === "sabqy"
            ? "Sabqy (Murojaah Berjalan)"
            : "Manzil (Murojaah Seluruh)";
      toast.success(`Setoran ${typeLabel} berhasil disimpan!`);
      setTahfizCatatan("");
      queryClient.invalidateQueries({ queryKey: ["tahfiz-context"] });
      queryClient.invalidateQueries({ queryKey: ["tahfiz-student-detail", activeStudent?.id] });
    },
    onError: (err: any) => {
      toast.error(`Gagal menyimpan: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecord,
    onSuccess: () => {
      toast.success("Catatan setoran telah dihapus");
      queryClient.invalidateQueries({ queryKey: ["tahfiz-context"] });
      queryClient.invalidateQueries({ queryKey: ["tahfiz-student-detail", activeStudent?.id] });
    },
    onError: (err: any) => {
      toast.error(`Gagal menghapus: ${err.message}`);
    },
  });

  const levelMutation = useMutation({
    mutationFn: updateLevel,
    onSuccess: () => {
      toast.success("Tingkatan santri berhasil diperbarui");
      setChangeLevelOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tahfiz-context"] });
      queryClient.invalidateQueries({ queryKey: ["tahfiz-student-detail", activeStudent?.id] });
    },
    onError: (err: any) => {
      toast.error(`Gagal memperbarui tingkatan: ${err.message}`);
    },
  });

  // Quick stats
  const halaqohStudents = useMemo(() => {
    if (!activeHalaqohName || activeHalaqohName === "all") return allStudents;
    return allStudents.filter((s: any) => s.halaqoh === activeHalaqohName);
  }, [allStudents, activeHalaqohName]);

  const countIqro = halaqohStudents.filter((s: any) => s.level === "iqro").length;
  const countTilawah = halaqohStudents.filter((s: any) => s.level === "tilawah").length;
  const countTahfiz = halaqohStudents.filter((s: any) => s.level === "tahfiz").length;

  const handleSaveIqro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent?.id) return;
    iqroMutation.mutate({
      data: {
        student_id: activeStudent.id,
        date: inputDate,
        halaman: Number(iqroHalaman),
        tahap: iqroTahap,
        nilai: Number(iqroNilai),
        catatan: iqroCatatan,
        murojaah_harian: iqroMurojaah,
      },
    });
  };

  const handleSaveTilawah = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent?.id) return;
    tilawahMutation.mutate({
      data: {
        student_id: activeStudent.id,
        date: inputDate,
        juz: Number(tilawahJuz),
        surah_name: tilawahSurah,
        ayat_start: Number(tilawahAyatStart),
        ayat_end: Number(tilawahAyatEnd),
        halaman: tilawahHalaman ? Number(tilawahHalaman) : undefined,
        nilai_kelancaran: tilawahKelancaran,
        nilai_tajwid: tilawahTajwid,
        catatan: tilawahCatatan,
        murojaah_harian: tilawahMurojaah,
      },
    });
  };

  const handleSaveTahfiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent?.id) return;
    let predikat = "Mumtaz";
    if (tahfizNilai < 70) predikat = "Perlu Bimbingan";
    else if (tahfizNilai < 80) predikat = "Jayyid";
    else if (tahfizNilai < 90) predikat = "Jayyid Jiddan";

    tahfizMutation.mutate({
      data: {
        student_id: activeStudent.id,
        date: inputDate,
        type: tahfizType,
        juz: Number(tahfizJuz),
        surah_name: tahfizSurah,
        ayat_start: Number(tahfizAyatStart),
        ayat_end: Number(tahfizAyatEnd),
        nilai: Number(tahfizNilai),
        predikat,
        catatan: tahfizCatatan,
      },
    });
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Halaqoh Qur'an
              </span>
              <span className="text-xs text-muted-foreground">• Buku Kontrol 2025</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Input & Mutaba'ah Tahfiz
            </h1>
            <p className="text-sm text-muted-foreground">
              Pencatatan setoran santri: Iqro (Metode Itqon), Tilawah Al-Qur'an, dan Tahfiz 3 Pilar
              (Sabq, Sabqy, Manzil).
            </p>
          </div>

          {/* Halaqoh Filter */}
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap text-sm font-medium">Pilih Halaqoh:</Label>
            <Select
              value={activeHalaqohName || "all"}
              onValueChange={(val) => setSelectedHalaqoh(val === "all" ? "" : val)}
            >
              <SelectTrigger className="w-56 bg-background">
                <SelectValue placeholder="Pilih Halaqoh" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Halaqoh</SelectItem>
                {contextQuery.data?.halaqohs.map((h: any) => (
                  <SelectItem key={h.id} value={h.name}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Santri</p>
                <p className="text-xl font-bold">{halaqohStudents.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tingkat Iqro</p>
                <p className="text-xl font-bold">{countIqro}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tingkat Tilawah</p>
                <p className="text-xl font-bold">{countTilawah}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tingkat Tahfiz</p>
                <p className="text-xl font-bold">{countTahfiz}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Work Area: Split View */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Student List (4 Cols) */}
          <div className="space-y-4 lg:col-span-4">
            <Card className="border-border/60">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Santri Halaqoh</CardTitle>
                  <Badge variant="outline" className="text-xs font-normal">
                    {filteredStudents.length} Santri
                  </Badge>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau kelas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[580px] space-y-2 overflow-y-auto p-4 pt-0">
                {contextQuery.isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="mt-2 text-xs">Memuat data halaqoh...</span>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Tidak ada santri di halaqoh ini.
                  </p>
                ) : (
                  filteredStudents.map((s: any) => {
                    const isSelected = activeStudent?.id === s.id;
                    const levelBadge =
                      s.level === "iqro" ? (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          Iqro (Itqon)
                        </span>
                      ) : s.level === "tilawah" ? (
                        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                          Tilawah
                        </span>
                      ) : (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          Tahfiz 3 Pilar
                        </span>
                      );

                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`group relative flex cursor-pointer flex-col rounded-lg border p-3 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary">
                              {s.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.class || "Tanpa Kelas"} • {s.dorm || "Asrama"}
                            </p>
                          </div>
                          {levelBadge}
                        </div>

                        {s.currentPosition ? (
                          <p className="mt-2 text-[11px] font-medium text-foreground/80 line-clamp-1">
                            📍 {s.currentPosition}
                          </p>
                        ) : (
                          <p className="mt-2 text-[11px] italic text-muted-foreground">
                            Belum ada setoran tercatat
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Input Forms & Student Detail (8 Cols) */}
          <div className="space-y-6 lg:col-span-8">
            {activeStudent ? (
              <>
                {/* Active Student Banner */}
                <Card className="border-border/60 bg-gradient-to-r from-background via-muted/20 to-primary/5">
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground">{activeStudent.name}</h2>
                        <Badge variant="outline">{activeStudent.class || "Tanpa Kelas"}</Badge>
                        <Badge variant="secondary">{activeStudent.halaqoh || "Halaqoh"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        NIS: {activeStudent.nis_nip || "-"} • Target Mustawa:{" "}
                        <span className="font-semibold text-foreground">
                          {activeStudent.target?.semesterGasal.title || "Tahfiz"}
                        </span>
                      </p>
                      {activeStudent.currentPosition && (
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Posisi Terakhir: {activeStudent.currentPosition}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewLevel(activeStudent.level);
                          setChangeLevelOpen(true);
                        }}
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Ubah Tingkat
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Input Form Tabs */}
                <Card className="border-border/60">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">Form Setoran Harian</CardTitle>
                        <CardDescription className="text-xs">
                          Pilih tab materi yang disetorkan santri pada sesi ini.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="date-input" className="text-xs text-muted-foreground">
                          Tanggal:
                        </Label>
                        <Input
                          id="date-input"
                          type="date"
                          value={inputDate}
                          onChange={(e) => setInputDate(e.target.value)}
                          className="h-8 w-36 text-xs"
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    <Tabs
                      defaultValue={currentStudentLevel}
                      value={activeTab}
                      onValueChange={setActiveTab}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="iqro" className="text-xs font-semibold">
                          📖 1. Iqro (Metode Itqon)
                        </TabsTrigger>
                        <TabsTrigger value="tilawah" className="text-xs font-semibold">
                          📜 2. Tilawah Qur'an
                        </TabsTrigger>
                        <TabsTrigger value="tahfiz" className="text-xs font-semibold">
                          ✨ 3. Tahfiz (3 Pilar)
                        </TabsTrigger>
                      </TabsList>

                      {/* TAB 1: IQRO */}
                      <TabsContent value="iqro" className="mt-4 space-y-4">
                        <form onSubmit={handleSaveIqro} className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Halaman Iqro</Label>
                              <Input
                                type="number"
                                min={1}
                                max={60}
                                value={iqroHalaman}
                                onChange={(e) => setIqroHalaman(Number(e.target.value))}
                                required
                              />
                              <p className="text-[11px] text-muted-foreground">Halaman 1 - 60</p>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Tahap Pembelajaran</Label>
                              <Select value={iqroTahap} onValueChange={setIqroTahap}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {iqroStages.map((stage) => (
                                    <SelectItem key={stage} value={stage}>
                                      {stage}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Nilai (0 - 100)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={iqroNilai}
                                onChange={(e) => setIqroNilai(Number(e.target.value))}
                                required
                              />
                              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {iqroNilai >= 90
                                  ? "Mumtaz (Sangat Baik)"
                                  : iqroNilai >= 80
                                    ? "Jayyid Jiddan (Baik Sekali)"
                                    : iqroNilai >= 70
                                      ? "Jayyid (Cukup)"
                                      : "Maqbul / Perlu Bimbingan"}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Rekap Murojaah Harian</Label>
                              <Select value={iqroMurojaah} onValueChange={setIqroMurojaah}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Lancar (Mutqin)">Lancar (Mutqin)</SelectItem>
                                  <SelectItem value="Cukup Lancar">Cukup Lancar</SelectItem>
                                  <SelectItem value="Perlu Diulang">Perlu Diulang</SelectItem>
                                  <SelectItem value="Belum Murojaah">Belum Murojaah</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">
                                Catatan Musyrif (Makhroj, Sifat, Harokat)
                              </Label>
                              <Input
                                placeholder="Contoh: Perbaiki makhroj 'Ain dan Ha, harokat sukun sudah bagus..."
                                value={iqroCatatan}
                                onChange={(e) => setIqroCatatan(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button
                              type="submit"
                              disabled={iqroMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              {iqroMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              Simpan Setoran Iqro
                            </Button>
                          </div>
                        </form>
                      </TabsContent>

                      {/* TAB 2: TILAWAH */}
                      <TabsContent value="tilawah" className="mt-4 space-y-4">
                        <form onSubmit={handleSaveTilawah} className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Juz</Label>
                              <Input
                                type="number"
                                min={1}
                                max={30}
                                value={tilawahJuz}
                                onChange={(e) => setTilawahJuz(Number(e.target.value))}
                                required
                              />
                            </div>

                            <div className="space-y-1.5 sm:col-span-3">
                              <Label className="text-xs font-medium">Surat Al-Qur'an</Label>
                              <Select value={tilawahSurah} onValueChange={setTilawahSurah}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                  {surahList.map((s) => (
                                    <SelectItem key={s.number} value={s.name}>
                                      {s.number}. {s.name} ({s.arabic}) - {s.totalVerses} Ayat
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Dari Ayat</Label>
                              <Input
                                type="number"
                                min={1}
                                value={tilawahAyatStart}
                                onChange={(e) => setTilawahAyatStart(Number(e.target.value))}
                                required
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Sampai Ayat</Label>
                              <Input
                                type="number"
                                min={1}
                                value={tilawahAyatEnd}
                                onChange={(e) => setTilawahAyatEnd(Number(e.target.value))}
                                required
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Halaman (Opsional)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={604}
                                placeholder="Misal: 15"
                                value={tilawahHalaman ?? ""}
                                onChange={(e) =>
                                  setTilawahHalaman(
                                    e.target.value ? Number(e.target.value) : undefined,
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Nilai Kelancaran</Label>
                              <Select
                                value={tilawahKelancaran}
                                onValueChange={setTilawahKelancaran}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Mumtaz">Mumtaz (Sangat Lancar)</SelectItem>
                                  <SelectItem value="Jayyid Jiddan">
                                    Jayyid Jiddan (Lancar)
                                  </SelectItem>
                                  <SelectItem value="Jayyid">Jayyid (Cukup)</SelectItem>
                                  <SelectItem value="Maqbul">Maqbul (Perlu Latihan)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Nilai Tajwid</Label>
                              <Select value={tilawahTajwid} onValueChange={setTilawahTajwid}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Mumtaz">Mumtaz (Kaidah Sempurna)</SelectItem>
                                  <SelectItem value="Jayyid Jiddan">Jayyid Jiddan (Baik)</SelectItem>
                                  <SelectItem value="Jayyid">Jayyid (Cukup)</SelectItem>
                                  <SelectItem value="Maqbul">Maqbul (Kurang)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Murojaah Harian</Label>
                              <Select value={tilawahMurojaah} onValueChange={setTilawahMurojaah}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Lancar">Lancar</SelectItem>
                                  <SelectItem value="Cukup">Cukup</SelectItem>
                                  <SelectItem value="Perlu Diulang">Perlu Diulang</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Catatan Musyrif</Label>
                            <Input
                              placeholder="Catatan waqaf, ibtida', dan fashohah..."
                              value={tilawahCatatan}
                              onChange={(e) => setTilawahCatatan(e.target.value)}
                            />
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button
                              type="submit"
                              disabled={tilawahMutation.isPending}
                              className="bg-sky-600 hover:bg-sky-700"
                            >
                              {tilawahMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              Simpan Setoran Tilawah
                            </Button>
                          </div>
                        </form>
                      </TabsContent>

                      {/* TAB 3: TAHFIZ (3 PILAR) */}
                      <TabsContent value="tahfiz" className="mt-4 space-y-4">
                        <form onSubmit={handleSaveTahfiz} className="space-y-4">
                          {/* Pilar Selector */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Pilih Pilar Hafalan:</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => setTahfizType("sabq")}
                                className={`flex flex-col items-center justify-center rounded-lg border p-3 text-left transition-all ${
                                  tahfizType === "sabq"
                                    ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-200"
                                    : "border-border/60 hover:bg-muted/40"
                                }`}
                              >
                                <span className="font-bold text-sm">⭐ Sabq</span>
                                <span className="text-[11px] opacity-80">Hafalan Baru (Ziyadah)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setTahfizType("sabqy")}
                                className={`flex flex-col items-center justify-center rounded-lg border p-3 text-left transition-all ${
                                  tahfizType === "sabqy"
                                    ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm dark:bg-blue-950/40 dark:text-blue-200"
                                    : "border-border/60 hover:bg-muted/40"
                                }`}
                              >
                                <span className="font-bold text-sm">🔄 Sabqy</span>
                                <span className="text-[11px] opacity-80">Murojaah Surat Berjalan</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setTahfizType("manzil")}
                                className={`flex flex-col items-center justify-center rounded-lg border p-3 text-left transition-all ${
                                  tahfizType === "manzil"
                                    ? "border-purple-600 bg-purple-50 text-purple-900 shadow-sm dark:bg-purple-950/40 dark:text-purple-200"
                                    : "border-border/60 hover:bg-muted/40"
                                }`}
                              >
                                <span className="font-bold text-sm">🏰 Manzil</span>
                                <span className="text-[11px] opacity-80">Murojaah Seluruh Hafalan</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Juz</Label>
                              <Input
                                type="number"
                                min={1}
                                max={30}
                                value={tahfizJuz}
                                onChange={(e) => setTahfizJuz(Number(e.target.value))}
                                required
                              />
                            </div>

                            <div className="space-y-1.5 sm:col-span-3">
                              <Label className="text-xs font-medium">Surat</Label>
                              <Select value={tahfizSurah} onValueChange={setTahfizSurah}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                  {surahList.map((s) => (
                                    <SelectItem key={s.number} value={s.name}>
                                      {s.number}. {s.name} ({s.arabic}) - {s.totalVerses} Ayat
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Dari Ayat</Label>
                              <Input
                                type="number"
                                min={1}
                                value={tahfizAyatStart}
                                onChange={(e) => setTahfizAyatStart(Number(e.target.value))}
                                required
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Sampai Ayat</Label>
                              <Input
                                type="number"
                                min={1}
                                value={tahfizAyatEnd}
                                onChange={(e) => setTahfizAyatEnd(Number(e.target.value))}
                                required
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Nilai Kelancaran (0-100)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={tahfizNilai}
                                onChange={(e) => setTahfizNilai(Number(e.target.value))}
                                required
                              />
                              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                {tahfizNilai >= 90
                                  ? "Mumtaz (Sangat Mutqin)"
                                  : tahfizNilai >= 80
                                    ? "Jayyid Jiddan (Lancar)"
                                    : tahfizNilai >= 70
                                      ? "Jayyid (Cukup)"
                                      : "Perlu Bimbingan & Murojaah"}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Catatan Musyrif</Label>
                            <Input
                              placeholder="Kerapian tajwid, waqaf, atau ayat yang sempat terlewat..."
                              value={tahfizCatatan}
                              onChange={(e) => setTahfizCatatan(e.target.value)}
                            />
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button
                              type="submit"
                              disabled={tahfizMutation.isPending}
                              className="bg-amber-600 hover:bg-amber-700"
                            >
                              {tahfizMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              Simpan Setoran Tahfiz (
                              {tahfizType === "sabq"
                                ? "Sabq"
                                : tahfizType === "sabqy"
                                  ? "Sabqy"
                                  : "Manzil"}
                              )
                            </Button>
                          </div>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* History of Selected Student */}
                <Card className="border-border/60">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">
                        Riwayat Setoran: {activeStudent.name}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        Menampilkan rekaman mutabaah terbaru
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    {detailQuery.isLoading ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        Memuat riwayat...
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Hafalan Records */}
                        {detailQuery.data?.history.hafalan &&
                          detailQuery.data.history.hafalan.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Setoran Tahfiz (Sabq / Sabqy / Manzil)
                              </h4>
                              <div className="divide-y rounded-md border text-sm">
                                {detailQuery.data.history.hafalan.slice(0, 5).map((r) => (
                                  <div
                                    key={r.id}
                                    className="flex items-center justify-between p-2.5 hover:bg-muted/30"
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
                                          {r.type.toUpperCase()}
                                        </Badge>
                                        <span className="font-semibold">
                                          Juz {r.juz} • {r.surah_name} ({r.ayat_start}-
                                          {r.ayat_end})
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          • Nilai: {r.nilai} ({r.predikat || "Mutqin"})
                                        </span>
                                      </div>
                                      {r.catatan && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          "{r.catatan}"
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-muted-foreground">{r.date}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                        onClick={() =>
                                          deleteMutation.mutate({
                                            data: { category: "hafalan", id: r.id },
                                          })
                                        }
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Tilawah Records */}
                        {detailQuery.data?.history.tilawah &&
                          detailQuery.data.history.tilawah.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Setoran Tilawah
                              </h4>
                              <div className="divide-y rounded-md border text-sm">
                                {detailQuery.data.history.tilawah.slice(0, 5).map((r) => (
                                  <div
                                    key={r.id}
                                    className="flex items-center justify-between p-2.5 hover:bg-muted/30"
                                  >
                                    <div>
                                      <span className="font-semibold">
                                        Juz {r.juz} • {r.surah_name} ({r.ayat_start}-{r.ayat_end})
                                      </span>
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        • Kelancaran: {r.nilai_kelancaran} • Tajwid: {r.nilai_tajwid}
                                      </span>
                                      {r.catatan && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          "{r.catatan}"
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-muted-foreground">{r.date}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                        onClick={() =>
                                          deleteMutation.mutate({
                                            data: { category: "tilawah", id: r.id },
                                          })
                                        }
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Iqro Records */}
                        {detailQuery.data?.history.iqro &&
                          detailQuery.data.history.iqro.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Setoran Iqro (Metode Itqon)
                              </h4>
                              <div className="divide-y rounded-md border text-sm">
                                {detailQuery.data.history.iqro.slice(0, 5).map((r) => (
                                  <div
                                    key={r.id}
                                    className="flex items-center justify-between p-2.5 hover:bg-muted/30"
                                  >
                                    <div>
                                      <span className="font-semibold">
                                        Halaman {r.halaman} ({r.tahap})
                                      </span>
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        • Nilai: {r.nilai} • Murojaah: {r.murojaah_harian || "-"}
                                      </span>
                                      {r.catatan && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          "{r.catatan}"
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-muted-foreground">{r.date}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                        onClick={() =>
                                          deleteMutation.mutate({
                                            data: { category: "iqro", id: r.id },
                                          })
                                        }
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {(!detailQuery.data?.history.hafalan?.length &&
                          !detailQuery.data?.history.tilawah?.length &&
                          !detailQuery.data?.history.iqro?.length) && (
                          <p className="py-4 text-center text-xs text-muted-foreground">
                            Belum ada riwayat setoran untuk santri ini.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-dashed p-12 text-center">
                <CardContent className="space-y-3">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Pilih Santri</h3>
                  <p className="text-sm text-muted-foreground">
                    Pilih salah satu santri di kolom sebelah kiri untuk mulai menginput setoran
                    hafalan, tilawah, atau iqro.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Dialog Ubah Tingkat Santri */}
        <Dialog open={changeLevelOpen} onOpenChange={setChangeLevelOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ubah Tingkat Santri</DialogTitle>
              <DialogDescription>
                Tentukan tingkatan kurikulum tahfiz aktif untuk{" "}
                <span className="font-semibold text-foreground">{activeStudent?.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label>Pilih Tingkat:</Label>
                <div className="grid grid-cols-1 gap-2">
                  <div
                    onClick={() => setNewLevel("iqro")}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                      newLevel === "iqro"
                        ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
                        : "border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    <BookOpen className="mt-0.5 h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-sm">1. Iqro (Metode Itqon)</p>
                      <p className="text-xs text-muted-foreground">
                        Pengenalan huruf hijaiyah, harokat, makhroj, sukun, dan menyambung huruf.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setNewLevel("tilawah")}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                      newLevel === "tilawah"
                        ? "border-sky-600 bg-sky-50/50 dark:bg-sky-950/20"
                        : "border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    <GraduationCap className="mt-0.5 h-5 w-5 text-sky-600" />
                    <div>
                      <p className="font-semibold text-sm">2. Tilawah Al-Qur'an</p>
                      <p className="text-xs text-muted-foreground">
                        Membaca tartil dari Juz 1 sampai khatam dengan kaidah tajwid.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setNewLevel("tahfiz")}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                      newLevel === "tahfiz"
                        ? "border-amber-600 bg-amber-50/50 dark:bg-amber-950/20"
                        : "border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    <Sparkles className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-sm">3. Tahfiz Al-Qur'an (3 Pilar)</p>
                      <p className="text-xs text-muted-foreground">
                        Menghafal hafalan baru (Sabq), murojaah surat berjalan (Sabqy), dan manzil.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setChangeLevelOpen(false)}>
                Batal
              </Button>
              <Button
                disabled={levelMutation.isPending}
                onClick={() => {
                  if (!activeStudent?.id) return;
                  levelMutation.mutate({
                    data: {
                      student_id: activeStudent.id,
                      level: newLevel,
                    },
                  });
                }}
              >
                {levelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
