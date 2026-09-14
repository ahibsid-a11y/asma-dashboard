import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Edit2,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
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
import { useCurrentProfile } from "@/hooks/use-current-profile";
import {
  deleteClassSubjectAssignment,
  getSubjectAssignmentContext,
  saveClassSubjectAssignment,
} from "@/lib/schedule.functions";

export const Route = createFileRoute("/_authenticated/manajemen-mapel")({
  head: () => ({
    meta: [
      { title: "Manajemen Mapel & Guru | SIM-AHIBS" },
      {
        name: "description",
        content: "Pengaturan mata pelajaran per kelas dan penugasan guru pengampu SIM-AHIBS.",
      },
      { property: "og:title", content: "Manajemen Mapel & Guru | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Pengaturan mata pelajaran per kelas dan penugasan guru pengampu SIM-AHIBS.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ManajemenMapelPage,
});

function ManajemenMapelPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchContext = useServerFn(getSubjectAssignmentContext);
  const saveAssignment = useServerFn(saveClassSubjectAssignment);
  const deleteAssignment = useServerFn(deleteClassSubjectAssignment);

  const [selectedClass, setSelectedClass] = useState<string>("VII A");
  const [academicYear, setAcademicYear] = useState<string>("2026/2027");

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [jpPerWeek, setJpPerWeek] = useState<number>(2);

  // Copy Dialog State
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [targetClass, setTargetClass] = useState<string>("VII B");

  const contextQuery = useQuery({
    queryKey: ["schedule-assignment-context", academicYear, selectedClass],
    queryFn: () => fetchContext({ data: { academicYear, className: selectedClass } }),
  });

  const subjects = contextQuery.data?.subjects || [];
  const classes = contextQuery.data?.classes || [];
  const teachers = contextQuery.data?.teachers || [];
  const assignments = contextQuery.data?.assignments || [];

  const saveMutation = useMutation({
    mutationFn: saveAssignment,
    onSuccess: () => {
      toast.success("Penugasan mata pelajaran berhasil disimpan!");
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["schedule-assignment-context"] });
    },
    onError: (err: any) => {
      toast.error(`Gagal menyimpan: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      toast.success("Penugasan mapel telah dihapus");
      queryClient.invalidateQueries({ queryKey: ["schedule-assignment-context"] });
    },
    onError: (err: any) => {
      toast.error(`Gagal menghapus: ${err.message}`);
    },
  });

  const resetForm = () => {
    setEditId(null);
    setSelectedSubjectId("");
    setSelectedTeacherId("");
    setJpPerWeek(2);
  };

  const handleOpenAdd = () => {
    resetForm();
    if (subjects.length > 0 && subjects[0]) {
      setSelectedSubjectId(subjects[0].id);
    }
    setDialogOpen(true);
  };

  const handleOpenEdit = (a: any) => {
    setEditId(a.id);
    setSelectedSubjectId(a.subject_id);
    setSelectedTeacherId(a.teacher_id || "");
    setJpPerWeek(a.jp_per_week || 2);
    setDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = subjects.find((s: any) => s.id === selectedSubjectId);
    if (!subject) {
      toast.error("Pilih mata pelajaran terlebih dahulu");
      return;
    }
    const teacher = teachers.find((t: any) => t.id === selectedTeacherId);

    saveMutation.mutate({
      data: {
        id: editId || undefined,
        academic_year: academicYear,
        class_name: selectedClass,
        subject_id: subject.id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_group: subject.group,
        teacher_id: teacher ? teacher.id : null,
        teacher_name: teacher ? teacher.name : null,
        jp_per_week: Number(jpPerWeek),
      },
    });
  };

  // Salin seluruh mapel kelas terpilih ke kelas lain
  const handleCopyClass = async () => {
    if (targetClass === selectedClass) {
      toast.error("Pilih kelas tujuan yang berbeda!");
      return;
    }
    if (assignments.length === 0) {
      toast.error("Kelas sumber tidak memiliki mapel yang dapat disalin.");
      return;
    }

    try {
      for (const a of assignments) {
        await saveAssignment({
          data: {
            academic_year: academicYear,
            class_name: targetClass,
            subject_id: a.subject_id,
            subject_code: a.subject_code,
            subject_name: a.subject_name,
            subject_group: a.subject_group,
            teacher_id: a.teacher_id,
            teacher_name: a.teacher_name,
            jp_per_week: a.jp_per_week,
          },
        });
      }
      toast.success(
        `Berhasil menyalin ${assignments.length} mata pelajaran ke kelas ${targetClass}!`,
      );
      setCopyDialogOpen(false);
      setSelectedClass(targetClass);
      queryClient.invalidateQueries({ queryKey: ["schedule-assignment-context"] });
    } catch (err: any) {
      toast.error(`Gagal menyalin: ${err.message}`);
    }
  };

  const totalJp = useMemo(() => {
    return assignments.reduce((acc: number, a: any) => acc + (a.jp_per_week || 0), 0);
  }, [assignments]);

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                Manajemen Akademik
              </span>
              <span className="text-xs text-muted-foreground">• Plotting Kurikulum</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Manajemen Mapel & Guru Pengampu
            </h1>
            <p className="text-sm text-muted-foreground">
              Atur daftar mata pelajaran pada setiap kelas serta tentukan guru pengampu dan alokasi
              jam tatap muka per minggu.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCopyDialogOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Copy className="h-4 w-4" />
              Salin ke Kelas Lain
            </Button>
            <Button size="sm" onClick={handleOpenAdd} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Mapel Kelas
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Mapel Kelas {selectedClass}</p>
                <p className="text-xl font-bold">{assignments.length} Mapel</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <School className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Beban Belajar per Pekan</p>
                <p className="text-xl font-bold">{totalJp} JP / Minggu</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Guru Pengampu Ditugaskan</p>
                <p className="text-xl font-bold">
                  {assignments.filter((a: any) => Boolean(a.teacher_id)).length} /{" "}
                  {assignments.length} Mapel
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card className="border-border/60">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Daftar Mata Pelajaran: Kelas {selectedClass}
              </CardTitle>
              <Badge variant="outline" className="text-xs font-normal">
                {assignments.length} Mata Pelajaran
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {contextQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="mt-2 text-xs">Memuat penugasan mapel...</p>
              </div>
            ) : assignments.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-semibold">Belum Ada Mapel di Kelas {selectedClass}</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Klik tombol "Tambah Mapel Kelas" di atas untuk menambahkan mapel pertama, atau
                  salin dari kelas lain.
                </p>
                <Button size="sm" onClick={handleOpenAdd}>
                  + Tambah Mapel Sekarang
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-y bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium w-10 text-center">No</th>
                      <th className="p-3 font-medium w-24">Kode</th>
                      <th className="p-3 font-medium">Nama Mata Pelajaran</th>
                      <th className="p-3 font-medium">Kelompok</th>
                      <th className="p-3 font-medium">Guru Pengampu</th>
                      <th className="p-3 font-medium text-center w-24">Alokasi JP</th>
                      <th className="p-3 font-medium text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {assignments.map((a: any, idx: number) => {
                      const groupBadge =
                        a.subject_group === "Diniyyah" ? (
                          <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            Diniyyah
                          </span>
                        ) : a.subject_group === "Bahasa Arab" ? (
                          <span className="rounded bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                            Bahasa Arab
                          </span>
                        ) : (
                          <span className="rounded bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                            Umum
                          </span>
                        );

                      return (
                        <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-center text-muted-foreground font-medium">
                            {idx + 1}
                          </td>
                          <td className="p-3 font-bold text-primary">{a.subject_code}</td>
                          <td className="p-3 font-semibold text-foreground">{a.subject_name}</td>
                          <td className="p-3">{groupBadge}</td>
                          <td className="p-3">
                            {a.teacher_name ? (
                              <div className="flex items-center gap-1.5 font-medium text-foreground">
                                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{a.teacher_name}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] italic text-muted-foreground">
                                Belum ditentukan
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="secondary" className="font-bold">
                              {a.jp_per_week} JP / mgg
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleOpenEdit(a)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => deleteMutation.mutate({ data: { id: a.id } })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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

        {/* Dialog Form Tambah / Edit Penugasan Mapel */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>
                  {editId ? "Edit Penugasan Mapel" : "Tambah Mapel di Kelas " + selectedClass}
                </DialogTitle>
                <DialogDescription>
                  Tentukan mata pelajaran, guru pengampu, serta alokasi JP per minggu.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                {/* Mata Pelajaran */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Pilih Mata Pelajaran:</Label>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Mapel" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.code} - {s.name} ({s.group})
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
                          {t.name} ({t.account_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Beban JP per Pekan */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Alokasi JP per Minggu (Tatap Muka):</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={jpPerWeek}
                    onChange={(e) => setJpPerWeek(Number(e.target.value))}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Umumnya 2 s/d 4 Jam Pelajaran (JP) per minggu.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Penugasan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Salin Pengaturan ke Kelas Lain */}
        <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Salin Mapel Kelas {selectedClass}</DialogTitle>
              <DialogDescription>
                Salin seluruh ({assignments.length}) mata pelajaran dari kelas{" "}
                <span className="font-semibold text-foreground">{selectedClass}</span> ke kelas
                lain untuk menghemat waktu.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <Label className="text-xs font-medium">Pilih Kelas Tujuan:</Label>
              <Select value={targetClass} onValueChange={setTargetClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classes
                    .filter((c: any) => c.name !== selectedClass)
                    .map((c: any) => (
                      <SelectItem key={c.id} value={c.name}>
                        Kelas {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleCopyClass}>Salin Sekarang</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
