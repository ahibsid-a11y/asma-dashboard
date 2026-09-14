import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Sparkles,
  Trophy,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getMyMutabaah } from "@/lib/mutabaah.functions";

export const Route = createFileRoute("/_authenticated/mutabaah-saya")({
  head: () => ({
    meta: [
      { title: "Mutaba'ah Saya | SIM-AHIBS" },
      {
        name: "description",
        content: "Pantau catatan amal yaumi dan kedisiplinan ibadah harian pribadi santri AHIBS.",
      },
      { property: "og:title", content: "Mutaba'ah Saya | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Pantau catatan amal yaumi dan kedisiplinan ibadah harian pribadi santri AHIBS.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: MutabaahSayaPage,
});

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function MutabaahSayaPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;

  const fetchMyMutabaah = useServerFn(getMyMutabaah);
  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr);

  const query = useQuery({
    queryKey: ["my-mutabaah", selectedMonth],
    queryFn: () => fetchMyMutabaah({ data: { monthDate: selectedMonth } }),
  });

  const data = query.data;
  const activities = data?.activities ?? [];
  const matrix = data?.matrix ?? {};
  const daysInMonth = data?.daysInMonth ?? 30;
  const daysArray = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth],
  );

  const stepMonth = (dir: number) => {
    const d = new Date(`${selectedMonth}T00:00:00`);
    d.setMonth(d.getMonth() + dir);
    setSelectedMonth(toDateStr(d));
  };

  const monthLabel = useMemo(() => {
    return new Date(`${selectedMonth}T00:00:00`).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  }, [selectedMonth]);

  // Pesan motivasi berdasarkan performa hari ini
  const motivation = useMemo(() => {
    const pct = data?.todayPct ?? 0;
    if (pct >= 90) {
      return {
        title: "Masya Allah, Istiqomah yang Luar Biasa!",
        desc: "Hampir seluruh amalan yaumi hari ini telah terlaksana dengan baik. Pertahankan kebiasaan mulia ini!",
        color: "text-emerald-600",
        badgeBg: "bg-emerald-500/10 text-emerald-700",
      };
    }
    if (pct >= 70) {
      return {
        title: "Alhamdulillah, Terus Tingkatkan!",
        desc: "Sebagian besar ibadah dan adab harian sudah kamu penuhi. Sempurnakan amalan sunnah dan adab lainnya hari ini.",
        color: "text-primary",
        badgeBg: "bg-primary/10 text-primary",
      };
    }
    return {
      title: "Yuk Semangat Ibadahnya!",
      desc: "Jangan lupa salat berjamaah tepat waktu, zikir, dan muraja'ah tahfiz. Jadikan setiap waktu bernilai ibadah.",
      color: "text-amber-600",
      badgeBg: "bg-amber-500/10 text-amber-700",
    };
  }, [data?.todayPct]);

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header Halaman */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Ibadah Harian</p>
              <Badge variant="outline" className="text-[10px] font-semibold">Amal Yaumi</Badge>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-foreground">Mutaba'ah Saya</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Pantau kepatuhan amal ibadah dan kedisiplinan harianmu di SMPIT Putra Al-Hanif.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-card p-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => stepMonth(-1)}
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-3 text-xs font-bold text-foreground capitalize">
                {monthLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => stepMonth(1)}
                title="Bulan Berikutnya"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Ringkasan Skor Hari Ini & Motivasi */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Kartu Skor Hari Ini */}
          <Card className="border-border bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                  Capaian Hari Ini
                </CardTitle>
                <Flame className="size-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground">
                  {data?.todayCompleted ?? 0}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  / {data?.todayTotal ?? 24} amalan
                </span>
              </div>
              <Progress value={data?.todayPct ?? 0} className="mt-3 h-2" />
              <p className="mt-2 text-xs font-semibold text-emerald-600">
                {data?.todayPct ?? 0}% selesai
              </p>
            </CardContent>
          </Card>

          {/* Kartu Rata-Rata Bulan Ini */}
          <Card className="border-border bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                  Rata-rata Bulan Ini
                </CardTitle>
                <Trophy className="size-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground">
                  {data?.monthPct ?? 0}%
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  konsistensi
                </span>
              </div>
              <Progress value={data?.monthPct ?? 0} className="mt-3 h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                Bulan {monthLabel}
              </p>
            </CardContent>
          </Card>

          {/* Pesan Motivasi */}
          <Card className="border-border bg-card sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                  Evaluasi Diri
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-sm font-bold ${motivation.color}`}>{motivation.title}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {motivation.desc}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lembar Kalender Mutaba'ah Bulanan Santri (Format Lembar Fisik) */}
        <Card className="overflow-hidden border-border shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold sm:text-base">
                  Lembar Mutaba'ah Amal Yaumi — {monthLabel}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Catatan ceklis harian dari musyrif asramamu.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {data?.student?.dorm ? `Kamar: ${data.student.dorm}` : "Santri Aktif"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {query.isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center p-8 text-xs text-muted-foreground">
                <Loader2 className="mr-2 size-5 animate-spin" /> Memuat lembar mutaba'ahmu...
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/80 text-foreground">
                      <th className="sticky left-0 z-20 min-w-[36px] border-r border-border bg-muted/95 p-2 text-center font-bold">
                        NO
                      </th>
                      <th className="sticky left-[36px] z-20 min-w-[190px] max-w-[240px] border-r border-border bg-muted/95 p-2 font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
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
                      const actRecords = matrix[act.id] || {};
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
