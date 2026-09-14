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
  assignRfidCard,
  listScanSessions,
  listTodayAttendance,
  processAbsentToday,
  scanAttendance,
  searchMembersForCard,
} from "@/lib/attendance.functions";

import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/scan-presensi")({
  head: () => ({
    meta: [
      { title: "Scan Presensi RFID | SIM-AHIBS" },
      {
        name: "description",
        content:
          "Catat kehadiran santri dan pegawai SMPIT Putra Al-Hanif dengan scan kartu RFID atau input manual.",
      },
      { property: "og:title", content: "Scan Presensi RFID | SIM-AHIBS" },
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
  ok: true;
  member: { id: string; name: string | null; nis_nip: string | null; account_type: string; class: string | null; dorm: string | null };
  status: "Hadir" | "Telat" | "Alfa";
  scan_time: string;
  violation_created: boolean;
  session_name: string;
};

type ScanFailure = {
  ok: false;
  reason: "unknown_card" | "inactive" | "wrong_session";
  code: string;
  message: string;
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

/** Efek suara audio untuk pembacaan RFID */
function playChime(type: "success" | "warning" | "error") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    if (type === "success") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  } catch {
    // Abaikan bila audio dicegah browser
  }
}

function ScanPresensiPage() {
  const profileQuery = useCurrentProfile();
  const accountType = profileQuery.data?.account_type ?? null;
  const allowed = (ATTENDANCE_OFFICER_TYPES as readonly string[]).includes(accountType ?? "");

  const queryClient = useQueryClient();
  const fetchSessions = useServerFn(listScanSessions);
  const fetchToday = useServerFn(listTodayAttendance);
  const submitScan = useServerFn(scanAttendance);
  const runAbsent = useServerFn(processAbsentToday);
  const fetchCandidates = useServerFn(searchMembersForCard);
  const submitAssign = useServerFn(assignRfidCard);

  const isMemberAdmin = ["super_admin", "mudir", "kepala_sekolah", "kepala_tu"].includes(
    accountType ?? "",
  );

  const [sessionId, setSessionId] = useState("");
  const [card, setCard] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [unknownCard, setUnknownCard] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState("");
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

  const candidatesQuery = useQuery({
    queryKey: ["card-candidates", sessionId],
    queryFn: () => fetchCandidates({ data: { session_id: sessionId } }) as Promise<any[]>,
    enabled: allowed && isMemberAdmin && !!sessionId && !!unknownCard,
  });

  const scanMutation = useMutation({
    mutationFn: (rfid: string) =>
      submitScan({ data: { session_id: sessionId, rfid_card: rfid } }) as Promise<
        ScanResult | ScanFailure
      >,
    onSuccess: async (result) => {
      setCard("");
      inputRef.current?.focus();
      if (!result.ok) {
        playChime("warning");
        toast.error(result.message);
        setUnknownCard(result.reason === "unknown_card" ? result.code : null);
        setAssignTo("");
        return;
      }
      playChime("success");
      setUnknownCard(null);
      setResults((prev) => [result, ...prev].slice(0, 20));
      toast.success(`${result.member.name ?? "Anggota"} — ${result.status}`);
      await queryClient.invalidateQueries({ queryKey: ["attendance-today", sessionId] });
    },
    onError: (error: Error) => {
      playChime("error");
      toast.error(error.message);
      setCard("");
      inputRef.current?.focus();
    },
  });

  // Global listener khusus USB RFID Reader (HID Keyboard emulation)
  useEffect(() => {
    let rfidBuffer = "";
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isOtherInput =
        activeEl &&
        activeEl.id !== "rfid" &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable);

      if (isOtherInput) return;

      const now = Date.now();
      const interval = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === "Enter") {
        const scanned = rfidBuffer.trim();
        if (scanned.length >= 3) {
          e.preventDefault();
          if (!sessionId) {
            toast.error("Pilih sesi presensi terlebih dahulu");
            playChime("warning");
            rfidBuffer = "";
            return;
          }
          setCard(scanned);
          scanMutation.mutate(scanned);
        }
        rfidBuffer = "";
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (interval > 180 && activeEl?.id !== "rfid") {
          rfidBuffer = e.key;
        } else {
          rfidBuffer += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [sessionId, scanMutation]);

  // Kembalikan fokus otomatis ke input scan saat layar diklik di area kosong
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isInteractive = target.closest("button, a, input, select, textarea, [role='button'], [role='combobox'], [role='option'], [role='dialog']");
      if (!isInteractive && inputRef.current) {
        inputRef.current.focus();
      }
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  const assignMutation = useMutation({
    mutationFn: async (vars: { user_id: string; rfid_card: string }) => {
      await submitAssign({ data: vars });
      return vars.rfid_card;
    },
    onSuccess: async (rfid) => {
      toast.success("Kartu berhasil didaftarkan, mencatat presensi…");
      setUnknownCard(null);
      setAssignTo("");
      await queryClient.invalidateQueries({ queryKey: ["card-candidates", sessionId] });
      scanMutation.mutate(rfid);
    },
    onError: (error: Error) => toast.error(error.message),
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
                  if (!sessionId) {
                    toast.error("Pilih sesi presensi terlebih dahulu");
                    return;
                  }
                  if (!card.trim()) return;
                  scanMutation.mutate(card.trim());
                }}
              >
                <Label htmlFor="rfid">Nomor kartu RFID atau nomor induk</Label>
                <div className="flex gap-2">
                  <Input
                    id="rfid"
                    ref={inputRef}
                    autoFocus
                    autoComplete="off"
                    placeholder="Tempel kartu, atau ketik nomor kartu / NIS/NIY…"
                    value={card}
                    onChange={(e) => setCard(e.target.value)}
                  />
                  <Button type="submit" disabled={scanMutation.isPending}>
                    <ScanLine /> Catat
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Alat pembaca RFID biasanya mengirim nomor kartu lalu menekan Enter otomatis. Bila
                  kartu belum terdaftar, Anda tetap bisa mengetik nomor induk (NIS/NIY) anggota.
                </p>
              </form>

              {unknownCard && (
                <div className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-4">
                  <p className="text-sm font-bold text-foreground">
                    Kartu "{unknownCard}" belum terdaftar
                  </p>
                  {isMemberAdmin ? (
                    <>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pilih anggota pemilik kartu ini, lalu kartu langsung didaftarkan dan
                        presensinya dicatat.
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Select value={assignTo} onValueChange={setAssignTo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih anggota…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(candidatesQuery.data ?? []).map((m: any) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name ?? "Tanpa nama"}
                                {m.nis_nip ? ` · ${m.nis_nip}` : ""}
                                {m.rfid_card ? " (sudah ada kartu)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          disabled={!assignTo || assignMutation.isPending}
                          onClick={() =>
                            assignMutation.mutate({ user_id: assignTo, rfid_card: unknownCard })
                          }
                        >
                          Daftarkan & Catat
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setUnknownCard(null)}>
                          Tutup
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Minta admin (Super Admin / Mudir / Kepala Sekolah / Kepala TU) mendaftarkan
                      nomor kartu ini pada data anggota, atau ketik nomor induk anggota untuk
                      mencatat presensi sekarang.
                    </p>
                  )}
                </div>
              )}


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
