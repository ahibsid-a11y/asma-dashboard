import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importMembers } from "@/lib/members.functions";
import { downloadTemplate, parseMemberFile, type ParsedRow } from "@/lib/member-import";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function MemberImportDialog({
  existing,
}: {
  existing: { nis_nip: string | null; rfid_card: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const runImport = useServerFn(importMembers);

  const validRows = rows.filter((r) => r.errors.length === 0);
  const errorCount = rows.length - validRows.length;

  const importMutation = useMutation({
    mutationFn: () =>
      runImport({
        data: {
          rows: validRows.map((r) => ({
            name: r.name,
            nis_nip: r.nis_nip,
            account_type: r.account_type as AccountType,
            class: r.class,
            dorm: r.dorm,
            halaqoh: r.halaqoh,
            phone: r.phone,
            gender: r.gender === "L" || r.gender === "P" ? r.gender : null,
            rfid_card: r.rfid_card,
          })),
        },
      }),
    onSuccess: async (result: any) => {
      toast.success(`${result.created} anggota berhasil diimpor`);
      if (result.failures?.length) {
        toast.error(
          `${result.failures.length} baris gagal: ${result.failures
            .slice(0, 3)
            .map((f: any) => `${f.nis_nip} (${f.message})`)
            .join("; ")}`,
        );
      }
      setRows([]);
      setFileName("");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleFile(file: File) {
    try {
      const parsed = await parseMemberFile(file, existing);
      if (parsed.length === 0) {
        toast.error("File tidak berisi data anggota");
        return;
      }
      setFileName(file.name);
      setRows(parsed);
    } catch {
      toast.error("File tidak dapat dibaca. Pastikan berformat .xlsx");
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => downloadTemplate()}>
        <Download /> Unduh Template Excel
      </Button>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet /> Impor Data dari Excel
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Impor Data Anggota dari Excel</DialogTitle>
            <DialogDescription>
              Unggah file .xlsx sesuai template. Pratinjau di bawah menandai baris yang perlu
              dikoreksi sebelum disimpan.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
            <Button type="button" onClick={() => inputRef.current?.click()}>
              <Upload /> Pilih File Excel
            </Button>
            <Button type="button" variant="outline" onClick={() => downloadTemplate()}>
              <Download /> Unduh Template
            </Button>
            {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-muted/40 p-3 text-sm font-semibold">
                <span>Total baris: {rows.length}</span>
                <span className="text-primary">Siap disimpan: {validRows.length}</span>
                <span className={cn(errorCount > 0 && "text-destructive")}>
                  Perlu koreksi: {errorCount}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Baris</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>No. Induk</TableHead>
                      <TableHead>Jenis Akun</TableHead>
                      <TableHead>Kelas / Asrama</TableHead>
                      <TableHead>RFID</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.rowNumber} className={cn(r.errors.length > 0 && "bg-destructive/10")}>
                        <TableCell>{r.rowNumber}</TableCell>
                        <TableCell className="font-semibold">{r.name || "-"}</TableCell>
                        <TableCell>{r.nis_nip || "-"}</TableCell>
                        <TableCell>
                          {ACCOUNT_TYPE_LABELS[r.account_type as AccountType] ??
                            r.account_type ??
                            "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{r.class || "-"}</div>
                          <div className="text-muted-foreground">{r.dorm || "-"}</div>
                        </TableCell>
                        <TableCell>{r.rfid_card || "-"}</TableCell>
                        <TableCell className="text-xs font-semibold text-destructive">
                          {r.errors.join(", ") || (
                            <span className="text-muted-foreground">Valid</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground">
                Setiap anggota baru dibuatkan akun masuk otomatis dengan email
                &lt;nomor induk&gt;@ahibs.local dan kata sandi awal Ahibs1234. Silakan minta anggota
                menggantinya atau ubah dari tombol Ubah.
              </p>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              disabled={validRows.length === 0 || importMutation.isPending}
              onClick={() => importMutation.mutate()}
            >
              {importMutation.isPending
                ? "Menyimpan…"
                : `Simpan ${validRows.length} Anggota`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
