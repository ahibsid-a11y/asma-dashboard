import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Info,
  Loader2,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  User,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getMyViolations } from "@/lib/violations.functions";

export const Route = createFileRoute("/_authenticated/pelanggaran-saya")({
  head: () => ({
    meta: [
      { title: "Pelanggaran Saya | ASMA" },
      {
        name: "description",
        content: "Pantau catatan kedisiplinan pribadi, akumulasi poin, status peringatan (SP), dan nasihat pembinaan santri AHIBS.",
      },
      { property: "og:title", content: "Pelanggaran Saya | ASMA" },
      {
        property: "og:description",
        content: "Pantau catatan kedisiplinan pribadi, akumulasi poin, status peringatan (SP), dan nasihat pembinaan santri AHIBS.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PelanggaranSayaPage,
});

function PelanggaranSayaPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;

  const fetchMyViolations = useServerFn(getMyViolations);

  const query = useQuery({
    queryKey: ["my-violations"],
    queryFn: () => fetchMyViolations(),
  });

  const data = query.data;
  const records = data?.records ?? [];
  const totalPoints = data?.totalPoints ?? 0;
  const spInfo = data?.spInfo;
  const student = data?.student;

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case "Berat":
        return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900";
      case "Sedang":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900";
    }
  };

  const getSpBadge = (tier?: string) => {
    switch (tier) {
      case "SP 3":
        return (
          <Badge variant="destructive" className="font-semibold gap-1 animate-pulse">
            <AlertOctagon className="h-3.5 w-3.5" /> SP 3 (Sidang Dewan Pengasuh)
          </Badge>
        );
      case "SP 2":
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> SP 2 (Peringatan Keras)
          </Badge>
        );
      case "SP 1":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300 gap-1 font-medium"
          >
            <AlertCircle className="h-3.5 w-3.5" /> SP 1 (Peringatan Pertama)
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Aman & Disiplin
          </Badge>
        );
    }
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Kedisiplinan & Poin Saya
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Evaluasi diri terhadap tata tertib pesantren dan riwayat tindak lanjut pembinaan karakter.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 self-start sm:self-auto"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RotateCcw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Perbarui
          </Button>
        </div>

        {/* Supportive Islamic Advice Banner */}
        <Card className="border-primary/20 bg-primary/5 shadow-xs">
          <CardContent className="p-4 flex items-start gap-3">
            <HeartHandshake className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-foreground space-y-1">
              <p className="font-semibold italic">
                &ldquo;Kullu bani Adama khaththa&apos;un, wa khoirul khaththa&apos;inat-tawwabun.&rdquo;
              </p>
              <p className="text-xs text-muted-foreground">
                &ldquo;Setiap anak cucu Adam pasti pernah berbuat salah, dan sebaik-baik orang yang berbuat salah adalah yang bertaubat dan memperbaiki diri.&rdquo; (HR. Tirmidzi & Ibnu Majah)
              </p>
            </div>
          </CardContent>
        </Card>

        {query.isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-2 text-xs">Memuat data kedisiplinan Anda...</p>
          </div>
        ) : (
          <>
            {/* Status Meter Card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-primary" />
                      Status Kedisiplinan Saat Ini
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Santri: <span className="font-medium text-foreground">{student?.name}</span>{" "}
                      • Kamar: <span className="font-medium text-foreground">{student?.dorm || "-"}</span>{" "}
                      • Kelas: <span className="font-medium text-foreground">{student?.class || "-"}</span>
                    </CardDescription>
                  </div>
                  <div>{getSpBadge(spInfo?.tier)}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Visual Progress Bar */}
                <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Akumulasi Poin: <span className="text-base text-rose-600 font-bold">{totalPoints}</span> / 100 Poin
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Batas SP 1: 26 pt • SP 2: 51 pt • SP 3: 76 pt
                    </span>
                  </div>
                  <Progress value={Math.min(100, totalPoints)} className="h-3" />
                  
                  {/* Threshold Indicators */}
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-center pt-1">
                    <div className={`p-1 rounded border ${totalPoints <= 25 ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "text-muted-foreground bg-muted/40"}`}>
                      0 - 25: Aman
                    </div>
                    <div className={`p-1 rounded border ${totalPoints >= 26 && totalPoints <= 50 ? "bg-yellow-50 border-yellow-300 font-bold text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300" : "text-muted-foreground bg-muted/40"}`}>
                      26 - 50: SP 1
                    </div>
                    <div className={`p-1 rounded border ${totalPoints >= 51 && totalPoints <= 75 ? "bg-amber-50 border-amber-300 font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : "text-muted-foreground bg-muted/40"}`}>
                      51 - 75: SP 2
                    </div>
                    <div className={`p-1 rounded border ${totalPoints >= 76 ? "bg-rose-50 border-rose-300 font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" : "text-muted-foreground bg-muted/40"}`}>
                      ≥ 76: SP 3
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground pt-1">
                    {spInfo?.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Riwayat Pelanggaran Table */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Riwayat Catatan Pelanggaran ({records.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Daftar catatan pelanggaran tata tertib dan tindakan pembinaan yang pernah dijalani.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {records.length} Catatan
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                      Alhamdulillah! Tidak Ada Catatan Pelanggaran
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                      Anda memiliki rekam jejak kedisiplinan yang bersih. Terus istiqomah menjaga akhlak, adab, dan tata tertib pesantren!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase">
                        <tr>
                          <th className="p-3">Tanggal</th>
                          <th className="p-3">Pelanggaran</th>
                          <th className="p-3">Kategori</th>
                          <th className="p-3 text-center">Poin</th>
                          <th className="p-3">Sanksi / Pembinaan</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Petugas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {records.map((r: any) => (
                          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 whitespace-nowrap text-muted-foreground">
                              {r.date}
                            </td>
                            <td className="p-3">
                              <span className="font-medium text-foreground">{r.violation_title}</span>
                              {r.notes && (
                                <span className="block text-[10px] text-muted-foreground">
                                  Catatan: {r.notes}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${getCategoryBadgeClass(r.category)}`}
                              >
                                {r.category}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-bold text-rose-600">
                              +{r.points}
                            </td>
                            <td className="p-3 text-muted-foreground max-w-[200px]">
                              {r.penalty || "Nasihat & pembinaan"}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={
                                  r.status === "Selesai"
                                    ? "outline"
                                    : r.status === "Perlu Pembinaan"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-[10px]"
                              >
                                {r.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground text-[11px]">
                              {r.recorder_name}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
