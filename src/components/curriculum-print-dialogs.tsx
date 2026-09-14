import { FileText, Loader2, Printer, X } from "lucide-react";
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
import type {
  CurriculumElement,
  CurriculumPlan,
  CurriculumPromesEntry,
  CurriculumTimeAllocation,
  CurriculumTp,
} from "@/lib/curriculum.functions";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    plan: CurriculumPlan;
    subject: any;
    teacher: any;
    headmasterName: string;
    elements: CurriculumElement[];
    tps: CurriculumTp[];
    timeAllocations: CurriculumTimeAllocation[];
    promesEntries: CurriculumPromesEntry[];
  } | null;
}

/** 1. DIALOG CETAK BAGIAN 1: CP, TP, & ATP */
export function CurriculumCpTpAtpPrintDialog({ open, onOpenChange, data }: PrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const { plan, subject, teacher, headmasterName, elements, tps } = data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Top Control Bar */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-b bg-muted/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <DialogTitle className="text-base font-semibold leading-none">
                Pratinjau Dokumen CP, TP & ATP
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Format resmi Capaian & Alur Tujuan Pembelajaran SMPIT Putra Al-Hanif
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 font-medium shadow-xs">
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

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50 dark:bg-slate-950/40">
          <div
            ref={printRef}
            id="official-report-card"
            className="max-w-[900px] mx-auto bg-white text-slate-900 dark:bg-card dark:text-card-foreground p-8 md:p-12 rounded-xl shadow-md print:shadow-none print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black border border-border/80 print:border-none"
          >
            {/* KOP SURAT RESMI */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-slate-900 print:border-black">
              <img
                src="/logo-alhanif.png"
                alt="Logo Al-Hanif"
                className="w-20 h-20 object-contain shrink-0"
                onError={(e) => {
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
                    KURIKULUM MERDEKA
                  </span>
                </div>
              </div>
            </div>
            <div className="h-0.5 bg-slate-900 print:bg-black mt-0.5 mb-6" />

            {/* JUDUL DOKUMEN */}
            <div className="text-center mb-6">
              <h3 className="text-base md:text-lg font-black uppercase tracking-wide underline underline-offset-4">
                Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP) & Alur Tujuan Pembelajaran (ATP)
              </h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 print:text-slate-600 mt-1">
                Tahun Ajaran {plan.academic_year} — Fase {plan.phase} (Kelas {plan.class_name})
              </p>
            </div>

            {/* BIODATA / INFORMASI MAPEL */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs md:text-sm mb-6 bg-slate-50/70 dark:bg-slate-900/40 print:bg-transparent p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 print:border-none print:p-0">
              <div className="flex">
                <span className="w-36 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                  Mata Pelajaran
                </span>
                <span className="font-bold text-slate-900 dark:text-white print:text-black">
                  : {subject.name} ({subject.code})
                </span>
              </div>
              <div className="flex">
                <span className="w-36 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                  Fase / Kelas
                </span>
                <span className="font-semibold text-slate-900 dark:text-white print:text-black">
                  : Fase {plan.phase} / Kelas {plan.class_name}
                </span>
              </div>
              <div className="flex">
                <span className="w-36 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                  Rumpun / Kelompok
                </span>
                <span className="text-slate-800 dark:text-slate-200 print:text-black">
                  : Kelompok {subject.group}
                </span>
              </div>
              <div className="flex">
                <span className="w-36 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                  Beban Belajar
                </span>
                <span className="text-slate-800 dark:text-slate-200 print:text-black">
                  : {plan.jp_per_week} Jam Pelajaran (JP) / Pekan
                </span>
              </div>
              <div className="flex">
                <span className="w-36 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                  Guru Pengampu
                </span>
                <span className="text-slate-800 dark:text-slate-200 print:text-black uppercase font-medium">
                  : {teacher ? teacher.name || teacher.display_name : "Ustadz Pengampu"}
                </span>
              </div>
              <div className="flex">
                <span className="w-36 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                  NIY / NIP
                </span>
                <span className="text-slate-800 dark:text-slate-200 print:text-black font-mono">
                  : {teacher?.nis_nip || "-"}
                </span>
              </div>
            </div>

            {/* BAGIAN A: ELEMEN & CP */}
            <div className="mb-6">
              <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary print:bg-slate-200 print:text-black rounded">
                  Bagian A
                </span>
                Elemen dan Capaian Pembelajaran (CP)
              </h4>
              <table className="w-full text-[11px] md:text-xs border-collapse border border-slate-300 dark:border-slate-700 print:border-black">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-900 dark:text-white print:text-black font-bold">
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-10 text-center">
                      No
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 w-1/3 text-left">
                      Elemen
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">
                      Capaian Pembelajaran (CP)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {elements.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-3 text-center text-slate-400 italic border">
                        Belum ada elemen CP yang ditambahkan.
                      </td>
                    </tr>
                  ) : (
                    elements.map((el, idx) => (
                      <tr key={el.id} className="border-b border-slate-300 dark:border-slate-700 print:border-black">
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-2 text-center font-medium">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 font-bold text-slate-900 dark:text-white print:text-black">
                          {el.name}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-2 leading-relaxed text-slate-700 dark:text-slate-300 print:text-black">
                          {el.cp_description || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* BAGIAN B: MATRIKS TP & ATP */}
            <div className="mb-8">
              <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary print:bg-slate-200 print:text-black rounded">
                  Bagian B
                </span>
                Tujuan Pembelajaran (TP) dan Alur Tujuan Pembelajaran (ATP)
              </h4>
              <table className="w-full text-[10.5px] md:text-[11px] border-collapse border border-slate-300 dark:border-slate-700 print:border-black">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-900 dark:text-white print:text-black font-bold text-center">
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-1.5 py-1.5 w-7">
                      No
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-12">
                      Sem.
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-left w-28">
                      Elemen
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-14">
                      Kode
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2.5 py-1.5 text-left">
                      Rumusan Tujuan Pembelajaran (TP)
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-1.5 py-1.5 w-16">
                      Kognitif
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-1.5 py-1.5 w-16">
                      Dimensi
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-1.5 py-1.5 w-8">
                      Alur
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-left w-28">
                      Keterkaitan (ATP)
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-1.5 py-1.5 w-9">
                      JP
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-left w-20">
                      Asesmen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tps.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-4 text-center text-slate-400 italic border">
                        Belum ada Tujuan Pembelajaran (TP) yang dirumuskan.
                      </td>
                    </tr>
                  ) : (
                    tps.map((tp, idx) => (
                      <tr key={tp.id} className="border-b border-slate-300 dark:border-slate-700 print:border-black">
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1.5 text-center font-medium">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1.5 py-1.5 text-center">
                          {tp.semester === "1" ? "Ganjil" : "Genap"}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 font-medium">
                          {tp.element_name || "-"}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1.5 py-1.5 text-center font-bold font-mono">
                          {tp.code}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2.5 py-1.5 leading-relaxed">
                          {tp.description}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1.5 text-center">
                          {tp.cognitive_level.split(" - ")[0] || tp.cognitive_level}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1.5 text-center">
                          {tp.dimension}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1.5 text-center font-bold">
                          {tp.atp_order}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-[10px] leading-tight">
                          {tp.atp_flow || "-"}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-1 py-1.5 text-center font-bold">
                          {tp.alokasi_jp}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-[10px]">
                          {tp.assessment_method}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PENGESAHAN TANDA TANGAN */}
            <div className="pt-4 text-xs md:text-sm">
              <div className="text-right mb-4">
                <span>Cilegon, 14 September 2026</span>
              </div>
              <div className="grid grid-cols-2 gap-8 text-center">
                <div>
                  <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">
                    Mengetahui,
                  </p>
                  <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">
                    Kepala Sekolah SMPIT Putra Al-Hanif
                  </p>
                  <div className="h-20" />
                  <p className="font-bold uppercase underline">{headmasterName}</p>
                  <p className="text-[10px] text-slate-500 print:text-black">NIY. 201801002</p>
                </div>

                <div>
                  <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">
                    Guru Pengampu Mata Pelajaran
                  </p>
                  <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">
                    {subject.name}
                  </p>
                  <div className="h-20" />
                  <p className="font-bold uppercase underline">
                    {teacher ? teacher.name || teacher.display_name : "Ustadz Pengampu"}
                  </p>
                  <p className="text-[10px] text-slate-500 print:text-black">
                    NIY/NIP. {teacher?.nis_nip || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 2. DIALOG CETAK BAGIAN 2: ALOKASI WAKTU, PROTA, & PROMES */
export function CurriculumProtaPromesPrintDialog({ open, onOpenChange, data }: PrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const { plan, subject, teacher, headmasterName, tps, timeAllocations, promesEntries } = data;

  const ganjilAlloc = timeAllocations.filter((t) => t.semester === "1");
  const genapAlloc = timeAllocations.filter((t) => t.semester === "2");

  const totalEffectiveJpGanjil = ganjilAlloc.reduce((acc, curr) => acc + Number(curr.effective_jp), 0);
  const totalEffectiveJpGenap = genapAlloc.reduce((acc, curr) => acc + Number(curr.effective_jp), 0);

  const tpsGanjil = tps.filter((t) => t.semester === "1");
  const tpsGenap = tps.filter((t) => t.semester === "2");

  // Promes matrix lookup
  const promesLookup = new Map<string, number>();
  for (const entry of promesEntries) {
    promesLookup.set(`${entry.tp_id}_${entry.month_name}_${entry.week_number}`, entry.allocated_jp);
  }

  const ganjilMonths = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const genapMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];
  const weeks = [1, 2, 3, 4, 5];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Top Control Bar */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-b bg-muted/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <DialogTitle className="text-base font-semibold leading-none">
                Pratinjau Alokasi Waktu, PROTA & PROMES
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Format resmi Analisis Pekan Efektif, Program Tahunan & Program Semester
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 font-medium shadow-xs">
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

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50 dark:bg-slate-950/40">
          <div
            ref={printRef}
            id="official-report-card"
            className="max-w-[1050px] mx-auto bg-white text-slate-900 dark:bg-card dark:text-card-foreground p-8 md:p-12 rounded-xl shadow-md print:shadow-none print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black border border-border/80 print:border-none"
          >
            {/* KOP SURAT RESMI */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-slate-900 print:border-black">
              <img
                src="/logo-alhanif.png"
                alt="Logo Al-Hanif"
                className="w-20 h-20 object-contain shrink-0"
                onError={(e) => {
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
                    PROTA & PROMES
                  </span>
                </div>
              </div>
            </div>
            <div className="h-0.5 bg-slate-900 print:bg-black mt-0.5 mb-6" />

            {/* JUDUL DOKUMEN */}
            <div className="text-center mb-6">
              <h3 className="text-base md:text-lg font-black uppercase tracking-wide underline underline-offset-4">
                Analisis Alokasi Waktu, Program Tahunan (PROTA) & Program Semester (PROMES)
              </h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 print:text-slate-600 mt-1">
                Tahun Ajaran {plan.academic_year} — Kelas {plan.class_name} (Fase {plan.phase})
              </p>
            </div>

            {/* INFORMASI MAPEL */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs md:text-sm mb-6 bg-slate-50/70 dark:bg-slate-900/40 print:bg-transparent p-3 rounded-lg border border-slate-200 dark:border-slate-800 print:border-none print:p-0">
              <div className="flex">
                <span className="w-36 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                  Mata Pelajaran
                </span>
                <span className="font-bold text-slate-900 dark:text-white print:text-black">
                  : {subject.name} ({subject.code})
                </span>
              </div>
              <div className="flex">
                <span className="w-36 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                  Kelas / Fase
                </span>
                <span className="font-semibold text-slate-900 dark:text-white print:text-black">
                  : Kelas {plan.class_name} / Fase {plan.phase}
                </span>
              </div>
              <div className="flex">
                <span className="w-36 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                  Guru Pengampu
                </span>
                <span className="text-slate-800 dark:text-slate-200 print:text-black uppercase font-medium">
                  : {teacher ? teacher.name || teacher.display_name : "Ustadz Pengampu"}
                </span>
              </div>
              <div className="flex">
                <span className="w-36 font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                  Alokasi Tatap Muka
                </span>
                <span className="text-slate-800 dark:text-slate-200 print:text-black font-semibold">
                  : {plan.jp_per_week} JP / Pekan (Total {totalEffectiveJpGanjil + totalEffectiveJpGenap} JP / Tahun)
                </span>
              </div>
            </div>

            {/* BAGIAN 1: ANALISIS ALOKASI WAKTU PEKAN EFEKTIF */}
            <div className="mb-6">
              <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary print:bg-slate-200 print:text-black rounded">
                  Bagian 1
                </span>
                Rincian Analisis Alokasi Waktu (Pekan Efektif Belajar)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Semester Ganjil */}
                <div className="border border-slate-300 dark:border-slate-700 print:border-black rounded-lg overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 px-3 py-1.5 font-bold text-center border-b border-slate-300 dark:border-slate-700 print:border-black">
                    Semester Ganjil (Juli - Desember {plan.academic_year.split("/")[0]})
                  </div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 print:bg-white text-[11px] font-semibold border-b">
                        <th className="p-1.5 text-left pl-3">Bulan</th>
                        <th className="p-1.5">Kalender</th>
                        <th className="p-1.5">Non-Efektif</th>
                        <th className="p-1.5">Efektif</th>
                        <th className="p-1.5 pr-3">Total JP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                      {ganjilAlloc.map((row) => (
                        <tr key={row.id}>
                          <td className="p-1.5 text-left pl-3 font-medium">{row.month_name}</td>
                          <td className="p-1.5">{row.calendar_weeks}</td>
                          <td className="p-1.5 text-amber-600">{row.non_effective_weeks}</td>
                          <td className="p-1.5 font-bold">{row.effective_weeks}</td>
                          <td className="p-1.5 pr-3 font-bold text-primary font-mono">{row.effective_jp}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t">
                        <td className="p-1.5 text-left pl-3">Total Ganjil</td>
                        <td className="p-1.5">
                          {ganjilAlloc.reduce((a, b) => a + Number(b.calendar_weeks), 0)}
                        </td>
                        <td className="p-1.5">
                          {ganjilAlloc.reduce((a, b) => a + Number(b.non_effective_weeks), 0)}
                        </td>
                        <td className="p-1.5">
                          {ganjilAlloc.reduce((a, b) => a + Number(b.effective_weeks), 0)}
                        </td>
                        <td className="p-1.5 pr-3 text-primary font-mono">{totalEffectiveJpGanjil} JP</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Semester Genap */}
                <div className="border border-slate-300 dark:border-slate-700 print:border-black rounded-lg overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 px-3 py-1.5 font-bold text-center border-b border-slate-300 dark:border-slate-700 print:border-black">
                    Semester Genap (Januari - Juni {plan.academic_year.split("/")[1] || "2027"})
                  </div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 print:bg-white text-[11px] font-semibold border-b">
                        <th className="p-1.5 text-left pl-3">Bulan</th>
                        <th className="p-1.5">Kalender</th>
                        <th className="p-1.5">Non-Efektif</th>
                        <th className="p-1.5">Efektif</th>
                        <th className="p-1.5 pr-3">Total JP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                      {genapAlloc.map((row) => (
                        <tr key={row.id}>
                          <td className="p-1.5 text-left pl-3 font-medium">{row.month_name}</td>
                          <td className="p-1.5">{row.calendar_weeks}</td>
                          <td className="p-1.5 text-amber-600">{row.non_effective_weeks}</td>
                          <td className="p-1.5 font-bold">{row.effective_weeks}</td>
                          <td className="p-1.5 pr-3 font-bold text-primary font-mono">{row.effective_jp}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t">
                        <td className="p-1.5 text-left pl-3">Total Genap</td>
                        <td className="p-1.5">
                          {genapAlloc.reduce((a, b) => a + Number(b.calendar_weeks), 0)}
                        </td>
                        <td className="p-1.5">
                          {genapAlloc.reduce((a, b) => a + Number(b.non_effective_weeks), 0)}
                        </td>
                        <td className="p-1.5">
                          {genapAlloc.reduce((a, b) => a + Number(b.effective_weeks), 0)}
                        </td>
                        <td className="p-1.5 pr-3 text-primary font-mono">{totalEffectiveJpGenap} JP</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* BAGIAN 2: PROGRAM TAHUNAN (PROTA) */}
            <div className="mb-6">
              <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary print:bg-slate-200 print:text-black rounded">
                  Bagian 2
                </span>
                Program Tahunan (PROTA)
              </h4>
              <table className="w-full text-[11px] md:text-xs border-collapse border border-slate-300 dark:border-slate-700 print:border-black">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-900 dark:text-white print:text-black font-bold text-center">
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-10">
                      No
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-16">
                      Semester
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-16">
                      Kode TP
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left">
                      Tujuan Pembelajaran Pokok
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 w-20">
                      Alokasi JP
                    </th>
                    <th className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-left w-32">
                      Keterangan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-slate-400 italic border">
                        Belum ada Tujuan Pembelajaran yang diinput untuk PROTA.
                      </td>
                    </tr>
                  ) : (
                    tps.map((tp, idx) => (
                      <tr key={tp.id} className="border-b border-slate-300 dark:border-slate-700 print:border-black">
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-medium">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center">
                          {tp.semester === "1" ? "Ganjil" : "Genap"}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-bold font-mono">
                          {tp.code}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 leading-relaxed">
                          {tp.description}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-2 py-1.5 text-center font-bold font-mono">
                          {tp.alokasi_jp} JP
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 print:border-black px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                          {tp.element_name || "Elemen Inti"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t text-center">
                    <td colSpan={4} className="p-2 text-right pr-4">
                      Total Alokasi Waktu PROTA:
                    </td>
                    <td className="p-2 font-mono text-primary font-bold">
                      {tps.reduce((acc, curr) => acc + Number(curr.alokasi_jp), 0)} JP
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* BAGIAN 3: PROGRAM SEMESTER (PROMES) */}
            <div className="mb-8">
              <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary print:bg-slate-200 print:text-black rounded">
                  Bagian 3
                </span>
                Program Semester (PROMES) — Sebaran Jam Mengajar per Pekan
              </h4>

              {/* Semester Ganjil Promes */}
              <div className="mb-4">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  A. Semester Ganjil (Juli - Desember)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse border border-slate-300 dark:border-slate-700 print:border-black">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-900 font-bold text-center">
                        <th rowSpan={2} className="border border-slate-300 px-1 py-1 w-6">
                          No
                        </th>
                        <th rowSpan={2} className="border border-slate-300 px-1 py-1 w-12">
                          Kode
                        </th>
                        <th rowSpan={2} className="border border-slate-300 px-2 py-1 text-left min-w-[150px]">
                          Tujuan Pembelajaran
                        </th>
                        <th rowSpan={2} className="border border-slate-300 px-1 py-1 w-8">
                          JP
                        </th>
                        {ganjilMonths.map((m) => (
                          <th key={m} colSpan={5} className="border border-slate-300 px-1 py-0.5">
                            {m}
                          </th>
                        ))}
                        <th rowSpan={2} className="border border-slate-300 px-1 py-1 w-16">
                          Status
                        </th>
                      </tr>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-600 text-[9px] text-center">
                        {ganjilMonths.map((m) =>
                          weeks.map((w) => (
                            <th key={`${m}_${w}`} className="border border-slate-300 px-0.5 py-0.5 w-4">
                              {w}
                            </th>
                          )),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {tpsGanjil.length === 0 ? (
                        <tr>
                          <td colSpan={35} className="p-3 text-center text-slate-400 italic border">
                            Belum ada materi untuk Semester Ganjil.
                          </td>
                        </tr>
                      ) : (
                        tpsGanjil.map((tp, idx) => (
                          <tr key={tp.id} className="border-b text-center">
                            <td className="border border-slate-300 px-1 py-1 font-medium">{idx + 1}</td>
                            <td className="border border-slate-300 px-1 py-1 font-bold font-mono">{tp.code}</td>
                            <td className="border border-slate-300 px-2 py-1 text-left line-clamp-1">{tp.description}</td>
                            <td className="border border-slate-300 px-1 py-1 font-bold">{tp.alokasi_jp}</td>
                            {ganjilMonths.map((m) =>
                              weeks.map((w) => {
                                const val = promesLookup.get(`${tp.id}_${m}_${w}`) || 0;
                                return (
                                  <td
                                    key={`${tp.id}_${m}_${w}`}
                                    className={`border border-slate-300 px-0.5 py-1 ${
                                      val > 0 ? "bg-primary/10 font-bold text-primary" : ""
                                    }`}
                                  >
                                    {val > 0 ? val : ""}
                                  </td>
                                );
                              }),
                            )}
                            <td className="border border-slate-300 px-1 py-1 text-[9px] font-medium">
                              {tp.status_realisasi || "Belum"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Semester Genap Promes */}
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  B. Semester Genap (Januari - Juni)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse border border-slate-300 dark:border-slate-700 print:border-black">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-900 font-bold text-center">
                        <th rowSpan={2} className="border border-slate-300 px-1 py-1 w-6">
                          No
                        </th>
                        <th rowSpan={2} className="border border-slate-300 px-1 py-1 w-12">
                          Kode
                        </th>
                        <th rowSpan={2} className="border border-slate-300 px-2 py-1 text-left min-w-[150px]">
                          Tujuan Pembelajaran
                        </th>
                        <th rowSpan={2} className="border border-slate-300 px-1 py-1 w-8">
                          JP
                        </th>
                        {genapMonths.map((m) => (
                          <th key={m} colSpan={5} className="border border-slate-300 px-1 py-0.5">
                            {m}
                          </th>
                        ))}
                        <th rowSpan={2} className="border border-slate-300 px-1 py-1 w-16">
                          Status
                        </th>
                      </tr>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-600 text-[9px] text-center">
                        {genapMonths.map((m) =>
                          weeks.map((w) => (
                            <th key={`${m}_${w}`} className="border border-slate-300 px-0.5 py-0.5 w-4">
                              {w}
                            </th>
                          )),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {tpsGenap.length === 0 ? (
                        <tr>
                          <td colSpan={35} className="p-3 text-center text-slate-400 italic border">
                            Belum ada materi untuk Semester Genap.
                          </td>
                        </tr>
                      ) : (
                        tpsGenap.map((tp, idx) => (
                          <tr key={tp.id} className="border-b text-center">
                            <td className="border border-slate-300 px-1 py-1 font-medium">{idx + 1}</td>
                            <td className="border border-slate-300 px-1 py-1 font-bold font-mono">{tp.code}</td>
                            <td className="border border-slate-300 px-2 py-1 text-left line-clamp-1">{tp.description}</td>
                            <td className="border border-slate-300 px-1 py-1 font-bold">{tp.alokasi_jp}</td>
                            {genapMonths.map((m) =>
                              weeks.map((w) => {
                                const val = promesLookup.get(`${tp.id}_${m}_${w}`) || 0;
                                return (
                                  <td
                                    key={`${tp.id}_${m}_${w}`}
                                    className={`border border-slate-300 px-0.5 py-1 ${
                                      val > 0 ? "bg-primary/10 font-bold text-primary" : ""
                                    }`}
                                  >
                                    {val > 0 ? val : ""}
                                  </td>
                                );
                              }),
                            )}
                            <td className="border border-slate-300 px-1 py-1 text-[9px] font-medium">
                              {tp.status_realisasi || "Belum"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* PENGESAHAN TANDA TANGAN */}
            <div className="pt-4 text-xs md:text-sm">
              <div className="text-right mb-4">
                <span>Cilegon, 14 September 2026</span>
              </div>
              <div className="grid grid-cols-2 gap-8 text-center">
                <div>
                  <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">
                    Mengetahui,
                  </p>
                  <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">
                    Kepala Sekolah SMPIT Putra Al-Hanif
                  </p>
                  <div className="h-20" />
                  <p className="font-bold uppercase underline">{headmasterName}</p>
                  <p className="text-[10px] text-slate-500 print:text-black">NIY. 201801002</p>
                </div>

                <div>
                  <p className="font-medium text-slate-600 dark:text-slate-400 print:text-black">
                    Guru Pengampu Mata Pelajaran
                  </p>
                  <p className="font-medium text-slate-700 dark:text-slate-300 print:text-black">
                    {subject.name}
                  </p>
                  <div className="h-20" />
                  <p className="font-bold uppercase underline">
                    {teacher ? teacher.name || teacher.display_name : "Ustadz Pengampu"}
                  </p>
                  <p className="text-[10px] text-slate-500 print:text-black">
                    NIY/NIP. {teacher?.nis_nip || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
