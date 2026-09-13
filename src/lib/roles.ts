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
