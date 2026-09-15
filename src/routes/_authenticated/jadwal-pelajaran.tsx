import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo, useEffect } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Plus,
  Printer,
  School,
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
import { useCurrentProfile } from "@/hooks/use-current-profile";
import {
  deleteTimetableSlot,
  getMyTimetable,
  getTimetableContext,
  saveTimetableSlot,
} from "@/lib/schedule.functions";
import type { TimetableDay } from "@/lib/schedule.storage.server";

export const Route = createFileRoute("/_authenticated/jadwal-pelajaran")({
  head: () => ({
    meta: [
      { title: "Jadwal Pelajaran | SIM-AHIBS" },
      {
        name: "description",
        content: "Jadwal pelajaran mingguan kelas dan jadwal mengajar guru SIM-AHIBS.",
      },
      { property: "og:title", content: "Jadwal Pelajaran | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Jadwal pelajaran mingguan kelas dan jadwal mengajar guru SIM-AHIBS.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: JadwalPelajaranPage,
});

function JadwalPelajaranPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const isStudent = profile?.account_type === "santri";
  const isTeacher = profile?.account_type === "guru_mapel";
  const isAdmin =
    profile?.account_type === "super_admin" ||
    profile?.account_type === "mudir" ||
    profile?.account_type === "waka_kurikulum" ||
    profile?.account_type === "kepala_sekolah" ||
    profile?.account_type === "wali_kelas";

  const fetchContext = useServerFn(getTimetableContext);
  const fetchMySchedule = useServerFn(getMyTimetable);
  const saveSlotFn = useServerFn(saveTimetableSlot);
  const deleteSlotFn = useServerFn(deleteTimetableSlot);

  const [academicYear, setAcademicYear] = useState<string>("2026/2027");
  const [semester, setSemester] = useState<"1" | "2">("1");
  const [selectedClass, setSelectedClass] = useState<string>(
    isStudent && (profile as any)?.class ? (profile as any).class : "VII A",
  );

  // Slot Dialog
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [targetDay, setTargetDay] = useState<TimetableDay>("Senin");
  const [targetPeriod, setTargetPeriod] = useState<number>(1);
  const [timeStart, setTimeStart] = useState<string>("07:30");
  const [timeEnd, setTimeEnd] = useState<string>("08:15");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [slotRoom, setSlotRoom] = useState<string>("");
  const [slotType, setSlotType] = useState<"kbm" | "istirahat">("kbm");
  const [extraPeriods, setExtraPeriods] = useState<number[]>([]);

  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Context Query for Admin
  const contextQuery = useQuery({
    queryKey: ["timetable-context", academicYear, semester, selectedClass],
    queryFn: () =>
      fetchContext({
        data: {
          academicYear,
          semester,
          className: selectedClass,
        },
      }),
    enabled: isAdmin,
  });

  // My Schedule Query for Student / Teacher
  const myScheduleQuery = useQuery({
    queryKey: ["my-timetable", academicYear, semester],
    queryFn: () =>
      fetchMySchedule({
        data: {
          academicYear,
          semester,
        },
      }),
    enabled: !isAdmin,
  });

  const days = contextQuery.data?.days || myScheduleQuery.data?.days || [];
  const basePeriods = contextQuery.data?.periods || myScheduleQuery.data?.periods || [];
  const periods = useMemo(() => {
    const map = new Map<number, { period: number; start: string; end: string }>();
    for (const p of basePeriods) map.set(p.period, p as any);
    for (const n of extraPeriods) {
      if (!map.has(n)) map.set(n, { period: n, start: "", end: "" });
    }
    return Array.from(map.values()).sort((a, b) => a.period - b.period);
  }, [basePeriods, extraPeriods]);
  const classMissing = (myScheduleQuery.data as any)?.classMissing === true;
  const classes = contextQuery.data?.classes || [];
  const subjects = contextQuery.data?.subjects || [];
  const teachers = contextQuery.data?.teachers || [];
  const assignments = contextQuery.data?.assignments || [];

  // Active slots to render in grid
  const slots = isAdmin
    ? contextQuery.data?.slots || []
    : myScheduleQuery.data?.slots || [];

  const saveMutation = useMutation({
    mutationFn: saveSlotFn,
    onSuccess: (res) => {
      if (res.conflict) {
        toast.error(res.message, { duration: 6000 });
      } else {
        toast.success("Jadwal pelajaran berhasil disimpan!");
        setSlotDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["timetable-context"] });
        queryClient.invalidateQueries({ queryKey: ["my-timetable"] });
      }
    },
    onError: (err: any) => {
      toast.error(`Gagal menyimpan jadwal: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSlotFn,
    onSuccess: () => {
      toast.success("Slot jadwal telah dikosongkan");
      setSlotDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["timetable-context"] });
      queryClient.invalidateQueries({ queryKey: ["my-timetable"] });
    },
    onError: (err: any) => {
      toast.error(`Gagal menghapus: ${err.message}`);
    },
  });

  // Pastikan kelas terpilih benar-benar ada pada data master kelas
  useEffect(() => {
    if (!isAdmin || classes.length === 0) return;
    if (!classes.some((c: any) => c.name === selectedClass)) {
      setSelectedClass(classes[0].name);
    }
  }, [isAdmin, classes, selectedClass]);

  const handleOpenSlot = (day: TimetableDay, periodObj: any) => {
    if (!isAdmin) return; // Only admin/curriculum can edit
    setTargetDay(day);
    setTargetPeriod(periodObj.period);
    setTimeStart(periodObj.start || "");
    setTimeEnd(periodObj.end || "");

    // Check if slot already exists
    const existing = slots.find((s: any) => s.day === day && s.period === periodObj.period);
    if (existing) {
      setSlotType(((existing as any).slot_type as "kbm" | "istirahat") || "kbm");
      setSelectedSubjectId(existing.subject_id);
      setSelectedTeacherId(existing.teacher_id || "");
      setSlotRoom(existing.room || "");
    } else {
      setSlotType("kbm");
      setSelectedSubjectId(subjects[0]?.id || "");
      setSelectedTeacherId("");
      setSlotRoom("");
    }
    setSlotDialogOpen(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();

    if (slotType === "istirahat") {
      if (!timeStart || !timeEnd) {
        toast.error("Isi jam mulai dan jam selesai istirahat");
        return;
      }
      saveMutation.mutate({
        data: {
          academic_year: academicYear,
          semester,
          class_name: selectedClass,
          day: targetDay,
          period: targetPeriod,
          time_start: timeStart,
          time_end: timeEnd,
          slot_type: "istirahat",
          subject_id: "istirahat",
          subject_code: "IST",
          subject_name: "Istirahat",
          teacher_id: null,
          teacher_name: null,
          room: slotRoom || null,
        },
      });
      return;
    }

    const subject = subjects.find((s: any) => s.id === selectedSubjectId);
    if (!subject) {
      toast.error("Pilih mata pelajaran terlebih dahulu");
      return;
    }
    if (!timeStart || !timeEnd) {
      toast.error("Isi jam mulai dan jam selesai");
      return;
    }
    const teacher = teachers.find((t: any) => t.id === selectedTeacherId);

    saveMutation.mutate({
      data: {
        academic_year: academicYear,
        semester,
        class_name: selectedClass,
        day: targetDay,
        period: targetPeriod,
        time_start: timeStart,
        time_end: timeEnd,
        slot_type: "kbm",
        subject_id: subject.id,
        subject_code: subject.code,
        subject_name: subject.name,
        teacher_id: teacher ? teacher.id : null,
        teacher_name: teacher ? teacher.name : null,
        room: slotRoom || null,
      },
    });
  };

  const currentExistingSlot = useMemo(() => {
    return slots.find((s: any) => s.day === targetDay && s.period === targetPeriod);
  }, [slots, targetDay, targetPeriod]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                Pendidikan SIM-AHIBS
              </span>
              <span className="text-xs text-muted-foreground">
                • {isStudent ? "Jadwal Kelas Saya" : isTeacher ? "Jadwal Mengajar Saya" : "Manajemen Jadwal"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {isStudent
                ? `Jadwal Pelajaran Kelas ${(profile as any)?.class || selectedClass}`
                : isTeacher && !isAdmin
                  ? "Jadwal Mengajar Pribadi"
                  : `Jadwal Pelajaran Kelas ${selectedClass}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Atur jadwal pelajaran mingguan per kelas. Klik pada slot untuk menetapkan mapel & guru pengampu (dilengkapi deteksi bentrok otomatis)."
                : "Jadwal kegiatan belajar mengajar (KBM) mingguan santri dan asatidzah."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrintModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Cetak Jadwal
            </Button>
          </div>
        </div>

        {/* Filter Bar (for Admin / Teacher) */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {isAdmin && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Pilih Kelas:</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c: any) => (
                        <SelectItem key={c.id} value={c.name}>
                          Kelas {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Semester:</Label>
                <Select value={semester} onValueChange={(v) => setSemester(v as "1" | "2")}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester I (Gasal)</SelectItem>
                    <SelectItem value="2">Semester II (Genap)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Tahun Ajaran:</Label>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026/2027">2026/2027</SelectItem>
                    <SelectItem value="2025/2026">2025/2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timetable Grid */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="p-4 pb-2 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Matriks Jadwal Belajar Mingguan ({selectedClass})
                </CardTitle>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-muted-foreground italic md:inline">
                    * Klik slot untuk mengisi mapel atau istirahat
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next =
                        periods.reduce((max, p) => (p.period > max ? p.period : max), 0) + 1;
                      if (next > 24) {
                        toast.error("Maksimal 24 jam pelajaran per hari");
                        return;
                      }
                      setExtraPeriods((prev) => [...prev, next]);
                      toast.success(`Jam ke-${next} ditambahkan. Klik slotnya untuk mengisi.`);
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Tambah Jam ke-
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[760px]">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-3 w-28 text-center border-r font-semibold">Jam / Waktu</th>
                  {days.map((day) => (
                    <th key={day} className="p-3 text-center border-r font-semibold">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {periods.map((p) => (
                  <tr key={p.period} className="hover:bg-muted/10 transition-colors">
                    {/* Period header column */}
                    <td className="p-2.5 text-center border-r bg-muted/20 font-medium">
                      <span className="font-bold text-foreground">Jam ke-{p.period}</span>
                      <p className="text-[10px] text-muted-foreground">
                        {p.start} - {p.end}
                      </p>
                    </td>

                    {/* Day columns */}
                    {days.map((day) => {
                      const slot = slots.find(
                        (s: any) => s.day === day && s.period === p.period,
                      );

                      return (
                        <td
                          key={day}
                          onClick={() => handleOpenSlot(day, p)}
                          className={`p-2 border-r align-top transition-all ${
                            isAdmin ? "cursor-pointer hover:bg-primary/5" : ""
                          }`}
                        >
                          {slot && (slot as any).slot_type === "istirahat" ? (
                            <div className="flex h-14 items-center justify-center rounded-md border border-dashed border-amber-400/70 bg-amber-50 p-2 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                              ☕ Istirahat
                            </div>
                          ) : slot ? (
                            <div className="rounded-md border border-border/80 bg-card p-2 shadow-2xs space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 font-bold border-primary/40 text-primary"
                                >
                                  {slot.subject_code}
                                </Badge>
                                {slot.room && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {slot.room}
                                  </span>
                                )}
                              </div>
                              <p className="font-bold text-[11px] text-foreground leading-tight line-clamp-2">
                                {slot.subject_name}
                              </p>
                              {slot.teacher_name && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                                  👤 {slot.teacher_name}
                                </p>
                              )}
                              {!isStudent && slot.class_name && (
                                <p className="text-[10px] font-semibold text-sky-600">
                                  Kelas {slot.class_name}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="h-14 flex items-center justify-center rounded border border-dashed border-border/40 text-muted-foreground/50 text-[11px]">
                              {isAdmin ? <Plus className="h-3.5 w-3.5" /> : "-"}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Dialog Slot Editor (For Admin) */}
        <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSaveSlot}>
              <DialogHeader>
                <DialogTitle>
                  Slot Jadwal: {targetDay} (Jam ke-{targetPeriod})
                </DialogTitle>
                <DialogDescription>
                  Kelas: <span className="font-semibold text-foreground">{selectedClass}</span> •
                  Waktu: {timeStart} - {timeEnd}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                {/* Jenis Slot */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Jenis Slot:</Label>
                  <Select
                    value={slotType}
                    onValueChange={(v) => setSlotType(v as "kbm" | "istirahat")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kbm">Mata Pelajaran</SelectItem>
                      <SelectItem value="istirahat">Istirahat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Waktu Jam */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Jam Mulai:</Label>
                    <Input
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Jam Selesai:</Label>
                    <Input value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} required />
                  </div>
                </div>

                {/* Mata Pelajaran */}
                <div className={slotType === "istirahat" ? "hidden" : "space-y-1.5"}>
                  <Label className="text-xs font-medium">Pilih Mata Pelajaran:</Label>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Mapel" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.code} - {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Guru Pengampu */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Guru Pengampu:</Label>
                  <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Guru Pengampu (Opsional)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="">-- Belum Ditentukan --</SelectItem>
                      {teachers.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Sistem akan memverifikasi agar tidak ada guru yang bentrok jadwal di kelas lain.
                  </p>
                </div>

                {/* Ruangan */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Ruang Kelas / Lab (Opsional):</Label>
                  <Input
                    placeholder="Contoh: R. VII A / Lab Komputer"
                    value={slotRoom}
                    onChange={(e) => setSlotRoom(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between">
                {currentExistingSlot ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() =>
                      deleteMutation.mutate({ data: { id: currentExistingSlot.id } })
                    }
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Kosongkan Slot
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setSlotDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan Slot
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Cetak Jadwal Pelajaran */}
        <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Pratinjau Cetak Jadwal Pelajaran</span>
                <Button size="sm" onClick={handlePrint} className="print:hidden">
                  <Printer className="mr-1.5 h-4 w-4" /> Cetak Jadwal
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 rounded-md border p-6 bg-white text-black font-sans text-xs">
              {/* Kop Sekolah */}
              <div className="border-b-2 border-black pb-3 text-center">
                <h2 className="text-base font-bold uppercase tracking-wider">
                  SMPIT PUTRA AL-HANIF (AHIBS)
                </h2>
                <h3 className="text-sm font-semibold">
                  JADWAL PELAJARAN KELAS {selectedClass.toUpperCase()}
                </h3>
                <p className="text-[11px] text-gray-600">
                  Tahun Ajaran {academicYear} • Semester {semester === "1" ? "Gasal" : "Genap"}
                </p>
              </div>

              {/* Tabel Jadwal Cetak */}
              <table className="w-full border-collapse border border-gray-400 text-left text-[10px]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 p-2 w-20 text-center font-bold">Waktu</th>
                    {days.map((day) => (
                      <th key={day} className="border border-gray-400 p-2 text-center font-bold">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.period}>
                      <td className="border border-gray-400 p-1.5 text-center font-medium bg-gray-50">
                        {p.start}-{p.end}
                      </td>
                      {days.map((day) => {
                        const slot = slots.find((s: any) => s.day === day && s.period === p.period);
                        return (
                          <td key={day} className="border border-gray-400 p-1.5 align-top">
                            {slot ? (
                              <div>
                                <p className="font-bold">{slot.subject_name}</p>
                                {slot.teacher_name && (
                                  <p className="text-[9px] text-gray-600">({slot.teacher_name})</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="pt-8 grid grid-cols-2 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-semibold">Kepala Sekolah SMPIT</p>
                  <div className="h-16" />
                  <p className="border-t border-dashed w-40 mx-auto pt-1">( ........................... )</p>
                </div>
                <div>
                  <p>Cilegon, {new Date().toLocaleDateString("id-ID")}</p>
                  <p className="font-semibold">Waka Kurikulum</p>
                  <div className="h-16" />
                  <p className="border-t border-dashed w-40 mx-auto pt-1">( ........................... )</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
