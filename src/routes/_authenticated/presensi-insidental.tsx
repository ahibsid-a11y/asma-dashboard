import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { CalendarPlus, Pencil, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import {
  deleteIncidentalEvent,
  listIncidentalCandidates,
  listIncidentalEvents,
  listIncidentalRoster,
  saveIncidentalAttendance,
  saveIncidentalEvent,
} from "@/lib/incidental.functions";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/presensi-insidental")({
  head: () => ({
    meta: [
      { title: "Presensi Insidental | ASMA" },
      {
        name: "description",
        content:
          "Buat kegiatan insidental dan catat kehadiran anggota secara manual (Hadir, Izin, Sakit, Alfa) di SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Presensi Insidental | ASMA" },
      {
        property: "og:description",
        content:
          "Buat kegiatan insidental dan catat kehadiran anggota secara manual tanpa scan RFID.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncidentalPage,
});

const STATUSES = ["Hadir", "Izin", "Sakit", "Alfa"] as const;
type Status = (typeof STATUSES)[number];

const TARGET_ROLE_OPTIONS = ACCOUNT_TYPES;

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  created_by: string;
  target_type: "ROLE" | "USERS";
  target_roles: AccountType[];
  target_user_ids: string[];
  creator_name: string;
  can_manage: boolean;
};

type Member = {
  id: string;
  name: string | null;
  nis_nip: string | null;
  account_type: AccountType | null;
  class: string | null;
  dorm: string | null;
  halaqoh: string | null;
  status: Status | null;
  notes: string | null;
};

const todayJakarta = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const emptyForm = () => ({
  id: undefined as string | undefined,
  title: "",
  description: "",
  event_date: todayJakarta(),
  target_type: "ROLE" as "ROLE" | "USERS",
  target_roles: [] as AccountType[],
  target_user_ids: [] as string[],
});

function IncidentalPage() {
  const profileQuery = useCurrentProfile();
  const accountType = profileQuery.data?.account_type ?? null;
  const allowed = !!accountType && accountType !== "santri";

  const queryClient = useQueryClient();
  const fetchEvents = useServerFn(listIncidentalEvents);
  const fetchCandidates = useServerFn(listIncidentalCandidates);
  const fetchRoster = useServerFn(listIncidentalRoster);
  const submitEvent = useServerFn(saveIncidentalEvent);
  const removeEvent = useServerFn(deleteIncidentalEvent);
  const submitAttendance = useServerFn(saveIncidentalAttendance);

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");

  const eventsQuery = useQuery({
    queryKey: ["incidental-events"],
    queryFn: () => fetchEvents({}) as Promise<EventRow[]>,
    enabled: allowed,
  });

  const candidatesQuery = useQuery({
    queryKey: ["incidental-candidates"],
    queryFn: () => fetchCandidates({}) as Promise<Member[]>,
    enabled: allowed && showForm && form.target_type === "USERS",
  });

  const rosterQuery = useQuery({
    queryKey: ["incidental-roster", selectedEventId],
    queryFn: () =>
      fetchRoster({ data: { event_id: selectedEventId! } }) as unknown as Promise<{
        event: EventRow;
        members: Member[];
      }>,
    enabled: allowed && !!selectedEventId,
  });

  const saveEventMutation = useMutation({
    mutationFn: () =>
      submitEvent({
        data: {
          id: form.id,
          title: form.title,
          description: form.description,
          event_date: form.event_date,
          target_type: form.target_type,
          target_roles: form.target_roles,
          target_user_ids: form.target_user_ids,
        },
      }) as Promise<{ id: string }>,
    onSuccess: async (result) => {
      toast.success(form.id ? "Kegiatan diperbarui" : "Kegiatan dibuat");
      setShowForm(false);
      setForm(emptyForm());
      setSelectedEventId(result.id);
      await queryClient.invalidateQueries({ queryKey: ["incidental-events"] });
      await queryClient.invalidateQueries({ queryKey: ["incidental-roster", result.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeEvent({ data: { id } }),
    onSuccess: async (_r, id) => {
      toast.success("Kegiatan dihapus");
      if (selectedEventId === id) setSelectedEventId(null);
      await queryClient.invalidateQueries({ queryKey: ["incidental-events"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markMutation = useMutation({
    mutationFn: (input: { user_id: string; status: Status }) =>
      submitAttendance({
        data: { event_id: selectedEventId!, user_id: input.user_id, status: input.status },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["incidental-roster", selectedEventId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filteredCandidates = useMemo(() => {
    const rows = candidatesQuery.data ?? [];
    const q = memberSearch.trim().toLowerCase();
    if (!q) return rows.slice(0, 60);
    return rows
      .filter(
        (m) =>
          (m.name ?? "").toLowerCase().includes(q) || (m.nis_nip ?? "").toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [candidatesQuery.data, memberSearch]);

  const roster = useMemo(() => {
    const rows = rosterQuery.data?.members ?? [];
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (m) => (m.name ?? "").toLowerCase().includes(q) || (m.nis_nip ?? "").toLowerCase().includes(q),
    );
  }, [rosterQuery.data, rosterSearch]);

  const summary = useMemo(() => {
    const rows = rosterQuery.data?.members ?? [];
    return {
      total: rows.length,
      Hadir: rows.filter((m) => m.status === "Hadir").length,
      Izin: rows.filter((m) => m.status === "Izin").length,
      Sakit: rows.filter((m) => m.status === "Sakit").length,
      Alfa: rows.filter((m) => m.status === "Alfa").length,
      belum: rows.filter((m) => !m.status).length,
    };
  }, [rosterQuery.data]);

  function startEdit(event: EventRow) {
    setForm({
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      event_date: event.event_date,
      target_type: event.target_type,
      target_roles: event.target_roles ?? [],
      target_user_ids: event.target_user_ids ?? [],
    });
    setShowForm(true);
  }

  function toggleRole(role: AccountType) {
    setForm((f) => ({
      ...f,
      target_roles: f.target_roles.includes(role)
        ? f.target_roles.filter((r) => r !== role)
        : [...f.target_roles, role],
    }));
  }

  function toggleUser(id: string) {
    setForm((f) => ({
      ...f,
      target_user_ids: f.target_user_ids.includes(id)
        ? f.target_user_ids.filter((u) => u !== id)
        : [...f.target_user_ids, id],
    }));
  }

  return (
    <AppShell accountType={accountType}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-accent">Presensi</p>
          <h1 className="text-2xl font-extrabold text-foreground">Presensi Insidental</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kegiatan di luar jadwal rutin. Kehadiran dicentang manual, tanpa scan kartu RFID.
          </p>
        </div>
        {allowed && (
          <Button
            type="button"
            onClick={() => {
              setForm(emptyForm());
              setShowForm((v) => !v);
            }}
          >
            <CalendarPlus /> Kegiatan Baru
          </Button>
        )}
      </div>

      {profileQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
      ) : !allowed ? (
        <p className="mt-6 rounded-xl border border-border bg-card p-6 text-sm font-medium text-muted-foreground">
          Halaman ini tidak tersedia untuk akun santri.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {showForm && (
            <form
              className="space-y-4 rounded-xl border border-border bg-card p-5"
              onSubmit={(e) => {
                e.preventDefault();
                saveEventMutation.mutate();
              }}
            >
              <h2 className="text-lg font-bold text-foreground">
                {form.id ? "Ubah Kegiatan" : "Buat Kegiatan Baru"}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Judul kegiatan</Label>
                  <Input
                    id="title"
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Contoh: Rapat Guru Persiapan UAS"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event_date">Tanggal</Label>
                  <Input
                    id="event_date"
                    type="date"
                    required
                    value={form.event_date}
                    onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Keterangan (opsional)</Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Siapa yang wajib ikut?</Label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: "ROLE", label: "Berdasarkan Jabatan" },
                      { value: "USERS", label: "Pilih Anggota Tertentu" },
                    ] as const
                  ).map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={form.target_type === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setForm((f) => ({ ...f, target_type: opt.value }))}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {form.target_type === "ROLE" ? (
                <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3">
                  {TARGET_ROLE_OPTIONS.map((role) => (
                    <label key={role} className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={form.target_roles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                        aria-label={ACCOUNT_TYPE_LABELS[role]}
                      />
                      {ACCOUNT_TYPE_LABELS[role]}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Cari nama atau NIS/NIP…"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      aria-label="Cari anggota"
                    />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Terpilih: {form.target_user_ids.length} anggota
                  </p>
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {candidatesQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground">Memuat anggota…</p>
                    ) : (
                      filteredCandidates.map((m) => (
                        <label
                          key={m.id}
                          className="flex items-center gap-2 rounded-md px-1 py-1 text-sm"
                        >
                          <Checkbox
                            checked={form.target_user_ids.includes(m.id)}
                            onCheckedChange={() => toggleUser(m.id)}
                            aria-label={m.name ?? m.id}
                          />
                          <span className="font-medium">{m.name ?? "—"}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.account_type ? ACCOUNT_TYPE_LABELS[m.account_type] : "—"}
                            {m.nis_nip ? ` · ${m.nis_nip}` : ""}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={saveEventMutation.isPending}>
                  {saveEventMutation.isPending ? "Menyimpan…" : "Simpan Kegiatan"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
              </div>
            </form>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <div className="space-y-2">
              <h2 className="text-sm font-bold uppercase text-muted-foreground">Daftar Kegiatan</h2>
              {eventsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Memuat…</p>
              ) : (eventsQuery.data ?? []).length === 0 ? (
                <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  Belum ada kegiatan insidental.
                </p>
              ) : (
                (eventsQuery.data ?? []).map((ev) => (
                  <div
                    key={ev.id}
                    className={`rounded-xl border bg-card p-4 ${
                      selectedEventId === ev.id ? "border-accent" : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedEventId(ev.id)}
                    >
                      <p className="font-bold text-foreground">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ev.event_date} · oleh {ev.creator_name}
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        {ev.target_type === "ROLE"
                          ? `${(ev.target_roles ?? []).length} jabatan`
                          : `${(ev.target_user_ids ?? []).length} anggota`}
                      </Badge>
                    </button>
                    {ev.can_manage && (
                      <div className="mt-3 flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => startEdit(ev)}>
                          <Pencil /> Ubah
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(ev.id)}
                        >
                          <Trash2 /> Hapus
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              {!selectedEventId ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                  <Users className="size-8" />
                  <p className="text-sm font-medium">
                    Pilih kegiatan di sebelah kiri untuk mencentang kehadiran.
                  </p>
                </div>
              ) : rosterQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Memuat daftar anggota…</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">
                        {rosterQuery.data?.event.title}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {summary.total} anggota target · Hadir {summary.Hadir} · Izin {summary.Izin} ·
                        Sakit {summary.Sakit} · Alfa {summary.Alfa} · Belum dicatat {summary.belum}
                      </p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Cari anggota…"
                        value={rosterSearch}
                        onChange={(e) => setRosterSearch(e.target.value)}
                        aria-label="Cari anggota target"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {roster.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Tidak ada anggota aktif yang termasuk target kegiatan ini.
                      </p>
                    ) : (
                      roster.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                        >
                          <div>
                            <p className="font-semibold text-foreground">{m.name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.account_type ? ACCOUNT_TYPE_LABELS[m.account_type] : "—"}
                              {m.nis_nip ? ` · ${m.nis_nip}` : ""}
                              {m.class ? ` · ${m.class}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {STATUSES.map((s) => (
                              <Button
                                key={s}
                                type="button"
                                size="sm"
                                variant={m.status === s ? "default" : "outline"}
                                disabled={markMutation.isPending}
                                onClick={() => markMutation.mutate({ user_id: m.id, status: s })}
                              >
                                {s}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
