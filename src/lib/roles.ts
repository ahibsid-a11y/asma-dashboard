export const ACCOUNT_TYPES = [
  "super_admin",
  "mudir",
  "kepala_sekolah",
  "waka_kurikulum",
  "kabid_kesantrian",
  "musyrif_asrama",
  "musyrif_halaqoh",
  "wali_kelas",
  "guru_mapel",
  "pembina_ekskul",
  "kepala_tu",
  "kepala_rt_sarpras",
  "tendik",
  "santri",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  super_admin: "Super Admin",
  mudir: "Mudir",
  kepala_sekolah: "Kepala Sekolah",
  waka_kurikulum: "Waka Kurikulum",
  kabid_kesantrian: "Kabid Kesantrian",
  musyrif_asrama: "Musyrif Asrama",
  musyrif_halaqoh: "Musyrif Halaqoh",
  wali_kelas: "Wali Kelas",
  guru_mapel: "Guru Mapel",
  pembina_ekskul: "Pembina Ekstrakurikuler",
  kepala_tu: "Kepala Tata Usaha",
  kepala_rt_sarpras: "Kepala RT & Sarpras",
  tendik: "Tendik",
  santri: "Santri",
};

export const MEMBER_ADMIN_TYPES: AccountType[] = [
  "super_admin",
  "mudir",
  "kepala_sekolah",
  "kepala_tu",
];

export function isMemberAdmin(accountType?: string | null) {
  return MEMBER_ADMIN_TYPES.includes(accountType as AccountType);
}

export const MEMBER_CATEGORIES = [
  "super_admin",
  "admin",
  "guru",
  "musyrif",
  "tendik",
  "siswa",
] as const;

export type MemberCategory = (typeof MEMBER_CATEGORIES)[number];

export const MEMBER_CATEGORY_LABELS: Record<MemberCategory, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  guru: "Guru",
  musyrif: "Musyrif",
  tendik: "Tendik",
  siswa: "Siswa",
};

/** Jabatan yang boleh dipilih untuk setiap kategori akun. Siswa tidak memiliki jabatan. */
export const CATEGORY_POSITIONS: Record<MemberCategory, AccountType[]> = {
  super_admin: ["super_admin"],
  admin: [
    "mudir",
    "kepala_sekolah",
    "waka_kurikulum",
    "kabid_kesantrian",
    "kepala_tu",
    "kepala_rt_sarpras",
  ],
  guru: ["guru_mapel", "wali_kelas", "pembina_ekskul"],
  musyrif: ["musyrif_asrama", "musyrif_halaqoh"],
  tendik: ["tendik"],
  siswa: [],
};

export const CATEGORY_DEFAULT_ACCOUNT_TYPE: Record<MemberCategory, AccountType> = {
  super_admin: "super_admin",
  admin: "mudir",
  guru: "guru_mapel",
  musyrif: "musyrif_asrama",
  tendik: "tendik",
  siswa: "santri",
};

export function categoryOf(accountType?: string | null): MemberCategory {
  const entry = MEMBER_CATEGORIES.find((c) =>
    CATEGORY_POSITIONS[c].includes(accountType as AccountType),
  );
  return entry ?? "siswa";
}

