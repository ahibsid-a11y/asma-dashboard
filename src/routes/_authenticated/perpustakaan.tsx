import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  GraduationCap,
  History,
  Info,
  Layers,
  Loader2,
  LogOut,
  Radio,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
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
  getLibraryRecapFn,
  getStudentsForManualCheckInFn,
  getTodayLibraryVisitsFn,
  recordLibraryCheckInFn,
  recordLibraryCheckOutFn,
} from "@/lib/library.functions";

export const Route = createFileRoute("/_authenticated/perpustakaan")({
  head: () => ({
    meta: [
      { title: "Presensi Perpustakaan & Maktabah | SIM-AHIBS" },
      {
        name: "description",
        content: "Sistem absensi pengunjung perpustakaan pesantren via kartu RFID pintar dan absensi manual terpadu.",
      },
      { property: "og:title", content: "Presensi Perpustakaan | SIM-AHIBS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PerpustakaanPage,
});

function PerpustakaanPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchToday = useServerFn(getTodayLibraryVisitsFn);
  const fetchStudents = useServerFn(getStudentsForManualCheckInFn);
  const fetchRecap = useServerFn(getLibraryRecapFn);
  const checkInFn = useServerFn(recordLibraryCheckInFn);
  const checkOutFn = useServerFn(recordLibraryCheckOutFn);

  // States
  const [rfidInput, setRfidInput] = useState("");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualPurpose, setManualPurpose] = useState("Membaca Buku");
  const [manualNotes, setManualNotes] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const rfidInputRef = useRef<HTMLInputElement>(null);

  // Autofocus input scanner RFID saat halaman dimuat
  useEffect(() => {
    rfidInputRef.current?.focus();
  }, []);

  // 1. Data Kunjungan Hari Ini
  const todayQuery = useQuery({
    queryKey: ["today-library-visits"],
    queryFn: () => fetchToday(),
    refetchInterval: 10000, // refresh tiap 10 detik
  });

  // 2. Data Santri untuk Pilihan Manual
  const studentsQuery = useQuery({
    queryKey: ["students-library-manual"],
    queryFn: () => fetchStudents(),
  });

  // 3. Rekap Umum & Top Pembaca
  const recapQuery = useQuery({
    queryKey: ["library-recap-general"],
    queryFn: () => fetchRecap({ data: {} }),
  });

  const todayData = todayQuery.data || {
    date: new Date().toISOString().split("T")[0],
    visits: [],
    activeVisitorsCount: 0,
    totalTodayCount: 0,
    rfidCount: 0,
    manualCount: 0,
  };

  const studentList = studentsQuery.data || [];
  const topReaders = recapQuery.data?.topReaders || [];

  // Mutation: Check In
  const checkInMutation = useMutation({
    mutationFn: (payload: { rfidCard?: string; studentId?: string; purpose?: string; notes?: string }) =>
      checkInFn({ data: payload }),
    onSuccess: (res) => {
      toast.success(res.message);
      setRfidInput("");
      setIsManualModalOpen(false);
      setManualStudentId("");
      setManualNotes("");
      queryClient.invalidateQueries({ queryKey: ["today-library-visits"] });
      queryClient.invalidateQueries({ queryKey: ["library-recap-general"] });
      rfidInputRef.current?.focus();
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mencatat kunjungan perpustakaan");
      setRfidInput("");
      rfidInputRef.current?.focus();
    },
  });

  // Mutation: Check Out
  const checkOutMutation = useMutation({
    mutationFn: (visitId: string) => checkOutFn({ data: { visitId } }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["today-library-visits"] });
      queryClient.invalidateQueries({ queryKey: ["library-recap-general"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal melakukan check out");
    },
  });

  // Handler Submit Scan RFID
  const handleRfidScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfidInput.trim()) return;
    checkInMutation.mutate({
      rfidCard: rfidInput.trim(),
      purpose: "Membaca Buku",
    });
  };

  // Filter daftar santri untuk absensi manual
  const filteredStudents = studentList.filter(
    (s: any) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.nis_nip.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.class_name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Presensi & Kunjungan Perpustakaan (Maktabah)
            </h1>
            <p className="text-sm text-muted-foreground">
              Pencatatan absensi masuk perpustakaan via pemindai RFID otomatis dan opsi manual darurat.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-bold gap-1.5 border-primary/40 hover:bg-primary/10 text-primary"
              onClick={() => setIsManualModalOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Absensi Manual (Opsi Darurat)
            </Button>
          </div>
        </div>

        {/* STATISTIK RINGKASAN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pengunjung Hari Ini</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">
                  {todayData.totalTodayCount} Santri
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tercatat di sistem perpustakaan
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Sedang Berada di Perpustakaan</p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {todayData.activeVisitorsCount} Santri
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Belum check-out / membaca aktif
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Radio className="h-5 w-5 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Absensi via Kartu RFID</p>
                <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                  {todayData.rfidCount} Santri
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tap kartu RFID pintar
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Wifi className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Absensi Input Manual</p>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {todayData.manualCount} Santri
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Input petugas (saat RFID kendala)
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <History className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SCANNER RFID BOX & TOP READERS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SCAN RFID INTERFACE */}
          <Card className="lg:col-span-2 border-primary/30 shadow-sm bg-gradient-to-br from-primary/5 via-card to-card">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-primary animate-pulse" />
                  Area Pemindaian Kartu RFID Santri
                </CardTitle>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase font-extrabold tracking-wider">
                  Scanner Siaga (Ready)
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Tempelkan kartu santri RFID pada scanner USB. Nomor kartu akan otomatis dibaca dan absensi langsung tercatat.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-1 space-y-4">
              <form onSubmit={handleRfidScanSubmit} className="space-y-3">
                <div className="relative">
                  <Input
                    ref={rfidInputRef}
                    value={rfidInput}
                    onChange={(e) => setRfidInput(e.target.value)}
                    placeholder="Menunggu pemindaian kartu RFID / Masukkan NIS..."
                    className="h-12 pl-4 pr-32 text-base font-mono font-bold tracking-wider border-2 border-primary/40 focus-visible:border-primary shadow-inner bg-background"
                    autoFocus
                    disabled={checkInMutation.isPending}
                  />
                  <div className="absolute right-2 top-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8 text-xs font-bold gap-1.5"
                      disabled={!rfidInput.trim() || checkInMutation.isPending}
                    >
                      {checkInMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Catat Masuk
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span className="flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-primary" />
                    Bila RFID pembaca sedang kendala / kartu tertinggal, gunakan tombol <b>Absensi Manual</b>.
                  </span>
                  <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Sistem RFID Terhubung
                  </span>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* SANTRI TER-RAJIN MEMBACA (DUTA LITERASI) */}
          <Card className="border-border shadow-xs bg-card flex flex-col justify-between">
            <CardHeader className="p-4 bg-muted/20 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Duta Literasi Maktabah
              </CardTitle>
              <CardDescription className="text-xs">
                Santri dengan frekuensi kunjungan perpustakaan terbanyak.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 flex-1">
              {topReaders.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Belum ada data kunjungan yang tercatat.
                </div>
              ) : (
                <div className="space-y-3">
                  {topReaders.map((reader: any, index: number) => (
                    <div
                      key={reader.name}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-5 w-5 rounded-full flex items-center justify-center font-extrabold text-[10px] ${
                            index === 0
                              ? "bg-amber-400 text-amber-950"
                              : index === 1
                              ? "bg-slate-300 text-slate-900"
                              : index === 2
                              ? "bg-amber-700 text-amber-100"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-bold text-foreground block">{reader.name}</span>
                          <span className="text-[10px] text-muted-foreground">Kelas {reader.class_name}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {reader.count} Kali
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* TABEL PENGUNJUNG HARI INI */}
        <Card className="border-border shadow-xs">
          <CardHeader className="p-4 bg-muted/20 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Daftar Kunjungan Perpustakaan Hari Ini ({todayData.date})
                </CardTitle>
                <CardDescription className="text-xs">
                  Daftar santri yang hadir di perpustakaan hari ini beserta metode presensi dan status kepulangan.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {todayData.visits.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                Belum ada kunjungan santri ke perpustakaan hari ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground font-bold">
                      <th className="p-3">No</th>
                      <th className="p-3">Waktu Masuk</th>
                      <th className="p-3">Nama Santri</th>
                      <th className="p-3">Kelas & Asrama</th>
                      <th className="p-3">Metode Absen</th>
                      <th className="p-3">Keperluan</th>
                      <th className="p-3">Waktu Keluar</th>
                      <th className="p-3 text-center">Status / Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayData.visits.map((visit: any, idx: number) => {
                      const checkInTime = new Date(visit.check_in).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const checkOutTime = visit.check_out
                        ? new Date(visit.check_out).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : null;
                      const isCheckingOut =
                        checkOutMutation.isPending && checkOutMutation.variables === visit.id;

                      return (
                        <tr key={visit.id} className="border-b hover:bg-muted/10 transition-colors">
                          <td className="p-3 font-bold text-muted-foreground">{idx + 1}</td>
                          <td className="p-3 font-bold text-foreground">{checkInTime} WIB</td>
                          <td className="p-3">
                            <span className="font-bold text-foreground block">{visit.student_name}</span>
                            <span className="text-[10px] text-muted-foreground">NIS: {visit.nis_nip}</span>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            <span>{visit.class_name}</span>
                            {visit.dorm_name && (
                              <span className="block text-[10.5px] text-muted-foreground/80">
                                {visit.dorm_name}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-[9.5px] font-bold ${
                                visit.method === "rfid"
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {visit.method === "rfid" ? "Scan RFID" : "Manual Input"}
                            </Badge>
                          </td>
                          <td className="p-3 text-foreground font-medium">{visit.purpose}</td>
                          <td className="p-3 text-muted-foreground">
                            {checkOutTime ? (
                              <span className="font-semibold text-foreground">{checkOutTime} WIB</span>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                                Masih di Maktabah
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {visit.check_out ? (
                              <span className="text-[10.5px] text-muted-foreground flex items-center justify-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Selesai
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10.5px] font-bold gap-1 text-destructive hover:bg-destructive/10"
                                disabled={isCheckingOut}
                                onClick={() => checkOutMutation.mutate(visit.id)}
                              >
                                {isCheckingOut ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <LogOut className="h-3 w-3" />
                                )}
                                Check Out
                              </Button>
                            )}
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

        {/* DIALOG ABSENSI MANUAL (BILA RFID KENDALA) */}
        <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Absensi Manual Kunjungan Perpustakaan
              </DialogTitle>
              <DialogDescription className="text-xs">
                Gunakan fitur ini apabila pemindai kartu RFID sedang mengalami gangguan atau kartu santri tertinggal.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Filter Cari Santri */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cari & Pilih Santri:</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Ketik nama atau NIS santri..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-8 h-8 text-xs mb-2"
                  />
                </div>

                <Select value={manualStudentId} onValueChange={setManualStudentId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih nama santri..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {filteredStudents.slice(0, 30).map((s: any) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name} - {s.class_name} (NIS: {s.nis_nip})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Keperluan */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tujuan / Keperluan:</Label>
                <Select value={manualPurpose} onValueChange={setManualPurpose}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Membaca Buku">Membaca Buku (Literasi)</SelectItem>
                    <SelectItem value="Peminjaman / Pengembalian">Peminjaman / Pengembalian Buku</SelectItem>
                    <SelectItem value="Mengerjakan Tugas Sekolah">Mengerjakan Tugas Sekolah</SelectItem>
                    <SelectItem value="Belajar Mandiri / Diskusi">Belajar Mandiri / Diskusi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Catatan Tambahan */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Catatan Petugas (Opsional):</Label>
                <Input
                  placeholder="Misal: Kartu RFID sedang rusak"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setIsManualModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold gap-1.5"
                disabled={!manualStudentId || checkInMutation.isPending}
                onClick={() => {
                  checkInMutation.mutate({
                    studentId: manualStudentId,
                    purpose: manualPurpose,
                    notes: manualNotes,
                  });
                }}
              >
                {checkInMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Simpan Presensi Masuk
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
