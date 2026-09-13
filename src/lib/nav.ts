import {
  BedDouble,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  ScanLine,
  School,
  ShieldAlert,
  Timer,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import type { AccountType } from "./roles";

export type NavKey =
  | "dashboard"
  | "anggota"
  | "manajemen-kelas"
  | "manajemen-asrama"
  | "manajemen-halaqoh"
  | "presensi"
  | "scan-presensi"
  | "presensi-insidental"
  | "pengaturan-sesi"
  | "absensi-diri"
  | "kalender"
  | "kesiswaan"
  | "mutabaah-saya"
  | "pelanggaran-saya"
  | "profil";


export type NavItem = {
  key: NavKey;
  to: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: Record<NavKey, NavItem> = {
  dashboard: { key: "dashboard", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  anggota: { key: "anggota", to: "/anggota", label: "Manajemen Anggota", icon: Users },
  "manajemen-kelas": {
    key: "manajemen-kelas",
    to: "/manajemen-kelas",
    label: "Manajemen Kelas",
    icon: School,
  },
  "manajemen-asrama": {
    key: "manajemen-asrama",
    to: "/manajemen-asrama",
    label: "Manajemen Asrama",
    icon: BedDouble,
  },
  "manajemen-halaqoh": {
    key: "manajemen-halaqoh",
    to: "/manajemen-halaqoh",
    label: "Manajemen Halaqoh",
    icon: BookOpen,
  },

  presensi: { key: "presensi", to: "/rekap-presensi", label: "Rekap Presensi", icon: ClipboardCheck },
  "scan-presensi": {
    key: "scan-presensi",
    to: "/scan-presensi",
    label: "Scan Presensi",
    icon: ScanLine,
  },
  "presensi-insidental": {
    key: "presensi-insidental",
    to: "/presensi-insidental",
    label: "Presensi Insidental",
    icon: CalendarPlus,
  },
  "pengaturan-sesi": {
    key: "pengaturan-sesi",
    to: "/pengaturan-sesi",
    label: "Sesi Presensi",
    icon: Timer,
  },
  "absensi-diri": { key: "absensi-diri", to: "/absensi-diri", label: "Absensi Diri", icon: UserCheck },
  kalender: { key: "kalender", to: "/kalender", label: "Kalender Pendidikan", icon: CalendarDays },
  kesiswaan: { key: "kesiswaan", to: "/kesiswaan", label: "Kesiswaan", icon: GraduationCap },
  "mutabaah-saya": {
    key: "mutabaah-saya",
    to: "/mutabaah-saya",
    label: "Mutaba'ah Saya",
    icon: ListChecks,
  },
  "pelanggaran-saya": {
    key: "pelanggaran-saya",
    to: "/pelanggaran-saya",
    label: "Pelanggaran Saya",
    icon: ShieldAlert,
  },
  profil: { key: "profil", to: "/profil", label: "Profil Saya", icon: UserCog },
};

const MENUS: Record<AccountType, NavKey[]> = {
  super_admin: ["dashboard", "anggota", "presensi", "scan-presensi", "presensi-insidental", "pengaturan-sesi", "kalender", "kesiswaan", "profil"],
  mudir: ["dashboard", "anggota", "presensi", "scan-presensi", "presensi-insidental", "pengaturan-sesi", "absensi-diri", "kalender", "kesiswaan", "profil"],
  kepala_sekolah: ["dashboard", "anggota", "presensi", "scan-presensi", "presensi-insidental", "pengaturan-sesi", "absensi-diri", "kalender", "kesiswaan", "profil"],
  kepala_tu: ["dashboard", "anggota", "scan-presensi", "presensi-insidental", "absensi-diri", "kalender", "kesiswaan", "profil"],
  waka_kurikulum: ["dashboard", "presensi", "scan-presensi", "presensi-insidental", "absensi-diri", "kalender", "kesiswaan", "profil"],
  kabid_kesantrian: ["dashboard", "presensi", "scan-presensi", "presensi-insidental", "absensi-diri", "kalender", "kesiswaan", "profil"],

  musyrif_asrama: ["dashboard", "scan-presensi", "presensi-insidental", "absensi-diri", "kalender", "kesiswaan", "profil"],
  musyrif_halaqoh: ["dashboard", "scan-presensi", "presensi-insidental", "absensi-diri", "kalender", "kesiswaan", "profil"],
  wali_kelas: ["dashboard", "scan-presensi", "presensi-insidental", "absensi-diri", "kalender", "kesiswaan", "profil"],
  guru_mapel: ["dashboard", "scan-presensi", "presensi-insidental", "absensi-diri", "kalender", "kesiswaan", "profil"],
  kepala_rt_sarpras: ["dashboard", "presensi-insidental", "absensi-diri", "kalender", "profil"],
  tendik: ["dashboard", "scan-presensi", "presensi-insidental", "absensi-diri", "kalender", "profil"],
  santri: ["dashboard", "absensi-diri", "mutabaah-saya", "pelanggaran-saya", "kalender", "profil"],
};

export function navItemsFor(accountType?: string | null): NavItem[] {
  const keys = MENUS[accountType as AccountType] ?? ["dashboard", "profil"];
  return keys.map((key) => NAV_ITEMS[key]);
}
