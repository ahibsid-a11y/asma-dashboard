import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/absensi-diri")({
  head: () => ({
    meta: [
      { title: "Absensi Diri | ASMA" },
      {
        name: "description",
        content:
          "Rekap kehadiran pribadi harian, pekanan, dan bulanan dari kegiatan wajib dan insidental.",
      },
      { property: "og:title", content: "Absensi Diri | ASMA" },
      {
        property: "og:description",
        content:
          "Rekap kehadiran pribadi harian, pekanan, dan bulanan dari kegiatan wajib dan insidental.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SelfAttendancePage,
});

type Period = "harian" | "pekanan" | "bulanan";

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (iso: string) => new Date(`${iso}T00:00:00`);
const addDays = (iso: string, n: number) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
const mondayOf = (iso: string) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toISO(d);
};

const STATUS_STYLE: Record<string, string> = {
  Hadir: "bg-primary/10 text-primary border-primary/20",
  Telat: "bg-accent/15 text-accent border-accent/25",
  Izin: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  Sakit: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  Alfa: "bg-destructive/10 text-destructive border-destructive/20",
};

type Item = {
  date: string;
  kind: "Wajib" | "Insidental";
  label: string;
  status: string;
  notes: string | null;
  time: string | null;
};

function SelfAttendancePage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const accountType = profile?.account_type ?? null;

  const [period, setPeriod] = useState<Period>("pekanan");
  const [anchor, setAnchor] = useState(toISO(new Date()));

  const range = useMemo(() => {
    if (period === "harian") return { from: anchor, to: anchor };
    if (period === "pekanan") {
      const from = mondayOf(anchor);
      return { from, to: addDays(from, 6) };
    }
    const d = parseISO(anchor);
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: toISO(from), to: toISO(to) };
  }, [period, anchor]);

  const step = (dir: number) => {
    if (period === "harian") return setAnchor(addDays(anchor, dir));
    if (period === "pekanan") return setAnchor(addDays(anchor, dir * 7));
    const d = parseISO(anchor);
    setAnchor(toISO(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
  };

  const recapQuery = useQuery({
    queryKey: ["self-attendance", profile?.id, range.from, range.to],
    enabled: Boolean(profile?.id),
    queryFn: async (): Promise<Item[]> => {
      const userId = profile!.id;
      const fixed = await supabase
        .from("attendance_records")
        .select("attendance_date,status,notes,scan_time,attendance_sessions(session_name)")
        .eq("user_id", userId)
        .gte("attendance_date", range.from)
        .lte("attendance_date", range.to);
      if (fixed.error) throw new Error(fixed.error.message);

      const incidental = await supabase
        .from("incidental_attendance_records")
        .select("status,notes,incidental_attendance_events!inner(title,event_date)")
        .eq("user_id", userId)
        .gte("incidental_attendance_events.event_date", range.from)
        .lte("incidental_attendance_events.event_date", range.to);
      if (incidental.error) throw new Error(incidental.error.message);

      const items: Item[] = [
        ...((fixed.data ?? []) as any[]).map((r) => ({
          date: r.attendance_date as string,
          kind: "Wajib" as const,
          label: r.attendance_sessions?.session_name ?? "Sesi presensi",
          status: r.status as string,
          notes: (r.notes as string | null) ?? null,
          time: r.scan_time
            ? new Date(r.scan_time).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : null,
        })),
        ...((incidental.data ?? []) as any[]).map((r) => ({
          date: r.incidental_attendance_events?.event_date as string,
          kind: "Insidental" as const,
          label: r.incidental_attendance_events?.title ?? "Kegiatan insidental",
          status: r.status as string,
          notes: (r.notes as string | null) ?? null,
          time: null,
        })),
      ];
      return items.sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : a.label.localeCompare(b.label, "id"),
      );
    },
  });

  const items = recapQuery.data ?? [];

  const counts = useMemo(() => {
    const base = { Hadir: 0, Telat: 0, Izin: 0, Sakit: 0, Alfa: 0 };
    const rec = base as Record<string, number>;
    for (const it of items) {
      if (it.status in base) rec[it.status] = (rec[it.status] ?? 0) + 1;
    }
    return base;
  }, [items]);



  const total = items.length;
  const percent = total ? Math.round(((counts.Hadir + counts.Telat) / total) * 1000) / 10 : 0;

  const wajib = items.filter((i) => i.kind === "Wajib").length;
  const insidental = total - wajib;

  const series = useMemo(() => {
    const days: string[] = [];
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) days.push(d);
    const map = new Map(
      days.map((d) => [d, { label: d.slice(8, 10), Hadir: 0, Telat: 0, Izin: 0, Sakit: 0, Alfa: 0 }]),
    );
    for (const it of items) {
      const row = map.get(it.date) as any;
      if (row && it.status in row) row[it.status] += 1;
    }
    return [...map.values()];
  }, [items, range]);

  const pieData = [
    { name: "Hadir", value: counts.Hadir, fill: "var(--primary)" },
    { name: "Telat", value: counts.Telat, fill: "var(--accent)" },
    { name: "Izin", value: counts.Izin, fill: "#0284c7" },
    { name: "Sakit", value: counts.Sakit, fill: "#7c3aed" },
    { name: "Alfa", value: counts.Alfa, fill: "var(--destructive)" },
  ].filter((d) => d.value > 0);

  const periodLabel =
    period === "harian"
      ? parseISO(anchor).toLocaleDateString("id-ID", { dateStyle: "full" })
      : period === "pekanan"
        ? `${parseISO(range.from).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${parseISO(range.to).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
        : parseISO(range.from).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <AppShell accountType={accountType}>
      <div className="space-y-6">
        <div className="border-b border-border pb-5">
          <p className="mb-1 text-xs font-bold uppercase text-accent">Kehadiran</p>
          <h1 className="text-2xl font-extrabold text-foreground">Absensi Diri</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rekap kehadiran pribadi {profile?.name ? `— ${profile.name}` : ""} dari kegiatan wajib
            dan kegiatan insidental.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="harian">Harian</TabsTrigger>
                <TabsTrigger value="pekanan">Pekanan</TabsTrigger>
                <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Sebelumnya">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Berikutnya">
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="ghost" onClick={() => setAnchor(toISO(new Date()))}>
                Hari ini
              </Button>
            </div>
            <Input
              type="date"
              className="w-44"
              value={anchor}
              onChange={(e) => e.target.value && setAnchor(e.target.value)}
            />
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="size-4 text-primary" /> {periodLabel}
            </span>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Persentase kehadiran</p>
              <p className="mt-1 text-3xl font-semibold text-primary">{percent}%</p>
              <p className="mt-1 text-xs text-muted-foreground">{total} catatan presensi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Hadir / Telat</p>
              <p className="mt-1 text-3xl font-semibold">
                {counts.Hadir}
                <span className="text-muted-foreground"> / {counts.Telat}</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Izin / Sakit</p>
              <p className="mt-1 text-3xl font-semibold">
                {counts.Izin}
                <span className="text-muted-foreground"> / {counts.Sakit}</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Alfa</p>
              <p className="mt-1 text-3xl font-semibold text-destructive">{counts.Alfa}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {wajib} wajib · {insidental} insidental
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tren kehadiran per hari</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {series.every((s) => s.Hadir + s.Telat + s.Izin + s.Sakit + s.Alfa === 0) ? (
                <p className="text-sm text-muted-foreground">Belum ada data pada periode ini.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Hadir" stackId="a" fill="var(--primary)" />
                    <Bar dataKey="Telat" stackId="a" fill="var(--accent)" />
                    <Bar dataKey="Izin" stackId="a" fill="#0284c7" />
                    <Bar dataKey="Sakit" stackId="a" fill="#7c3aed" />
                    <Bar dataKey="Alfa" stackId="a" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Komposisi status</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada data.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                      {pieData.map((d) => (
                        <Cell key={d.name} fill={d.fill} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rincian presensi</CardTitle>
          </CardHeader>
          <CardContent>
            {recapQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Memuat rekap…
              </div>
            ) : recapQuery.isError ? (
              <p className="text-sm text-destructive">{(recapQuery.error as Error).message}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada catatan presensi pada periode ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Kegiatan</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Jam</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it, i) => (
                      <TableRow key={`${it.date}-${it.label}-${i}`}>
                        <TableCell className="whitespace-nowrap">
                          {parseISO(it.date).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{it.label}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{it.kind}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{it.time ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_STYLE[it.status] ?? ""}>
                            {it.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{it.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
