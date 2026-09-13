import {
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
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
  super_admin: ["dashboard", "anggota", "presensi", "kalender", "kesiswaan"],
  mudir: ["dashboard", "anggota", "presensi", "kalender", "kesiswaan"],
  kepala_sekolah: ["dashboard", "anggota", "presensi", "kalender", "kesiswaan"],
  kepala_tu: ["dashboard", "anggota", "presensi", "kalender", "kesiswaan"],
  waka_kurikulum: ["dashboard", "presensi", "kalender", "kesiswaan"],
  kabid_kesantrian: ["dashboard", "presensi", "kalender", "kesiswaan"],
  musyrif_asrama: ["dashboard", "absensi-diri", "kalender", "kesiswaan"],
  musyrif_halaqoh: ["dashboard", "absensi-diri", "kalender", "kesiswaan"],
  wali_kelas: ["dashboard", "absensi-diri", "kalender", "kesiswaan"],
  guru_mapel: ["dashboard", "absensi-diri", "kalender", "kesiswaan"],
  kepala_rt_sarpras: ["dashboard", "absensi-diri", "kalender"],
  tendik: ["dashboard", "absensi-diri", "kalender"],
  santri: ["dashboard", "absensi-diri", "mutabaah-saya", "pelanggaran-saya", "kalender"],
};

export function navItemsFor(accountType?: string | null): NavItem[] {
  const keys = MENUS[accountType as AccountType] ?? ["dashboard"];
  return keys.map((key) => NAV_ITEMS[key]);
}
