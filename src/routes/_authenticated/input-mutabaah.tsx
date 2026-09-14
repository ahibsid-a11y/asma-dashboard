import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Loader2,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCurrentProfile } from "@/hooks/use-current-profile";
import {
  getMutabaahSheet,
  manageMutabaahActivity,
  saveMutabaahChecklist,
  type MutabaahActivity,
} from "@/lib/mutabaah.functions";

export const Route = createFileRoute("/_authenticated/input-mutabaah")({
  head: () => ({
    meta: [
      { title: "Input Mutaba'ah Harian | SIM-AHIBS" },
      {
        name: "description",
        content: "Pencatatan mutaba'ah amal yaumi santri AHIBS oleh musyrif asrama dan admin.",
      },
      { property: "og:title", content: "Input Mutaba'ah Harian | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Pencatatan mutaba'ah amal yaumi santri AHIBS oleh musyrif asrama dan admin.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: InputMutabaahPage,
});

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function InputMutabaahPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchSheet = useServerFn(getMutabaahSheet);
  const saveChecklist = useServerFn(saveMutabaahChecklist);
  const manageActivity = useServerFn(manageMutabaahActivity);

  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedDorm, setSelectedDorm] = useState<string>("");

  // Dialog kelola kegiatan
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityCategory, setNewActivityCategory] = useState("Ibadah");

  // Dialog catatan uzur/sakit
  const [notesTarget, setNotesTarget] = useState<{
    studentId: string;
    studentName: string;
    activityId: string;
    activityTitle: string;
    currentNote: string;
  } | null>(null);
  const [tempNote, setTempNote] = useState("");

  const sheetQuery = useQuery({
    queryKey: ["mutabaah-sheet", selectedDate, selectedDorm],
    queryFn: () => fetchSheet({ data: { date: selectedDate, dorm: selectedDorm || undefined } }),
  });

  const sheet = sheetQuery.data;
  const students = sheet?.students ?? [];
  const activities = sheet?.activities ?? [];
  const records = sheet?.records ?? {};
  const currentDorm = sheet?.selectedDorm ?? selectedDorm;

  // Mutasi simpan checklist
  const checkMutation = useMutation({
    mutationFn: (updates: { student_id: string; activity_id: string; status: boolean; notes?: string | null }[]) =>
      saveChecklist({ data: { date: selectedDate, updates } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mutabaah-sheet", selectedDate] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menyimpan checklist");
    },
  });

  // Mutasi kelola kegiatan
  const activityMutation = useMutation({
    mutationFn: (payload: { action: "create" | "update" | "delete" | "toggle"; id?: string; title?: string; category?: string }) =>
      manageActivity({ data: payload }),
    onSuccess: () => {
      toast.success("Daftar kegiatan diperbarui");
      setNewActivityTitle("");
      queryClient.invalidateQueries({ queryKey: ["mutabaah-sheet"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal mengelola kegiatan");
    },
  });

  // Navigasi tanggal
  const stepDate = (offset: number) => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + offset);
    setSelectedDate(toDateStr(d));
  };

  // Toggle single cell
  const handleToggle = (studentId: string, activityId: string, currentStatus: boolean) => {
    checkMutation.mutate([
      {
        student_id: studentId,
        activity_id: activityId,
        status: !currentStatus,
      },
    ]);
  };

  // Centang semua kegiatan untuk 1 santri
  const handleCheckAllForStudent = (studentId: string) => {
    const updates = activities.map((act) => ({
      student_id: studentId,
      activity_id: act.id,
      status: true,
    }));
    checkMutation.mutate(updates);
    toast.success("Semua kegiatan santri berhasil dicentang");
  };

  // Reset semua kegiatan untuk 1 santri
  const handleResetForStudent = (studentId: string) => {
    const updates = activities.map((act) => ({
      student_id: studentId,
      activity_id: act.id,
      status: false,
    }));
    checkMutation.mutate(updates);
    toast.success("Checklist santri dikosongkan");
  };

  // Centang semua santri untuk 1 kegiatan
  const handleCheckAllForActivity = (activityId: string) => {
    const updates = students.map((s: any) => ({
      student_id: s.id,
      activity_id: activityId,
      status: true,
    }));
    checkMutation.mutate(updates);
    toast.success("Kegiatan dicentang untuk seluruh santri kamar ini");
  };

  // Simpan catatan uzur / sakit
  const handleSaveNote = () => {
    if (!notesTarget) return;
    checkMutation.mutate(
      [
        {
          student_id: notesTarget.studentId,
          activity_id: notesTarget.activityId,
          status: false,
          notes: tempNote.trim() || null,
        },
      ],
      {
        onSuccess: () => {
          toast.success("Keterangan berhasil disimpan");
          setNotesTarget(null);
          setTempNote("");
        },
      },
    );
  };

  // Statistik ringkas kamar hari ini
  const stats = useMemo(() => {
    const totalPossible = students.length * activities.length;
    let totalChecked = 0;
    for (const s of students) {
      for (const act of activities) {
        if (records[`${s.id}_${act.id}`]?.status) totalChecked += 1;
      }
    }
    const pct = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;
    return { totalPossible, totalChecked, pct };
  }, [students, activities, records]);

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header Halaman */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Kesantrian</p>
              <Badge variant="outline" className="text-[10px] font-semibold">Amal Yaumi</Badge>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-foreground">Input Mutaba'ah Harian</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Pencatatan 24 amalan yaumi harian santri oleh musyrif asrama dan admin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sheet?.canManageActivities && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActivityDialogOpen(true)}
                className="font-medium"
              >
                <Settings2 className="size-4" /> Kelola Kegiatan
              </Button>
            )}
          </div>
        </div>

        {/* Filter Bar: Tanggal & Kamar Asrama */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Navigasi Tanggal */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg border border-border bg-background p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => stepDate(-1)}
                    title="Hari Sebelumnya"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2.5 text-xs font-semibold"
                    onClick={() => setSelectedDate(todayStr)}
                  >
                    Hari Ini
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => stepDate(1)}
                    title="Hari Berikutnya"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>

                <div className="relative">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-10 w-44 text-sm font-medium"
                  />
                </div>

                <p className="hidden text-sm font-semibold capitalize text-foreground sm:block">
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Pemilih Asrama / Kamar */}
              <div className="flex items-center gap-3">
                <Label htmlFor="dorm-select" className="text-xs font-semibold text-muted-foreground sm:text-sm">
                  Kamar / Asrama:
                </Label>
                {sheet?.canChangeDorm ? (
                  <Select
                    value={currentDorm || ""}
                    onValueChange={(val) => setSelectedDorm(val)}
                  >
                    <SelectTrigger id="dorm-select" className="h-10 w-44 font-semibold">
                      <SelectValue placeholder="Pilih Kamar" />
                    </SelectTrigger>
                    <SelectContent>
                      {(sheet?.availableDorms ?? []).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="px-3 py-1.5 text-xs font-bold">
                    {currentDorm || "Kamar Anda"}
                  </Badge>
                )}
              </div>
            </div>

            {/* Statistik Capaian Kamar Hari Ini */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  Total Santri: <strong className="text-foreground">{students.length} orang</strong>
                </span>
                <span>
                  Total Amalan Terceklis: <strong className="text-foreground">{stats.totalChecked} / {stats.totalPossible}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span>Kepatuhan Kamar:</span>
                <span className={`font-bold ${stats.pct >= 80 ? "text-emerald-600" : stats.pct >= 50 ? "text-accent" : "text-destructive"}`}>
                  {stats.pct}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabel Matriks Ceklis Santri vs 24 Kegiatan */}
        {sheetQuery.isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            <span>Memuat lembar mutaba'ah santri...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
            <UserCheck className="mx-auto size-10 text-muted-foreground/60" />
            <p className="mt-3 font-bold text-foreground">Tidak ada santri di kamar ini</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pastikan santri telah diatur asrama/kamarnya pada menu Manajemen Anggota.
            </p>
          </div>
        ) : (
          <Card className="overflow-hidden border-border shadow-sm">
            <div className="relative overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* Header Tabel */}
                <thead className="sticky top-0 z-20 border-b border-border bg-muted/90 backdrop-blur-md">
                  <tr>
                    <th className="sticky left-0 z-30 min-w-[190px] border-r border-border bg-muted/95 p-3 text-left font-bold text-foreground shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                      Santri
                    </th>
                    <th className="min-w-[70px] border-r border-border p-2 text-center font-bold text-foreground">
                      Aksi
                    </th>
                    {activities.map((act, idx) => (
                      <th
                        key={act.id}
                        className="min-w-[130px] max-w-[150px] border-r border-border p-2 text-center font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        <div className="flex flex-col items-center justify-between gap-1">
                          <span className="line-clamp-2 text-center text-[11px] leading-snug" title={act.title}>
                            {idx + 1}. {act.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCheckAllForActivity(act.id)}
                            className="mt-1 rounded bg-background/80 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground shadow-xs hover:bg-primary/10 hover:text-primary"
                            title="Centang semua santri untuk kegiatan ini"
                          >
                            + Semua
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Body Tabel */}
                <tbody className="divide-y divide-border">
                  {students.map((st: any) => {
                    // Hitung jumlah terceklis santri ini
                    const stChecked = activities.filter((act) => records[`${st.id}_${act.id}`]?.status).length;
                    const stPct = activities.length > 0 ? Math.round((stChecked / activities.length) * 100) : 0;

                    return (
                      <tr key={st.id} className="transition-colors hover:bg-muted/40">
                        {/* Kolom Nama Santri (Sticky Kiri) */}
                        <td className="sticky left-0 z-10 border-r border-border bg-card p-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                          <div className="font-semibold text-foreground">{st.name}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            {st.display_name && st.display_name !== st.name && (
                              <span className="text-accent font-medium">{st.display_name}</span>
                            )}
                            {st.nis_nip && <span>· {st.nis_nip}</span>}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                            <span className="font-mono text-muted-foreground">{stChecked}/{activities.length}</span>
                            <span className={`font-bold ${stPct >= 80 ? "text-emerald-600" : stPct >= 50 ? "text-accent" : "text-destructive"}`}>
                              ({stPct}%)
                            </span>
                          </div>
                        </td>

                        {/* Kolom Aksi Cepat per Santri */}
                        <td className="border-r border-border p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCheckAllForStudent(st.id)}
                              className="rounded p-1 text-muted-foreground hover:bg-emerald-500/15 hover:text-emerald-600"
                              title="Centang Semua Kegiatan Santri Ini"
                            >
                              <CheckCheck className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetForStudent(st.id)}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                              title="Kosongkan Checklist Santri Ini"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Sel Ceklis 24 Kegiatan */}
                        {activities.map((act) => {
                          const recordKey = `${st.id}_${act.id}`;
                          const rec = records[recordKey];
                          const isChecked = Boolean(rec?.status);
                          const note = rec?.notes;

                          return (
                            <td
                              key={act.id}
                              className={`border-r border-border p-2 text-center transition-colors ${
                                isChecked ? "bg-emerald-500/5" : note ? "bg-amber-500/5" : ""
                              }`}
                            >
                              <div className="flex flex-col items-center justify-center gap-1">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => handleToggle(st.id, act.id, isChecked)}
                                  aria-label={`${st.name} - ${act.title}`}
                                  className="size-5 transition-transform active:scale-95"
                                />

                                {note ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNotesTarget({
                                        studentId: st.id,
                                        studentName: st.name,
                                        activityId: act.id,
                                        activityTitle: act.title,
                                        currentNote: note,
                                      });
                                      setTempNote(note);
                                    }}
                                    className="max-w-[100px] truncate rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-semibold text-amber-700 hover:underline"
                                    title={note}
                                  >
                                    {note}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNotesTarget({
                                        studentId: st.id,
                                        studentName: st.name,
                                        activityId: act.id,
                                        activityTitle: act.title,
                                        currentNote: "",
                                      });
                                      setTempNote("");
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-[9px] text-muted-foreground hover:text-foreground"
                                    title="Tambah catatan uzur/sakit"
                                  >
                                    + note
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Dialog Catatan Uzur / Sakit */}
        <Dialog open={notesTarget !== null} onOpenChange={(o) => !o && setNotesTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-4 text-accent" />
                Catatan Uzur / Sakit
              </DialogTitle>
              <DialogDescription>
                {notesTarget?.studentName} — {notesTarget?.activityTitle}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Label>Keterangan Halangan</Label>
              <Input
                placeholder="Contoh: Sakit demam, Izin pulang, Uzur syar'i"
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                autoFocus
              />
              <div className="flex flex-wrap gap-2 text-xs">
                {["Sakit", "Izin Kepulangan", "Uzur Syar'i", "Piket Khusus"].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setTempNote(quick)}
                    className="rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-medium hover:bg-muted"
                  >
                    {quick}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNotesTarget(null)}>
                Batal
              </Button>
              <Button onClick={handleSaveNote} disabled={checkMutation.isPending}>
                Simpan Keterangan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Kelola Daftar Kegiatan Mutaba'ah (Khusus Admin) */}
        <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="size-5 text-accent" />
                Kelola Daftar Kegiatan Mutaba'ah
              </DialogTitle>
              <DialogDescription>
                Tambah, atur urutan, atau nonaktifkan kegiatan yang diceklis musyrif setiap hari.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Form Tambah Kegiatan Baru */}
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-3">
                <p className="text-xs font-bold text-foreground">Tambah Kegiatan Baru</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                  <Input
                    placeholder="Contoh: Qiyamul Lail / Witir"
                    value={newActivityTitle}
                    onChange={(e) => setNewActivityTitle(e.target.value)}
                  />
                  <Select value={newActivityCategory} onValueChange={setNewActivityCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ibadah">Ibadah</SelectItem>
                      <SelectItem value="Tahfiz">Tahfiz</SelectItem>
                      <SelectItem value="Kedisiplinan">Kedisiplinan</SelectItem>
                      <SelectItem value="Bahasa">Bahasa</SelectItem>
                      <SelectItem value="Akademik">Akademik</SelectItem>
                      <SelectItem value="Akhlak">Akhlak</SelectItem>
                      <SelectItem value="Sunnah">Sunnah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  disabled={!newActivityTitle.trim() || activityMutation.isPending}
                  onClick={() =>
                    activityMutation.mutate({
                      action: "create",
                      title: newActivityTitle.trim(),
                      category: newActivityCategory,
                    })
                  }
                  className="w-full font-bold sm:w-auto"
                >
                  <Plus className="size-4" /> Tambah ke Daftar
                </Button>
              </div>

              {/* Daftar Kegiatan yang Ada */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-foreground">Daftar Kegiatan Aktif ({activities.length})</p>
                <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
                  {activities.map((act, index) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-[10px] text-muted-foreground">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{act.title}</p>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {act.category}
                          </Badge>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:bg-destructive/10"
                        title="Nonaktifkan kegiatan"
                        onClick={() => {
                          if (confirm(`Hapus/nonaktifkan kegiatan "${act.title}"? Riwayat lama tetap tersimpan.`)) {
                            activityMutation.mutate({ action: "delete", id: act.id });
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setActivityDialogOpen(false)}>Selesai</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
