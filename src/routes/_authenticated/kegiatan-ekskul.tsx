import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Award,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  History,
  Layers,
  Loader2,
  Save,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  getEkskulEnrollmentDataFn,
  getEkskulSessionsAndGradesFn,
  getMasterEkskulListFn,
  recordEkskulAttendanceSessionFn,
  saveEkskulStudentGradeFn,
} from "@/lib/ekskul.functions";

export const Route = createFileRoute("/_authenticated/kegiatan-ekskul")({
  head: () => ({
    meta: [
      { title: "Kegiatan & Nilai Ekstrakurikuler | SIM-AHIBS" },
      {
        name: "description",
        content: "Presensi sesi kegiatan ekstrakurikuler santri dan penilaian akhir semester untuk Rapor Dinas.",
      },
      { property: "og:title", content: "Kegiatan & Nilai Ekstrakurikuler | SIM-AHIBS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: KegiatanEkskulPage,
});

function KegiatanEkskulPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchMasterEkskul = useServerFn(getMasterEkskulListFn);
  const fetchEnrollmentData = useServerFn(getEkskulEnrollmentDataFn);
  const fetchSessionsAndGrades = useServerFn(getEkskulSessionsAndGradesFn);
  const recordAttendanceFn = useServerFn(recordEkskulAttendanceSessionFn);
  const saveGradeFn = useServerFn(saveEkskulStudentGradeFn);

  // Filters
  const [selectedEkskulId, setSelectedEkskulId] = useState<string>("ekskul-pramuka");
  const [selectedSemester, setSelectedSemester] = useState<string>("1");
  const [selectedYear, setSelectedYear] = useState<string>("2026/2027");

  // Presensi Form States
  const todayStr = new Date().toISOString().split("T")[0] || "";
  const [sessionDate, setSessionDate] = useState<string>(todayStr);
  const [sessionTopic, setSessionTopic] = useState<string>("Latihan / Pertemuan Rutin");
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: "hadir" | "izin" | "sakit" | "alpa"; notes?: string }>
  >({});

  // Grades Form States: studentId -> { grade: 'A'|'B'|'C'|'D', predicate: string, description: string }
  const [localGrades, setLocalGrades] = useState<
    Record<string, { grade: "A" | "B" | "C" | "D"; predicate: string; description: string }>
  >({});

  // 1. Ambil master ekskul
  const masterEkskulQuery = useQuery({
    queryKey: ["master-ekskuls"],
    queryFn: () => fetchMasterEkskul(),
  });
  const ekskuls = masterEkskulQuery.data || [];

  // 2. Ambil santri terdaftar
  const enrollmentQuery = useQuery({
    queryKey: ["ekskul-enrollment", selectedEkskulId, selectedSemester, selectedYear],
    queryFn: async () => {
      const res = await fetchEnrollmentData({
        data: {
          ekskulId: selectedEkskulId,
          semester: selectedSemester,
          academicYear: selectedYear,
        },
      });

      // Default presensi hadir untuk semua
      const initAtt: Record<
        string,
        { status: "hadir" | "izin" | "sakit" | "alpa"; notes?: string }
      > = {};
      for (const m of res.members) {
        initAtt[m.student.id] = { status: "hadir" };
      }
      setAttendanceState(initAtt);
      return res;
    },
    enabled: Boolean(selectedEkskulId),
  });

  // 3. Ambil riwayat sesi dan nilai
  const sessionsAndGradesQuery = useQuery({
    queryKey: ["ekskul-sessions-grades", selectedEkskulId, selectedSemester, selectedYear],
    queryFn: async () => {
      const res = await fetchSessionsAndGrades({
        data: {
          ekskulId: selectedEkskulId,
          semester: selectedSemester,
          academicYear: selectedYear,
        },
      });

      // Inisialisasi localGrades
      const initGrades: Record<
        string,
        { grade: "A" | "B" | "C" | "D"; predicate: string; description: string }
      > = {};

      for (const item of res.studentStats) {
        const studentId = item.student.id;
        if (item.grade) {
          initGrades[studentId] = {
            grade: item.grade.grade,
            predicate: item.grade.predicate,
            description: item.grade.description,
          };
        } else {
          // Default berdasarkan kehadiran
          const defaultGrade = item.percentage >= 85 ? "A" : item.percentage >= 70 ? "B" : "C";
          const defaultPredicate =
            defaultGrade === "A" ? "Sangat Baik" : defaultGrade === "B" ? "Baik" : "Cukup";
          initGrades[studentId] = {
            grade: defaultGrade,
            predicate: defaultPredicate,
            description: `Aktif dan bersemangat dalam mengikuti program ${res.ekskul.name} dengan kehadiran ${item.percentage}%.`,
          };
        }
      }
      setLocalGrades(initGrades);
      return res;
    },
    enabled: Boolean(selectedEkskulId),
  });

  const members = enrollmentQuery.data?.members || [];
  const selectedEkskul = ekskuls.find((e) => e.id === selectedEkskulId);

  // Mutation: Simpan Presensi Sesi
  const saveAttendanceMutation = useMutation({
    mutationFn: () => {
      const records = members.map((m: any) => ({
        student_id: m.student.id,
        status: attendanceState[m.student.id]?.status || "hadir",
        notes: attendanceState[m.student.id]?.notes || "",
      }));

      return recordAttendanceFn({
        data: {
          ekskulId: selectedEkskulId,
          date: sessionDate,
          topic: sessionTopic.trim(),
          semester: selectedSemester,
          academicYear: selectedYear,
          records,
        },
      });
    },
    onSuccess: () => {
      toast.success(`Presensi ${selectedEkskul?.name} tanggal ${sessionDate} berhasil disimpan!`);
      queryClient.invalidateQueries({ queryKey: ["ekskul-sessions-grades"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menyimpan presensi");
    },
  });

  // Mutation: Simpan Nilai Santri
  const saveGradeMutation = useMutation({
    mutationFn: (studentId: string) => {
      const current = localGrades[studentId];
      if (!current) throw new Error("Data nilai kosong");

      return saveGradeFn({
        data: {
          ekskulId: selectedEkskulId,
          studentId,
          semester: selectedSemester,
          academicYear: selectedYear,
          grade: current.grade,
          predicate: current.predicate as any,
          description: current.description,
        },
      });
    },
    onSuccess: () => {
      toast.success("Nilai rapor ekskul santri berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["ekskul-sessions-grades"] });
      queryClient.invalidateQueries({ queryKey: ["report-card-dinas"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menyimpan nilai rapor ekskul");
    },
  });

  // Handler tandai semua hadir
  const handleMarkAllHadir = () => {
    const updated = { ...attendanceState };
    for (const m of members) {
      updated[m.student.id] = { status: "hadir" };
    }
    setAttendanceState(updated);
    toast.info("Semua santri ditandai hadir.");
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Kegiatan & Nilai Ekstrakurikuler
            </h1>
            <p className="text-sm text-muted-foreground">
              Pencatatan presensi sesi latihan dan input nilai capaian santri untuk Seksi C Rapor Dinas.
            </p>
          </div>
        </div>

        {/* Filter Bar: Pilih Ekskul, Semester, Tahun Ajaran */}
        <Card className="border-border shadow-xs bg-muted/10">
          <CardContent className="p-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Ekskul */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Pilih Program Ekskul</Label>
                <Select value={selectedEkskulId} onValueChange={setSelectedEkskulId}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ekskuls.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.category === "wajib" ? "Wajib" : "Pilihan"})
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

        {/* Info Singkat Ekskul Terpilih */}
        {selectedEkskul && (
          <div className="p-3 rounded-lg border border-border/80 bg-card flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-bold text-[11px] px-2 py-0.5 bg-primary/10 text-primary">
                {selectedEkskul.category.toUpperCase()}
              </Badge>
              <span className="font-bold text-sm text-foreground">{selectedEkskul.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-[11px]">
              <span>Pelatih: <b>{selectedEkskul.coach_name}</b></span>
              <span>Jadwal: <b>{selectedEkskul.schedule_day}, {selectedEkskul.schedule_time}</b></span>
              <span>Lokasi: <b>{selectedEkskul.location}</b></span>
              <span>Total Santri: <b>{members.length} Orang</b></span>
            </div>
          </div>
        )}

        {/* Tabs: Presensi Sesi Latihan vs Input Nilai Rapor */}
        <Tabs defaultValue="presensi" className="space-y-4">
          <TabsList className="bg-muted/40 p-1">
            <TabsTrigger value="presensi" className="text-xs gap-1.5 font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Presensi Sesi Kegiatan (Centang Cepat)
            </TabsTrigger>
            <TabsTrigger value="nilai" className="text-xs gap-1.5 font-bold">
              <GraduationCap className="h-3.5 w-3.5" />
              Penilaian Rapor Semester (Seksi C Rapor Dinas)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PRESENSI SESI */}
          <TabsContent value="presensi" className="space-y-4">
            {/* Header Sesi */}
            <Card className="border-border shadow-xs">
              <CardHeader className="p-4 bg-muted/20 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Lembar Presensi Sesi Latihan
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Default hadir otomatis. Cukup ubah status bagi santri yang berhalangan izin, sakit, atau alpa.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5"
                      onClick={handleMarkAllHadir}
                    >
                      <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Tandai Semua Hadir
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs font-bold h-8 gap-1.5"
                      onClick={() => saveAttendanceMutation.mutate()}
                      disabled={saveAttendanceMutation.isPending || members.length === 0}
                    >
                      {saveAttendanceMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Simpan Presensi Sesi
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Atur Tanggal & Materi Sesi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-border/60">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Tanggal Kegiatan</Label>
                    <Input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Agenda / Materi Latihan</Label>
                    <Input
                      value={sessionTopic}
                      onChange={(e) => setSessionTopic(e.target.value)}
                      placeholder="Contoh: Baris-berbaris dasar, teknik shooting, perakitan sensor..."
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Daftar Santri untuk Absensi */}
                {members.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border-dashed border rounded-lg">
                    Belum ada santri yang terdaftar pada program ekskul ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 text-[11px] font-bold text-muted-foreground px-3 py-1.5 bg-muted/40 rounded">
                      <span className="col-span-1">No</span>
                      <span className="col-span-4 sm:col-span-5">Nama Santri</span>
                      <span className="col-span-2">Kelas</span>
                      <span className="col-span-5 sm:col-span-4 text-center">Status Kehadiran</span>
                    </div>

                    {members.map((m: any, idx: number) => {
                      const studentId = m.student.id;
                      const currentStatus = attendanceState[studentId]?.status || "hadir";

                      return (
                        <div
                          key={studentId}
                          className="grid grid-cols-12 items-center text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors"
                        >
                          <span className="col-span-1 font-bold text-muted-foreground">{idx + 1}</span>
                          <div className="col-span-4 sm:col-span-5">
                            <span className="font-bold text-foreground block truncate">
                              {m.student.full_name || m.student.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              NIS: {m.student.nis_nip || "-"}
                            </span>
                          </div>
                          <span className="col-span-2 text-muted-foreground font-medium">
                            {m.student.class_name || "-"}
                          </span>
                          <div className="col-span-5 sm:col-span-4 flex items-center justify-center gap-1">
                            {(["hadir", "izin", "sakit", "alpa"] as const).map((st) => {
                              const isSelected = currentStatus === st;
                              const colors = {
                                hadir: "bg-emerald-600 text-white hover:bg-emerald-700",
                                izin: "bg-blue-600 text-white hover:bg-blue-700",
                                sakit: "bg-amber-600 text-white hover:bg-amber-700",
                                alpa: "bg-rose-600 text-white hover:bg-rose-700",
                              };
                              const unselectedColors = {
                                hadir: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
                                izin: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
                                sakit: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
                                alpa: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
                              };

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() =>
                                    setAttendanceState((prev) => ({
                                      ...prev,
                                      [studentId]: {
                                        ...prev[studentId],
                                        status: st,
                                      },
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded text-[10.5px] font-bold capitalize transition-all border ${
                                    isSelected
                                      ? colors[st]
                                      : `${unselectedColors[st]} hover:opacity-80`
                                  }`}
                                >
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: INPUT NILAI RAPOR */}
          <TabsContent value="nilai" className="space-y-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="p-4 bg-muted/20 border-b border-border/60">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Penilaian Ekstrakurikuler Semester (Rapor Dinas Seksi C)
                </CardTitle>
                <CardDescription className="text-xs">
                  Nilai dan keterangan capaian ini otomatis tampil di Rapor Dinas cetak santri.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {sessionsAndGradesQuery.isLoading ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                    Memuat data santri dan kehadiran...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(sessionsAndGradesQuery.data?.studentStats || []).map((item: any, idx: number) => {
                      const studentId = item.student.id;
                      const current = localGrades[studentId] || {
                        grade: "B",
                        predicate: "Baik",
                        description: "",
                      };
                      const isSaving =
                        saveGradeMutation.isPending && saveGradeMutation.variables === studentId;

                      return (
                        <Card key={studentId} className="border-border shadow-xs overflow-hidden">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold text-xs text-muted-foreground w-6">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <h5 className="font-bold text-xs text-foreground">
                                    {item.student.full_name || item.student.name}
                                  </h5>
                                  <p className="text-[10.5px] text-muted-foreground">
                                    Kelas {item.student.class_name || "-"} • Kehadiran:{" "}
                                    <b className="text-foreground">{item.percentage}%</b> ({item.hadir} Hadir, {item.izin} Izin, {item.sakit} Sakit, {item.alpa} Alpa)
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 text-xs font-bold gap-1.5"
                                  onClick={() => saveGradeMutation.mutate(studentId)}
                                  disabled={isSaving}
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Save className="h-3.5 w-3.5" />
                                  )}
                                  Simpan Nilai
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                              {/* Pilih Nilai Huruf */}
                              <div className="space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">
                                  Nilai Huruf
                                </Label>
                                <Select
                                  value={current.grade}
                                  onValueChange={(val: any) => {
                                    const predMap: any = {
                                      A: "Sangat Baik",
                                      B: "Baik",
                                      C: "Cukup",
                                      D: "Kurang",
                                    };
                                    setLocalGrades((prev) => ({
                                      ...prev,
                                      [studentId]: {
                                        ...prev[studentId]!,
                                        grade: val,
                                        predicate: predMap[val],
                                      },
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="h-9 text-xs font-bold">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="A">A (Sangat Baik)</SelectItem>
                                    <SelectItem value="B">B (Baik)</SelectItem>
                                    <SelectItem value="C">C (Cukup)</SelectItem>
                                    <SelectItem value="D">D (Kurang)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Deskripsi Capaian Rapor */}
                              <div className="sm:col-span-3 space-y-1">
                                <Label className="text-[11px] font-semibold text-muted-foreground">
                                  Keterangan Capaian di Rapor
                                </Label>
                                <Input
                                  value={current.description}
                                  onChange={(e) =>
                                    setLocalGrades((prev) => ({
                                      ...prev,
                                      [studentId]: {
                                        ...prev[studentId]!,
                                        description: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Deskripsi pencapaian santri dalam kegiatan ekskul ini..."
                                  className="h-9 text-xs"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
