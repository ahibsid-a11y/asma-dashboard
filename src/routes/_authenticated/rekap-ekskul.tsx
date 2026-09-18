import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Activity,
  Award,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Loader2,
  Search,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useCurrentProfile } from "@/hooks/use-current-profile";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  approveStudentEnrollmentFn,
  getEkskulPaymentsFn,
  getEkskulRecapDataFn,
  getMasterEkskulListFn,
  updateEkskulPaymentStatusFn,
} from "@/lib/ekskul.functions";

export const Route = createFileRoute("/_authenticated/rekap-ekskul")({
  head: () => ({
    meta: [
      { title: "Rekap Ekstrakurikuler | SIM-AHIBS" },
      {
        name: "description",
        content: "Rekapitulasi lengkap kegiatan ekstrakurikuler, presensi santri, status pembayaran iuran, dan nilai rapor.",
      },
      { property: "og:title", content: "Rekap Ekstrakurikuler | SIM-AHIBS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RekapEkskulPage,
});

function RekapEkskulPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchRecap = useServerFn(getEkskulRecapDataFn);
  const fetchPayments = useServerFn(getEkskulPaymentsFn);
  const updatePaymentStatus = useServerFn(updateEkskulPaymentStatusFn);
  const approveEnrollmentFn = useServerFn(approveStudentEnrollmentFn);

  const [selectedSemester, setSelectedSemester] = useState<string>("1");
  const [selectedYear, setSelectedYear] = useState<string>("2026/2027");
  const [paymentFilterStatus, setPaymentFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEkskulForMembers, setSelectedEkskulForMembers] = useState<any | null>(null);

  // 1. Ambil Rekap Utama
  const recapQuery = useQuery({
    queryKey: ["ekskul-recap-main", selectedSemester, selectedYear],
    queryFn: () =>
      fetchRecap({
        data: { semester: selectedSemester, academicYear: selectedYear },
      }),
  });

  // 2. Ambil Rekap Pembayaran Keuangan
  const paymentsQuery = useQuery({
    queryKey: ["ekskul-payments-recap", selectedSemester, selectedYear],
    queryFn: () =>
      fetchPayments({
        data: { semester: selectedSemester, academicYear: selectedYear },
      }),
  });

  const ekskulStats = recapQuery.data?.ekskulStats || [];
  const paymentList = paymentsQuery.data?.payments || [];
  const paymentSummary = paymentsQuery.data?.summary || {
    totalBilled: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    paidCount: 0,
    unpaidCount: 0,
  };

  // Mutation Update Status Pembayaran (Tandai Lunas)
  const markPaymentMutation = useMutation({
    mutationFn: (data: { paymentId: string; status: "lunas" | "belum_bayar" }) =>
      updatePaymentStatus({
        data: {
          paymentId: data.paymentId,
          status: data.status,
          payment_method: "tunai",
          notes: "Dikonfirmasi oleh bagian keuangan / admin",
        },
      }),
    onSuccess: () => {
      toast.success("Status pembayaran berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["ekskul-payments-recap"] });
      queryClient.invalidateQueries({ queryKey: ["ekskul-recap-main"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mengubah status pembayaran");
    },
  });

  // Mutation Approve Keikutsertaan Santri
  const approveEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId: string) =>
      approveEnrollmentFn({
        data: { enrollmentId },
      }),
    onSuccess: () => {
      toast.success("Keikutsertaan santri berhasil disetujui & pembayaran ditandai lunas!");
      queryClient.invalidateQueries({ queryKey: ["ekskul-recap-main"] });
      queryClient.invalidateQueries({ queryKey: ["ekskul-payments-recap"] });
      // Update selectedEkskulForMembers bila sedang terbuka
      if (selectedEkskulForMembers) {
        setSelectedEkskulForMembers((prev: any) => {
          if (!prev) return null;
          return {
            ...prev,
            members: prev.members.map((m: any) =>
              m.enrollmentId === approveEnrollmentMutation.variables
                ? {
                    ...m,
                    enrollmentStatus: "aktif",
                    payment: m.payment ? { ...m.payment, status: "lunas" } : null,
                  }
                : m
            ),
          };
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menyetujui keikutsertaan");
    },
  });

  const filteredPayments = paymentList.filter((item: any) => {
    const p = item.payment;
    const s = item.student;
    const e = item.ekskul;

    const matchSearch =
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.period_label?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus =
      paymentFilterStatus === "all" || p.status === paymentFilterStatus;

    return matchSearch && matchStatus;
  });

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Rekapitulasi Ekstrakurikuler
            </h1>
            <p className="text-sm text-muted-foreground">
              Laporan terpadu presensi kegiatan, pembayaran iuran kas ekskul, dan nilai capaian santri.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="h-8 text-xs font-medium w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Semester 1 (Ganjil)</SelectItem>
                <SelectItem value="2">Semester 2 (Genap)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 text-xs font-medium w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025/2026">2025/2026</SelectItem>
                <SelectItem value="2026/2027">2026/2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ringkasan Statistik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Program Ekskul</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">
                  {recapQuery.data?.totalEkskuls || 0}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {recapQuery.data?.activeEkskuls || 0} Aktif Berjalan
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Tagihan Iuran</p>
                <h3 className="text-xl font-black text-foreground mt-0.5">
                  Rp {paymentSummary.totalBilled.toLocaleString("id-ID")}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Seluruh ekskul pilihan
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Iuran Terbayar (Lunas)</p>
                <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Rp {paymentSummary.totalPaid.toLocaleString("id-ID")}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {paymentSummary.paidCount} Transaksi lunas
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Sisa Piutang / Tunggakan</p>
                <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  Rp {paymentSummary.totalUnpaid.toLocaleString("id-ID")}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {paymentSummary.unpaidCount} Santri belum bayar
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Coins className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Rekap per Program vs Rekap Pembayaran */}
        <Tabs defaultValue="program" className="space-y-4">
          <TabsList className="bg-muted/40 p-1">
            <TabsTrigger value="program" className="text-xs gap-1.5 font-bold">
              <Activity className="h-3.5 w-3.5" />
              Rekap per Program Kegiatan
            </TabsTrigger>
            <TabsTrigger value="pembayaran" className="text-xs gap-1.5 font-bold">
              <Coins className="h-3.5 w-3.5" />
              Rekap Pembayaran & Tagihan Santri
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: REKAP PER PROGRAM EKSKUL */}
          <TabsContent value="program" className="space-y-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="p-4 bg-muted/20 border-b border-border/60">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Statistik & Rekapitulasi Program Ekstrakurikuler
                </CardTitle>
                <CardDescription className="text-xs">
                  Ringkasan santri terdaftar, sesi latihan tercatat, santri dinilai, dan arus keuangan per ekskul.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/30 text-muted-foreground font-bold">
                        <th className="p-3">No</th>
                        <th className="p-3">Nama Ekskul</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Pelatih / Pembina</th>
                        <th className="p-3 text-center">Santri Aktif</th>
                        <th className="p-3 text-center">Sesi Terlaksana</th>
                        <th className="p-3 text-center">Santri Dinilai</th>
                        <th className="p-3 text-right">Kas Masuk (Lunas)</th>
                        <th className="p-3 text-right">Tunggakan</th>
                        <th className="p-3 text-center">Rekap Santri & Approval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ekskulStats.map((item: any, idx: number) => {
                        const e = item.ekskul;
                        const isWajib = e.category === "wajib";
                        const pendingCount = item.totalPending || 0;

                        return (
                          <tr
                            key={e.id}
                            className="border-b hover:bg-muted/10 transition-colors"
                          >
                            <td className="p-3 font-bold text-muted-foreground">{idx + 1}</td>
                            <td className="p-3 font-bold text-foreground">
                              {e.name}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  isWajib
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : "bg-blue-100 text-blue-800 border-blue-300"
                                }`}
                              >
                                {isWajib ? "Wajib" : "Pilihan"}
                              </Badge>
                            </td>
                            <td className="p-3 text-foreground font-medium">{e.coach_name}</td>
                            <td className="p-3 text-center font-bold text-foreground">
                              {item.totalMembers} Orang
                            </td>
                            <td className="p-3 text-center font-bold text-foreground">
                              {item.totalSessions} Sesi
                            </td>
                            <td className="p-3 text-center font-bold text-foreground">
                              {item.totalGrades} Santri
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-600">
                              {isWajib
                                ? "-"
                                : `Rp ${item.finance.totalPaid.toLocaleString("id-ID")}`}
                            </td>
                            <td className="p-3 text-right font-bold text-amber-600">
                              {isWajib || item.finance.unpaid === 0
                                ? "-"
                                : `Rp ${item.finance.unpaid.toLocaleString("id-ID")}`}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] font-bold gap-1.5 border-primary/40 hover:bg-primary/10 text-primary"
                                onClick={() => setSelectedEkskulForMembers(item)}
                              >
                                <Users className="h-3.5 w-3.5" />
                                Rekap Santri ({item.members?.length || 0})
                                {pendingCount > 0 && (
                                  <Badge className="ml-1 h-4 px-1 text-[9px] bg-amber-500 text-white font-extrabold animate-pulse">
                                    {pendingCount} Pending
                                  </Badge>
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: REKAP PEMBAYARAN SANTRI */}
          <TabsContent value="pembayaran" className="space-y-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="p-4 bg-muted/20 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Coins className="h-4 w-4 text-amber-500" />
                      Daftar Tagihan & Status Pembayaran Iuran Santri
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Admin dan pembina dapat memantau pembayaran dan mengubah status lunas secara langsung.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-60">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Cari santri / ekskul..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>

                    <Select value={paymentFilterStatus} onValueChange={setPaymentFilterStatus}>
                      <SelectTrigger className="h-8 text-xs font-medium w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="lunas">Hanya Lunas</SelectItem>
                        <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {filteredPayments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ada data tagihan yang sesuai dengan filter pencarian.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/30 text-muted-foreground font-bold">
                          <th className="p-3">No</th>
                          <th className="p-3">Nama Santri</th>
                          <th className="p-3">Kelas</th>
                          <th className="p-3">Ekskul</th>
                          <th className="p-3">Periode</th>
                          <th className="p-3 text-right">Nominal</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayments.map((item: any, idx: number) => {
                          const p = item.payment;
                          const s = item.student;
                          const e = item.ekskul;
                          const isLunas = p.status === "lunas";
                          const isPending =
                            markPaymentMutation.isPending &&
                            markPaymentMutation.variables?.paymentId === p.id;

                          return (
                            <tr
                              key={p.id}
                              className="border-b hover:bg-muted/10 transition-colors"
                            >
                              <td className="p-3 font-bold text-muted-foreground">{idx + 1}</td>
                              <td className="p-3">
                                <span className="font-bold text-foreground block">
                                  {s.full_name || s.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  NIS: {s.nis_nip || "-"}
                                </span>
                              </td>
                              <td className="p-3 text-muted-foreground">{s.class_name || "-"}</td>
                              <td className="p-3 font-semibold text-foreground">{e?.name}</td>
                              <td className="p-3 text-muted-foreground">{p.period_label}</td>
                              <td className="p-3 text-right font-bold text-foreground">
                                Rp {p.amount.toLocaleString("id-ID")}
                              </td>
                              <td className="p-3 text-center">
                                <Badge
                                  className={`text-[10px] font-bold ${
                                    isLunas
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                                  }`}
                                >
                                  {isLunas ? "Lunas" : "Belum Bayar"}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                {isLunas ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10.5px] text-muted-foreground hover:text-destructive"
                                    onClick={() =>
                                      markPaymentMutation.mutate({
                                        paymentId: p.id,
                                        status: "belum_bayar",
                                      })
                                    }
                                    disabled={isPending}
                                  >
                                    Batalkan
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-7 text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() =>
                                      markPaymentMutation.mutate({
                                        paymentId: p.id,
                                        status: "lunas",
                                      })
                                    }
                                    disabled={isPending}
                                  >
                                    Tandai Lunas
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
          </TabsContent>
        </Tabs>

        {/* DIALOG DAFTAR SANTRI & APPROVE KEIKUTSERTAAN */}
        <Dialog
          open={Boolean(selectedEkskulForMembers)}
          onOpenChange={(open) => !open && setSelectedEkskulForMembers(null)}
        >
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Rekap Peserta & Keikutsertaan: {selectedEkskulForMembers?.ekskul?.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Daftar lengkap santri terdaftar, sesi pilihan, rincian tagihan kas, dan persetujuan (approval) keikutsertaan.
              </DialogDescription>
            </DialogHeader>

            {selectedEkskulForMembers && (
              <div className="space-y-4 pt-2">
                {/* Ringkasan Singkat Ekskul */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-lg border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10.5px]">Pelatih / Pembina:</span>
                    <b className="text-foreground">{selectedEkskulForMembers.ekskul?.coach_name}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10.5px]">Total Terdaftar:</span>
                    <b className="text-foreground">{selectedEkskulForMembers.members?.length || 0} Santri</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10.5px]">Menunggu Approval:</span>
                    <b className="text-amber-600 font-extrabold">
                      {selectedEkskulForMembers.members?.filter((m: any) => m.enrollmentStatus === "menunggu_konfirmasi").length || 0} Santri
                    </b>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10.5px]">Kas Masuk:</span>
                    <b className="text-emerald-600 font-extrabold">
                      Rp {(selectedEkskulForMembers.finance?.totalPaid || 0).toLocaleString("id-ID")}
                    </b>
                  </div>
                </div>

                {/* Tabel Peserta */}
                {(!selectedEkskulForMembers.members || selectedEkskulForMembers.members.length === 0) ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Belum ada santri yang terdaftar di program ekstrakurikuler ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/40 text-muted-foreground font-bold">
                          <th className="p-2.5">No</th>
                          <th className="p-2.5">Nama Santri</th>
                          <th className="p-2.5">Kelas</th>
                          <th className="p-2.5">Sesi / Bulan</th>
                          <th className="p-2.5 text-right">Tagihan</th>
                          <th className="p-2.5 text-center">Status Bayar</th>
                          <th className="p-2.5 text-center">Keikutsertaan</th>
                          <th className="p-2.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEkskulForMembers.members.map((m: any, idx: number) => {
                          const isAktif = m.enrollmentStatus === "aktif";
                          const isLunas = m.payment?.status === "lunas" || selectedEkskulForMembers.ekskul?.category === "wajib";
                          const isPendingApprove =
                            approveEnrollmentMutation.isPending &&
                            approveEnrollmentMutation.variables === m.enrollmentId;

                          return (
                            <tr key={m.enrollmentId} className="border-b hover:bg-muted/10">
                              <td className="p-2.5 text-muted-foreground font-bold">{idx + 1}</td>
                              <td className="p-2.5">
                                <span className="font-bold text-foreground block">{m.name}</span>
                                <span className="text-[10px] text-muted-foreground">NIS: {m.nis}</span>
                              </td>
                              <td className="p-2.5 font-medium">{m.className}</td>
                              <td className="p-2.5 font-medium text-foreground">
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                  {m.sessionLabel || "Sesi 1"}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-right font-bold">
                                {m.payment ? (
                                  <span>Rp {m.payment.amount.toLocaleString("id-ID")}</span>
                                ) : selectedEkskulForMembers.ekskul?.category === "wajib" ? (
                                  <span className="text-slate-500 font-normal">Gratis</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <Badge
                                  className={`text-[9.5px] font-bold ${
                                    isLunas
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                                  }`}
                                >
                                  {isLunas ? "Lunas" : "Belum Bayar"}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-center">
                                <Badge
                                  className={`text-[9.5px] font-bold ${
                                    isAktif
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 animate-pulse"
                                  }`}
                                >
                                  {isAktif ? "Aktif" : "Menunggu Approval"}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-center">
                                {isAktif ? (
                                  <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Disetujui
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-7 text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                    disabled={isPendingApprove}
                                    onClick={() => approveEnrollmentMutation.mutate(m.enrollmentId)}
                                  >
                                    {isPendingApprove ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <UserCheck className="h-3.5 w-3.5" />
                                    )}
                                    Approve Keikutsertaan
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
