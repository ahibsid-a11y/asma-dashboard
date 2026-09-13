import {
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  ScanLine,
  ShieldAlert,
  Timer,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AccountType } from "./roles";

export type NavKey =
  | "dashboard"
  | "anggota"
  | "presensi"
  | "scan-presensi"
  | "presensi-insidental"
  | "pengaturan-sesi"
  | "absensi-diri"
  | "kalender"
  | "kesiswaan"
  | "mutabaah-saya"
  | "pelanggaran-saya";

export type NavItem = {
  key: NavKey;
  to: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: Record<NavKey, NavItem> = {
  dashboard: { key: "dashboard", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  anggota: { key: "anggota", to: "/anggota", label: "Manajemen Anggota", icon: Users },
  presensi: { key: "presensi", to: "/presensi", label: "Presensi", icon: ClipboardCheck },
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
};

const MENUS: Record<AccountType, NavKey[]> = {
  super_admin: ["dashboard", "anggota", "presensi", "scan-presensi", "pengaturan-sesi", "kalender", "kesiswaan"],
  mudir: ["dashboard", "anggota", "presensi", "scan-presensi", "pengaturan-sesi", "kalender", "kesiswaan"],
  kepala_sekolah: ["dashboard", "anggota", "presensi", "scan-presensi", "pengaturan-sesi", "kalender", "kesiswaan"],
  kepala_tu: ["dashboard", "anggota", "presensi", "scan-presensi", "kalender", "kesiswaan"],
  waka_kurikulum: ["dashboard", "presensi", "scan-presensi", "kalender", "kesiswaan"],
  kabid_kesantrian: ["dashboard", "presensi", "scan-presensi", "kalender", "kesiswaan"],
  musyrif_asrama: ["dashboard", "scan-presensi", "absensi-diri", "kalender", "kesiswaan"],
  musyrif_halaqoh: ["dashboard", "scan-presensi", "absensi-diri", "kalender", "kesiswaan"],
  wali_kelas: ["dashboard", "scan-presensi", "absensi-diri", "kalender", "kesiswaan"],
  guru_mapel: ["dashboard", "scan-presensi", "absensi-diri", "kalender", "kesiswaan"],
  kepala_rt_sarpras: ["dashboard", "absensi-diri", "kalender"],
  tendik: ["dashboard", "scan-presensi", "absensi-diri", "kalender"],
  santri: ["dashboard", "absensi-diri", "mutabaah-saya", "pelanggaran-saya", "kalender"],
};

export function navItemsFor(accountType?: string | null): NavItem[] {
  const keys = MENUS[accountType as AccountType] ?? ["dashboard"];
  return keys.map((key) => NAV_ITEMS[key]);
}
