import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { BarChart3, Download, Loader2, Search, X } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/roles";
import {
  getAttendanceRecap,
  getMemberRecapDetail,
  getRecapFilterOptions,
  RECAP_VIEWER_TYPES,
} from "@/lib/recap.functions";

export const Route = createFileRoute("/_authenticated/rekap-presensi")({
  head: () => ({
    meta: [
      { title: "Rekap Presensi | ASMA" },
      {
        name: "description",
        content:
          "Rekap kehadiran harian, mingguan, dan bulanan santri serta pegawai SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Rekap Presensi | ASMA" },
      {
        property: "og:description",
        content:
          "Rekap kehadiran harian, mingguan, dan bulanan santri serta pegawai SMPIT Putra Al-Hanif.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecapPage,
});

type Period = "harian" | "mingguan" | "bulanan";

const ALL = "__all__";

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function mondayOf(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function RecapPage() {
  const profileQuery = useCurrentProfile();
  const accountType = profileQuery.data?.account_type ?? null;
  const allowed = (RECAP_VIEWER_TYPES as readonly string[]).includes(accountType ?? "");

  const today = toISO(new Date());
  const [period, setPeriod] = useState<Period>("harian");
  const [day, setDay] = useState(today);
  const [weekStart, setWeekStart] = useState(today);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [role, setRole] = useState(ALL);
  const [klass, setKlass] = useState(ALL);
  const [dorm, setDorm] = useState(ALL);
  const [halaqoh, setHalaqoh] = useState(ALL);
  const [search, setSearch] = useState("");
  const [chartBy, setChartBy] = useState<"class" | "dorm">("class");
  const [detailId, setDetailId] = useState<string | null>(null);

  const range = useMemo(() => {
    if (period === "harian") return { from: day, to: day };
    if (period === "mingguan") {
      const start = mondayOf(weekStart);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: toISO(start), to: toISO(end) };
    }
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { from: toISO(start), to: toISO(end) };
  }, [period, day, weekStart, month, year]);

  const fetchOptions = useServerFn(getRecapFilterOptions);
  const fetchRecap = useServerFn(getAttendanceRecap);
  const fetchDetail = useServerFn(getMemberRecapDetail);

  const optionsQuery = useQuery({
    queryKey: ["recap-options"],
    queryFn: () => fetchOptions({}) as Promise<any>,
    enabled: allowed,
  });

  const filters = {
    from: range.from,
    to: range.to,
    account_type: role === ALL ? undefined : (role as AccountType),
    class: klass === ALL ? undefined : klass,
    dorm: dorm === ALL ? undefined : dorm,
    halaqoh: halaqoh === ALL ? undefined : halaqoh,
  };

  const recapQuery = useQuery({
    queryKey: ["recap", filters],
    queryFn: () => fetchRecap({ data: filters }) as Promise<any>,
    enabled: allowed,
  });

  const detailQuery = useQuery({
    queryKey: ["recap-detail", detailId, range.from, range.to],
    queryFn: () =>
      fetchDetail({
        data: { user_id: detailId as string, from: range.from, to: range.to },
      }) as Promise<any>,
    enabled: Boolean(detailId),
  });

  const rows = useMemo(() => {
    const all = (recapQuery.data?.rows ?? []) as any[];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) || (r.nis_nip ?? "").toLowerCase().includes(q),
    );
  }, [recapQuery.data, search]);

  const chartData = ((chartBy === "class" ? recapQuery.data?.byClass : recapQuery.data?.byDorm) ??
    []) as any[];

  const periodLabel =
    period === "harian"
      ? new Date(`${day}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "long" })
      : period === "mingguan"
        ? `${range.from} s.d. ${range.to}`
        : `${MONTHS[month - 1]} ${year}`;

  function exportExcel() {
    const sheetRows = rows.map((r) => ({
      Nama: r.name ?? "",
      "NIS/NIP": r.nis_nip ?? "",
      Jabatan: ACCOUNT_TYPE_LABELS[r.account_type as AccountType] ?? r.account_type ?? "",
      Kelas: r.class ?? "",
      Asrama: r.dorm ?? "",
      Halaqoh: r.halaqoh ?? "",
      Hadir: r.hadir,
      Telat: r.telat,
      Izin: r.izin,
      Sakit: r.sakit,
      Alfa: r.alfa,
      Total: r.total,
      "Kehadiran (%)": r.percent,
    }));
    const sheet = XLSX.utils.json_to_sheet(sheetRows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Rekap Presensi");
    XLSX.writeFile(book, `rekap-presensi-${range.from}_${range.to}.xlsx`);
  }

  if (profileQuery.isLoading) {
    return (
      <AppShell title="Rekap Presensi">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat…
        </div>
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell title="Rekap Presensi">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Halaman Rekap Presensi hanya untuk pimpinan dan petugas kehadiran.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const options = optionsQuery.data;

  return (
    <AppShell title="Rekap Presensi">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter rekap</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Periode</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="harian">Harian</SelectItem>
                  <SelectItem value="mingguan">Mingguan</SelectItem>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === "harian" && (
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
              </div>
            )}
            {period === "mingguan" && (
              <div className="space-y-1.5">
                <Label>Minggu (pilih tanggal mana pun)</Label>
                <Input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                />
              </div>
            )}
            {period === "bulanan" && (
              <>
                <div className="space-y-1.5">
                  <Label>Bulan</Label>
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tahun</Label>
                  <Input
                    type="number"
                    min={2020}
                    max={2100}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value) || year)}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Jabatan</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua jabatan</SelectItem>
                  {(options?.account_types ?? []).map((t: string) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t as AccountType] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kelas</Label>
              <Select value={klass} onValueChange={setKlass}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua kelas</SelectItem>
                  {(options?.classes ?? []).map((t: string) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Asrama</Label>
              <Select value={dorm} onValueChange={setDorm}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua asrama</SelectItem>
                  {(options?.dorms ?? []).map((t: string) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Halaqoh</Label>
              <Select value={halaqoh} onValueChange={setHalaqoh}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua halaqoh</SelectItem>
                  {(options?.halaqohs ?? []).map((t: string) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Persentase kehadiran sekolah</p>
              <p className="mt-1 text-3xl font-semibold text-primary">
                {recapQuery.data?.overallPercent ?? 0}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Hadir / Telat</p>
              <p className="mt-1 text-3xl font-semibold">
                {recapQuery.data?.totals?.hadir ?? 0}
                <span className="text-muted-foreground"> / {recapQuery.data?.totals?.telat ?? 0}</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Izin / Sakit</p>
              <p className="mt-1 text-3xl font-semibold">
                {recapQuery.data?.totals?.izin ?? 0}
                <span className="text-muted-foreground"> / {recapQuery.data?.totals?.sakit ?? 0}</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Alfa</p>
              <p className="mt-1 text-3xl font-semibold text-destructive">
                {recapQuery.data?.totals?.alfa ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {recapQuery.data?.memberCount ?? 0} anggota
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" /> Perbandingan kehadiran
            </CardTitle>
            <Select value={chartBy} onValueChange={(v) => setChartBy(v as "class" | "dorm")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="class">Per kelas</SelectItem>
                <SelectItem value="dorm">Per asrama</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-80">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data pada periode ini.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hadir" name="Hadir" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="telat" name="Telat" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="alfa"
                    name="Alfa"
                    fill="hsl(var(--destructive))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
            <CardTitle className="text-base">Rekap per anggota</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  className="w-56 pl-8"
                  placeholder="Cari nama / NIS-NIP"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button onClick={exportExcel} disabled={rows.length === 0}>
                <Download className="size-4" /> Unduh sebagai Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recapQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Menghitung rekap…
              </div>
            ) : recapQuery.isError ? (
              <p className="text-sm text-destructive">{(recapQuery.error as Error).message}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada anggota sesuai filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-center">Hadir</TableHead>
                      <TableHead className="text-center">Telat</TableHead>
                      <TableHead className="text-center">Izin</TableHead>
                      <TableHead className="text-center">Sakit</TableHead>
                      <TableHead className="text-center">Alfa</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium">{r.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.nis_nip ?? "—"} ·{" "}
                            {ACCOUNT_TYPE_LABELS[r.account_type as AccountType] ?? r.account_type}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {[r.class, r.dorm, r.halaqoh].filter(Boolean).join(" · ") || "—"}
                        </TableCell>
                        <TableCell className="text-center">{r.hadir}</TableCell>
                        <TableCell className="text-center">{r.telat}</TableCell>
                        <TableCell className="text-center">{r.izin}</TableCell>
                        <TableCell className="text-center">{r.sakit}</TableCell>
                        <TableCell className="text-center">{r.alfa}</TableCell>
                        <TableCell className="text-center font-medium">{r.percent}%</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setDetailId(r.id)}>
                            Rincian
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Rincian presensi {detailQuery.data?.member?.name ?? ""} — {periodLabel}
            </DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Memuat rincian…
            </div>
          ) : detailQuery.isError ? (
            <p className="text-sm text-destructive">{(detailQuery.error as Error).message}</p>
          ) : (detailQuery.data?.items ?? []).length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <X className="size-4" /> Belum ada catatan presensi pada periode ini.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kegiatan</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detailQuery.data?.items ?? []).map((item: any, index: number) => (
                    <TableRow key={`${item.date}-${item.label}-${index}`}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>
                        {item.label}
                        {item.notes ? (
                          <span className="block text-xs text-muted-foreground">{item.notes}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.kind}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "Alfa" ? "destructive" : "secondary"}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
