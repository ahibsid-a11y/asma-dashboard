import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  LineChart as LineChartIcon,
  Loader2,
  PieChart,
  Table as TableIcon,
  TrendingUp,
  Trophy,
  User,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getMutabaahSummary } from "@/lib/mutabaah.functions";

export const Route = createFileRoute("/_authenticated/rekap-mutabaah")({
  head: () => ({
    meta: [
      { title: "Rekap Mutaba'ah Santri | SIM-AHIBS" },
      {
        name: "description",
        content: "Ringkasan statistik, tren grafik, dan lembar bulanan amal yaumi santri AHIBS.",
      },
      { property: "og:title", content: "Rekap Mutaba'ah Santri | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Ringkasan statistik, tren grafik, dan lembar bulanan amal yaumi santri AHIBS.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RekapMutabaahPage,
});

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function RekapMutabaahPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;

  const fetchSummary = useServerFn(getMutabaahSummary);

  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const [view, setView] = useState<"hari" | "pekan" | "bulan">("bulan");
  const [anchorDate, setAnchorDate] = useState<string>(todayStr);
  const [selectedDorm, setSelectedDorm] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const summaryQuery = useQuery({
    queryKey: ["mutabaah-summary", view, anchorDate, selectedDorm, selectedStudentId],
    queryFn: () =>
      fetchSummary({
        data: {
          view,
          anchorDate,
          dorm: selectedDorm || undefined,
          studentId: selectedStudentId || undefined,
        },
      }),
  });

  const data = summaryQuery.data;
  const currentDorm = data?.selectedDorm ?? selectedDorm;
  const targetStudent = data?.targetStudent;
  const studentList = data?.students ?? [];
  const studentStats = data?.studentStats ?? [];
  const activityStats = data?.activityStats ?? [];
  const trendData = data?.trendData ?? [];
  const activities = data?.activities ?? [];
  const matrixGrid = data?.matrixGrid ?? {};

  // Geser tanggal anchor
  const stepAnchor = (dir: number) => {
    const d = new Date(`${anchorDate}T00:00:00`);
    if (view === "hari") d.setDate(d.getDate() + dir);
    else if (view === "pekan") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setAnchorDate(toDateStr(d));
  };

  // Label rentang waktu
  const rangeLabel = useMemo(() => {
    const d = new Date(`${anchorDate}T00:00:00`);
    if (view === "hari") {
      return d.toLocaleDateString("id-ID", { dateStyle: "full" });
    }
    if (view === "pekan") {
      if (!data?.startDate || !data?.endDate) return "";
      const s = new Date(`${data.startDate}T00:00:00`);
      const e = new Date(`${data.endDate}T00:00:00`);
      return `${s.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }, [anchorDate, view, data]);

  // Ekstraksi jumlah hari dalam bulan untuk lembar fisik
  const daysInMonth = useMemo(() => {
    const d = new Date(`${anchorDate}T00:00:00`);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }, [anchorDate]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Best & need attention activity
  const topActivity = activityStats[0];
  const lowActivity = [...activityStats].sort((a, b) => a.percentage - b.percentage)[0];
  const topStudent = studentStats[0];

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header Rekap */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Laporan & Analitik</p>
              <Badge variant="outline" className="text-[10px] font-semibold">Kesantrian</Badge>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-foreground">Rekap Mutaba'ah Santri</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Analisis kepatuhan ibadah harian, tren performa kamar, dan format lembar bulanan santri.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="font-medium"
            >
              <Download className="size-4" /> Cetak Lembar
            </Button>
          </div>
        </div>

        {/* Filter Bar & Periode */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Tab Periode & Navigasi Tanggal */}
              <div className="flex flex-wrap items-center gap-3">
                <Tabs value={view} onValueChange={(v) => setView(v as "hari" | "pekan" | "bulan")}>
                  <TabsList className="bg-muted/60">
                    <TabsTrigger value="hari">Harian</TabsTrigger>
                    <TabsTrigger value="pekan">Pekanan</TabsTrigger>
                    <TabsTrigger value="bulan">Bulanan</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center rounded-lg border border-border bg-background p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => stepAnchor(-1)}
                    title="Periode Sebelumnya"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2.5 text-xs font-semibold"
                    onClick={() => setAnchorDate(todayStr)}
                  >
                    Hari Ini
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => stepAnchor(1)}
                    title="Periode Berikutnya"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>

                <p className="text-sm font-bold capitalize text-foreground">{rangeLabel}</p>
              </div>

              {/* Filter Asrama & Siswa */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Pilih Kamar */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="dorm-filter" className="text-xs font-semibold text-muted-foreground">
                    Kamar:
                  </Label>
                  {data?.canChangeDorm ? (
                    <Select
                      value={currentDorm || "ALL"}
                      onValueChange={(val) => {
                        setSelectedDorm(val === "ALL" ? "" : val);
                        setSelectedStudentId(""); // Reset santri saat ganti kamar
                      }}
                    >
                      <SelectTrigger id="dorm-filter" className="h-9 w-36 text-xs font-medium">
                        <SelectValue placeholder="Semua Kamar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua Kamar</SelectItem>
                        {(data?.availableDorms ?? []).map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="px-2.5 py-1 text-xs font-bold">
                      {currentDorm || "Kamar Anda"}
                    </Badge>
                  )}
                </div>

                {/* Pilih Santri Tertentu */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="student-filter" className="text-xs font-semibold text-muted-foreground">
                    Santri:
                  </Label>
                  <Select
                    value={selectedStudentId || "ALL"}
                    onValueChange={(val) => setSelectedStudentId(val === "ALL" ? "" : val)}
                  >
                    <SelectTrigger id="student-filter" className="h-9 w-44 text-xs font-medium">
                      <SelectValue placeholder="Semua Santri" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Santri</SelectItem>
                      {studentList.map((st: any) => (
                        <SelectItem key={st.id} value={st.id}>
                          {st.name} {st.dorm ? `(${st.dorm})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kartu Ringkasan (KPIs) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Rata-Rata Kepatuhan</p>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-foreground">{data?.overallCompliance ?? 0}%</span>
                <span className="text-xs text-muted-foreground">amal yaumi tercapai</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Santri Terdisiplin</p>
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                  <Trophy className="size-4" />
                </div>
              </div>
              <div className="mt-2 truncate">
                <span className="text-sm font-bold text-foreground">
                  {topStudent ? topStudent.name : "—"}
                </span>
                {topStudent && (
                  <p className="text-xs text-emerald-600 font-semibold">{topStudent.percentage}% capaian</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Amalan Terkonsisten</p>
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <div className="mt-2 truncate">
                <span className="text-sm font-bold text-foreground">
                  {topActivity ? topActivity.title : "—"}
                </span>
                {topActivity && (
                  <p className="text-xs text-emerald-600 font-semibold">{topActivity.percentage}% kehadiran</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Perlu Perhatian</p>
                <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600">
                  <BarChart3 className="size-4" />
                </div>
              </div>
              <div className="mt-2 truncate">
                <span className="text-sm font-bold text-foreground">
                  {lowActivity ? lowActivity.title : "—"}
                </span>
                {lowActivity && (
                  <p className="text-xs text-rose-600 font-semibold">{lowActivity.percentage}% kehadiran</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visualisasi Grafik (Line Chart Tren & Bar Chart Kegiatan) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Grafik 1: Tren Harian */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <LineChartIcon className="size-4 text-primary" /> Tren Kepatuhan Ibadah ({rangeLabel})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[260px] w-full">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(val: any) => [`${val}% Kepatuhan`, "Capaian"]}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="compliance"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Belum ada data pada periode ini
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grafik 2: Kepatuhan per Kegiatan */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <BarChart3 className="size-4 text-accent" /> Persentase Capaian per Kegiatan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[260px] w-full">
                {activityStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={activityStats.slice(0, 10)}
                      margin={{ top: 10, right: 15, left: -20, bottom: 35 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                      <XAxis
                        dataKey="title"
                        tick={{ fontSize: 10 }}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(val: any) => [`${val}%`, "Kepatuhan"]} />
                      <Bar dataKey="percentage" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Belum ada data kegiatan
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tampilan Lembar Bulanan Santri (Format Lembar Fisik Word) */}
        <Card className="overflow-hidden border-border shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <TableIcon className="size-4 text-primary" />
                  Lembar Mutaba'ah Bulanan Santri (Format Resmi)
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Format tabel horizontal tanggal 1 s.d. {daysInMonth} sesuai lembar buku pedoman santri.
                </p>
              </div>

              {targetStudent && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
                  <User className="size-4 text-accent" />
                  <span className="text-xs font-bold text-foreground">{targetStudent.name}</span>
                  {targetStudent.dorm && (
                    <Badge variant="outline" className="text-[10px]">{targetStudent.dorm}</Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {summaryQuery.isLoading ? (
              <div className="flex min-h-[220px] items-center justify-center p-8 text-xs text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" /> Memuat data lembar bulanan...
              </div>
            ) : !targetStudent ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Pilih santri pada dropdown di atas untuk melihat lembar mutaba'ah bulanan individu.
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <div className="border-b border-border bg-card p-4 text-center">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-foreground">
                    MUTABA'AH HARIAN SANTRI AHIBS
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground">
                    Tahun Pelajaran 1446-1447 H / 2025-2026 M — Bulan: {new Date(`${anchorDate}T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                  </p>
                </div>

                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/80 text-foreground">
                      <th className="sticky left-0 z-20 min-w-[36px] border-r border-border bg-muted/95 p-2 text-center font-bold">
                        NO
                      </th>
                      <th className="sticky left-[36px] z-20 min-w-[180px] max-w-[220px] border-r border-border bg-muted/95 p-2 font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                        KEGIATAN
                      </th>
                      {daysArray.map((dayNum) => (
                        <th
                          key={dayNum}
                          className="min-w-[28px] border-r border-border p-1 text-center font-bold"
                        >
                          {dayNum}
                        </th>
                      ))}
                      <th className="min-w-[48px] border-l border-border bg-muted p-2 text-center font-bold">
                        Total
                      </th>
                      <th className="min-w-[48px] p-2 text-center font-bold">
                        %
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {activities.map((act, index) => {
                      const actRecords = matrixGrid[act.id] || {};
                      let totalCheckedAct = 0;
                      for (const d of daysArray) {
                        if (actRecords[d]) totalCheckedAct += 1;
                      }
                      const actPct = Math.round((totalCheckedAct / daysInMonth) * 100);

                      return (
                        <tr key={act.id} className="transition-colors hover:bg-muted/30">
                          <td className="sticky left-0 z-10 border-r border-border bg-card p-2 text-center font-bold text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="sticky left-[36px] z-10 border-r border-border bg-card p-2 font-medium text-foreground shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                            {act.title}
                          </td>

                          {daysArray.map((dayNum) => {
                            const isDone = Boolean(actRecords[dayNum]);
                            return (
                              <td
                                key={dayNum}
                                className={`border-r border-border p-1 text-center font-bold transition-colors ${
                                  isDone
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "text-muted-foreground/30"
                                }`}
                              >
                                {isDone ? "✓" : "-"}
                              </td>
                            );
                          })}

                          <td className="border-l border-border bg-muted/20 p-2 text-center font-bold text-foreground">
                            {totalCheckedAct}
                          </td>
                          <td className="p-2 text-center font-extrabold text-foreground">
                            <span className={actPct >= 80 ? "text-emerald-600" : actPct >= 50 ? "text-accent" : "text-destructive"}>
                              {actPct}%
                            </span>
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
      </div>
    </AppShell>
  );
}
