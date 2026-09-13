import * as XLSX from "xlsx";

import { ACCOUNT_TYPES, type AccountType } from "./roles";

export const IMPORT_COLUMNS = [
  "name",
  "nis_nip",
  "account_type",
  "class",
  "dorm",
  "halaqoh",
  "phone",
  "gender",
  "rfid_card",
] as const;

export type ImportRow = {
  name: string;
  nis_nip: string;
  account_type: string;
  class: string;
  dorm: string;
  halaqoh: string;
  phone: string;
  gender: string;
  rfid_card: string;
};

export type ParsedRow = ImportRow & { rowNumber: number; errors: string[] };

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export function downloadTemplate() {
  const sample: ImportRow[] = [
    {
      name: "Ahmad Fauzan",
      nis_nip: "2026001",
      account_type: "santri",
      class: "7A Tahfizh",
      dorm: "Asrama Abu Bakar - Kamar 102",
      halaqoh: "Halaqoh Ustadz Ahmad",
      phone: "081200000001",
      gender: "L",
      rfid_card: "RFID-1001",
    },
    {
      name: "Ustadz Bilal",
      nis_nip: "19850101001",
      account_type: "guru_mapel",
      class: "",
      dorm: "",
      halaqoh: "",
      phone: "081200000002",
      gender: "L",
      rfid_card: "RFID-2001",
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(sample, { header: [...IMPORT_COLUMNS] });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Anggota");
  const notes = XLSX.utils.aoa_to_sheet([
    ["Petunjuk pengisian"],
    ["name", "Wajib. Nama lengkap anggota."],
    ["nis_nip", "Wajib. Nomor induk, harus unik."],
    ["account_type", `Wajib. Pilih salah satu: ${ACCOUNT_TYPES.join(", ")}`],
    ["class / dorm / halaqoh", "Hanya untuk santri."],
    ["gender", "L atau P."],
    ["rfid_card", "Opsional, harus unik bila diisi."],
  ]);
  XLSX.utils.book_append_sheet(book, notes, "Petunjuk");
  XLSX.writeFile(book, "template-anggota-asma.xlsx");
}

export async function parseMemberFile(
  file: File,
  existing: { nis_nip: string | null; rfid_card: string | null }[],
): Promise<ParsedRow[]> {
  const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const first = book.SheetNames[0];
  if (!first) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[first]!, {
    defval: "",
  });

  const existingNis = new Set(existing.map((m) => str(m.nis_nip).toLowerCase()).filter(Boolean));
  const existingRfid = new Set(
    existing.map((m) => str(m.rfid_card).toLowerCase()).filter(Boolean),
  );
  const seenNis = new Set<string>();
  const seenRfid = new Set<string>();

  return raw.map((r, index) => {
    const row: ImportRow = {
      name: str(r["name"]),
      nis_nip: str(r["nis_nip"]),
      account_type: str(r["account_type"]).toLowerCase(),
      class: str(r["class"]),
      dorm: str(r["dorm"]),
      halaqoh: str(r["halaqoh"]),
      phone: str(r["phone"]),
      gender: str(r["gender"]).toUpperCase(),
      rfid_card: str(r["rfid_card"]),
    };
    const errors: string[] = [];

    if (row.name.length < 2) errors.push("Nama wajib diisi (min. 2 karakter)");
    if (!row.nis_nip) errors.push("Nomor induk wajib diisi");
    if (!ACCOUNT_TYPES.includes(row.account_type as AccountType))
      errors.push("Jenis akun tidak valid");
    if (row.gender && row.gender !== "L" && row.gender !== "P")
      errors.push("Jenis kelamin harus L atau P");

    const nisKey = row.nis_nip.toLowerCase();
    if (nisKey) {
      if (existingNis.has(nisKey)) errors.push("Nomor induk sudah terdaftar");
      else if (seenNis.has(nisKey)) errors.push("Nomor induk duplikat di dalam file");
      seenNis.add(nisKey);
    }

    const rfidKey = row.rfid_card.toLowerCase();
    if (rfidKey) {
      if (existingRfid.has(rfidKey)) errors.push("Nomor RFID sudah terdaftar");
      else if (seenRfid.has(rfidKey)) errors.push("Nomor RFID duplikat di dalam file");
      seenRfid.add(rfidKey);
    }

    return { ...row, rowNumber: index + 2, errors };
  });
}
