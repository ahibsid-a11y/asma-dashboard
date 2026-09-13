import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ScanLine, Zap } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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
import {
  ATTENDANCE_OFFICER_TYPES,
  listScanSessions,
  listTodayAttendance,
  processAbsentToday,
  scanAttendance,
} from "@/lib/attendance.functions";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/scan-presensi")({
  head: () => ({
    meta: [
      { title: "Scan Presensi RFID | ASMA" },
      {
        name: "description",
        content:
          "Catat kehadiran santri dan pegawai SMPIT Putra Al-Hanif dengan scan kartu RFID atau input manual.",
      },
      { property: "og:title", content: "Scan Presensi RFID | ASMA" },
      {
        property: "og:description",
        content:
          "Catat kehadiran santri dan pegawai SMPIT Putra Al-Hanif dengan scan kartu RFID atau input manual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPresensiPage,
});

type ScanSession = {
  id: string;
  session_name: string;
  target_role: AccountType[];
  on_time_deadline: string;
  late_cutoff_time: string;
  is_exit: boolean;
  is_current: boolean;
};

type ScanResult = {
  member: { id: string; name: string | null; nis_nip: string | null; account_type: string; class: string | null; dorm: string | null };
  status: "Hadir" | "Telat" | "Alfa";
  scan_time: string;
  violation_created: boolean;
  session_name: string;
};

const hhmm = (v: string) => v.slice(0, 5);

const jam = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const STATUS_STYLE: Record<string, string> = {
  Hadir: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Telat: "bg-accent/20 text-accent",
  Alfa: "bg-destructive/15 text-destructive",
};

function ScanPresensiPage() {
  const profileQuery = useCurrentProfile();
  const accountType = profileQuery.data?.account_type ?? null;
  const allowed = (ATTENDANCE_OFFICER_TYPES as readonly string[]).includes(accountType ?? "");

  const queryClient = useQueryClient();
  const fetchSessions = useServerFn(listScanSessions);
  const fetchToday = useServerFn(listTodayAttendance);
  const submitScan = useServerFn(scanAttendance);
  const runAbsent = useServerFn(processAbsentToday);

  const [sessionId, setSessionId] = useState("");
  const [card, setCard] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const sessionsQuery = useQuery({
    queryKey: ["scan-sessions"],
    queryFn: () => fetchSessions({}) as Promise<ScanSession[]>,
    enabled: allowed,
  });

  const sessions = sessionsQuery.data ?? [];
  const visibleSessions = showAll ? sessions : sessions.filter((s) => s.is_current);

  useEffect(() => {
    if (!sessionId && visibleSessions.length > 0) setSessionId(visibleSessions[0]!.id);
  }, [visibleSessions, sessionId]);

  const todayQuery = useQuery({
    queryKey: ["attendance-today", sessionId],
    queryFn: () => fetchToday({ data: { session_id: sessionId } }) as Promise<any[]>,
    enabled: allowed && !!sessionId,
  });

  const scanMutation = useMutation({
    mutationFn: (rfid: string) =>
      submitScan({ data: { session_id: sessionId, rfid_card: rfid } }) as Promise<ScanResult>,
    onSuccess: async (result) => {
      setResults((prev) => [result, ...prev].slice(0, 20));
      setCard("");
      inputRef.current?.focus();
      toast.success(`${result.member.name ?? "Anggota"} — ${result.status}`);
      await queryClient.invalidateQueries({ queryKey: ["attendance-today", sessionId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setCard("");
      inputRef.current?.focus();
    },
  });

  const absentMutation = useMutation({
    mutationFn: () => runAbsent({ data: { session_id: sessionId || undefined } }) as Promise<any>,
    onSuccess: async (r) => {
      toast.success(
        `${r.marked} anggota ditandai Alfa, ${r.violations} pelanggaran otomatis dibuat.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["attendance-today", sessionId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const selected = sessions.find((s) => s.id === sessionId);

  return (
    <AppShell accountType={accountType}>
      <div className="border-b border-border pb-5">
        <p className="mb-1 text-xs font-bold uppercase text-accent">Kehadiran</p>
        <h1 className="text-2xl font-extrabold text-foreground">Scan Presensi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tempelkan kartu RFID pada alat pembaca, atau ketik nomor kartu secara manual.
        </p>
      </div>

      {profileQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
      ) : !allowed ? (
        <p className="mt-6 rounded-xl border border-border bg-card p-6 text-sm font-medium text-muted-foreground">
          Halaman Scan Presensi tidak tersedia untuk akun Anda.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="sesi">Sesi presensi</Label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-accent underline"
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll ? "Hanya sesi berjalan" : "Tampilkan semua sesi"}
                  </button>
                </div>
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger id="sesi">
                    <SelectValue placeholder="Pilih sesi" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleSessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.session_name} · {hhmm(s.on_time_deadline)}
                        {s.is_exit ? " (pulang)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {visibleSessions.length === 0 && !sessionsQuery.isLoading && (
                  <p className="flex items-start gap-2 text-xs font-medium text-muted-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" />
                    Tidak ada sesi yang sedang berjalan saat ini. Pilih "Tampilkan semua sesi" untuk
                    mencatat sesi lain.
                  </p>
                )}
                {selected && (
                  <p className="text-xs text-muted-foreground">
                    Tepat waktu s.d. <strong>{hhmm(selected.on_time_deadline)}</strong> · Telat s.d.{" "}
                    <strong>{hhmm(selected.late_cutoff_time)}</strong> · Untuk:{" "}
                    {selected.target_role.map((r) => ACCOUNT_TYPE_LABELS[r] ?? r).join(", ")}
                  </p>
                )}
              </div>

              <form
                className="mt-5 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!sessionId) return toast.error("Pilih sesi presensi terlebih dahulu");
                  if (!card.trim()) return;
                  scanMutation.mutate(card.trim());
                }}
              >
                <Label htmlFor="rfid">Nomor kartu RFID</Label>
                <div className="flex gap-2">
                  <Input
                    id="rfid"
                    ref={inputRef}
                    autoFocus
                    autoComplete="off"
                    placeholder="Tempel kartu atau ketik nomor…"
                    value={card}
                    onChange={(e) => setCard(e.target.value)}
                  />
                  <Button type="submit" disabled={scanMutation.isPending}>
                    <ScanLine /> Catat
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Alat pembaca RFID biasanya mengirim nomor kartu lalu menekan Enter otomatis.
                </p>
              </form>

              <div className="mt-5 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={absentMutation.isPending}
                  onClick={() => absentMutation.mutate()}
                >
                  <Zap /> Proses Alfa Hari Ini
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Menandai Alfa untuk anggota yang belum tercatat setelah batas telat pada sesi
                  terpilih, dan membuat pelanggaran otomatis bila sesi mengaktifkannya.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold uppercase text-muted-foreground">Hasil scan terakhir</h2>
              {results.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Belum ada kartu yang discan.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {results.map((r, i) => (
                    <li
                      key={`${r.member.id}-${i}`}
                      className="flex items-start gap-3 rounded-lg border border-border p-3"
                    >
                      {r.status === "Hadir" ? (
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                      ) : (
                        <Clock className="mt-0.5 size-5 shrink-0 text-accent" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">
                          {r.member.name ?? "Tanpa nama"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ACCOUNT_TYPE_LABELS[r.member.account_type as AccountType] ??
                            r.member.account_type}
                          {r.member.class ? ` · ${r.member.class}` : ""} · {jam(r.scan_time)}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[r.status]}`}
                        >
                          {r.status}
                        </span>
                        {r.violation_created && (
                          <span className="ml-2 text-xs font-semibold text-destructive">
                            + pelanggaran otomatis
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Nomor Induk</TableHead>
                  <TableHead>Kelas / Asrama</TableHead>
                  <TableHead>Jam Scan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!sessionId || todayQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {sessionId ? "Memuat data…" : "Pilih sesi untuk melihat rekap hari ini."}
                    </TableCell>
                  </TableRow>
                ) : (todayQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Belum ada catatan presensi untuk sesi ini hari ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  (todayQuery.data ?? []).map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold">{row.profiles?.name ?? "-"}</TableCell>
                      <TableCell>{row.profiles?.nis_nip ?? "-"}</TableCell>
                      <TableCell>{row.profiles?.class ?? row.profiles?.dorm ?? "-"}</TableCell>
                      <TableCell>{row.scan_time ? jam(row.scan_time) : "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[row.status]}`}
                        >
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.notes ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </AppShell>
  );
}
