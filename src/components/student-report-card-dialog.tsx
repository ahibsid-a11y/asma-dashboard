import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Award, CheckCircle2, Download, FileText, Info, Loader2, Printer, X } from "lucide-react";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getStudentReportCard } from "@/lib/grades.functions";

interface StudentReportCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  semester?: string;
  academicYear?: string;
}

export function StudentReportCardDialog({
  open,
  onOpenChange,
  studentId,
  semester = "1",
  academicYear = "2026/2027",
}: StudentReportCardDialogProps) {
  const fetchReportCardFn = useServerFn(getStudentReportCard);
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["student-report-card", studentId, semester, academicYear],
    queryFn: () => {
      if (!studentId) return null;
      return fetchReportCardFn({
        data: {
          student_id: studentId,
          semester,
          academic_year: academicYear,
        },
      });
    },
    enabled: open && Boolean(studentId),
  });

  const handlePrint = () => {
    window.print();
  };

  const getSemesterLabel = (sem: string) => {
    return sem === "1" ? "1 (Ganjil)" : "2 (Genap)";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Top Control Bar - Hidden on Print */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-b bg-muted/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <DialogTitle className="text-base font-semibold leading-none">
                Pratinjau Rapor Digital Siswa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Format resmi Kurikulum Merdeka & Diniyyah SMPIT Putra Al-Hanif
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              disabled={isLoading || !data}
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

        {/* Report Content - Scrollable on Screen, Clean on Print */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50 dark:bg-slate-950/40">
          {isLoading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Menyiapkan dokumen rapor resmi...</p>
            </div>
          ) : error || !data ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
              <p className="text-destructive font-semibold mb-1">Gagal memuat data rapor</p>
              <p className="text-sm text-muted-foreground mb-4">
                {(error as any)?.message || "Data santri atau nilai tidak ditemukan."}
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </div>
          ) : (
            <div
              ref={printRef}
              id="official-report-card"
              className="max-w-[850px] mx-auto bg-white text-slate-900 dark:bg-card dark:text-card-foreground p-8 md:p-12 rounded-xl shadow-md print:shadow-none print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black border border-border/80 print:border-none"
            >
              {/* KOP SURAT RESMI */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-slate-900 print:border-black">
                <img
                  src="/logo-alhanif.png"
                  alt="Logo Al-Hanif"
                  className="w-20 h-20 object-contain shrink-0"
                  onError={(e) => {
                    // Fallback if logo fails
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div className="flex-1 text-center">
                  <h3 className="text-xs md:text-sm font-semibold tracking-wider text-slate-600 dark:text-slate-400 print:text-slate-600 uppercase">
                    Yayasan Al-Hanif Cilegon
                  </h3>
                  <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white print:text-black tracking-tight leading-tight">
                    AL-HANIF ISLAMIC BOARDING SCHOOL (AHIBS)
                  </h1>
                  <h2 className="text-base md:text-lg font-bold text-primary print:text-black leading-tight">
                    SMPIT PUTRA AL-HANIF CILEGON
                  </h2>
                  <p className="text-[11px] md:text-xs text-slate-600 dark:text-slate-400 print:text-slate-600 mt-0.5">
                    NPSN: 69989823 • Terakreditasi A • Jl. Al-Hanif, Cibeber, Kota Cilegon, Banten
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
              {/* Double underline decoration */}
              <div className="h-0.5 bg-slate-900 print:bg-black mt-0.5 mb-6" />

              {/* JUDUL RAPOR */}
              <div className="text-center mb-6">
                <h3 className="text-base md:text-lg font-black uppercase tracking-wide underline underline-offset-4">
                  Laporan Capaian Hasil Belajar Santri
                </h3>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 print:text-slate-600 mt-1">
                  Kurikulum Merdeka & Kurikulum Kepesantrenan Terpadu
                </p>
              </div>

              {/* BIODATA SANTRI GRID */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs md:text-sm mb-6 bg-slate-50/70 dark:bg-slate-900/40 print:bg-transparent p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 print:border-none print:p-0">
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                    Nama Santri
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-black uppercase">
                    : {data.student.name || data.student.display_name}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                    Kelas / Rombel
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white print:text-black">
                    : Kelas {data.student.class || "-"}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                    NIS / NISN
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 print:text-black">
                    : {data.student.nis_nip || "-"}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                    Semester
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 print:text-black">
                    : {getSemesterLabel(data.semester)}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                    Asrama / Kamar
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 print:text-black">
                    : Kamar {data.student.dorm || "-"}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                    Tahun Ajaran
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 print:text-black">
                    : {data.academic_year}
                  </span>
                </div>
              </div>

              {/* SECTION A: KELOMPOK MATA PELAJARAN UMUM */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-xs uppercase px-2 py-0.5 bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 print:bg-slate-200 print:text-black rounded">
                    Kelompok A
                  </span>
                  <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide">
                    Muatan Nasional (Kemendikdasmen / Kurikulum Merdeka)
                  </h4>
                </div>
                <ReportTable items={data.groupedSubjects.umum} />
              </div>

              {/* SECTION B: KELOMPOK DINIYYAH */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-xs uppercase px-2 py-0.5 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 print:bg-slate-200 print:text-black rounded">
                    Kelompok B
                  </span>
                  <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide">
                    Muatan Kepesantrenan & Diniyyah AHIBS
                  </h4>
                </div>
                <ReportTable items={data.groupedSubjects.diniyyah} />
              </div>

              {/* SECTION C: BAHASA ARAB */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-xs uppercase px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 print:bg-slate-200 print:text-black rounded">
                    Kelompok C
                  </span>
                  <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide">
                    Program Penguatan Bahasa Arab
                  </h4>
                </div>
                <ReportTable items={data.groupedSubjects.bahasa_arab} />
              </div>

              {/* KEHADIRAN & CATATAN WALI KELAS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-xs">
                {/* Tabel Kehadiran */}
                <div className="border border-slate-300 dark:border-slate-700 print:border-black rounded-md overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 px-3 py-1.5 font-bold uppercase border-b border-slate-300 dark:border-slate-700 print:border-black text-center">
                    Ketidakhadiran
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Sakit</span>
                      <span className="font-semibold">{data.attendance.sakit} hari</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Izin</span>
                      <span className="font-semibold">{data.attendance.izin} hari</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tanpa Keterangan</span>
                      <span className="font-semibold">{data.attendance.alpa} hari</span>
                    </div>
                  </div>
                </div>

                {/* Catatan Wali Kelas */}
                <div className="md:col-span-2 border border-slate-300 dark:border-slate-700 print:border-black rounded-md overflow-hidden flex flex-col">
                  <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 px-3 py-1.5 font-bold uppercase border-b border-slate-300 dark:border-slate-700 print:border-black">
                    Catatan & Motivasi Wali Kelas
                  </div>
                  <div className="p-3 text-slate-700 dark:text-slate-300 print:text-black italic flex-1 flex items-center">
                    "Alhamdulillah ananda menunjukkan perkembangan adab dan kedisiplinan belajar yang
                    baik di pesantren. Terus tingkatkan muraja'ah Al-Qur'an, pemahaman diniyyah, serta
                    konsistensi belajar."
                  </div>
                </div>
              </div>

              {/* TANDA TANGAN RESMI */}
              <div className="pt-4 text-xs md:text-sm">
                <div className="text-right mb-4">
                  <span>Cilegon, 20 Desember 2026</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">
                      Mengetahui,
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">
                      Orang Tua / Wali Santri
                    </p>
                    <div className="h-20" />
                    <p className="font-bold uppercase underline">
                      ( ........................................ )
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">
                      Wali Kelas
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">
                      Kelas {data.student.class || "-"}
                    </p>
                    <div className="h-20" />
                    <p className="font-bold uppercase underline">
                      {data.signatures.homeroomTeacher}
                    </p>
                    <p className="text-[10px] text-slate-500 print:text-black">NIY. 202201088</p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">
                      Kepala Sekolah
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">
                      SMPIT Putra Al-Hanif
                    </p>
                    <div className="h-20" />
                    <p className="font-bold uppercase underline">{data.signatures.headmaster}</p>
                    <p className="text-[10px] text-slate-500 print:text-black">NIY. 201801002</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportTable({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-3 border rounded text-center italic">
        Belum ada mata pelajaran pada kelompok ini.
      </div>
    );
  }

  return (
    <table className="w-full text-[11px] md:text-xs border-collapse border border-slate-300 dark:border-slate-700 print:border-black">
      <thead>
        <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-900 dark:text-white print:text-black text-center font-bold">
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-8">
            No
          </th>
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">
            Mata Pelajaran
          </th>
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-12">
            KKM
          </th>
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-14">
            Nilai Akhir
          </th>
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-12">
            Predikat
          </th>
          <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">
            Capaian Kompetensi (Kurikulum Merdeka)
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((row, idx) => {
          const finalScore = Number(row.finalScore) || 0;
          const kkm = Number(row.subject?.kkm) || 75;
          const isRemedial = finalScore > 0 && finalScore < kkm;

          return (
            <tr
              key={row.subject.id}
              className="border-b border-slate-300 dark:border-slate-700 print:border-black hover:bg-slate-50/50"
            >
              <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-medium">
                {idx + 1}
              </td>
              <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 font-medium">
                <div>{row.subject.name}</div>
                {row.tpList && row.tpList.length > 0 && (
                  <div className="text-[10px] text-slate-500 print:text-slate-600 mt-0.5">
                    {row.tpList.length} Tujuan Pembelajaran (TP) dinilai
                  </div>
                )}
              </td>
              <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center text-slate-600 dark:text-slate-400 print:text-black">
                {kkm}
              </td>
              <td
                className={`border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-bold ${
                  isRemedial
                    ? "text-red-600 dark:text-red-400 print:text-black"
                    : finalScore >= 85
                    ? "text-emerald-700 dark:text-emerald-400 print:text-black"
                    : ""
                }`}
              >
                {finalScore > 0 ? finalScore : "-"}
              </td>
              <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-bold">
                {row.letterGrade}
              </td>
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
                  <span>
                    Menunjukkan pemahaman materi sesuai dengan target capaian pembelajaran semester ini.
                  </span>
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
