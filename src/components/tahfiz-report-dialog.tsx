import { useRef } from "react";
import { BookMarked, Download, Printer, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TahfizExam } from "@/lib/tahfiz.exams.server";

interface TahfizReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exam: TahfizExam | null;
}

export function TahfizReportDialog({ isOpen, onClose, exam }: TahfizReportDialogProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!exam) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 print:p-0 print:max-w-none print:shadow-none print:border-0">
        <DialogHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between print:hidden">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            Cetak Rapor Ujian Tahfidz Al-Qur'an
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Cetak / Print PDF
            </Button>
          </div>
        </DialogHeader>

        {/* KERTAS RAPOR TAHFIZ (A4 LAYOUT) */}
        <div
          ref={printAreaRef}
          className="p-8 sm:p-12 text-slate-900 bg-white font-serif leading-normal print:p-6"
          id="tahfiz-report-print"
        >
          {/* KOP SURAT AL-HANIF */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-5 text-center print-section print-avoid-break">
            <img
              src="/logo-alhanif.png"
              alt="Logo AHIBS"
              className="w-20 h-20 object-contain shrink-0"
            />
            <div className="flex-1 text-center px-2">
              <h3 className="text-xs md:text-sm font-bold tracking-wider text-slate-700 font-sans uppercase">
                YAYASAN AL-HANIF AL-ATSARIYAH CILEGON
              </h3>
              <h1 className="text-lg md:text-xl font-black text-slate-900 font-sans tracking-tight leading-tight">
                AL-HANIF ISLAMIC BOARDING SCHOOL (AHIBS)
              </h1>
              <h2 className="text-base md:text-lg font-bold text-emerald-800 font-sans leading-tight">
                SMPIT PUTRA AL-HANIF
              </h2>
              <p className="text-[11px] md:text-xs text-slate-600 font-sans mt-1 leading-snug">
                NPSN: 70045436 • Terakreditasi B • Jl. Pejaten, Link. Pejaten. Kel. Cikerai, Kec. Cibeber, Kota Cilegon, Banten 42422
              </p>
            </div>
            <img
              src="/logo-alhanif.png"
              alt="Logo AHIBS"
              className="w-20 h-20 object-contain shrink-0"
            />
          </div>
          <div className="h-0.5 bg-slate-900 print:bg-black -mt-4 mb-5" />

          {/* JUDUL RAPOR */}
          <div className="text-center my-5">
            <h1 className="text-base sm:text-lg font-black tracking-widest uppercase underline text-slate-950">
              RAPOR PENILAIAN UJIAN TAHFIDZ AL-QUR'AN
            </h1>
            <p className="text-xs font-sans text-slate-600 mt-1 uppercase font-semibold">
              {exam.exam_title} — Semester {exam.semester === "1" ? "Ganjil" : "Genap"} Tahun Ajaran {exam.academic_year}
            </p>
          </div>

          {/* BIODATA SANTRI */}
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-8 text-xs font-sans mb-6 p-3 bg-slate-50 border border-slate-200 rounded">
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Nama Santri</span>
              <span className="w-3">:</span>
              <span className="font-black text-slate-900 uppercase">{exam.student_name}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Juz yang Diuji</span>
              <span className="w-3">:</span>
              <span className="font-bold text-emerald-800">{exam.target_juz}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">NIS / No. Induk</span>
              <span className="w-3">:</span>
              <span className="font-mono text-slate-800">{exam.nis_nip}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Musyrif Halaqoh</span>
              <span className="w-3">:</span>
              <span className="text-slate-800">{exam.musyrif_name}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Kelas / Halaqoh</span>
              <span className="w-3">:</span>
              <span className="text-slate-800">{exam.class_name} / {exam.halaqoh_name}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Penguji Ujian</span>
              <span className="w-3">:</span>
              <span className="text-slate-800">{exam.examiner_name}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Tanggal Ujian</span>
              <span className="w-3">:</span>
              <span className="text-slate-800">
                {new Date(exam.date).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* TABEL PENILAIAN PER SOAL */}
          <div className="mb-6 font-sans">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800 mb-2">
              A. Rincian Penilaian Soal Ujian (Maqro' & Tajwid)
            </h4>
            <table className="w-full text-xs text-left border border-slate-400 border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-black text-center">
                  <th className="p-2 border-r border-slate-400 w-10">No</th>
                  <th className="p-2 border-r border-slate-400 text-left">Maqro' / Potongan Ayat Ujian</th>
                  <th className="p-2 border-r border-slate-400 w-24">Skor Tajwid (0-100)</th>
                  <th className="p-2 border-r border-slate-400 w-28">Kelancaran Hafalan (0-100)</th>
                  <th className="p-2 border-r border-slate-400 w-20">Nilai Soal</th>
                  <th className="p-2 text-left">Catatan / Koreksi</th>
                </tr>
              </thead>
              <tbody>
                {exam.questions.map((q, idx) => (
                  <tr key={idx} className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold text-slate-700 border-r border-slate-300">
                      {q.question_number}
                    </td>
                    <td className="p-2 font-bold text-slate-900 border-r border-slate-300">
                      {q.surah_ayat}
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-slate-900 border-r border-slate-300">
                      {q.tajwid_score}
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-slate-900 border-r border-slate-300">
                      {q.hafalan_score}
                    </td>
                    <td className="p-2 text-center font-mono font-black text-emerald-900 border-r border-slate-300 bg-slate-50">
                      {q.total_score}
                    </td>
                    <td className="p-2 text-slate-600 text-[11px] italic">
                      {q.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* HASIL AKHIR & PREDIKAT */}
          <div className="mb-6 font-sans grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rekap Angka */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded space-y-1.5 text-xs">
              <h4 className="font-bold text-slate-900 uppercase border-b pb-1 text-[11px]">
                B. Rekapitulasi Rata-Rata Nilai
              </h4>
              <div className="flex justify-between">
                <span className="text-slate-600">Rata-rata Nilai Tajwid:</span>
                <b className="font-mono text-slate-900">{exam.tajwid_avg} / 100</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Rata-rata Kelancaran Hafalan:</span>
                <b className="font-mono text-slate-900">{exam.hafalan_avg} / 100</b>
              </div>
              <div className="flex justify-between pt-1 border-t text-sm font-black text-emerald-950">
                <span>NILAI AKHIR UJIAN:</span>
                <span className="font-mono text-base font-black text-emerald-800">{exam.final_score}</span>
              </div>
            </div>

            {/* Predikat & Keterangan */}
            <div className="p-3 bg-emerald-50/60 border border-emerald-300 rounded flex flex-col justify-between text-xs">
              <div>
                <h4 className="font-bold text-emerald-950 uppercase border-b border-emerald-200 pb-1 text-[11px]">
                  C. Predikat Kelulusan Ujian
                </h4>
                <div className="mt-2 text-center">
                  <span className="text-base font-black text-emerald-900 uppercase tracking-wide block">
                    {exam.predicate}
                  </span>
                  <span className="text-[10px] text-emerald-700 italic block mt-0.5">
                    Standar Kelulusan Minimal (KKM): 75
                  </span>
                </div>
              </div>

              {exam.notes && (
                <div className="mt-2 pt-1 border-t border-emerald-200 text-[11px] text-slate-700 italic">
                  <b>Catatan Penguji:</b> "{exam.notes}"
                </div>
              )}
            </div>
          </div>

          {/* KOTAK TANDA TANGAN (4 PIHAK RESMI) */}
          <div className="mt-10 font-sans text-xs text-center text-slate-800">
            <div className="text-right text-[11px] text-slate-600 mb-4">
              Cilegon,{" "}
              {new Date(exam.date).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <p className="text-[11px] text-slate-600 mb-16">Orang Tua / Wali Santri,</p>
                <p className="font-bold border-t border-slate-900 pt-1 text-slate-900 uppercase">
                  ( ..................................... )
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-600 mb-16">Musyrif Halaqoh,</p>
                <p className="font-bold border-t border-slate-900 pt-1 text-slate-900 uppercase">
                  {exam.musyrif_name}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-600 mb-16">Penguji Tahfidz,</p>
                <p className="font-bold border-t border-slate-900 pt-1 text-slate-900 uppercase">
                  {exam.examiner_name}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-600 mb-16">Mengetahui, Kepala Sekolah,</p>
                <p className="font-bold border-t border-slate-900 pt-1 text-slate-900 uppercase">
                  Ust. H. Ahmad Fauzi, Lc.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
