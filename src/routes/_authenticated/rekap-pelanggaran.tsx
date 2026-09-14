import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  Flame,
  LineChart as LineChartIcon,
  Loader2,
  PieChart as PieChartIcon,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Table as TableIcon,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  getSpStatusTier,
  getViolationSummary,
  updateViolationStatus,
} from "@/lib/violations.functions";

export const Route = createFileRoute("/_authenticated/rekap-pelanggaran")({
  head: () => ({
    meta: [
      { title: "Rekap Pelanggaran & Poin Santri | SIM-AHIBS" },
      {
        name: "description",
        content: "Rekapitulasi poin pelanggaran, statistik kedisiplinan, pemantauan SP 1/2/3, dan evaluasi pembinaan santri AHIBS.",
      },
      { property: "og:title", content: "Rekap Pelanggaran & Poin Santri | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Rekapitulasi poin pelanggaran, statistik kedisiplinan, pemantauan SP 1/2/3, dan evaluasi pembinaan santri AHIBS.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RekapPelanggaranPage,
});

function RekapPelanggaranPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchSummary = useServerFn(getViolationSummary);
  const updateStatusFn = useServerFn(updateViolationStatus);

  // Filter states
  const [period, setPeriod] = useState<
    "hari_ini" | "pekan_ini" | "bulan_ini" | "semester" | "semua"
  >("bulan_ini");
  const [selectedDorm, setSelectedDorm] = useState<string>("semua");
  const [selectedClass, setSelectedClass] = useState<string>("semua");
  const [selectedCategory, setSelectedCategory] = useState<string>("semua");
  const [selectedStatus, setSelectedStatus] = useState<string>("semua");
  const [search, setSearch] = useState<string>("");

  // Modal states
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any | null>(null);
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<
    "Perlu Pembinaan" | "Dalam Pembinaan" | "Selesai"
  >("Selesai");
  const [editPenalty, setEditPenalty] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Query rekap data
  const summaryQuery = useQuery({
    queryKey: [
      "violation-summary",
      period,
      selectedDorm,
      selectedClass,
      selectedCategory,
      selectedStatus,
      search,
    ],
    queryFn: () =>
      fetchSummary({
        data: {
          period,
          dorm: selectedDorm !== "semua" ? selectedDorm : undefined,
          class: selectedClass !== "semua" ? selectedClass : undefined,
          category: selectedCategory !== "semua" ? selectedCategory : undefined,
          status: selectedStatus !== "semua" ? selectedStatus : undefined,
          search: search.trim() || undefined,
        },
      }),
  });

  const data = summaryQuery.data;
  const studentRankings = data?.studentRankings ?? [];
  const records = data?.records ?? [];
  const availableDorms = data?.availableDorms ?? [];
  const categoryStats = data?.categoryStats ?? [];
  const monthlyTrend = data?.monthlyTrend ?? [];
  const topViolations = data?.topViolations ?? [];

  // Mutation to update violation status
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRecordForEdit) return;
      return updateStatusFn({
        data: {
          record_id: selectedRecordForEdit.id,
          status: editStatus,
          penalty: editPenalty.trim() || undefined,
          notes: editNotes.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Status pembinaan berhasil diperbarui");
      setSelectedRecordForEdit(null);
      queryClient.invalidateQueries({ queryKey: ["violation-summary"] });
      queryClient.invalidateQueries({ queryKey: ["violations-today"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal memperbarui status");
    },
  });

  const openEditModal = (rec: any) => {
    setSelectedRecordForEdit(rec);
    setEditStatus(rec.status || "Selesai");
    setEditPenalty(rec.penalty || "");
    setEditNotes(rec.notes || "");
  };

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

  const getSpBadge = (tier: string) => {
    switch (tier) {
      case "SP 3":
        return (
          <Badge variant="destructive" className="font-semibold gap-1 animate-pulse">
            <AlertOctagon className="h-3 w-3" /> SP 3 (Sidang)
          </Badge>
        );
      case "SP 2":
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1">
            <AlertTriangle className="h-3 w-3" /> SP 2 (Keras)
          </Badge>
        );
      case "SP 1":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300 gap-1 font-medium">
            <AlertCircle className="h-3 w-3" /> SP 1 (Wali)
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-emerald-700 border-emerald-300 dark:text-emerald-400 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Disiplin
          </Badge>
        );
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
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Rekapitulasi Pelanggaran & Poin Santri
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Pemantauan akumulasi poin kedisiplinan, jenjang peringatan (SP 1, SP 2, SP 3), dan tindak lanjut pembinaan santri AHIBS.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsPrintModalOpen(true)}
            >
              <Printer className="h-4 w-4" />
              Cetak Laporan
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => summaryQuery.refetch()}
              disabled={summaryQuery.isFetching}
            >
              <RotateCcw
                className={`h-4 w-4 ${summaryQuery.isFetching ? "animate-spin" : ""}`}
              />
              Muat Ulang
            </Button>
          </div>
        </div>

        {/* Warning Alert if any student is at SP 3 or SP 2 */}
        {(data?.sp3Count ?? 0) > 0 && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-900 shadow-xs dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <div className="flex items-start gap-3">
              <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-semibold">
                  Peringatan Kritis: Terdapat {data?.sp3Count} Santri yang Mencapai Ambang Batas SP 3 (≥ 76 Poin)!
                </p>
                <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">
                  Segera agendakan sidang dewan pengasuh dan pemanggilan orang tua / wali santri untuk tindak lanjut pembinaan komprehensif.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Total Pelanggaran</span>
                <ShieldAlert className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                {data?.totalViolations ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Kasus tercatat</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Total Poin</span>
                <Flame className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-rose-600">
                {data?.totalPoints ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Akumulasi poin</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Santri Tercatat</span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                {data?.totalStudentsWithViolations ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Santri memiliki poin</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Status SP 1</span>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-yellow-600">
                {data?.sp1Count ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">26 - 50 Poin</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Status SP 2</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-amber-600">
                {data?.sp2Count ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">51 - 75 Poin</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Status SP 3</span>
                <AlertOctagon className="h-4 w-4 text-rose-600" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-rose-600">
                {data?.sp3Count ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">≥ 76 Poin (Kritis)</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="border-border shadow-xs bg-muted/10">
          <CardContent className="p-3.5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {/* Periode */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Periode Waktu</Label>
                <Select
                  value={period}
                  onValueChange={(v: any) => setPeriod(v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hari_ini">Hari Ini</SelectItem>
                    <SelectItem value="pekan_ini">Pekan Ini</SelectItem>
                    <SelectItem value="bulan_ini">Bulan Ini</SelectItem>
                    <SelectItem value="semester">Semester Ini</SelectItem>
                    <SelectItem value="semua">Semua Waktu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Asrama */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Kamar / Asrama</Label>
                <Select value={selectedDorm} onValueChange={setSelectedDorm}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Semua Asrama" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Asrama</SelectItem>
                    {availableDorms.map((d: string) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Kategori */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Tingkat Pelanggaran</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Semua Tingkat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Tingkat</SelectItem>
                    <SelectItem value="Ringan">Ringan (2-5 Poin)</SelectItem>
                    <SelectItem value="Sedang">Sedang (10-25 Poin)</SelectItem>
                    <SelectItem value="Berat">Berat (50-100 Poin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Pembinaan */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Status Pembinaan</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Status</SelectItem>
                    <SelectItem value="Perlu Pembinaan">Perlu Pembinaan</SelectItem>
                    <SelectItem value="Dalam Pembinaan">Dalam Pembinaan</SelectItem>
                    <SelectItem value="Selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Bar */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground">Pencarian</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama santri, NIS, atau pelanggaran..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual Charts & Breakdown Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Chart 1: Tren Bulanan (7 Kolom) */}
          <Card className="border-border shadow-sm lg:col-span-7">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <LineChartIcon className="h-4 w-4 text-primary" />
                Tren Pelanggaran & Poin Bulanan
              </CardTitle>
              <CardDescription className="text-xs">
                Grafik akumulasi frekuensi dan total poin pelanggaran santri selama 6 bulan terakhir.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {monthlyTrend.length === 0 ? (
                <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
                  Belum ada data tren pelanggaran pada periode ini.
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="count" name="Jumlah Kasus" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="points" name="Total Poin" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart 2: Komposisi Kategori & Top Pelanggaran (5 Kolom) */}
          <Card className="border-border shadow-sm lg:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" />
                Komposisi & Top Kasus
              </CardTitle>
              <CardDescription className="text-xs">
                Distribusi kategori (Ringan, Sedang, Berat) dan 5 jenis pelanggaran terbanyak.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {/* Category mini bars */}
              <div className="space-y-2">
                {categoryStats.map((cs: any) => {
                  const pct =
                    data?.totalViolations && data.totalViolations > 0
                      ? Math.round((cs.count / data.totalViolations) * 100)
                      : 0;
                  return (
                    <div key={cs.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cs.color }}
                          />
                          {cs.category}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {cs.count} kasus ({pct}%) • {cs.points} poin
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </div>

              {/* Top 5 list */}
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold mb-2 text-foreground">5 Pelanggaran Terbanyak:</p>
                {topViolations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum ada data.</p>
                ) : (
                  <div className="space-y-1.5">
                    {topViolations.map((tv: any, idx: number) => (
                      <div
                        key={tv.title}
                        className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="truncate text-foreground max-w-[200px]">
                            {tv.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[10px]">
                            {tv.count}x
                          </Badge>
                          <span className="text-[11px] font-bold text-rose-600">
                            {tv.points} pt
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabbed Data View */}
        <Card className="border-border shadow-sm">
          <Tabs defaultValue="santri" className="w-full">
            <CardHeader className="pb-0 border-b">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TableIcon className="h-4 w-4 text-primary" />
                    Data Kedisiplinan & Log Kasus
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pantau akumulasi poin santri berjenjang SP atau telusuri seluruh riwayat pencatatan.
                  </CardDescription>
                </div>
                <TabsList>
                  <TabsTrigger value="santri" className="text-xs gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Peringkat Poin Santri ({studentRankings.length})
                  </TabsTrigger>
                  <TabsTrigger value="log" className="text-xs gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Log Riwayat Lengkap ({records.length})
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>

            {/* TAB 1: PERINGKAT POIN & STATUS SP SANTRI */}
            <TabsContent value="santri" className="m-0 p-4">
              {summaryQuery.isLoading ? (
                <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat peringkat santri...
                </div>
              ) : studentRankings.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Tidak ada data santri yang memiliki poin pelanggaran pada filter ini.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase">
                      <tr>
                        <th className="p-3 text-center">No</th>
                        <th className="p-3">Nama Santri</th>
                        <th className="p-3">Kamar / Asrama</th>
                        <th className="p-3">Kelas</th>
                        <th className="p-3 text-center">Jumlah Kasus</th>
                        <th className="p-3 text-center">Total Poin</th>
                        <th className="p-3">Status Peringatan</th>
                        <th className="p-3">Terakhir Melanggar</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {studentRankings.map((item: any, idx: number) => (
                        <tr
                          key={item.student.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedStudentForDetail(item)}
                        >
                          <td className="p-3 text-center font-semibold text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="p-3 font-medium text-foreground">
                            {item.student.name}
                            <span className="block text-[10px] text-muted-foreground">
                              NIS: {item.student.nis_nip || "-"}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">{item.student.dorm || "-"}</td>
                          <td className="p-3 text-muted-foreground">{item.student.class || "-"}</td>
                          <td className="p-3 text-center font-medium">
                            {item.violationCount} kali
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300">
                              {item.totalPoints}
                            </span>
                          </td>
                          <td className="p-3">{getSpBadge(item.spInfo.tier)}</td>
                          <td className="p-3 text-muted-foreground text-[11px]">
                            {item.lastDate}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentForDetail(item);
                              }}
                            >
                              <Eye className="h-3 w-3" /> Detail
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: LOG RIWAYAT LENGKAP PELANGGARAN */}
            <TabsContent value="log" className="m-0 p-4">
              {summaryQuery.isLoading ? (
                <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat log pelanggaran...
                </div>
              ) : records.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Tidak ada catatan pelanggaran yang sesuai filter.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase">
                      <tr>
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Santri</th>
                        <th className="p-3">Kamar / Kelas</th>
                        <th className="p-3">Pelanggaran</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3 text-center">Poin</th>
                        <th className="p-3">Sanksi Edukatif</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Pencatat</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {records.map((r: any) => (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 whitespace-nowrap text-muted-foreground">
                            {r.date}
                          </td>
                          <td className="p-3 font-medium text-foreground">
                            {r.student_name}
                            <span className="block text-[10px] text-muted-foreground">
                              NIS: {r.student_nis}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {r.student_dorm} • {r.student_class}
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-foreground">{r.violation_title}</span>
                            {r.notes && (
                              <span className="block text-[10px] text-muted-foreground truncate max-w-[200px]">
                                {r.notes}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${getCategoryBadgeClass(r.category)}`}
                            >
                              {r.category}
                            </Badge>
                          </td>
                          <td className="p-3 text-center font-bold text-rose-600">
                            +{r.points}
                          </td>
                          <td className="p-3 text-muted-foreground max-w-[160px] truncate">
                            {r.penalty || "-"}
                          </td>
                          <td className="p-3">
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
                          <td className="p-3 text-muted-foreground text-[11px] whitespace-nowrap">
                            {r.recorder_name}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-primary hover:text-primary/80"
                              onClick={() => openEditModal(r)}
                            >
                              Kelola Status
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* MODAL 1: DETAIL SANTRI & LOG INDIVIDUAL */}
      <Dialog
        open={Boolean(selectedStudentForDetail)}
        onOpenChange={(open) => !open && setSelectedStudentForDetail(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-primary" />
              Detail Catatan Kedisiplinan: {selectedStudentForDetail?.student.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Kamar: {selectedStudentForDetail?.student.dorm} • Kelas:{" "}
              {selectedStudentForDetail?.student.class} • NIS:{" "}
              {selectedStudentForDetail?.student.nis_nip || "-"}
            </DialogDescription>
          </DialogHeader>

          {selectedStudentForDetail && (
            <div className="space-y-4">
              {/* Point bar towards SP 3 */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    Akumulasi Poin: {selectedStudentForDetail.totalPoints} / 100
                  </span>
                  <div>{getSpBadge(selectedStudentForDetail.spInfo.tier)}</div>
                </div>
                <Progress
                  value={Math.min(100, selectedStudentForDetail.totalPoints)}
                  className="h-2.5"
                />
                <p className="text-[11px] text-muted-foreground">
                  {selectedStudentForDetail.spInfo.description}
                </p>
              </div>

              {/* Individual records list */}
              <div className="max-h-72 overflow-y-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase sticky top-0">
                    <tr>
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5">Pelanggaran</th>
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5 text-center">Poin</th>
                      <th className="p-2.5">Sanksi Edukatif</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Pencatat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedStudentForDetail.records.map((r: any) => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                          {r.date}
                        </td>
                        <td className="p-2.5 font-medium text-foreground">
                          {r.violation_title}
                          {r.notes && (
                            <span className="block text-[10px] text-muted-foreground">
                              {r.notes}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${getCategoryBadgeClass(r.category)}`}
                          >
                            {r.category}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center font-bold text-rose-600">
                          +{r.points}
                        </td>
                        <td className="p-2.5 text-muted-foreground">{r.penalty || "-"}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStudentForDetail(null)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: UPDATE STATUS PEMBINAAN */}
      <Dialog
        open={Boolean(selectedRecordForEdit)}
        onOpenChange={(open) => !open && setSelectedRecordForEdit(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Kelola Tindak Lanjut Pembinaan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Santri: {selectedRecordForEdit?.student_name} • Pelanggaran:{" "}
              {selectedRecordForEdit?.violation_title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Status Pembinaan</Label>
              <Select
                value={editStatus}
                onValueChange={(v: "Perlu Pembinaan" | "Dalam Pembinaan" | "Selesai") =>
                  setEditStatus(v)
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Selesai">Selesai (Tuntaskan)</SelectItem>
                  <SelectItem value="Perlu Pembinaan">Perlu Pembinaan / Pemanggilan</SelectItem>
                  <SelectItem value="Dalam Pembinaan">Dalam Pembinaan Berjalan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Sanksi / Tindakan yang Telah Dilakukan</Label>
              <Input
                placeholder="Contoh: Telah menjalani piket dan hafalan doa..."
                value={editPenalty}
                onChange={(e) => setEditPenalty(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Catatan Tambahan Pengasuh / Musyrif</Label>
              <Textarea
                placeholder="Perkembangan santri setelah dibina..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRecordForEdit(null)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CETAK LAPORAN RESMI KEDISIPLINAN */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Pratinjau Lembar Rekapitulasi Pelanggaran Santri
            </DialogTitle>
            <DialogDescription className="text-xs">
              Format siap cetak untuk arsip kesiswaan, laporan dewan pengasuh, atau pertemuan wali santri.
            </DialogDescription>
          </DialogHeader>

          {/* Printable Area */}
          <div id="printable-rekap-area" className="space-y-4 rounded-lg border bg-white p-6 text-black">
            {/* Kop Laporan */}
            <div className="border-b-2 border-black pb-3 text-center">
              <h2 className="text-base font-bold uppercase tracking-wide">
                AL-HIKMAH ISLAMIC BOARDING SCHOOL (AHIBS)
              </h2>
              <h3 className="text-sm font-semibold uppercase">
                BIDANG KESANTRIAN & KEDISIPLINAN SANTRI
              </h3>
              <p className="text-[11px] text-gray-600">
                Laporan Rekapitulasi Poin Pelanggaran & Jenjang Peringatan Santri
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                Filter: Periode {period} • Asrama: {selectedDorm} • Kelas: {selectedClass} • Dicetak pada:{" "}
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Ringkasan Statistik */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="border p-2 rounded">
                <span className="block text-gray-600 text-[10px]">Total Kasus</span>
                <span className="font-bold text-sm">{data?.totalViolations ?? 0}</span>
              </div>
              <div className="border p-2 rounded">
                <span className="block text-gray-600 text-[10px]">Total Poin Terakumulasi</span>
                <span className="font-bold text-sm text-red-600">{data?.totalPoints ?? 0}</span>
              </div>
              <div className="border p-2 rounded">
                <span className="block text-gray-600 text-[10px]">Santri Kena SP 1 & SP 2</span>
                <span className="font-bold text-sm text-amber-600">
                  {(data?.sp1Count ?? 0) + (data?.sp2Count ?? 0)}
                </span>
              </div>
              <div className="border p-2 rounded">
                <span className="block text-gray-600 text-[10px]">Santri Terancam SP 3</span>
                <span className="font-bold text-sm text-red-600">{data?.sp3Count ?? 0}</span>
              </div>
            </div>

            {/* Tabel Santri dengan Poin Tertinggi */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase">Daftar Santri dengan Poin Terbanyak:</h4>
              <table className="w-full border-collapse border border-gray-300 text-[11px]">
                <thead className="bg-gray-100 font-semibold">
                  <tr>
                    <th className="border border-gray-300 p-1.5 text-center">No</th>
                    <th className="border border-gray-300 p-1.5">Nama Santri</th>
                    <th className="border border-gray-300 p-1.5">Kamar / Asrama</th>
                    <th className="border border-gray-300 p-1.5">Kelas</th>
                    <th className="border border-gray-300 p-1.5 text-center">Jml Kasus</th>
                    <th className="border border-gray-300 p-1.5 text-center">Total Poin</th>
                    <th className="border border-gray-300 p-1.5">Status Peringatan</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRankings.slice(0, 15).map((s: any, i: number) => (
                    <tr key={s.student.id}>
                      <td className="border border-gray-300 p-1.5 text-center">{i + 1}</td>
                      <td className="border border-gray-300 p-1.5 font-medium">
                        {s.student.name} ({s.student.nis_nip || "-"})
                      </td>
                      <td className="border border-gray-300 p-1.5">{s.student.dorm || "-"}</td>
                      <td className="border border-gray-300 p-1.5">{s.student.class || "-"}</td>
                      <td className="border border-gray-300 p-1.5 text-center">{s.violationCount}</td>
                      <td className="border border-gray-300 p-1.5 text-center font-bold text-red-600">
                        {s.totalPoints}
                      </td>
                      <td className="border border-gray-300 p-1.5 font-semibold">
                        {s.spInfo.tier}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tanda Tangan Pengasuh */}
            <div className="pt-8 flex justify-between text-xs text-center">
              <div>
                <p>Mengetahui,</p>
                <p className="font-semibold">Kabid Kesantrian</p>
                <div className="h-16" />
                <p className="font-semibold underline">( Ustadz Pembina Kesantrian )</p>
              </div>
              <div>
                <p>Menyetujui,</p>
                <p className="font-semibold">Mudir / Kepala Pengasuhan</p>
                <div className="h-16" />
                <p className="font-semibold underline">( Mudir Pesantren AHIBS )</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsPrintModalOpen(false)}>
              Tutup
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                window.print();
              }}
            >
              <Printer className="h-4 w-4" /> Cetak Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
