import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  BookOpen,
  CheckCircle2,
  FileText,
  Heart,
  Loader2,
  Printer,
  School,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getReportCardPondok,
  getReportCardDinas,
  getReportCardKesantrian,
  calculateLetterGrade,
} from "@/lib/grades.functions";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type ReportType = "pondok" | "dinas" | "kesantrian";

interface StudentReportCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  semester?: string;
  academicYear?: string;
  defaultTab?: ReportType;
}

// ──────────────────────────────────────────────────────────────
// Main Dialog
// ──────────────────────────────────────────────────────────────

export function StudentReportCardDialog({
  open,
  onOpenChange,
  studentId,
  semester = "1",
  academicYear = "2026/2027",
  defaultTab = "pondok",
}: StudentReportCardDialogProps) {
  const [activeTab, setActiveTab] = useState<ReportType>(defaultTab);

  const fetchPondokFn = useServerFn(getReportCardPondok);
  const fetchDinasFn = useServerFn(getReportCardDinas);
  const fetchKesantrianFn = useServerFn(getReportCardKesantrian);

  const pondokQuery = useQuery({
    queryKey: ["report-card-pondok", studentId, semester, academicYear],
    queryFn: () => {
      if (!studentId) return null;
      return fetchPondokFn({ data: { student_id: studentId, semester, academic_year: academicYear } });
    },
    enabled: open && Boolean(studentId) && activeTab === "pondok",
  });

  const dinasQuery = useQuery({
    queryKey: ["report-card-dinas", studentId, semester, academicYear],
    queryFn: () => {
      if (!studentId) return null;
      return fetchDinasFn({ data: { student_id: studentId, semester, academic_year: academicYear } });
    },
    enabled: open && Boolean(studentId) && activeTab === "dinas",
  });

  const kesantrianQuery = useQuery({
    queryKey: ["report-card-kesantrian", studentId, semester, academicYear],
    queryFn: () => {
      if (!studentId) return null;
      return fetchKesantrianFn({ data: { student_id: studentId, semester, academic_year: academicYear } });
    },
    enabled: open && Boolean(studentId) && activeTab === "kesantrian",
  });

  const handlePrint = () => {
    window.print();
  };

  const getSemesterLabel = (sem: string) =>
    sem === "1" ? "1 (Ganjil)" : "2 (Genap)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Top Control Bar - Hidden on Print */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-b bg-muted/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <DialogTitle className="text-base font-semibold leading-none">
                Rapor Digital Santri
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Pilih jenis rapor, lalu cetak
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="gap-1.5 font-medium shadow-xs"
            >
              <Printer className="w-4 h-4 text-primary" />
              Cetak / Simpan PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tab Selector - Hidden on Print */}
        <div className="no-print px-6 pt-3 pb-0 shrink-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="pondok" className="gap-1.5 text-xs md:text-sm">
                <BookOpen className="w-4 h-4" />
                Rapor Pondok
              </TabsTrigger>
              <TabsTrigger value="dinas" className="gap-1.5 text-xs md:text-sm">
                <School className="w-4 h-4" />
                Rapor Dinas
              </TabsTrigger>
              <TabsTrigger value="kesantrian" className="gap-1.5 text-xs md:text-sm">
                <Heart className="w-4 h-4" />
                Rapor Kesantrian
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50 dark:bg-slate-950/40">
          {activeTab === "pondok" && (
            <ReportContent
              isLoading={pondokQuery.isLoading}
              error={pondokQuery.error}
              refetch={pondokQuery.refetch}
            >
              {pondokQuery.data && <RaporPondok data={pondokQuery.data} />}
            </ReportContent>
          )}
          {activeTab === "dinas" && (
            <ReportContent
              isLoading={dinasQuery.isLoading}
              error={dinasQuery.error}
              refetch={dinasQuery.refetch}
            >
              {dinasQuery.data && <RaporDinas data={dinasQuery.data} />}
            </ReportContent>
          )}
          {activeTab === "kesantrian" && (
            <ReportContent
              isLoading={kesantrianQuery.isLoading}
              error={kesantrianQuery.error}
              refetch={kesantrianQuery.refetch}
            >
              {kesantrianQuery.data && <RaporKesantrian data={kesantrianQuery.data} />}
            </ReportContent>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────
// Loading / Error wrapper
// ──────────────────────────────────────────────────────────────

function ReportContent({
  isLoading,
  error,
  refetch,
  children,
}: {
  isLoading: boolean;
  error: any;
  refetch: () => void;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Menyiapkan dokumen rapor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
        <p className="text-destructive font-semibold mb-1">Gagal memuat data rapor</p>
        <p className="text-sm text-muted-foreground mb-4">
          {(error as any)?.message || "Data santri atau nilai tidak ditemukan."}
        </p>
        <Button size="sm" variant="outline" onClick={refetch}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

// ──────────────────────────────────────────────────────────────
// Shared: KOP Surat
// ──────────────────────────────────────────────────────────────

function KopSurat({ school, subtitle }: { school: any; subtitle: string }) {
  return (
    <div className="print-section print-avoid-break">
      <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-slate-900 print:border-black">
        <img
          src={school.logo || "/logo-alhanif.png"}
          alt="Logo AHIBS"
          className="w-20 h-20 object-contain shrink-0"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
        <div className="flex-1 text-center">
          <h3 className="text-xs md:text-sm font-semibold tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-600 uppercase">
            {school.foundation}
          </h3>
          <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white print:text-black tracking-tight leading-tight">
            {school.fullName}
          </h1>
          <h2 className="text-base md:text-lg font-bold text-primary print:text-black leading-tight">
            {school.name}
          </h2>
          <p className="text-[11px] md:text-xs text-slate-600 dark:text-slate-400 print:text-slate-600 mt-0.5">
            NPSN: {school.npsn} • Terakreditasi {school.accreditation} • {school.address}
          </p>
        </div>
        <div className="w-20 hidden md:flex items-center justify-center shrink-0">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-center p-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase leading-tight">
              SMPIT AHIBS
            </span>
          </div>
        </div>
      </div>
      <div className="h-0.5 bg-slate-900 print:bg-black mt-0.5 mb-6" />

      <div className="text-center mb-6">
        <h3 className="text-base md:text-lg font-black uppercase tracking-wide underline underline-offset-4">
          {subtitle}
        </h3>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Shared: Biodata Grid
// ──────────────────────────────────────────────────────────────

function BiodataGrid({ student, semester, academicYear }: { student: any; semester: string; academicYear: string }) {
  const semLabel = semester === "1" ? "1 (Ganjil)" : "2 (Genap)";
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs md:text-sm mb-6 bg-slate-50/70 dark:bg-slate-900/40 print:bg-transparent p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 print:border-none print:p-0 print-section print-avoid-break">
      <div className="flex">
        <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">Nama Santri</span>
        <span className="font-bold text-slate-900 dark:text-white print:text-black uppercase">
          : {student.name || student.display_name}
        </span>
      </div>
      <div className="flex">
        <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">Kelas / Rombel</span>
        <span className="font-semibold text-slate-900 dark:text-white print:text-black">
          : Kelas {student.class || "-"}
        </span>
      </div>
      <div className="flex">
        <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">NIS / NISN</span>
        <span className="text-slate-800 dark:text-slate-200 print:text-black">
          : {student.nis_nip || "-"}
        </span>
      </div>
      <div className="flex">
        <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">Semester</span>
        <span className="text-slate-800 dark:text-slate-200 print:text-black">: {semLabel}</span>
      </div>
      <div className="flex">
        <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">Asrama / Kamar</span>
        <span className="text-slate-800 dark:text-slate-200 print:text-black">
          : {student.dorm || "-"}
        </span>
      </div>
      <div className="flex">
        <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">Tahun Ajaran</span>
        <span className="text-slate-800 dark:text-slate-200 print:text-black">: {academicYear}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Shared: Attendance table
// ──────────────────────────────────────────────────────────────

function AttendanceTable({ attendance }: { attendance: { sakit: number; izin: number; alpa: number } }) {
  return (
    <div className="border border-slate-300 dark:border-slate-700 print:border-black rounded-md overflow-hidden print-section print-avoid-break">
      <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 px-3 py-1.5 font-bold uppercase border-b border-slate-300 dark:border-slate-700 print:border-black text-center text-xs">
        Ketidakhadiran
      </div>
      <div className="p-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span>Sakit</span>
          <span className="font-semibold">{attendance.sakit} hari</span>
        </div>
        <div className="flex justify-between">
          <span>Izin</span>
          <span className="font-semibold">{attendance.izin} hari</span>
        </div>
        <div className="flex justify-between">
          <span>Tanpa Keterangan</span>
          <span className="font-semibold">{attendance.alpa} hari</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Shared: Signature Block
// ──────────────────────────────────────────────────────────────

function SignatureBlock({
  signatures,
  studentClass,
  extra,
}: {
  signatures: { homeroomTeacherName: string; homeroomTeacherNiy: string; headmasterName: string; headmasterNiy: string };
  studentClass: string;
  extra?: { label: string; name: string; niy: string };
}) {
  const today = new Date();
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const dateStr = `Cilegon, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

  const cols = extra ? "grid-cols-4" : "grid-cols-3";

  return (
    <div className="pt-4 text-xs md:text-sm print-section print-avoid-break report-signature-block">
      <div className="text-right mb-4">
        <span>{dateStr}</span>
      </div>
      <div className={`grid ${cols} gap-4 text-center`}>
        <div>
          <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">Mengetahui,</p>
          <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">Orang Tua / Wali Santri</p>
          <div className="h-20" />
          <p className="font-bold uppercase underline">( ........................................ )</p>
        </div>

        {extra && (
          <div>
            <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">{extra.label}</p>
            <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">&nbsp;</p>
            <div className="h-20" />
            <p className="font-bold uppercase underline">{extra.name}</p>
            <p className="text-[10px] text-slate-500 print:text-black">NIY. {extra.niy}</p>
          </div>
        )}

        <div>
          <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">Wali Kelas</p>
          <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">Kelas {studentClass || "-"}</p>
          <div className="h-20" />
          <p className="font-bold uppercase underline">{signatures.homeroomTeacherName}</p>
          <p className="text-[10px] text-slate-500 print:text-black">NIY. {signatures.homeroomTeacherNiy}</p>
        </div>

        <div>
          <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">Kepala Sekolah</p>
          <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">SMPIT Putra Al-Hanif</p>
          <div className="h-20" />
          <p className="font-bold uppercase underline">{signatures.headmasterName}</p>
          <p className="text-[10px] text-slate-500 print:text-black">NIY. {signatures.headmasterNiy}</p>
        </div>
      </div>
    </div>
  );
}

function KesantrianSignatureBlock({
  musyrif,
  signatures,
}: {
  musyrif: { name: string; niy: string };
  signatures: {
    headOfKesantrianName?: string;
    headOfKesantrianNiy?: string;
    headmasterName: string;
    headmasterNiy: string;
  };
}) {
  const today = new Date();
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const dateStr = `Cilegon, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

  const headKesantrian =
    signatures.headOfKesantrianName && signatures.headOfKesantrianName !== "Kepala Kesantrian"
      ? signatures.headOfKesantrianName
      : "Ust. H. Ahmad Fauzan, Lc";
  const headKesantrianNiy = signatures.headOfKesantrianNiy || "-";

  return (
    <div className="pt-4 text-xs md:text-sm print-section print-avoid-break report-signature-block">
      <div className="text-right mb-4">
        <span>{dateStr}</span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">Mengetahui,</p>
          <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">Orang Tua / Wali Siswa</p>
          <div className="h-20" />
          <p className="font-bold uppercase underline">( ........................................ )</p>
        </div>

        <div>
          <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">Musyrif Asrama</p>
          <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">&nbsp;</p>
          <div className="h-20" />
          <p className="font-bold uppercase underline">{musyrif?.name || "Musyrif Asrama"}</p>
          <p className="text-[10px] text-slate-500 print:text-black">NIY. {musyrif?.niy || "-"}</p>
        </div>

        <div>
          <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">Kepala Kesantrian</p>
          <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">SMPIT Putra Al-Hanif</p>
          <div className="h-20" />
          <p className="font-bold uppercase underline">{headKesantrian}</p>
          <p className="text-[10px] text-slate-500 print:text-black">NIY. {headKesantrianNiy}</p>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Shared: Grades Table
// ──────────────────────────────────────────────────────────────

function ReportGradesTable({ items, showTp = true }: { items: any[]; showTp?: boolean }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-3 border rounded text-center italic">
        Belum ada mata pelajaran pada kelompok ini.
      </div>
    );
  }

  return (
    <table className="w-full text-[11px] md:text-xs border-collapse border border-slate-300 dark:border-slate-700 print:border-black print-section print-avoid-break">
      <thead>
        <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-900 dark:text-white print:text-black text-center font-bold">
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-8">No</th>
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">Mata Pelajaran</th>
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-12">KKM</th>
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-14">Nilai Akhir</th>
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-12">Predikat</th>
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">Capaian Kompetensi</th>
        </tr>
      </thead>
      <tbody>
        {items.map((row, idx) => {
          const finalScore = Number(row.finalScore) || 0;
          const kkm = Number(row.subject?.kkm) || 75;
          const isRemedial = finalScore > 0 && finalScore < kkm;

          return (
            <tr key={row.subject.id} className="border-b border-slate-300 dark:border-slate-700 print:border-black">
              <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-medium">{idx + 1}</td>
              <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 font-medium">
                <div>{row.subject.name}</div>
                {showTp && row.tpList && row.tpList.length > 0 && (
                  <div className="text-[10px] text-slate-500 print:text-slate-600 mt-0.5">
                    {row.tpList.length} Tujuan Pembelajaran (TP) dinilai
                  </div>
                )}
                {row.components && row.components.length > 0 && (
                  <div className="text-[10px] text-slate-500 print:text-slate-600 mt-0.5">
                    Gabungan: {row.components.map((c: any) => `${c.name} (${c.score || "-"})`).join(", ")}
                  </div>
                )}
              </td>
              <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center text-slate-600 dark:text-slate-400 print:text-black">{kkm}</td>
              <td className={`border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-bold ${
                isRemedial ? "text-red-600 dark:text-red-400 print:text-black" : finalScore >= 85 ? "text-emerald-700 dark:text-emerald-400 print:text-black" : ""
              }`}>
                {finalScore > 0 ? finalScore : "-"}
              </td>
              <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-bold">{row.letterGrade}</td>
              <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-[10.5px] leading-relaxed text-slate-700 dark:text-slate-300 print:text-black">
                {row.highestDesc || row.lowestDesc ? (
                  <div className="space-y-1">
                    {row.highestDesc && <div>• {row.highestDesc}</div>}
                    {row.lowestDesc && (
                      <div className="text-amber-700 dark:text-amber-400 print:text-black font-medium">
                        • {row.lowestDesc}
                      </div>
                    )}
                  </div>
                ) : finalScore > 0 ? (
                  <span>Menunjukkan pemahaman materi sesuai dengan target capaian pembelajaran semester ini.</span>
                ) : (
                  <span className="text-slate-400 italic">Belum ada nilai yang diinput</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ──────────────────────────────────────────────────────────────
// RAPOR PONDOK
// ──────────────────────────────────────────────────────────────

function RaporPondok({ data }: { data: any }) {
  return (
    <div
      id="report-card-pondok"
      className="max-w-[850px] mx-auto bg-white text-slate-900 dark:bg-card dark:text-card-foreground p-8 md:p-12 rounded-xl shadow-md print:shadow-none print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black border border-border/80 print:border-none"
    >
      <KopSurat school={data.school} subtitle="Laporan Capaian Hasil Belajar Santri" />
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 print:text-slate-600 text-center -mt-4 mb-6">
        Kurikulum Merdeka & Kurikulum Kepesantrenan Terpadu
      </p>

      <BiodataGrid student={data.student} semester={data.semester} academicYear={data.academic_year} />

      {/* Kelompok A: Umum */}
      <div className="mb-6 print-section print-avoid-break">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-xs uppercase px-2 py-0.5 bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 print:bg-slate-200 print:text-black rounded">
            Kelompok A
          </span>
          <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide">
            Muatan Nasional (Kemendikdasmen / Kurikulum Merdeka)
          </h4>
        </div>
        <ReportGradesTable items={data.groupedSubjects.umum} />
      </div>

      {/* Kelompok B: Diniyyah */}
      <div className="mb-6 print-section print-avoid-break">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-xs uppercase px-2 py-0.5 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 print:bg-slate-200 print:text-black rounded">
            Kelompok B
          </span>
          <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide">
            Muatan Kepesantrenan & Diniyyah AHIBS
          </h4>
        </div>
        <ReportGradesTable items={data.groupedSubjects.diniyyah} />
      </div>

      {/* Kelompok C: Bahasa Arab */}
      <div className="mb-6 print-section print-avoid-break">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-xs uppercase px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 print:bg-slate-200 print:text-black rounded">
            Kelompok C
          </span>
          <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide">
            Program Penguatan Bahasa Arab
          </h4>
        </div>
        <ReportGradesTable items={data.groupedSubjects.bahasa_arab} />
      </div>

      {/* Kehadiran & Catatan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-xs print-section print-avoid-break">
        <AttendanceTable attendance={data.attendance} />
        <div className="md:col-span-2 border border-slate-300 dark:border-slate-700 print:border-black rounded-md overflow-hidden flex flex-col">
          <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 px-3 py-1.5 font-bold uppercase border-b border-slate-300 dark:border-slate-700 print:border-black text-xs">
            Catatan & Motivasi Wali Kelas
          </div>
          <div className="p-3 text-slate-700 dark:text-slate-300 print:text-black italic flex-1 flex items-center text-xs">
            "Alhamdulillah ananda menunjukkan perkembangan adab dan kedisiplinan belajar yang baik di pesantren.
            Terus tingkatkan muraja'ah Al-Qur'an, pemahaman diniyyah, serta konsistensi belajar."
          </div>
        </div>
      </div>

      {/* Tanda Tangan */}
      <SignatureBlock signatures={data.signatures} studentClass={data.student.class || "-"} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// RAPOR DINAS
// ──────────────────────────────────────────────────────────────

function RaporDinas({ data }: { data: any }) {
  return (
    <div
      id="report-card-dinas"
      className="max-w-[850px] mx-auto bg-white text-slate-900 dark:bg-card dark:text-card-foreground p-8 md:p-12 rounded-xl shadow-md print:shadow-none print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black border border-border/80 print:border-none"
    >
      <KopSurat school={data.school} subtitle="Laporan Hasil Belajar Peserta Didik" />
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 print:text-slate-600 text-center -mt-4 mb-6">
        Kurikulum Merdeka — Semester {data.semester === "1" ? "I (Ganjil)" : "II (Genap)"} — Tahun Pelajaran {data.academic_year}
      </p>

      <BiodataGrid student={data.student} semester={data.semester} academicYear={data.academic_year} />

      {/* Mata Pelajaran */}
      <div className="mb-6 print-section print-avoid-break">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-xs uppercase px-2 py-0.5 bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 print:bg-slate-200 print:text-black rounded">A</span>
          <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide">Mata Pelajaran</h4>
        </div>
        <ReportGradesTable items={data.subjects} showTp={false} />
      </div>

      {/* Kokurikuler (P5/P5RA - Narasi 1 Paragraf) */}
      <div className="mb-6 print-section print-avoid-break">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-xs uppercase px-2 py-0.5 bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200 print:bg-slate-200 print:text-black rounded">B</span>
          <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide">
            Kokurikuler (Projek Penguatan Profil Pelajar Pancasila & Rahmatan Lil 'Alamin)
          </h4>
        </div>
        <div className="border border-slate-300 dark:border-slate-700 print:border-black rounded-md p-4 text-xs md:text-sm leading-relaxed text-slate-800 dark:text-slate-200 print:text-black bg-slate-50/60 dark:bg-slate-900/30 print:bg-transparent">
          <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100 print:text-black mb-2 text-xs">
            <span>Capaian Projek & Pembiasaan Karakter Santri</span>
            <span className="text-[11px] font-normal text-slate-500 print:text-slate-700 italic">5 Dimensi Nilai HEBAT</span>
          </div>
          <p className="text-justify leading-relaxed text-[11.5px] md:text-xs">
            {data.kokurikulerNarrative || (
              <span className="text-slate-400 italic">Belum ada narasi capaian kokurikuler.</span>
            )}
          </p>
        </div>
      </div>

      {/* Ekstrakurikuler */}
      <div className="mb-6 print-section print-avoid-break">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-xs uppercase px-2 py-0.5 bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 print:bg-slate-200 print:text-black rounded">C</span>
          <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide">Ekstrakurikuler</h4>
        </div>
        {data.ekstrakurikuler && data.ekstrakurikuler.length > 0 ? (
          <table className="w-full text-[11px] md:text-xs border-collapse border border-slate-300 dark:border-slate-700 print:border-black">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-center font-bold">
                <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-8">No</th>
                <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">Kegiatan Ekstrakurikuler</th>
                <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-14">Nilai</th>
                <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {data.ekstrakurikuler.map((e: any, i: number) => (
                <tr key={i} className="border-b border-slate-300 dark:border-slate-700 print:border-black">
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center">{i + 1}</td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5">{e.name}</td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-bold">{e.grade}</td>
                  <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5">{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-xs text-muted-foreground p-3 border rounded text-center italic">
            Belum ada data ekstrakurikuler. (Akan ditambahkan setelah fitur Ekskul selesai)
          </div>
        )}
      </div>

      {/* Kehadiran */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-xs print-section print-avoid-break">
        <AttendanceTable attendance={data.attendance} />
        <div className="md:col-span-2 border border-slate-300 dark:border-slate-700 print:border-black rounded-md overflow-hidden flex flex-col">
          <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 px-3 py-1.5 font-bold uppercase border-b border-slate-300 dark:border-slate-700 print:border-black text-xs">
            Catatan Wali Kelas
          </div>
          <div className="p-3 text-slate-700 dark:text-slate-300 print:text-black italic flex-1 flex items-center text-xs">
            "Alhamdulillah ananda menunjukkan perkembangan yang baik dalam aspek akademik, kepribadian, dan adab selama semester ini."
          </div>
        </div>
      </div>

      <SignatureBlock signatures={data.signatures} studentClass={data.student.class || "-"} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// RAPOR KESANTRIAN
// ──────────────────────────────────────────────────────────────

function getGradeColor(grade: string) {
  switch (grade) {
    case "A": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
    case "B": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "C": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "D": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    default: return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  }
}

function RaporKesantrian({ data }: { data: any }) {
  const overallGrade = data.mutabaah.overallPercentage >= 90 ? "A"
    : data.mutabaah.overallPercentage >= 80 ? "B"
    : data.mutabaah.overallPercentage >= 70 ? "C"
    : data.mutabaah.overallPercentage >= 60 ? "D" : "E";

  const overallLabel = overallGrade === "A" ? "Sangat Baik"
    : overallGrade === "B" ? "Baik"
    : overallGrade === "C" ? "Cukup"
    : overallGrade === "D" ? "Kurang" : "Sangat Kurang";

  return (
    <div
      id="report-card-kesantrian"
      className="max-w-[850px] mx-auto bg-white text-slate-900 dark:bg-card dark:text-card-foreground p-8 md:p-12 rounded-xl shadow-md print:shadow-none print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black border border-border/80 print:border-none"
    >
      <KopSurat school={data.school} subtitle="Laporan Capaian Kesantrian & Adab" />
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 print:text-slate-600 text-center -mt-4 mb-6">
        Ringkasan Mutaba'ah Yaumiyyah (Pemantauan Harian) — Semester {data.semester === "1" ? "Ganjil" : "Genap"} — TA {data.academic_year}
      </p>

      <BiodataGrid student={data.student} semester={data.semester} academicYear={data.academic_year} />

      {/* Overall Score Card */}
      <div className="mb-6 p-4 rounded-lg border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 print:bg-slate-50 print:border-black flex items-center justify-between print-section print-avoid-break">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide">Capaian Keseluruhan Mutaba'ah</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-600 mt-0.5">
            {data.mutabaah.totalDays} hari tercatat selama semester ini
          </p>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-black ${getGradeColor(overallGrade)} px-4 py-2 rounded-lg print:bg-slate-200 print:text-black`}>
            {overallGrade}
          </div>
          <p className="text-xs font-semibold mt-1">{data.mutabaah.overallPercentage}% — {overallLabel}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="mb-6 print-section print-avoid-break">
        <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide mb-2">Rincian Per Aspek Kehidupan Santri</h4>
        <table className="w-full text-[11px] md:text-xs border-collapse border border-slate-300 dark:border-slate-700 print:border-black">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-center font-bold">
              <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-8">No</th>
              <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">Aspek / Kategori</th>
              <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">Kegiatan</th>
              <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-16">Pencapaian</th>
              <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-12">Predikat</th>
              <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-20">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {data.mutabaah.categorySummary.map((cat: any, idx: number) => (
              <tr key={cat.category} className="border-b border-slate-300 dark:border-slate-700 print:border-black">
                <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-medium">{idx + 1}</td>
                <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 font-bold">{cat.category}</td>
                <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5">
                  <div className="space-y-0.5">
                    {cat.activities.map((act: string, i: number) => (
                      <div key={i} className="text-[10px] text-slate-600 dark:text-slate-400 print:text-slate-700">• {act}</div>
                    ))}
                  </div>
                </td>
                <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-bold">
                  {cat.percentage}%
                </td>
                <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${getGradeColor(cat.grade)} print:bg-slate-200 print:text-black`}>
                    {cat.grade}
                  </span>
                </td>
                <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center text-[10px]">
                  {cat.label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Kehadiran & Catatan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-xs print-section print-avoid-break">
        <AttendanceTable attendance={data.attendance} />
        <div className="md:col-span-2 border border-slate-300 dark:border-slate-700 print:border-black rounded-md overflow-hidden flex flex-col">
          <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 px-3 py-1.5 font-bold uppercase border-b border-slate-300 dark:border-slate-700 print:border-black text-xs">
            Catatan Musyrif Asrama
          </div>
          <div className="p-3 text-slate-700 dark:text-slate-300 print:text-black italic flex-1 flex items-center text-xs">
            "Alhamdulillah ananda menunjukkan istiqomah dalam beribadah dan bermutaba'ah.
            Terus tingkatkan konsistensi adab kepada guru dan teman, serta kedisiplinan dalam kegiatan harian pondok."
          </div>
        </div>
      </div>

      {/* Tanda Tangan: Wali Siswa, Musyrif Asrama, Kepala Kesantrian */}
      <KesantrianSignatureBlock
        musyrif={data.musyrif}
        signatures={data.signatures}
      />
    </div>
  );
}
