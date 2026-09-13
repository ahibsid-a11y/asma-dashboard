import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  listAttendanceSessions,
  saveAttendanceSession,
} from "@/lib/attendance-sessions.functions";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/pengaturan-sesi")({
  head: () => ({
    meta: [
      { title: "Pengaturan Sesi Presensi | ASMA" },
      {
        name: "description",
        content:
          "Atur jadwal sesi presensi, batas tepat waktu, batas telat, dan pelanggaran otomatis di SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Pengaturan Sesi Presensi | ASMA" },
      {
        property: "og:description",
        content:
          "Atur jadwal sesi presensi, batas tepat waktu, batas telat, dan pelanggaran otomatis di SMPIT Putra Al-Hanif.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SessionSettingsPage,
});

const SESSION_ADMINS = ["super_admin", "mudir", "kepala_sekolah"];

type Session = {
  id: string;
  session_name: string;
  target_role: AccountType[];
  on_time_deadline: string;
  late_cutoff_time: string;
  is_exit: boolean;
  is_active: boolean;
  auto_violation_on_late: boolean;
  auto_violation_on_absent: boolean;
  violation_points_late: number;
  violation_points_absent: number;
  sort_order: number;
};

const hhmm = (value: string) => value.slice(0, 5);

function SessionSettingsPage() {
  const profileQuery = useCurrentProfile();
  const accountType = profileQuery.data?.account_type ?? null;
  const allowed = SESSION_ADMINS.includes(accountType ?? "");

  const queryClient = useQueryClient();
  const fetchSessions = useServerFn(listAttendanceSessions);
  const submitSession = useServerFn(saveAttendanceSession);

  const sessionsQuery = useQuery({
    queryKey: ["attendance-sessions"],
    queryFn: () => fetchSessions({}) as Promise<Session[]>,
    enabled: allowed,
  });

  const [draft, setDraft] = useState<Session[]>([]);
  useEffect(() => {
    if (sessionsQuery.data) {
      setDraft(
        sessionsQuery.data.map((s) => ({
          ...s,
          on_time_deadline: hhmm(s.on_time_deadline),
          late_cutoff_time: hhmm(s.late_cutoff_time),
        })),
      );
    }
  }, [sessionsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (session: Session) =>
      submitSession({
        data: {
          id: session.id,
          session_name: session.session_name,
          target_role: session.target_role,
          on_time_deadline: session.on_time_deadline,
          late_cutoff_time: session.late_cutoff_time,
          is_exit: session.is_exit,
          is_active: session.is_active,
          auto_violation_on_late: session.auto_violation_on_late,
          auto_violation_on_absent: session.auto_violation_on_absent,
          violation_points_late: session.violation_points_late,
          violation_points_absent: session.violation_points_absent,
        },
      }),
    onSuccess: async () => {
      toast.success("Sesi presensi diperbarui");
      await queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function update(id: string, patch: Partial<Session>) {
    setDraft((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <AppShell accountType={accountType}>
      <div className="border-b border-border pb-5">
        <p className="mb-1 text-xs font-bold uppercase text-accent">Presensi</p>
        <h1 className="text-2xl font-extrabold text-foreground">Pengaturan Sesi Presensi</h1>
      </div>

      {profileQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
      ) : !allowed ? (
        <p className="mt-6 rounded-xl border border-border bg-card p-6 text-sm font-medium text-muted-foreground">
          Halaman ini hanya dapat diakses oleh Super Admin, Mudir, dan Kepala Sekolah.
        </p>
      ) : (
        <>
          <div className="mt-6 flex gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-accent" />
            <p className="text-sm font-medium text-foreground">
              <strong>Catatan penting:</strong> jam batas telat saat ini masih ASUMSI AWAL (15 menit
              setelah jam tepat waktu). Jam ini WAJIB dikonfirmasi ulang dan disesuaikan oleh admin
              sekolah sebelum dipakai untuk penilaian. Sesi yang disimpan di sini otomatis dipakai
              oleh fitur scan RFID pada tahap berikutnya.
            </p>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-52">Nama Sesi</TableHead>
                  <TableHead className="min-w-40">Berlaku Untuk</TableHead>
                  <TableHead>Tepat Waktu</TableHead>
                  <TableHead>Batas Telat</TableHead>
                  <TableHead>Aktif</TableHead>
                  <TableHead className="min-w-40">Pelanggaran Telat</TableHead>
                  <TableHead className="min-w-40">Pelanggaran Alfa</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Memuat data…
                    </TableCell>
                  </TableRow>
                ) : (
                  draft.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Input
                          value={s.session_name}
                          aria-label={`Nama sesi ${s.session_name}`}
                          onChange={(e) => update(s.id, { session_name: e.target.value })}
                        />
                        {s.is_exit && (
                          <span className="mt-1 inline-block text-[10px] font-bold uppercase text-accent">
                            Sesi Pulang
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {s.target_role.map((r) => ACCOUNT_TYPE_LABELS[r] ?? r).join(", ")}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          className="w-28"
                          aria-label={`Jam tepat waktu ${s.session_name}`}
                          value={s.on_time_deadline}
                          onChange={(e) => update(s.id, { on_time_deadline: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          className="w-28"
                          aria-label={`Jam batas telat ${s.session_name}`}
                          value={s.late_cutoff_time}
                          onChange={(e) => update(s.id, { late_cutoff_time: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={s.is_active}
                          aria-label={`Aktifkan ${s.session_name}`}
                          onCheckedChange={(v) => update(s.id, { is_active: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={s.auto_violation_on_late}
                            aria-label={`Pelanggaran otomatis telat ${s.session_name}`}
                            onCheckedChange={(v) => update(s.id, { auto_violation_on_late: v })}
                          />
                          <Input
                            type="number"
                            min={0}
                            className="w-20"
                            aria-label={`Poin telat ${s.session_name}`}
                            value={s.violation_points_late}
                            onChange={(e) =>
                              update(s.id, { violation_points_late: Number(e.target.value) || 0 })
                            }
                          />
                          <span className="text-xs text-muted-foreground">poin</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={s.auto_violation_on_absent}
                            aria-label={`Pelanggaran otomatis alfa ${s.session_name}`}
                            onCheckedChange={(v) => update(s.id, { auto_violation_on_absent: v })}
                          />
                          <Input
                            type="number"
                            min={0}
                            className="w-20"
                            aria-label={`Poin alfa ${s.session_name}`}
                            value={s.violation_points_absent}
                            onChange={(e) =>
                              update(s.id, {
                                violation_points_absent: Number(e.target.value) || 0,
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground">poin</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          disabled={saveMutation.isPending}
                          onClick={() => saveMutation.mutate(s)}
                        >
                          <Save /> Simpan
                        </Button>
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
