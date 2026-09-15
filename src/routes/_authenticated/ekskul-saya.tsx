import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Activity,
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  FileCheck2,
  GraduationCap,
  HelpCircle,
  Loader2,
  MapPin,
  Sparkles,
  UserCheck,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getStudentEkskulPortalDataFn } from "@/lib/ekskul.functions";

export const Route = createFileRoute("/_authenticated/ekskul-saya")({
  head: () => ({
    meta: [
      { title: "Ekstrakurikuler Saya | SIM-AHIBS" },
      {
        name: "description",
        content: "Pantau riwayat absensi kegiatan, status pembayaran iuran, jadwal latihan, dan nilai capaian ekstrakurikuler santri.",
      },
      { property: "og:title", content: "Ekstrakurikuler Saya | SIM-AHIBS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: EkskulSayaPage,
});

function EkskulSayaPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;

  const fetchPortalData = useServerFn(getStudentEkskulPortalDataFn);

  const [selectedSemester, setSelectedSemester] = useState<string>("1");
  const [selectedYear, setSelectedYear] = useState<string>("2026/2027");

  const studentId = profile?.id || "";

  const portalQuery = useQuery({
    queryKey: ["my-ekskul-portal-full", studentId, selectedSemester, selectedYear],
    queryFn: () =>
      fetchPortalData({
        data: {
          studentId,
          semester: selectedSemester,
          academicYear: selectedYear,
        },
      }),
    enabled: Boolean(studentId),
  });

  const myEkskuls = portalQuery.data?.myEkskuls || [];

  // Hitung total tagihan & pembayaran seluruh ekskul
  const totalBilled = myEkskuls.reduce(
    (sum: number, item: any) => sum + (item.paymentSummary?.totalFee || 0),
    0
  );
  const totalPaid = myEkskuls.reduce(
    (sum: number, item: any) => sum + (item.paymentSummary?.paidFee || 0),
    0
  );
  const totalUnpaid = totalBilled - totalPaid;

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Ekstrakurikuler Saya
            </h1>
            <p className="text-sm text-muted-foreground">
              Pemantauan kehadiran kegiatan, status pembayaran iuran ekskul pilihan, dan nilai capaian rapor.
            </p>
          </div>

          {/* Filter Semester & Tahun */}
          <div className="flex items-center gap-2">
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="h-8 text-xs font-medium w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Semester 1 (Ganjil)</SelectItem>
                <SelectItem value="2">Semester 2 (Genap)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 text-xs font-medium w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025/2026">2025/2026</SelectItem>
                <SelectItem value="2026/2027">2026/2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ringkasan Dashboard Keuangan & Kehadiran */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Ekskul */}
          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Program Diikuti</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">{myEkskuls.length} Ekskul</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Wajib & Pilihan</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Status Pembayaran */}
          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Status Iuran Ekskul</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">
                  {totalUnpaid === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Lunas</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      Rp {totalUnpaid.toLocaleString("id-ID")}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {totalUnpaid === 0
                    ? "Seluruh iuran berbayar telah lunas"
                    : "Menunggu pembayaran iuran"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Coins className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Rata-rata Kehadiran */}
          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Rata-rata Kehadiran</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">
                  {myEkskuls.length > 0
                    ? Math.round(
                        myEkskuls.reduce(
                          (sum: number, item: any) => sum + (item.attendance?.attendanceRate || 100),
                          0
                        ) / myEkskuls.length
                      )
                    : 100}
                  %
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">Disiplin latihan santri</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daftar Ekskul yang Diikuti */}
        {portalQuery.isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
            Memuat data ekstrakurikuler Anda...
          </div>
        ) : myEkskuls.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h4 className="font-bold text-sm text-foreground">Belum Ada Ekstrakurikuler yang Diikuti</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Silakan mendaftar program ekstrakurikuler melalui menu Pendaftaran Ekstrakurikuler.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {myEkskuls.map((item: any) => {
              const ekskul = item.ekskul;
              const att = item.attendance;
              const grade = item.grade;
              const payments = item.payments || [];
              const isWajib = ekskul?.category === "wajib";

              return (
                <Card key={item.enrollment.id} className="border-border shadow-xs overflow-hidden">
                  <CardHeader className="p-4 bg-muted/20 border-b border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold uppercase ${
                              isWajib
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
                                : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200"
                            }`}
                          >
                            {isWajib ? "Ekskul Wajib" : "Ekskul Pilihan"}
                          </Badge>

                          <span className="text-xs text-muted-foreground">
                            Pelatih: <b className="text-foreground">{ekskul?.coach_name}</b>
                          </span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground mt-1">
                          {ekskul?.name}
                        </CardTitle>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded bg-muted text-muted-foreground font-medium flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          {ekskul?.schedule_day}, {ekskul?.schedule_time}
                        </span>
                        <span className="px-2.5 py-1 rounded bg-muted text-muted-foreground font-medium flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {ekskul?.location}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-5 text-xs">
                    {/* 2 Kolom Utama: Kehadiran & Keuangan */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* KOLOM 1: KEHADIRAN (ABSENSI) */}
                      <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Fokus Kehadiran & Absensi Sesi
                          </h4>
                          <span className="font-extrabold text-sm text-emerald-600">
                            {att?.attendanceRate || 100}%
                          </span>
                        </div>

                        <Progress value={att?.attendanceRate || 100} className="h-2" />

                        <div className="grid grid-cols-4 gap-2 text-center pt-1">
                          <div className="p-1.5 rounded bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                            <div className="font-black text-sm">{att?.hadir || 0}</div>
                            <div className="text-[10px] uppercase font-bold">Hadir</div>
                          </div>
                          <div className="p-1.5 rounded bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                            <div className="font-black text-sm">{att?.izin || 0}</div>
                            <div className="text-[10px] uppercase font-bold">Izin</div>
                          </div>
                          <div className="p-1.5 rounded bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            <div className="font-black text-sm">{att?.sakit || 0}</div>
                            <div className="text-[10px] uppercase font-bold">Sakit</div>
                          </div>
                          <div className="p-1.5 rounded bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                            <div className="font-black text-sm">{att?.alpa || 0}</div>
                            <div className="text-[10px] uppercase font-bold">Alpa</div>
                          </div>
                        </div>

                        <p className="text-[10.5px] text-muted-foreground pt-1">
                          Total Pertemuan Tercatat: <b>{att?.totalSesi || 0} Sesi</b> latihan.
                        </p>
                      </div>

                      {/* KOLOM 2: PEMBAYARAN IURAN EKSKUL */}
                      <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                            <CreditCard className="h-4 w-4 text-amber-500" />
                            Fokus Pembayaran & Iuran Kegiatan
                          </h4>
                          {isWajib ? (
                            <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-[10px]">
                              Bebas Biaya
                            </Badge>
                          ) : item.paymentSummary?.isAllPaid ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              Lunas
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-600 text-white text-[10px]">
                              Ada Tagihan
                            </Badge>
                          )}
                        </div>

                        {isWajib ? (
                          <div className="p-4 rounded-md bg-muted/20 text-center text-muted-foreground text-xs italic">
                            Kegiatan ekstrakurikuler wajib ini didanai penuh oleh pesantren dan tidak dikenakan iuran tambahan.
                          </div>
                        ) : payments.length === 0 ? (
                          <div className="p-4 rounded-md bg-muted/20 text-center text-muted-foreground text-xs italic">
                            Belum ada riwayat tagihan iuran yang diterbitkan untuk semester ini.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {payments.map((p: any) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-2 rounded border bg-muted/10 text-xs"
                              >
                                <div>
                                  <span className="font-bold text-foreground block">{p.period_label}</span>
                                  <span className="text-[10.5px] text-muted-foreground">
                                    {p.status === "lunas" ? `Dibayar: ${p.payment_date || "-"}` : "Menunggu pembayaran"}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-foreground block">
                                    Rp {p.amount.toLocaleString("id-ID")}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold uppercase ${
                                      p.status === "lunas"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    }`}
                                  >
                                    {p.status === "lunas" ? "Lunas" : "Belum Bayar"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BARIS CAPAIAN NILAI RAPOR */}
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                          <GraduationCap className="h-4 w-4" />
                          Capaian Akhir Semester (Rapor Dinas Seksi C)
                        </span>
                        <p className="text-xs text-foreground leading-relaxed">
                          {grade?.description ||
                            "Nilai dan deskripsi capaian akhir semester akan diterbitkan oleh pembina menjelang pembagian rapor."}
                        </p>
                      </div>

                      <div className="text-center sm:text-right shrink-0">
                        <div className="text-2xl font-black text-primary">
                          {grade?.grade || "B"}
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {grade?.predicate || "Baik"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
