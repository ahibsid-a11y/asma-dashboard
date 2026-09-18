import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Award,
  Calendar,
  CheckCircle,
  Coins,
  Compass,
  FileCheck,
  HeartHandshake,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useCurrentProfile } from "@/hooks/use-current-profile";
import {
  enrollStudentFn,
  getMasterEkskulListFn,
  getStudentEkskulPortalDataFn,
} from "@/lib/ekskul.functions";

export const Route = createFileRoute("/_authenticated/pendaftaran-ekskul")({
  head: () => ({
    meta: [
      { title: "Pendaftaran Ekstrakurikuler | SIM-AHIBS" },
      {
        name: "description",
        content: "Katalog dan pendaftaran program ekstrakurikuler pilihan dan wajib santri SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Pendaftaran Ekstrakurikuler | SIM-AHIBS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PendaftaranEkskulPage,
});

function PendaftaranEkskulPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchMaster = useServerFn(getMasterEkskulListFn);
  const fetchMyPortal = useServerFn(getStudentEkskulPortalDataFn);
  const enrollFn = useServerFn(enrollStudentFn);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEkskulToEnroll, setSelectedEkskulToEnroll] = useState<any | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>("Sesi 1 (Juli / 4 Pertemuan)");

  const studentId = profile?.id || "";

  // 1. Ambil seluruh ekskul
  const ekskulsQuery = useQuery({
    queryKey: ["master-ekskuls"],
    queryFn: () => fetchMaster(),
  });

  // 2. Ambil ekskul yang sudah didaftar santri
  const myPortalQuery = useQuery({
    queryKey: ["student-ekskul-portal", studentId],
    queryFn: () =>
      fetchMyPortal({
        data: { studentId, semester: "1", academicYear: "2026/2027" },
      }),
    enabled: Boolean(studentId),
  });

  const ekskulList = ekskulsQuery.data || [];
  const myEnrolledIds = new Set(
    (myPortalQuery.data?.myEkskuls || []).map((item: any) => item.ekskul?.id)
  );

  // Mutation Daftar
  const enrollMutation = useMutation({
    mutationFn: (data: { ekskulId: string; sessionLabel: string }) =>
      enrollFn({
        data: {
          ekskulId: data.ekskulId,
          studentId,
          sessionLabel: data.sessionLabel,
          semester: "1",
          academicYear: "2026/2027",
        },
      }),
    onSuccess: () => {
      toast.success("Alhamdulillah, pendaftaran ekstrakurikuler berhasil diajukan!");
      setSelectedEkskulToEnroll(null);
      queryClient.invalidateQueries({ queryKey: ["student-ekskul-portal"] });
      queryClient.invalidateQueries({ queryKey: ["master-ekskuls"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mendaftar ekskul");
    },
  });

  const filteredEkskuls = ekskulList.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.coach_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Pendaftaran Ekstrakurikuler
            </h1>
            <p className="text-sm text-muted-foreground">
              Pilih dan daftarkan diri pada kegiatan pengembangan minat, bakat, olahraga sunnah, dan kepemimpinan santri.
            </p>
          </div>
        </div>

        {/* Pencarian */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari program ekstrakurikuler..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Grid Katalog */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEkskuls.map((ekskul) => {
            const isEnrolled = myEnrolledIds.has(ekskul.id) || ekskul.category === "wajib";
            const isPending = enrollMutation.isPending && enrollMutation.variables === ekskul.id;

            return (
              <Card key={ekskul.id} className="border-border shadow-xs flex flex-col justify-between overflow-hidden">
                <CardHeader className="p-4 bg-muted/15 border-b border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase ${
                        ekskul.category === "wajib"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
                          : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200"
                      }`}
                    >
                      {ekskul.category === "wajib" ? "Ekskul Wajib" : "Ekskul Pilihan"}
                    </Badge>

                    {isEnrolled && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] gap-1 font-bold">
                        <CheckCircle className="h-3 w-3" /> Terdaftar
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-base font-bold text-foreground mt-2">
                    {ekskul.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                    {ekskul.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs flex-1">
                  <div className="space-y-2 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Award className="h-3.5 w-3.5 text-primary" />
                      <span>Pelatih: <b className="text-foreground">{ekskul.coach_name}</b></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>Jadwal: <b className="text-foreground">{ekskul.schedule_day}, {ekskul.schedule_time}</b></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>Lokasi: <b className="text-foreground">{ekskul.location}</b></span>
                    </div>
                  </div>

                  {/* Biaya */}
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-amber-500" />
                      Iuran Kegiatan:
                    </span>
                    <span className="font-bold text-sm">
                      {ekskul.fee > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Rp {ekskul.fee.toLocaleString("id-ID")}{" "}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            /{ekskul.fee_period === "per_bulan" ? "bln" : "smt"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Gratis (Wajib)</span>
                      )}
                    </span>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="pt-2">
                    {isEnrolled ? (
                      <Button
                        variant="secondary"
                        disabled
                        className="w-full text-xs font-bold gap-1.5"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        {ekskul.category === "wajib"
                          ? "Otomatis Terdaftar (Wajib)"
                          : "Sudah Terdaftar"}
                      </Button>
                    ) : (
                      <Button
                        className="w-full text-xs font-bold gap-1.5"
                        onClick={() => {
                          setSelectedEkskulToEnroll(ekskul);
                          setSelectedSession("Sesi 1 (Juli / 4 Pertemuan)");
                        }}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Daftar & Pilih Sesi
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* DIALOG PILIH SESI PENDAFTARAN */}
        <Dialog
          open={Boolean(selectedEkskulToEnroll)}
          onOpenChange={(open) => !open && setSelectedEkskulToEnroll(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Pilih Sesi & Periode Latihan
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pendaftaran untuk: <b className="text-foreground">{selectedEkskulToEnroll?.name}</b>. Setiap sesi mencakup 4 pertemuan latihan.
              </DialogDescription>
            </DialogHeader>

            {selectedEkskulToEnroll && (
              <div className="space-y-4 py-2 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Pilih Sesi / Bulan:</Label>
                  <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sesi 1 (Juli / 4 Pertemuan)">Sesi 1 (Juli / 4 Pertemuan)</SelectItem>
                      <SelectItem value="Sesi 2 (Agustus / 4 Pertemuan)">Sesi 2 (Agustus / 4 Pertemuan)</SelectItem>
                      <SelectItem value="Sesi 3 (September / 4 Pertemuan)">Sesi 3 (September / 4 Pertemuan)</SelectItem>
                      <SelectItem value="Sesi 4 (Oktober / 4 Pertemuan)">Sesi 4 (Oktober / 4 Pertemuan)</SelectItem>
                      <SelectItem value="Sesi 5 (November / 4 Pertemuan)">Sesi 5 (November / 4 Pertemuan)</SelectItem>
                      <SelectItem value="Sesi 6 (Desember / 4 Pertemuan)">Sesi 6 (Desember / 4 Pertemuan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jadwal Rutin:</span>
                    <span className="font-semibold">{selectedEkskulToEnroll.schedule_day}, {selectedEkskulToEnroll.schedule_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lokasi:</span>
                    <span className="font-semibold">{selectedEkskulToEnroll.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kapasitas Sesi:</span>
                    <span className="font-semibold text-emerald-600">Maks. {selectedEkskulToEnroll.quota || 30} Santri</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-muted-foreground font-medium">Iuran Sesi:</span>
                    <span className="font-bold text-sm text-foreground">
                      {selectedEkskulToEnroll.fee > 0
                        ? `Rp ${selectedEkskulToEnroll.fee.toLocaleString("id-ID")}`
                        : "Gratis (Wajib)"}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  * Setelah mendaftar, keikutsertaan Anda akan disetujui (approve) oleh pembina/admin setelah pembayaran iuran diselesaikan.
                </p>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setSelectedEkskulToEnroll(null)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold gap-1.5"
                disabled={enrollMutation.isPending}
                onClick={() => {
                  if (!selectedEkskulToEnroll) return;
                  enrollMutation.mutate({
                    ekskulId: selectedEkskulToEnroll.id,
                    sessionLabel: selectedSession,
                  });
                }}
              >
                {enrollMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                Konfirmasi Pendaftaran
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
