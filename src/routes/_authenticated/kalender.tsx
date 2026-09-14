import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { supabase } from "@/integrations/supabase/client";
import { isCalendarAdmin, listCalendarCandidates } from "@/lib/calendar.functions";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/kalender")({
  head: () => ({
    meta: [
      { title: "Kalender Pendidikan | ASMA" },
      {
        name: "description",
        content: "Agenda harian, pekanan, dan bulanan kegiatan SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Kalender Pendidikan | ASMA" },
      {
        property: "og:description",
        content: "Agenda harian, pekanan, dan bulanan kegiatan SMPIT Putra Al-Hanif.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

type View = "hari" | "pekan" | "bulan";

type CalEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  color: string;
  target_type: "ALL" | "ROLE" | "USERS";
  target_roles: string[];
  target_user_ids: string[];
  created_by: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (iso: string) => new Date(`${iso}T00:00:00`);
const addDays = (iso: string, n: number) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
const mondayOf = (iso: string) => addDays(iso, -((parseISO(iso).getDay() + 6) % 7));

const DAY_NAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Ahad"];
const START_HOUR = 0;
const END_HOUR = 23;
const HOUR_PX = 56;

const COLORS = [
  { value: "primary", label: "Biru tua", chip: "bg-primary/12 text-primary border-primary/25", dot: "bg-primary" },
  { value: "accent", label: "Oranye", chip: "bg-accent/15 text-accent border-accent/30", dot: "bg-accent" },
  { value: "emerald", label: "Hijau", chip: "bg-emerald-500/12 text-emerald-700 border-emerald-500/25", dot: "bg-emerald-500" },
  { value: "violet", label: "Ungu", chip: "bg-violet-500/12 text-violet-700 border-violet-500/25", dot: "bg-violet-500" },
  { value: "rose", label: "Merah", chip: "bg-rose-500/12 text-rose-700 border-rose-500/25", dot: "bg-rose-500" },
];
const colorOf = (c: string) => COLORS.find((x) => x.value === c) ?? COLORS[0]!;

const minutesOf = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : null);

const emptyForm = (date: string) => ({
  id: null as string | null,
  title: "",
  description: "",
  location: "",
  event_date: date,
  all_day: false,
  start_time: "08:00",
  end_time: "09:00",
  color: "primary",
  target_type: "ALL" as CalEvent["target_type"],
  target_roles: [] as string[],
  target_user_ids: [] as string[],
});

function CalendarPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const accountType = profile?.account_type ?? null;
  const canManage = isCalendarAdmin(accountType);
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("bulan");
  const [anchor, setAnchor] = useState(toISO(new Date()));
  const [form, setForm] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [detail, setDetail] = useState<CalEvent | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const range = useMemo(() => {
    if (view === "hari") return { from: anchor, to: anchor };
    if (view === "pekan") {
      const from = mondayOf(anchor);
      return { from, to: addDays(from, 6) };
    }
    const d = parseISO(anchor);
    const first = toISO(new Date(d.getFullYear(), d.getMonth(), 1));
    const from = mondayOf(first);
    return { from, to: addDays(from, 41) };
  }, [view, anchor]);

  const eventsQuery = useQuery({
    queryKey: ["calendar-events", range.from, range.to],
    queryFn: async (): Promise<CalEvent[]> => {
      const { data, error } = await (supabase.from("calendar_events" as any) as any)
        .select(
          "id,title,description,location,event_date,all_day,start_time,end_time,color,target_type,target_roles,target_user_ids,created_by",
        )
        .gte("event_date", range.from)
        .lte("event_date", range.to)
        .order("event_date", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as CalEvent[]).sort((a, b) =>
        a.event_date === b.event_date
          ? (minutesOf(a.start_time) ?? -1) - (minutesOf(b.start_time) ?? -1)
          : a.event_date < b.event_date
            ? -1
            : 1,
      );
    },
  });

  const fetchCandidates = useServerFn(listCalendarCandidates);
  const candidatesQuery = useQuery({
    queryKey: ["calendar-candidates"],
    queryFn: () => fetchCandidates({}) as Promise<any[]>,
    enabled: canManage && form !== null,
  });

  const saveMutation = useMutation({
    mutationFn: async (f: ReturnType<typeof emptyForm>) => {
      if (f.title.trim().length < 3) throw new Error("Judul kegiatan minimal 3 karakter");
      if (f.target_type === "ROLE" && f.target_roles.length === 0)
        throw new Error("Pilih minimal satu jabatan peserta");
      if (f.target_type === "USERS" && f.target_user_ids.length === 0)
        throw new Error("Pilih minimal satu anggota peserta");
      if (!f.all_day) {
        if (!f.start_time || !f.end_time) {
          throw new Error("Jam mulai dan jam selesai wajib diisi bila bukan agenda seharian");
        }
        if (f.end_time <= f.start_time) {
          throw new Error("Jam selesai harus setelah jam mulai");
        }
      }

      const payload = {
        title: f.title.trim(),
        description: f.description.trim() || null,
        location: f.location.trim() || null,
        event_date: f.event_date,
        all_day: f.all_day,
        start_time: f.all_day ? null : f.start_time || null,
        end_time: f.all_day ? null : f.end_time || null,
        color: f.color,
        target_type: f.target_type,
        target_roles: f.target_type === "ROLE" ? f.target_roles : [],
        target_user_ids: f.target_type === "USERS" ? f.target_user_ids : [],
      };
      const table = supabase.from("calendar_events" as any) as any;
      const { error } = f.id
        ? await table.update(payload).eq("id", f.id)
        : await table.insert({ ...payload, created_by: profile!.id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Agenda tersimpan");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("calendar_events" as any) as any)
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Agenda dihapus");
      setDetail(null);
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const events = eventsQuery.data ?? [];
  const byDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) map.set(e.event_date, [...(map.get(e.event_date) ?? []), e]);
    return map;
  }, [events]);

  const step = (dir: number) => {
    if (view === "hari") return setAnchor(addDays(anchor, dir));
    if (view === "pekan") return setAnchor(addDays(anchor, dir * 7));
    const d = parseISO(anchor);
    setAnchor(toISO(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
  };

  const headerLabel =
    view === "hari"
      ? parseISO(anchor).toLocaleDateString("id-ID", { dateStyle: "full" })
      : view === "pekan"
        ? `${parseISO(range.from).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${parseISO(range.to).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
        : parseISO(anchor).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const openCreate = (date?: string) => {
    setMemberSearch("");
    setForm(emptyForm(date ?? anchor));
  };
  const openEdit = (e: CalEvent) => {
    setMemberSearch("");
    setDetail(null);
    setForm({
      id: e.id,
      title: e.title,
      description: e.description ?? "",
      location: e.location ?? "",
      event_date: e.event_date,
      all_day: e.all_day,
      start_time: hhmm(e.start_time) ?? "08:00",
      end_time: hhmm(e.end_time) ?? "09:00",
      color: e.color,
      target_type: e.target_type,
      target_roles: e.target_roles ?? [],
      target_user_ids: e.target_user_ids ?? [],
    });
  };

  const today = toISO(new Date());
  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push(d);
    return out;
  }, [range]);

  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i),
    [],
  );

  const timedEvents = (date: string) =>
    (byDate.get(date) ?? []).filter((e) => !e.all_day && e.start_time);
  const allDayEvents = (date: string) =>
    (byDate.get(date) ?? []).filter((e) => e.all_day || !e.start_time);

  const timeGridDays = view === "hari" ? [anchor] : days;

  return (
    <AppShell accountType={accountType}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-accent">Agenda</p>
            <h1 className="text-2xl font-extrabold text-foreground">Kalender Pendidikan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Agenda kegiatan pesantren dan sekolah. Anda hanya melihat kegiatan yang ditujukan
              untuk Anda.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => openCreate()}>
              <CalendarPlus className="size-4" /> Agendakan kegiatan
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Sebelumnya">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Berikutnya">
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="ghost" onClick={() => setAnchor(today)}>
              Hari ini
            </Button>
          </div>
          <p className="text-base font-semibold capitalize">{headerLabel}</p>
          <div className="ms-auto flex items-center gap-2">
            {eventsQuery.isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="hari">Hari</TabsTrigger>
                <TabsTrigger value="pekan">Pekan</TabsTrigger>
                <TabsTrigger value="bulan">Bulan</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {eventsQuery.isError && (
          <p className="text-sm text-destructive">{(eventsQuery.error as Error).message}</p>
        )}

        {view === "bulan" ? (
          <Card className="overflow-hidden p-0">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="px-2 py-2 text-center text-xs font-semibold uppercase text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const inMonth = parseISO(d).getMonth() === parseISO(anchor).getMonth();
                const list = byDate.get(d) ?? [];
                return (
                  <div
                    key={d}
                    className={`min-h-24 border-b border-e border-border p-1.5 ${inMonth ? "" : "bg-muted/30"}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setAnchor(d);
                        setView("hari");
                      }}
                      className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                        d === today
                          ? "bg-primary text-primary-foreground"
                          : inMonth
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {parseISO(d).getDate()}
                    </button>
                    <div className="space-y-1">
                      {list.slice(0, 3).map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setDetail(e)}
                          className={`block w-full truncate rounded-md border px-1.5 py-0.5 text-start text-[11px] font-medium ${colorOf(e.color).chip}`}
                        >
                          {e.all_day ? "" : `${hhmm(e.start_time)} `}
                          {e.title}
                        </button>
                      ))}
                      {list.length > 3 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAnchor(d);
                            setView("hari");
                          }}
                          className="text-[11px] text-muted-foreground hover:underline"
                        >
                          +{list.length - 3} lainnya
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="flex border-b border-border bg-muted/40">
              <div className="w-16 shrink-0" />
              {timeGridDays.map((d) => (
                <div key={d} className="min-w-0 flex-1 border-s border-border px-1.5 py-2 text-center">
                  <p className="text-[11px] uppercase text-muted-foreground">
                    {DAY_NAMES[(parseISO(d).getDay() + 6) % 7]}
                  </p>
                  <p
                    className={`mx-auto mt-1 flex size-7 items-center justify-center rounded-full text-sm font-semibold ${
                      d === today ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    {parseISO(d).getDate()}
                  </p>
                  <div className="mt-1 space-y-1">
                    {allDayEvents(d).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setDetail(e)}
                        className={`block w-full truncate rounded-md border px-1.5 py-0.5 text-start text-[11px] font-medium ${colorOf(e.color).chip}`}
                      >
                        {e.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="flex">
                <div className="sticky start-0 z-10 w-16 shrink-0 bg-card">
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="flex items-start justify-end border-b border-e border-border pe-2 pt-1 text-[11px] tabular-nums text-muted-foreground"
                      style={{ height: HOUR_PX }}
                    >
                      {pad(h)}:00
                    </div>
                  ))}
                </div>
                {timeGridDays.map((d) => (
                  <div key={d} className="relative min-w-0 flex-1 border-s border-border">
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="border-b border-border"
                        style={{ height: HOUR_PX }}
                        onDoubleClick={() => canManage && openCreate(d)}
                      />
                    ))}
                    {timedEvents(d).map((e) => {
                      const start = minutesOf(e.start_time) ?? START_HOUR * 60;
                      const end = minutesOf(e.end_time) ?? start + 60;
                      const top = ((start - START_HOUR * 60) / 60) * HOUR_PX;
                      const height = Math.max(24, ((end - start) / 60) * HOUR_PX - 2);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setDetail(e)}
                          className={`absolute inset-x-0.5 overflow-hidden rounded-md border px-1.5 py-1 text-start text-[11px] font-medium leading-tight shadow-sm ${colorOf(e.color).chip}`}
                          style={{ top, height }}
                        >
                          <span className="block truncate">{e.title}</span>
                          <span className="block truncate opacity-70">
                            {hhmm(e.start_time)}–{hhmm(e.end_time)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {!eventsQuery.isLoading && events.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada agenda pada periode ini.</p>
        )}
      </div>

      {/* Detail agenda */}
      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${colorOf(detail?.color ?? "primary").dot}`} />
              {detail?.title}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4" />
                {parseISO(detail.event_date).toLocaleDateString("id-ID", { dateStyle: "full" })}
                {detail.all_day
                  ? " · Seharian"
                  : ` · ${hhmm(detail.start_time)}–${hhmm(detail.end_time)}`}
              </p>
              {detail.location && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" /> {detail.location}
                </p>
              )}
              <p className="flex items-start gap-2 text-muted-foreground">
                <Users className="mt-0.5 size-4" />
                {detail.target_type === "ALL"
                  ? "Untuk seluruh anggota"
                  : detail.target_type === "ROLE"
                    ? detail.target_roles
                        .map((r) => ACCOUNT_TYPE_LABELS[r as AccountType] ?? r)
                        .join(", ")
                    : `${detail.target_user_ids.length} anggota terpilih`}
              </p>
              {detail.description && <p className="whitespace-pre-line">{detail.description}</p>}
            </div>
          )}
          {canManage && detail && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm("Hapus agenda ini?")) deleteMutation.mutate(detail.id);
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="size-4" /> Hapus
              </Button>
              <Button onClick={() => openEdit(detail)}>
                <Pencil className="size-4" /> Ubah
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Form agenda */}
      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Ubah agenda" : "Agendakan kegiatan"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Judul kegiatan</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Rapat Guru Pekanan"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Warna</Label>
                  <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="all-day"
                  checked={form.all_day}
                  onCheckedChange={(v) => setForm({ ...form, all_day: v })}
                />
                <Label htmlFor="all-day">Seharian penuh</Label>
              </div>
              {!form.all_day && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Jam mulai</Label>
                    <Input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jam selesai</Label>
                    <Input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Lokasi (opsional)</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Contoh: Masjid AHIBS"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Keterangan (opsional)</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Peserta kegiatan</Label>
                <Select
                  value={form.target_type}
                  onValueChange={(v) => setForm({ ...form, target_type: v as CalEvent["target_type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Seluruh anggota</SelectItem>
                    <SelectItem value="ROLE">Jabatan tertentu</SelectItem>
                    <SelectItem value="USERS">Anggota tertentu</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Agenda hanya tampil di kalender peserta yang dipilih.
                </p>
              </div>

              {form.target_type === "ROLE" && (
                <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
                  {ACCOUNT_TYPES.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.target_roles.includes(r)}
                        onCheckedChange={(v) =>
                          setForm({
                            ...form,
                            target_roles: v
                              ? [...form.target_roles, r]
                              : form.target_roles.filter((x) => x !== r),
                          })
                        }
                      />
                      {ACCOUNT_TYPE_LABELS[r]}
                    </label>
                  ))}
                </div>
              )}

              {form.target_type === "USERS" && (
                <div className="space-y-2">
                  <Input
                    placeholder="Cari nama anggota…"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                  <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border p-3">
                    {candidatesQuery.isLoading ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Memuat anggota…
                      </p>
                    ) : candidatesQuery.isError ? (
                      <p className="text-sm text-destructive">
                        {(candidatesQuery.error as Error).message}
                      </p>
                    ) : (
                      (candidatesQuery.data ?? [])
                        .filter((m: any) =>
                          (m.name ?? "").toLowerCase().includes(memberSearch.trim().toLowerCase()),
                        )
                        .slice(0, 200)
                        .map((m: any) => (
                          <label key={m.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={form.target_user_ids.includes(m.id)}
                              onCheckedChange={(v) =>
                                setForm({
                                  ...form,
                                  target_user_ids: v
                                    ? [...form.target_user_ids, m.id]
                                    : form.target_user_ids.filter((x) => x !== m.id),
                                })
                              }
                            />
                            <span className="flex-1">{m.name ?? "Tanpa nama"}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {ACCOUNT_TYPE_LABELS[m.account_type as AccountType] ?? "—"}
                            </Badge>
                          </label>
                        ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {form.target_user_ids.length} anggota terpilih
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Batal
            </Button>
            <Button
              onClick={() => form && saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />} Simpan agenda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
