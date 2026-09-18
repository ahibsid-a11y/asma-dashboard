import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Heart,
  History,
  Layers,
  Loader2,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getStudentMaktabahVisitsFn } from "@/lib/library.functions";

export const Route = createFileRoute("/_authenticated/maktabah")({
  head: () => ({
    meta: [
      { title: "Maktabah & Literasi Santri | SIM-AHIBS" },
      {
        name: "description",
        content: "Portal pemantauan kehadiran dan aktivitas literasi santri di perpustakaan untuk santri dan orang tua.",
      },
      { property: "og:title", content: "Maktabah & Literasi Santri | SIM-AHIBS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: MaktabahPage,
});

function MaktabahPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;

  const fetchMaktabahVisits = useServerFn(getStudentMaktabahVisitsFn);
  const studentId = profile?.id || "";

  const maktabahQuery = useQuery({
    queryKey: ["student-maktabah-visits", studentId],
    queryFn: () => fetchMaktabahVisits({ data: { studentId } }),
    enabled: Boolean(studentId),
  });

  const data = maktabahQuery.data || {
    visits: [],
    totalVisits: 0,
    thisMonthVisits: 0,
    badgeTitle: "Pembaca Pemula",
    badgeLevel: "Bronze",
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Maktabah & Literasi Santri
            </h1>
            <p className="text-sm text-muted-foreground">
              Pemantauan data kehadiran, frekuensi membaca, dan aktivitas ananda di Perpustakaan Al-Hanif.
            </p>
          </div>
        </div>

        {/* Ringkasan Dashboard Literasi */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Kunjungan Maktabah</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">
                  {data.totalVisits} Kali
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Sepanjang tahun ajaran
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Kunjungan Bulan Ini</p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {data.thisMonthVisits} Kali
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Aktivitas literasi aktif
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Apresiasi Literasi</p>
                <h3 className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  {data.badgeTitle}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tingkat: <b>{data.badgeLevel}</b>
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Award className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIWAYAT LENGKAP KUNJUNGAN */}
        <Card className="border-border shadow-xs">
          <CardHeader className="p-4 bg-muted/20 border-b border-border/60">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Riwayat Kunjungan Perpustakaan Ananda
            </CardTitle>
            <CardDescription className="text-xs">
              Catatan waktu masuk, waktu keluar, dan tujuan berkunjung di Maktabah Al-Hanif yang dapat dipantau orang tua.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {maktabahQuery.isLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                Memuat riwayat kunjungan perpustakaan...
              </div>
            ) : data.visits.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <h4 className="font-bold text-sm text-foreground">Belum Ada Riwayat Kunjungan</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Kunjungan ananda ke perpustakaan akan otomatis tercatat ketika menempelkan kartu RFID santri.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground font-bold">
                      <th className="p-3">No</th>
                      <th className="p-3">Tanggal Kunjungan</th>
                      <th className="p-3">Waktu Masuk</th>
                      <th className="p-3">Waktu Keluar</th>
                      <th className="p-3">Keperluan / Aktivitas</th>
                      <th className="p-3">Metode Absensi</th>
                      <th className="p-3 text-center">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.visits.map((v: any, idx: number) => {
                      const checkInTime = new Date(v.check_in).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const checkOutTime = v.check_out
                        ? new Date(v.check_out).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : null;

                      return (
                        <tr key={v.id} className="border-b hover:bg-muted/10 transition-colors">
                          <td className="p-3 font-bold text-muted-foreground">{idx + 1}</td>
                          <td className="p-3 font-bold text-foreground">
                            {new Date(v.date).toLocaleDateString("id-ID", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </td>
                          <td className="p-3 font-semibold text-foreground">{checkInTime} WIB</td>
                          <td className="p-3 text-muted-foreground">
                            {checkOutTime ? (
                              `${checkOutTime} WIB`
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                                Sedang Membaca
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-foreground font-medium">{v.purpose}</td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-[9.5px] font-bold ${
                                v.method === "rfid"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {v.method === "rfid" ? "Scan RFID" : "Manual Petugas"}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[10.5px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Hadir Tercatat
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
