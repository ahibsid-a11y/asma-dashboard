import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Activity,
  Award,
  Calendar,
  Clock,
  Coins,
  Edit2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
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
import { Textarea } from "@/components/ui/textarea";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import {
  autoEnrollWajibFn,
  getCoachOptionsFn,
  getMasterEkskulListFn,
  manageEkskulItemFn,
} from "@/lib/ekskul.functions";
import type {
  EkskulCategory,
  EkskulFeePeriod,
  EkskulItem,
} from "@/lib/ekskul.types";

export const Route = createFileRoute("/_authenticated/manajemen-ekskul")({
  head: () => ({
    meta: [
      { title: "Manajemen Ekstrakurikuler | SIM-AHIBS" },
      {
        name: "description",
        content: "Kelola program ekstrakurikuler wajib & pilihan, jadwal, pembina/pelatih, dan iuran kegiatan santri.",
      },
      { property: "og:title", content: "Manajemen Ekstrakurikuler | SIM-AHIBS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ManajemenEkskulPage,
});

function ManajemenEkskulPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchEkskuls = useServerFn(getMasterEkskulListFn);
  const manageEkskulFn = useServerFn(manageEkskulItemFn);
  const fetchCoaches = useServerFn(getCoachOptionsFn);
  const autoEnrollFn = useServerFn(autoEnrollWajibFn);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<EkskulCategory>("pilihan");
  const [formFee, setFormFee] = useState<number>(50000);
  const [formFeePeriod, setFormFeePeriod] = useState<EkskulFeePeriod>("per_bulan");
  const [formCoachName, setFormCoachName] = useState("");
  const [formCoachId, setFormCoachId] = useState<string | undefined>(undefined);
  const [formDay, setFormDay] = useState("Sabtu");
  const [formTime, setFormTime] = useState("16:00 - 17:30");
  const [formLocation, setFormLocation] = useState("Lapangan Pesantren");
  const [formQuota, setFormQuota] = useState<number>(30);
  const [formDesc, setFormDesc] = useState("");

  // Queries
  const ekskulsQuery = useQuery({
    queryKey: ["master-ekskuls"],
    queryFn: () => fetchEkskuls(),
  });

  const coachesQuery = useQuery({
    queryKey: ["coach-options"],
    queryFn: () => fetchCoaches(),
  });

  const ekskulList = ekskulsQuery.data || [];
  const coaches = coachesQuery.data || [];

  // Mutations
  const saveMutation = useMutation({
    mutationFn: () =>
      manageEkskulFn({
        data: {
          action: "save",
          item: {
            id: editingId || undefined,
            name: formName.trim(),
            category: formCategory,
            fee: formCategory === "wajib" ? 0 : formFee,
            fee_period: formCategory === "wajib" ? "sekali" : formFeePeriod,
            coach_name: formCoachName.trim() || "Belum Ditentukan",
            coach_id: formCoachId,
            schedule_day: formDay,
            schedule_time: formTime,
            location: formLocation.trim(),
            quota: formQuota,
            description: formDesc.trim(),
            is_active: true,
          },
        },
      }),
    onSuccess: () => {
      toast.success(editingId ? "Ekskul berhasil diperbarui" : "Ekskul baru berhasil ditambahkan");
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["master-ekskuls"] });
      queryClient.invalidateQueries({ queryKey: ["report-card-dinas"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menyimpan ekskul");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      manageEkskulFn({
        data: { action: "delete", deleteId: id },
      }),
    onSuccess: () => {
      toast.success("Ekskul berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["master-ekskuls"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus ekskul");
    },
  });

  const autoEnrollMutation = useMutation({
    mutationFn: () =>
      autoEnrollFn({
        data: { semester: "1", academicYear: "2026/2027" },
      }),
    onSuccess: (res) => {
      toast.success(`Berhasil mendaftarkan santri ke ekskul wajib (${res.count} entri)!`);
      queryClient.invalidateQueries({ queryKey: ["master-ekskuls"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal melakukan auto enrollment");
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormCategory("pilihan");
    setFormFee(50000);
    setFormFeePeriod("per_bulan");
    setFormCoachName("");
    setFormCoachId(undefined);
    setFormDay("Sabtu");
    setFormTime("16:00 - 17:30");
    setFormLocation("Lapangan Pesantren");
    setFormQuota(30);
    setFormDesc("");
  };

  const handleEdit = (item: EkskulItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormFee(item.fee);
    setFormFeePeriod(item.fee_period);
    setFormCoachName(item.coach_name);
    setFormCoachId(item.coach_id);
    setFormDay(item.schedule_day);
    setFormTime(item.schedule_time);
    setFormLocation(item.location);
    setFormQuota(item.quota || 30);
    setFormDesc(item.description);
    setIsModalOpen(true);
  };

  const filteredEkskuls = ekskulList.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.coach_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = filterCategory === "all" || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Manajemen Ekstrakurikuler
            </h1>
            <p className="text-sm text-muted-foreground">
              Pengaturan kegiatan ekskul wajib & pilihan, penetapan pelatih/pembina, jadwal, dan iuran santri.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => autoEnrollMutation.mutate()}
              disabled={autoEnrollMutation.isPending}
            >
              <UserCheck className="h-4 w-4 text-emerald-600" />
              Daftarkan Santri ke Ekskul Wajib
            </Button>

            <Button
              size="sm"
              className="text-xs font-bold gap-1.5"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Tambah Ekskul Baru
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border shadow-xs bg-muted/10">
          <CardContent className="p-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama ekskul, pelatih, lokasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue placeholder="Kategori Ekskul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori (Wajib & Pilihan)</SelectItem>
                    <SelectItem value="wajib">Ekskul Wajib (Bebas Biaya)</SelectItem>
                    <SelectItem value="pilihan">Ekskul Pilihan (Berbayar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Total Terdata: <b>{filteredEkskuls.length}</b> Program</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid Kartu Ekskul */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEkskuls.map((ekskul) => (
            <Card key={ekskul.id} className="border-border shadow-xs flex flex-col justify-between overflow-hidden">
              <CardHeader className="p-4 bg-muted/20 border-b border-border/50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase mb-1.5 ${
                        ekskul.category === "wajib"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
                          : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200"
                      }`}
                    >
                      {ekskul.category === "wajib" ? "Ekskul Wajib" : "Ekskul Pilihan"}
                    </Badge>
                    <CardTitle className="text-base font-bold text-foreground">
                      {ekskul.name}
                    </CardTitle>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(ekskul)}
                      title="Edit Ekskul"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Hapus program ${ekskul.name}?`)) {
                          deleteMutation.mutate(ekskul.id);
                        }
                      }}
                      title="Hapus Ekskul"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {ekskul.description || "Tidak ada deskripsi"}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs flex-1">
                {/* Pembina */}
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    Pembina / Pelatih
                  </span>
                  <span className="font-semibold text-foreground text-right">{ekskul.coach_name}</span>
                </div>

                {/* Jadwal */}
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Jadwal Latihan
                  </span>
                  <span className="font-medium text-foreground">
                    {ekskul.schedule_day}, {ekskul.schedule_time}
                  </span>
                </div>

                {/* Lokasi */}
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Lokasi
                  </span>
                  <span className="font-medium text-foreground truncate max-w-[180px]">{ekskul.location}</span>
                </div>

                {/* Iuran Biaya */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-amber-500" />
                    Biaya Iuran
                  </span>
                  <span className="font-bold text-foreground">
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
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal Form Tambah / Edit */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingId ? "Edit Program Ekstrakurikuler" : "Tambah Ekstrakurikuler Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Isi rincian nama kegiatan, kategori wajib atau pilihan, jadwal, pelatih, dan iuran biaya.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Nama Ekskul */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nama Ekstrakurikuler *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Robotik & Coding, Panahan, Tapak Suci..."
                  className="h-9 text-xs"
                />
              </div>

              {/* Kategori & Kuota */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Kategori Ekskul</Label>
                  <Select
                    value={formCategory}
                    onValueChange={(val: EkskulCategory) => setFormCategory(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wajib">Wajib (Seluruh Santri)</SelectItem>
                      <SelectItem value="pilihan">Pilihan (Sesuai Minat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Kuota Santri</Label>
                  <Input
                    type="number"
                    value={formQuota}
                    onChange={(e) => setFormQuota(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Biaya & Periode Iuran jika Pilihan */}
              {formCategory === "pilihan" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 border rounded-lg">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nominal Iuran (Rp)</Label>
                    <Input
                      type="number"
                      value={formFee}
                      onChange={(e) => setFormFee(Number(e.target.value))}
                      placeholder="50000"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Periode Pembayaran</Label>
                    <Select
                      value={formFeePeriod}
                      onValueChange={(val: EkskulFeePeriod) => setFormFeePeriod(val)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_bulan">Per Bulan</SelectItem>
                        <SelectItem value="per_semester">Per Semester</SelectItem>
                        <SelectItem value="sekali">Sekali Bayar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Pembina / Pelatih */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pelatih / Pembina Ekskul</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select
                    value={formCoachId || "manual"}
                    onValueChange={(val) => {
                      if (val === "manual") {
                        setFormCoachId(undefined);
                      } else {
                        setFormCoachId(val);
                        const c = coaches.find((coach: any) => coach.id === val);
                        if (c) setFormCoachName(c.name);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Pilih dari Anggota / Staf" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">-- Input Nama Manual --</SelectItem>
                      {coaches.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.account_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={formCoachName}
                    onChange={(e) => setFormCoachName(e.target.value)}
                    placeholder="Nama pelatih / instruktur..."
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Hari, Waktu, & Lokasi */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Hari</Label>
                  <Select value={formDay} onValueChange={setFormDay}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Ahad"].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Waktu / Jam</Label>
                  <Input
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="16:00 - 17:30"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Lokasi</Label>
                  <Input
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Lapangan / Aula..."
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Deskripsi & Tujuan Ekskul</Label>
                <Textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Keterangan singkat kegiatan..."
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                className="font-bold"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !formName.trim()}
              >
                {saveMutation.isPending ? "Menyimpan..." : "Simpan Ekskul"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
