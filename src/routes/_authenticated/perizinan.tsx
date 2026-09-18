import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Building,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  DoorClosed,
  DoorOpen,
  FileBadge,
  FileCheck,
  Filter,
  GraduationCap,
  HeartPulse,
  Info,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  Shield,
  Trash2,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import {
  approveOrRejectPermit,
  getPendingPermitApprovalsCountFn,
  getPermitInputContext,
  getPermitSummary,
  managePermitCategory,
  recordGateCheck,
  submitPermit,
  type PermitCategory,
  type StudentPermit,
} from "@/lib/perizinan.functions";

export const Route = createFileRoute("/_authenticated/perizinan")({
  head: () => ({
    meta: [
      { title: "Perizinan Santri | SIM-AHIBS" },
      {
        name: "description",
        content: "Sistem pengajuan perizinan santri AHIBS dengan matriks persetujuan 3-pihak (Kurikulum, Kesantrian, Kepsek) dan UKS.",
      },
      { property: "og:title", content: "Perizinan Santri | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Sistem pengajuan perizinan santri AHIBS dengan matriks persetujuan 3-pihak (Kurikulum, Kesantrian, Kepsek) dan UKS.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PerizinanPage,
});

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function PerizinanPage() {
  const profileQuery = useCurrentProfile();
  const profile = profileQuery.data;
  const queryClient = useQueryClient();

  const fetchContext = useServerFn(getPermitInputContext);
  const submitPermitFn = useServerFn(submitPermit);
  const approveOrRejectFn = useServerFn(approveOrRejectPermit);
  const gateCheckFn = useServerFn(recordGateCheck);
  const fetchSummary = useServerFn(getPermitSummary);
  const manageCategoryFn = useServerFn(managePermitCategory);
  const fetchPendingApprovals = useServerFn(getPendingPermitApprovalsCountFn);

  const todayStr = useMemo(() => toDateStr(new Date()), []);

  // Form pengajuan states
  const [studentId, setStudentId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [endTime, setEndTime] = useState<string>("17:00");
  const [reason, setReason] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [pickupBy, setPickupBy] = useState<string>("");
  const [pickupPhone, setPickupPhone] = useState<string>("");

  // Student picker filters
  const [dormFilter, setDormFilter] = useState<string>("semua");
  const [studentSearch, setStudentSearch] = useState<string>("");

  // Filter rekap states
  const [rekapPeriod, setRekapPeriod] = useState<"hari_ini" | "pekan_ini" | "bulan_ini" | "semester" | "semua">("bulan_ini");
  const [rekapStatus, setRekapStatus] = useState<string>("semua");
  const [rekapCategory, setRekapCategory] = useState<string>("semua");
  const [rekapDorm, setRekapDorm] = useState<string>("semua");
  const [rekapSearch, setRekapSearch] = useState<string>("");

  // Modal dialog states
  const [selectedPermitForAction, setSelectedPermitForAction] = useState<StudentPermit | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionApprovalRole, setActionApprovalRole] = useState<"kurikulum" | "kesantrian" | "uks" | "kepsek" | "all_in_one">("kurikulum");
  const [actionNotes, setActionNotes] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // E-Permit & Print Modal states
  const [permitForEPass, setPermitForEPass] = useState<StudentPermit | null>(null);
  const [isPrintRecapOpen, setIsPrintRecapOpen] = useState<boolean>(false);

  // Category management modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatDays, setNewCatDays] = useState<number>(3);
  const [newCatUks, setNewCatUks] = useState<boolean>(false);

  // 1. Context query
  const contextQuery = useQuery({
    queryKey: ["permit-input-context"],
    queryFn: () => fetchContext(),
  });

  const students = contextQuery.data?.students ?? [];
  const categories = contextQuery.data?.categories ?? [];
  const dorms = contextQuery.data?.dorms ?? [];
  const approverRoles = contextQuery.data?.approverRoles;
  const isSantri = contextQuery.data?.isSantri ?? false;

  // Selected category object
  const selectedCategoryObj = useMemo(() => {
    return categories.find((c: PermitCategory) => c.id === categoryId);
  }, [categories, categoryId]);

  // Filtered students for picker
  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      if (dormFilter !== "semua" && s.dorm !== dormFilter) return false;
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchNis = s.nis_nip?.toLowerCase().includes(q);
        if (!matchName && !matchNis) return false;
      }
      return true;
    });
  }, [students, dormFilter, studentSearch]);

  // 2. Summary & permits list query
  const summaryQuery = useQuery({
    queryKey: [
      "permit-summary",
      rekapPeriod,
      rekapStatus,
      rekapCategory,
      rekapDorm,
      rekapSearch,
    ],
    queryFn: () =>
      fetchSummary({
        data: {
          period: rekapPeriod,
          status: rekapStatus === "semua" ? undefined : rekapStatus,
          categoryName: rekapCategory === "semua" ? undefined : rekapCategory,
          dorm: rekapDorm === "semua" ? undefined : rekapDorm,
          search: rekapSearch || undefined,
        },
      }),
  });

  // Query notifikasi antrean persetujuan untuk role aktif
  const pendingApprovalsQuery = useQuery({
    queryKey: ["pending-permit-approvals"],
    queryFn: () => fetchPendingApprovals(),
    refetchInterval: 30000,
  });

  const data = summaryQuery.data;
  const permits = data?.permits ?? [];

  // Filter permits for Approval tab (Only pending)
  const pendingPermits = useMemo(() => {
    return permits.filter((p: StudentPermit) => p.status === "Menunggu Persetujuan");
  }, [permits]);

  // Filter permits for Gate Monitoring tab (Approved or Out)
  const gatePermits = useMemo(() => {
    return permits.filter((p: StudentPermit) =>
      ["Disetujui", "Sedang di Luar", "Terlambat Kembali"].includes(p.status),
    );
  }, [permits]);

  // Mutation: Submit permit
  const submitMutation = useMutation({
    mutationFn: async () => {
      const actualStudentId = isSantri ? profile?.id : studentId;
      if (!actualStudentId) throw new Error("Pilih santri yang mengajukan izin");
      if (!categoryId || !selectedCategoryObj) throw new Error("Pilih kategori izin");
      if (!reason.trim()) throw new Error("Alasan izin wajib diisi");

      return submitPermitFn({
        data: {
          student_id: actualStudentId,
          category_id: selectedCategoryObj.id,
          category_name: selectedCategoryObj.name,
          requires_uks: selectedCategoryObj.requires_uks,
          start_date: startDate,
          start_time: startTime,
          end_date: endDate,
          end_time: endTime,
          reason: reason.trim(),
          destination: destination.trim() || undefined,
          pickup_by: pickupBy.trim() || undefined,
          pickup_phone: pickupPhone.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Pengajuan izin berhasil dikirim dan menunggu persetujuan pimpinan");
      setReason("");
      setDestination("");
      setPickupBy("");
      setPickupPhone("");
      if (!isSantri) setStudentId("");
      queryClient.invalidateQueries({ queryKey: ["permit-summary"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mengajukan izin");
    },
  });

  // Mutation: Approve or Reject
  const decisionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPermitForAction || !actionType) return;
      return approveOrRejectFn({
        data: {
          permit_id: selectedPermitForAction.id,
          decision: actionType,
          approval_type: actionApprovalRole,
          notes: actionNotes.trim() || undefined,
          rejection_reason: actionType === "reject" ? rejectionReason.trim() : undefined,
        },
      });
    },
    onSuccess: (res) => {
      if (actionType === "approve") {
        toast.success(
          res?.isFullyApproved
            ? "Izin telah disetujui penuh oleh seluruh pimpinan!"
            : "Persetujuan Anda telah dicatat, menunggu pimpinan lainnya.",
        );
      } else {
        toast.error("Izin santri telah ditolak.");
      }
      setSelectedPermitForAction(null);
      setActionType(null);
      setActionNotes("");
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["permit-summary"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal memproses keputusan");
    },
  });

  // Mutation: Gate check-in/out
  const gateMutation = useMutation({
    mutationFn: (args: { permit_id: string; action: "checkout" | "checkin" }) =>
      gateCheckFn({ data: args }),
    onSuccess: (res, vars) => {
      if (vars.action === "checkout") {
        toast.success("Santri dicatat telah berangkat keluar gerbang");
      } else {
        if (res.isOverdue) {
          toast.warning("Santri telah tiba kembali, namun TERLAMBAT dari jadwal izin!");
        } else {
          toast.success("Santri telah tiba kembali ke pondok tepat waktu");
        }
      }
      queryClient.invalidateQueries({ queryKey: ["permit-summary"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal memproses catatan gerbang");
    },
  });

  // Mutation: Add category
  const addCategoryMutation = useMutation({
    mutationFn: () =>
      manageCategoryFn({
        data: {
          action: "create",
          name: newCatName.trim(),
          description: newCatDesc.trim() || undefined,
          max_days: Number(newCatDays) || 3,
          requires_uks: newCatUks,
        },
      }),
    onSuccess: () => {
      toast.success("Kategori izin baru berhasil ditambahkan");
      setNewCatName("");
      setNewCatDesc("");
      setNewCatDays(3);
      setNewCatUks(false);
      queryClient.invalidateQueries({ queryKey: ["permit-input-context"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menambahkan kategori");
    },
  });

  // Mutation: Delete category
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      manageCategoryFn({
        data: { action: "delete", id },
      }),
    onSuccess: () => {
      toast.success("Kategori berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["permit-input-context"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus kategori");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Disetujui":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" /> Disetujui
          </Badge>
        );
      case "Sedang di Luar":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 font-medium">
            <DoorOpen className="h-3 w-3" /> Sedang di Luar
          </Badge>
        );
      case "Telah Kembali":
        return (
          <Badge variant="outline" className="text-emerald-700 border-emerald-300 dark:text-emerald-400 gap-1">
            <Check className="h-3 w-3" /> Telah Kembali
          </Badge>
        );
      case "Terlambat Kembali":
        return (
          <Badge variant="destructive" className="animate-pulse gap-1 font-semibold">
            <AlertOctagon className="h-3 w-3" /> Terlambat Kembali
          </Badge>
        );
      case "Ditolak":
        return (
          <Badge variant="destructive" className="gap-1 font-medium">
            <XCircle className="h-3 w-3" /> Ditolak
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 gap-1 font-medium">
            <Clock className="h-3 w-3" /> Menunggu Persetujuan
          </Badge>
        );
    }
  };

  const openDecisionModal = (
    permit: StudentPermit,
    type: "approve" | "reject",
    role: "kurikulum" | "kesantrian" | "uks" | "kepsek" | "all_in_one",
  ) => {
    setSelectedPermitForAction(permit);
    setActionType(type);
    setActionApprovalRole(role);
    setActionNotes("");
    setRejectionReason("");
  };

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileBadge className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Sistem Perizinan Santri AHIBS
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Persetujuan wajib 3 pihak (Kurikulum, Kesantrian, Kepala Sekolah) & UKS, monitoring pos gerbang, dan analitik kepulangan.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {approverRoles?.canManageCategories && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setIsCategoryModalOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                Kategori Izin
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setIsPrintRecapOpen(true)}
            >
              <Printer className="h-4 w-4" />
              Cetak Rekap
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                summaryQuery.refetch();
                contextQuery.refetch();
              }}
              disabled={summaryQuery.isFetching}
            >
              <RotateCcw className={`h-4 w-4 ${summaryQuery.isFetching ? "animate-spin" : ""}`} />
              Muat Ulang
            </Button>
          </div>
        </div>

        {/* Notifikasi Khusus Tim Approver */}
        {(pendingApprovalsQuery.data?.count ?? 0) > 0 && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">
                ⚠️
              </span>
              <div>
                <p className="font-bold">
                  Ada {pendingApprovalsQuery.data?.count} pengajuan izin santri yang menunggu persetujuan Anda!
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Mohon periksa dan berikan tanda tangan persetujuan pada tab Antrean Persetujuan di bawah ini.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 bg-white dark:bg-amber-900 text-amber-900 dark:text-amber-100 h-8 text-xs font-bold"
              onClick={() => {
                const el = document.getElementById("approval-queue-tab");
                if (el) el.click();
              }}
            >
              Lihat Antrean
            </Button>
          </div>
        )}

        {/* Live Status Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card className="border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Menunggu Persetujuan</span>
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-yellow-600">
                {data?.pendingCount ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Antrean butuh tanda tangan</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Izin Disetujui</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600">
                {data?.approvedCount ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Siap berangkat / E-Pass terbit</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Sedang di Luar</span>
                <DoorOpen className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-blue-600">
                {data?.currentlyOutCount ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Sudah check-out gerbang</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Terlambat Kembali</span>
                <AlertOctagon className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-rose-600">
                {data?.overdueCount ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Melewati batas jadwal</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium">Telah Kembali Tepat</span>
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                {data?.returnedCount ?? 0}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Check-in tepat waktu</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs Container */}
        <Tabs defaultValue={isSantri ? "ajukan" : pendingPermits.length > 0 ? "approval" : "rekap"} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="ajukan" className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Ajukan Izin Baru
            </TabsTrigger>
            {!isSantri && (
              <TabsTrigger value="approval" className="text-xs gap-1.5 relative">
                <FileCheck className="h-3.5 w-3.5" />
                Persetujuan Pimpinan
                {pendingPermits.length > 0 && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                    {pendingPermits.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            {!isSantri && (
              <TabsTrigger value="gate" className="text-xs gap-1.5">
                <DoorClosed className="h-3.5 w-3.5" />
                Pos Gerbang ({gatePermits.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="rekap" className="text-xs gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Rekapitulasi Izin
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FORM PENGAJUAN IZIN */}
          <TabsContent value="ajukan" className="space-y-4 m-0">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileBadge className="h-4 w-4 text-primary" />
                  Formulir Pengajuan Izin Santri
                </CardTitle>
                <CardDescription className="text-xs">
                  Pastikan tanggal, alasan, dan identitas penjemput diisi dengan benar. Izin akan diverifikasi bertingkat oleh Kurikulum, Kesantrian, dan Kepala Sekolah.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Pemilihan Santri (Jika bukan santri yang login) */}
                {!isSantri ? (
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      1. Pilih Santri yang Mengajukan Izin <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                      <div className="sm:col-span-4">
                        <Select value={dormFilter} onValueChange={setDormFilter}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Semua Asrama" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="semua">Semua Asrama</SelectItem>
                            {dorms.map((d: string) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-8">
                        <Input
                          placeholder="Ketik nama atau NIS santri..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="max-h-40 overflow-y-auto rounded-md border bg-background p-1 divide-y divide-border">
                      {filteredStudents.length === 0 ? (
                        <p className="p-2 text-center text-xs text-muted-foreground">
                          Santri tidak ditemukan.
                        </p>
                      ) : (
                        filteredStudents.map((s: any) => (
                          <div
                            key={s.id}
                            onClick={() => setStudentId(s.id)}
                            className={`flex cursor-pointer items-center justify-between p-2 text-xs rounded transition-colors ${
                              studentId === s.id
                                ? "bg-primary/10 font-semibold text-primary"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <span>
                              {s.name} ({s.nis_nip || "-"})
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {s.dorm || "-"} • {s.class || "-"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-primary/5 p-3 flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">Pemohon: {contextQuery.data?.me?.name || profile?.name}</p>
                      <p className="text-muted-foreground">
                        Kamar: {contextQuery.data?.me?.dorm || "-"} • Kelas: {contextQuery.data?.me?.class || "-"} • NIS: {contextQuery.data?.me?.nis_nip || "-"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Pemilihan Kategori Izin */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Kategori Izin <span className="text-destructive">*</span>
                  </Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="-- Pilih Kategori Izin --" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c: PermitCategory) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              (Maks {c.max_days} hari)
                            </span>
                            {c.requires_uks && (
                              <Badge variant="outline" className="text-[9px] text-rose-600 border-rose-200">
                                Wajib UKS
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCategoryObj && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 pt-0.5">
                      <Info className="h-3.5 w-3.5 text-primary" />
                      <span>{selectedCategoryObj.description || "Ketentuan izin berlaku."}</span>
                      {selectedCategoryObj.requires_uks && (
                        <span className="font-semibold text-rose-600">
                          (Wajib rekomendasi pemeriksaan medis dari Ustadz UKS)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Jadwal Berangkat & Rencana Kembali */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1 rounded-lg border p-2.5 bg-muted/10">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Tanggal & Jam Berangkat
                    </Label>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 rounded-lg border p-2.5 bg-muted/10">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Estimasi Tanggal & Jam Kembali
                    </Label>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Alasan, Tujuan, & Penjemput */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Kota / Alamat Tujuan
                    </Label>
                    <Input
                      placeholder="Contoh: Rumah orang tua di Cilegon / RSUD Serang..."
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground" /> Nama Penjemput
                      </Label>
                      <Input
                        placeholder="Nama Ayah/Ibu..."
                        value={pickupBy}
                        onChange={(e) => setPickupBy(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" /> No. HP / WA
                      </Label>
                      <Input
                        placeholder="0812xxxx..."
                        value={pickupPhone}
                        onChange={(e) => setPickupPhone(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Keperluan / Alasan Detail */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Alasan / Keperluan Izin Lengkap <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    placeholder="Tuliskan keterangan detail keperluan izin santri..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>

                {/* Submit Action */}
                <Button
                  type="button"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || !categoryId || (!isSantri && !studentId) || !reason.trim()}
                  className="w-full gap-2 font-medium"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengirim Pengajuan Izin...
                    </>
                  ) : (
                    <>
                      <FileBadge className="h-4 w-4" />
                      Kirim Pengajuan Izin Santri
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: ANTREAN PERSETUJUAN (APPROVAL MATRIX) */}
          {!isSantri && (
            <TabsContent value="approval" className="space-y-4 m-0">
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-primary" />
                        Antrean Pengajuan Izin Santri ({pendingPermits.length})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Izin memerlukan persetujuan bertingkat dari Waka Kurikulum, Kabid Kesantrian, Petugas UKS (jika sakit), dan Kepala Sekolah.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {pendingPermits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 mb-2" />
                      <p className="font-semibold text-foreground">Tidak Ada Antrean Perizinan</p>
                      <p>Semua pengajuan izin santri telah diproses oleh pimpinan.</p>
                    </div>
                  ) : (
                    pendingPermits.map((p: StudentPermit) => (
                      <div
                        key={p.id}
                        className="rounded-lg border bg-card p-4 shadow-xs space-y-3 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm text-foreground">
                                {p.student_name}
                              </h3>
                              <Badge variant="outline" className="text-[10px]">
                                {p.student_dorm} • {p.student_class}
                              </Badge>
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px]">
                                {p.category_name}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              NIS: {p.student_nis} • Diajukan oleh: {p.submitter_name} pada{" "}
                              {p.created_at.substring(0, 10)}
                            </p>
                          </div>
                          <div className="text-right text-xs">
                            <span className="font-medium text-foreground">
                              {p.start_date} ({p.start_time}) s.d. {p.end_date} ({p.end_time})
                            </span>
                            {p.destination && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                                <MapPin className="h-3 w-3" /> {p.destination}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Alasan & Penjemput */}
                        <div className="text-xs grid grid-cols-1 sm:grid-cols-12 gap-2 bg-muted/20 p-2.5 rounded">
                          <div className="sm:col-span-8">
                            <span className="font-semibold text-muted-foreground">Alasan Izin: </span>
                            <span className="text-foreground">{p.reason}</span>
                          </div>
                          <div className="sm:col-span-4 text-right">
                            <span className="text-muted-foreground">Penjemput: </span>
                            <span className="font-medium text-foreground">
                              {p.pickup_by || "-"} {p.pickup_phone ? `(${p.pickup_phone})` : ""}
                            </span>
                          </div>
                        </div>

                        {/* Papan Indikator Persetujuan Bertingkat */}
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                            Status Matriks Persetujuan:
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                            {/* Wali Kelas */}
                            <div className={`p-2 rounded border flex flex-col justify-between ${p.approved_kurikulum ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200" : "bg-muted/30 border-dashed"}`}>
                              <span className="text-[10px] font-semibold flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" /> Wali Kelas
                              </span>
                              <span className="text-[11px] mt-1 font-medium">
                                {p.approved_kurikulum ? "✔️ Disetujui" : "⏳ Menunggu"}
                              </span>
                              {p.notes_kurikulum && (
                                <span className="text-[9px] text-muted-foreground truncate">
                                  Cat: {p.notes_kurikulum}
                                </span>
                              )}
                            </div>

                            {/* Kesantrian */}
                            <div className={`p-2 rounded border flex flex-col justify-between ${p.approved_kesantrian ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200" : "bg-muted/30 border-dashed"}`}>
                              <span className="text-[10px] font-semibold flex items-center gap-1">
                                <Building className="h-3 w-3" /> Kabid Kesantrian
                              </span>
                              <span className="text-[11px] mt-1 font-medium">
                                {p.approved_kesantrian ? "✔️ Disetujui" : "⏳ Menunggu"}
                              </span>
                              {p.notes_kesantrian && (
                                <span className="text-[9px] text-muted-foreground truncate">
                                  Cat: {p.notes_kesantrian}
                                </span>
                              )}
                            </div>

                            {/* UKS (Hanya jika requires_uks) */}
                            <div className={`p-2 rounded border flex flex-col justify-between ${!p.requires_uks ? "opacity-50 bg-muted/20" : p.approved_uks ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200" : "bg-muted/30 border-dashed"}`}>
                              <span className="text-[10px] font-semibold flex items-center gap-1">
                                <HeartPulse className="h-3 w-3" /> Petugas UKS
                              </span>
                              <span className="text-[11px] mt-1 font-medium">
                                {!p.requires_uks
                                  ? "Tidak Wajib"
                                  : p.approved_uks
                                    ? "✔️ Disetujui"
                                    : "⏳ Menunggu"}
                              </span>
                              {p.notes_uks && (
                                <span className="text-[9px] text-muted-foreground truncate">
                                  Cat: {p.notes_uks}
                                </span>
                              )}
                            </div>

                            {/* Kepala Sekolah */}
                            <div className={`p-2 rounded border flex flex-col justify-between ${p.approved_kepsek ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200" : "bg-muted/30 border-dashed"}`}>
                              <span className="text-[10px] font-semibold flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Kepala Sekolah
                              </span>
                              <span className="text-[11px] mt-1 font-medium">
                                {p.approved_kepsek ? "✔️ Disetujui Final" : "⏳ Menunggu"}
                              </span>
                              {p.notes_kepsek && (
                                <span className="text-[9px] text-muted-foreground truncate">
                                  Cat: {p.notes_kepsek}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons Sesuai Peran Pejabat */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                          {/* Wali Kelas Action */}
                          {(approverRoles?.canApproveWaliKelas || approverRoles?.canApproveKurikulum) && !p.approved_kurikulum && (
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => openDecisionModal(p, "approve", "kurikulum")}
                            >
                              <GraduationCap className="h-3.5 w-3.5" /> Setujui (Wali Kelas)
                            </Button>
                          )}

                          {/* Kabid Kesantrian Action */}
                          {approverRoles?.canApproveKesantrian && !p.approved_kesantrian && (
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => openDecisionModal(p, "approve", "kesantrian")}
                            >
                              <Building className="h-3.5 w-3.5" /> Setujui (Kesantrian)
                            </Button>
                          )}

                          {/* Petugas UKS Action (Jika requires_uks) */}
                          {p.requires_uks && approverRoles?.canApproveUks && !p.approved_uks && (
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => openDecisionModal(p, "approve", "uks")}
                            >
                              <HeartPulse className="h-3.5 w-3.5" /> Rekomendasi Medis UKS
                            </Button>
                          )}

                          {/* Kepala Sekolah / Mudir Action */}
                          {approverRoles?.canApproveKepsek && !p.approved_kepsek && (
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => openDecisionModal(p, "approve", "kepsek")}
                            >
                              <Shield className="h-3.5 w-3.5" /> Persetujuan Final (Kepsek)
                            </Button>
                          )}

                          {/* Fast Track All-in-One untuk Super Admin / Mudir */}
                          {(profile?.account_type === "super_admin" || profile?.account_type === "mudir") && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 text-xs gap-1 bg-primary font-bold"
                              onClick={() => openDecisionModal(p, "approve", "all_in_one")}
                            >
                              ⚡ Setujui Penuh Pimpinan
                            </Button>
                          )}

                          {/* Reject Action */}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs gap-1"
                            onClick={() => openDecisionModal(p, "reject", "kurikulum")}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Tolak Izin
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* TAB 3: POS GERBANG & MONITORING LIVE */}
          {!isSantri && (
            <TabsContent value="gate" className="space-y-4 m-0">
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <DoorClosed className="h-4 w-4 text-primary" />
                        Pencatatan Gerbang & Pemantauan Santri di Luar
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Catat waktu berangkat (Check-Out) dan waktu tiba kembali (Check-In). Sistem otomatis mendeteksi keterlambatan.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {gatePermits.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      Tidak ada santri yang berstatus siap keluar atau sedang di luar pondok saat ini.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase">
                          <tr>
                            <th className="p-3">Santri</th>
                            <th className="p-3">Kategori</th>
                            <th className="p-3">Jadwal Izin</th>
                            <th className="p-3">Status Gerbang</th>
                            <th className="p-3">Waktu Berangkat</th>
                            <th className="p-3">Waktu Tiba</th>
                            <th className="p-3 text-right">Aksi Gerbang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {gatePermits.map((p: StudentPermit) => (
                            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-medium text-foreground">
                                {p.student_name}
                                <span className="block text-[10px] text-muted-foreground">
                                  {p.student_dorm} • {p.student_class}
                                </span>
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className="text-[10px]">
                                  {p.category_name}
                                </Badge>
                              </td>
                              <td className="p-3 text-muted-foreground">
                                <div>Keluar: {p.start_date} ({p.start_time})</div>
                                <div>Kembali: {p.end_date} ({p.end_time})</div>
                              </td>
                              <td className="p-3">{getStatusBadge(p.status)}</td>
                              <td className="p-3 text-muted-foreground text-[11px]">
                                {p.actual_checkout_at
                                  ? `${p.actual_checkout_at.substring(0, 10)} ${p.actual_checkout_at.substring(11, 16)}`
                                  : "-"}
                              </td>
                              <td className="p-3 text-muted-foreground text-[11px]">
                                {p.actual_checkin_at
                                  ? `${p.actual_checkin_at.substring(0, 10)} ${p.actual_checkin_at.substring(11, 16)}`
                                  : "-"}
                              </td>
                              <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                                {p.status === "Disetujui" && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() =>
                                      gateMutation.mutate({
                                        permit_id: p.id,
                                        action: "checkout",
                                      })
                                    }
                                    disabled={gateMutation.isPending}
                                  >
                                    <DoorOpen className="h-3 w-3" /> Catat Keluar
                                  </Button>
                                )}
                                {p.status === "Sedang di Luar" && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() =>
                                      gateMutation.mutate({
                                        permit_id: p.id,
                                        action: "checkin",
                                      })
                                    }
                                    disabled={gateMutation.isPending}
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> Catat Tiba Kembali
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => setPermitForEPass(p)}
                                >
                                  <FileBadge className="h-3 w-3" /> E-Surat Izin
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* TAB 4: REKAPITULASI & STATISTIK IZIN */}
          <TabsContent value="rekap" className="space-y-4 m-0">
            {/* Filter Bar */}
            <Card className="border-border shadow-xs bg-muted/10">
              <CardContent className="p-3">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Periode</Label>
                    <Select value={rekapPeriod} onValueChange={(v: any) => setRekapPeriod(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hari_ini">Hari Ini</SelectItem>
                        <SelectItem value="pekan_ini">Pekan Ini</SelectItem>
                        <SelectItem value="bulan_ini">Bulan Ini</SelectItem>
                        <SelectItem value="semester">Semester Ini</SelectItem>
                        <SelectItem value="semua">Semua Waktu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Status Izin</Label>
                    <Select value={rekapStatus} onValueChange={setRekapStatus}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semua">Semua Status</SelectItem>
                        <SelectItem value="Menunggu Persetujuan">Menunggu</SelectItem>
                        <SelectItem value="Disetujui">Disetujui</SelectItem>
                        <SelectItem value="Sedang di Luar">Sedang di Luar</SelectItem>
                        <SelectItem value="Telah Kembali">Telah Kembali</SelectItem>
                        <SelectItem value="Terlambat Kembali">Terlambat Kembali</SelectItem>
                        <SelectItem value="Ditolak">Ditolak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Kategori Izin</Label>
                    <Select value={rekapCategory} onValueChange={setRekapCategory}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semua">Semua Kategori</SelectItem>
                        {categories.map((c: PermitCategory) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] text-muted-foreground">Pencarian</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Cari santri, NIS, atau alasan izin..."
                        value={rekapSearch}
                        onChange={(e) => setRekapSearch(e.target.value)}
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visual Charts & Watchlist */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Card className="border-border shadow-sm lg:col-span-7">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Tren Frekuensi Izin Santri Bulanan
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  {(data?.monthlyTrend ?? []).length === 0 ? (
                    <div className="flex h-44 items-center justify-center text-xs text-muted-foreground">
                      Belum ada data tren izin pada periode ini.
                    </div>
                  ) : (
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.monthlyTrend ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              borderColor: "hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                          />
                          <Bar dataKey="count" name="Jumlah Izin" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Watchlist: Santri Sering Izin */}
              <Card className="border-border shadow-sm lg:col-span-5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Santri Paling Sering Izin (Watchlist)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Deteksi santri dengan frekuensi izin tertinggi untuk evaluasi asrama & belajar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5 pt-2">
                  {(data?.frequentStudents ?? []).length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Belum ada data santri yang sering izin.
                    </p>
                  ) : (
                    data?.frequentStudents.slice(0, 5).map((item: any, idx: number) => (
                      <div
                        key={item.student.id}
                        className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {item.student.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {item.student.dorm} • {item.student.class}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[11px] font-bold">
                          {item.count} kali izin
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Riwayat Lengkap Perizinan Table */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Daftar Riwayat Perizinan ({permits.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {permits.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada catatan perizinan yang sesuai filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase">
                        <tr>
                          <th className="p-3">Santri</th>
                          <th className="p-3">Kategori</th>
                          <th className="p-3">Tanggal Izin</th>
                          <th className="p-3">Alasan / Tujuan</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Tanda Tangan Pimpinan</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {permits.map((p: StudentPermit) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-medium text-foreground">
                              {p.student_name}
                              <span className="block text-[10px] text-muted-foreground">
                                {p.student_dorm} • {p.student_class}
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px]">
                                {p.category_name}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                              <div>{p.start_date} ({p.start_time})</div>
                              <div>s.d. {p.end_date} ({p.end_time})</div>
                            </td>
                            <td className="p-3 max-w-[200px]">
                              <p className="font-medium text-foreground truncate">{p.reason}</p>
                              {p.destination && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  Tujuan: {p.destination}
                                </p>
                              )}
                            </td>
                            <td className="p-3">{getStatusBadge(p.status)}</td>
                            <td className="p-3 text-[11px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span title="Wali Kelas" className={p.approved_kurikulum ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                                  [Wali: {p.approved_kurikulum ? "✔️" : "⏳"}]
                                </span>
                                <span title="Kesantrian" className={p.approved_kesantrian ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                                  [Santri: {p.approved_kesantrian ? "✔️" : "⏳"}]
                                </span>
                                {p.requires_uks && (
                                  <span title="UKS" className={p.approved_uks ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                                    [UKS: {p.approved_uks ? "✔️" : "⏳"}]
                                  </span>
                                )}
                                <span title="Kepala Sekolah" className={p.approved_kepsek ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                                  [Kepsek: {p.approved_kepsek ? "✔️" : "⏳"}]
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => setPermitForEPass(p)}
                              >
                                <FileBadge className="h-3 w-3" /> E-Surat Izin
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL 1: PERSETUJUAN / PENOLAKAN DENGAN CATATAN */}
      <Dialog
        open={Boolean(selectedPermitForAction)}
        onOpenChange={(open) => !open && setSelectedPermitForAction(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              {actionType === "approve" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Konfirmasi Persetujuan Izin Santri
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-600" />
                  Tolak Pengajuan Izin Santri
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Santri: <span className="font-semibold text-foreground">{selectedPermitForAction?.student_name}</span>{" "}
              • Kategori: {selectedPermitForAction?.category_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="rounded border bg-muted/20 p-2.5 text-xs space-y-1">
              <p>
                <span className="text-muted-foreground">Jadwal:</span>{" "}
                {selectedPermitForAction?.start_date} s.d. {selectedPermitForAction?.end_date}
              </p>
              <p>
                <span className="text-muted-foreground">Keperluan:</span>{" "}
                {selectedPermitForAction?.reason}
              </p>
              {selectedPermitForAction?.pickup_by && (
                <p>
                  <span className="text-muted-foreground">Penjemput:</span>{" "}
                  {selectedPermitForAction?.pickup_by} ({selectedPermitForAction?.pickup_phone || "-"})
                </p>
              )}
            </div>

            {actionType === "approve" ? (
              <div className="space-y-1">
                <Label className="text-xs">Catatan Instruksi / Tugas Santri (Opsional)</Label>
                <Textarea
                  placeholder="Contoh: Tugas bab 4 wajib dikumpulkan saat kembali ke madrasah..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs">
                  Alasan Penolakan <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="Contoh: Sedang ada agenda ujian tahfidz / batas kuota izin asrama penuh..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPermitForAction(null)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={() => decisionMutation.mutate()}
              disabled={decisionMutation.isPending || (actionType === "reject" && !rejectionReason.trim())}
            >
              {decisionMutation.isPending
                ? "Memproses..."
                : actionType === "approve"
                  ? "Tandatangani & Setujui"
                  : "Konfirmasi Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: E-SURAT IZIN DIGITAL SANTRI (SIAP CETAK / TUNJUKKAN KE GERBANG) */}
      <Dialog
        open={Boolean(permitForEPass)}
        onOpenChange={(open) => !open && setPermitForEPass(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileBadge className="h-5 w-5 text-primary" />
              Surat Izin Santri Resmi (E-Pass)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tunjukkan lembar digital ini ke Petugas Gerbang / Satpam saat keluar dan kembali ke pondok.
            </DialogDescription>
          </DialogHeader>

          {permitForEPass && (
            <div id="e-pass-area" className="space-y-4 rounded-lg border bg-white p-6 text-black shadow-xs">
              {/* Header Surat */}
              <div className="border-b-2 border-black pb-3 text-center">
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  AL-HIKMAH ISLAMIC BOARDING SCHOOL (AHIBS)
                </h2>
                <h3 className="text-xs font-semibold uppercase text-gray-700">
                  SURAT IZIN KELUAR / KEPULANGAN SANTRI
                </h3>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  ID Izin: {permitForEPass.id.substring(0, 8).toUpperCase()} • Status:{" "}
                  {permitForEPass.status}
                </p>
              </div>

              {/* Identitas Santri */}
              <div className="grid grid-cols-2 gap-2 text-xs border-b pb-3">
                <div>
                  <span className="text-gray-500 block text-[10px]">Nama Lengkap:</span>
                  <span className="font-bold text-sm">{permitForEPass.student_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">NIS / Kamar / Kelas:</span>
                  <span className="font-semibold">
                    {permitForEPass.student_nis} • {permitForEPass.student_dorm} • {permitForEPass.student_class}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Kategori Izin:</span>
                  <span className="font-semibold">{permitForEPass.category_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Tujuan & Penjemput:</span>
                  <span className="font-semibold">
                    {permitForEPass.destination || "-"} ({permitForEPass.pickup_by || "Mandiri"})
                  </span>
                </div>
              </div>

              {/* Jadwal Keluar & Kembali */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-2.5 rounded border border-gray-200">
                <div>
                  <span className="text-gray-500 block text-[10px]">Waktu Berangkat:</span>
                  <span className="font-bold text-blue-700">
                    {permitForEPass.start_date} ({permitForEPass.start_time} WIB)
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Batas Waktu Kembali:</span>
                  <span className="font-bold text-rose-700">
                    {permitForEPass.end_date} ({permitForEPass.end_time} WIB)
                  </span>
                </div>
              </div>

              {/* Keterangan Keperluan */}
              <div className="text-xs">
                <span className="text-gray-500 block text-[10px]">Alasan / Keperluan:</span>
                <p className="italic text-gray-800">{permitForEPass.reason}</p>
              </div>

              {/* Tanda Tangan Multi-Approval */}
              <div className="grid grid-cols-3 gap-2 text-[10px] text-center pt-3 border-t">
                <div>
                  <p className="text-gray-500">Wali Kelas</p>
                  <p className="font-bold mt-1">
                    {permitForEPass.approved_kurikulum ? "✔️ Disetujui" : "⏳ Menunggu"}
                  </p>
                  <p className="text-[9px] text-gray-400 truncate">{permitForEPass.approver_kurikulum_name || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Kabid Kesantrian</p>
                  <p className="font-bold mt-1">
                    {permitForEPass.approved_kesantrian ? "✔️ Disetujui" : "⏳ Menunggu"}
                  </p>
                  <p className="text-[9px] text-gray-400 truncate">{permitForEPass.approver_kesantrian_name || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Kepala Sekolah</p>
                  <p className="font-bold mt-1">
                    {permitForEPass.approved_kepsek ? "✔️ Sah (Final)" : "⏳ Menunggu"}
                  </p>
                  <p className="text-[9px] text-gray-400 truncate">{permitForEPass.approver_kepsek_name || "-"}</p>
                </div>
              </div>

              {permitForEPass.requires_uks && (
                <div className="p-1.5 rounded bg-purple-50 text-[10px] text-purple-900 border border-purple-200 text-center">
                  Rekomendasi Medis UKS:{" "}
                  <span className="font-bold">
                    {permitForEPass.approved_uks ? `Disetujui (${permitForEPass.notes_uks || "Laik Berobat"})` : "Menunggu Pemeriksaan"}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPermitForEPass(null)}>
              Tutup
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                window.print();
              }}
            >
              <Printer className="h-4 w-4" /> Cetak E-Pass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CETAK REKAP LAPORAN RESMI KEPULANGAN */}
      <Dialog open={isPrintRecapOpen} onOpenChange={setIsPrintRecapOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Pratinjau Lembar Rekapitulasi Perizinan Santri
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 rounded-lg border bg-white p-6 text-black">
            <div className="border-b-2 border-black pb-3 text-center">
              <h2 className="text-base font-bold uppercase">
                AL-HIKMAH ISLAMIC BOARDING SCHOOL (AHIBS)
              </h2>
              <h3 className="text-xs font-semibold uppercase text-gray-600">
                LAPORAN REKAPITULASI PERIZINAN & KEPULANGAN SANTRI
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Periode: {rekapPeriod} • Dicetak pada:{" "}
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <table className="w-full border-collapse border border-gray-300 text-[11px]">
              <thead className="bg-gray-100 font-semibold">
                <tr>
                  <th className="border border-gray-300 p-1.5 text-center">No</th>
                  <th className="border border-gray-300 p-1.5">Nama Santri</th>
                  <th className="border border-gray-300 p-1.5">Kamar / Kelas</th>
                  <th className="border border-gray-300 p-1.5">Kategori</th>
                  <th className="border border-gray-300 p-1.5">Jadwal Izin</th>
                  <th className="border border-gray-300 p-1.5">Status</th>
                  <th className="border border-gray-300 p-1.5">Waktu Tiba</th>
                </tr>
              </thead>
              <tbody>
                {permits.map((p: StudentPermit, i: number) => (
                  <tr key={p.id}>
                    <td className="border border-gray-300 p-1.5 text-center">{i + 1}</td>
                    <td className="border border-gray-300 p-1.5 font-medium">{p.student_name}</td>
                    <td className="border border-gray-300 p-1.5">
                      {p.student_dorm} • {p.student_class}
                    </td>
                    <td className="border border-gray-300 p-1.5">{p.category_name}</td>
                    <td className="border border-gray-300 p-1.5">
                      {p.start_date} s.d. {p.end_date}
                    </td>
                    <td className="border border-gray-300 p-1.5 font-semibold">{p.status}</td>
                    <td className="border border-gray-300 p-1.5">
                      {p.actual_checkin_at ? p.actual_checkin_at.substring(0, 16) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-8 flex justify-between text-xs text-center">
              <div>
                <p>Mengetahui,</p>
                <p className="font-semibold">Kabid Kesantrian</p>
                <div className="h-16" />
                <p className="font-semibold underline">( Ustadz Pembina Kesantrian )</p>
              </div>
              <div>
                <p>Menyetujui,</p>
                <p className="font-semibold">Kepala Sekolah / Mudir</p>
                <div className="h-16" />
                <p className="font-semibold underline">( Mudir Pesantren AHIBS )</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsPrintRecapOpen(false)}>
              Tutup
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                window.print();
              }}
            >
              <Printer className="h-4 w-4" /> Cetak Lembar Rekap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: MANAJEMEN KATEGORI IZIN (ADMIN) */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Kelola Kategori Perizinan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Atur daftar jenis izin santri, batas maksimal durasi hari, dan kewajiban rekomendasi UKS.
            </DialogDescription>
          </DialogHeader>

          {/* Form Tambah Kategori */}
          <div className="space-y-2.5 rounded-lg border bg-muted/30 p-3">
            <h4 className="text-xs font-semibold flex items-center gap-1">
              <Plus className="h-3.5 w-3.5 text-primary" /> Tambah Kategori Izin Baru
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <div className="sm:col-span-6 space-y-1">
                <Label className="text-[11px]">Nama Kategori</Label>
                <Input
                  placeholder="Contoh: Izin Perlombaan / Dinas..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px]">Batas Maks Hari</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={newCatDays}
                  onChange={(e) => setNewCatDays(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-[11px]">Wajib UKS?</Label>
                <Select
                  value={newCatUks ? "true" : "false"}
                  onValueChange={(v) => setNewCatUks(v === "true")}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Tidak Wajib</SelectItem>
                    <SelectItem value="true">Wajib UKS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-9 space-y-1">
                <Label className="text-[11px]">Deskripsi / Ketentuan</Label>
                <Input
                  placeholder="Penjelasan aturan izin ini..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-3 flex items-end">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 w-full text-xs"
                  onClick={() => addCategoryMutation.mutate()}
                  disabled={!newCatName.trim() || addCategoryMutation.isPending}
                >
                  {addCategoryMutation.isPending ? "Menyimpan..." : "Tambah Kategori"}
                </Button>
              </div>
            </div>
          </div>

          {/* Tabel Kategori */}
          <div className="max-h-60 overflow-y-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase sticky top-0">
                <tr>
                  <th className="p-2">Kategori</th>
                  <th className="p-2 text-center">Batas Hari</th>
                  <th className="p-2 text-center">Wajib UKS</th>
                  <th className="p-2">Keterangan</th>
                  <th className="p-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((c: PermitCategory) => (
                  <tr key={c.id} className="hover:bg-muted/20">
                    <td className="p-2 font-medium text-foreground">{c.name}</td>
                    <td className="p-2 text-center">{c.max_days} hari</td>
                    <td className="p-2 text-center">
                      <Badge
                        variant={c.requires_uks ? "destructive" : "outline"}
                        className="text-[10px]"
                      >
                        {c.requires_uks ? "Ya" : "Tidak"}
                      </Badge>
                    </td>
                    <td className="p-2 text-muted-foreground truncate max-w-[160px]">
                      {c.description || "-"}
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (window.confirm(`Hapus kategori "${c.name}"?`)) {
                            deleteCategoryMutation.mutate(c.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
