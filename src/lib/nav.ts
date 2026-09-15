import {
  BedDouble,
  BookMarked,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileBadge,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  PenLine,
  ScanLine,
  School,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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
  | "rekap-nilai"
  | "rekap-pelanggaran"
  | "rekap-mutabaah"
  | "rekap-tahfiz"
  | "scan-presensi"
  | "presensi-insidental"
  | "pengaturan-sesi"
  | "absensi-diri"
  | "input-mutabaah"
  | "mutabaah-saya"
  | "catat-pelanggaran"
  | "perizinan"
  | "pelanggaran-saya"
  | "input-nilai-tahfiz"
  | "nilai-tahfiz-saya"
  | "kalender"
  | "perangkat-ajar"
  | "rekap-perangkat-ajar"
  | "input-nilai"
  | "input-kokur"
  | "nilai-pelajaran"
  | "manajemen-mapel"
  | "jadwal-pelajaran"
  | "profil";

export type NavCategory =
  | "utama"
  | "manajemen"
  | "rekap"
  | "presensi"
  | "kesantrian"
  | "tahfiz"
  | "pendidikan"
  | "akun";

export const CATEGORY_LABELS: Record<NavCategory, string> = {
  utama: "Utama",
  manajemen: "Manajemen",
  rekap: "Rekap Kegiatan",
  presensi: "Presensi",
  kesantrian: "Kesantrian",
  tahfiz: "Tahfiz",
  pendidikan: "Pendidikan",
  akun: "Akun",
};

/** Satu warna ikon per kategori supaya mudah dikenali. */
export const CATEGORY_TONES: Record<NavCategory, string> = {
  utama: "bg-feature-blue text-primary",
  manajemen: "bg-feature-blue text-primary",
  rekap: "bg-feature-sky text-chart-3",
  presensi: "bg-feature-orange text-accent-foreground",
  kesantrian: "bg-feature-rose text-destructive",
  tahfiz: "bg-feature-emerald text-chart-2",
  pendidikan: "bg-feature-sky text-chart-3",
  akun: "bg-feature-blue text-primary",
};

export type NavItem = {
  key: NavKey;
  to: string;
  label: string;
  icon: LucideIcon;
  category: NavCategory;
};

export type NavGroup = {
  category: NavCategory;
  label: string;
  tone: string;
  items: NavItem[];
};

export const NAV_ITEMS: Record<NavKey, NavItem> = {
  dashboard: { key: "dashboard", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, category: "utama" },

  anggota: { key: "anggota", to: "/anggota", label: "Manajemen Anggota", icon: Users, category: "manajemen" },
  "manajemen-kelas": {
    key: "manajemen-kelas",
    to: "/manajemen-kelas",
    label: "Manajemen Kelas",
    icon: School,
    category: "manajemen",
  },
  "manajemen-asrama": {
    key: "manajemen-asrama",
    to: "/manajemen-asrama",
    label: "Manajemen Asrama",
    icon: BedDouble,
    category: "manajemen",
  },
  "manajemen-halaqoh": {
    key: "manajemen-halaqoh",
    to: "/manajemen-halaqoh",
    label: "Manajemen Halaqoh",
    icon: BookOpen,
    category: "manajemen",
  },

  presensi: {
    key: "presensi",
    to: "/rekap-presensi",
    label: "Rekap Presensi",
    icon: ClipboardCheck,
    category: "rekap",
  },
  "rekap-nilai": {
    key: "rekap-nilai",
    to: "/rekap-nilai",
    label: "Rekap Nilai",
    icon: FileSpreadsheet,
    category: "rekap",
  },
  "rekap-pelanggaran": {
    key: "rekap-pelanggaran",
    to: "/rekap-pelanggaran",
    label: "Rekap Pelanggaran",
    icon: ShieldAlert,
    category: "rekap",
  },
  "rekap-mutabaah": {
    key: "rekap-mutabaah",
    to: "/rekap-mutabaah",
    label: "Rekap Mutaba'ah",
    icon: ClipboardList,
    category: "rekap",
  },
  "rekap-tahfiz": {
    key: "rekap-tahfiz",
    to: "/rekap-tahfiz",
    label: "Rekap Tahfiz",
    icon: BookMarked,
    category: "rekap",
  },

  "scan-presensi": {
    key: "scan-presensi",
    to: "/scan-presensi",
    label: "Scan Presensi",
    icon: ScanLine,
    category: "presensi",
  },
  "presensi-insidental": {
    key: "presensi-insidental",
    to: "/presensi-insidental",
    label: "Presensi Insidental",
    icon: CalendarPlus,
    category: "presensi",
  },
  "pengaturan-sesi": {
    key: "pengaturan-sesi",
    to: "/pengaturan-sesi",
    label: "Sesi Presensi",
    icon: Timer,
    category: "presensi",
  },
  "absensi-diri": {
    key: "absensi-diri",
    to: "/absensi-diri",
    label: "Absensi Diri",
    icon: UserCheck,
    category: "presensi",
  },

  "input-mutabaah": {
    key: "input-mutabaah",
    to: "/input-mutabaah",
    label: "Input Mutaba'ah",
    icon: PenLine,
    category: "kesantrian",
  },
  "mutabaah-saya": {
    key: "mutabaah-saya",
    to: "/mutabaah-saya",
    label: "Mutaba'ah Saya",
    icon: ListChecks,
    category: "kesantrian",
  },
  "catat-pelanggaran": {
    key: "catat-pelanggaran",
    to: "/catat-pelanggaran",
    label: "Catat Pelanggaran",
    icon: ShieldCheck,
    category: "kesantrian",
  },
  perizinan: {
    key: "perizinan",
    to: "/perizinan",
    label: "Perizinan",
    icon: FileBadge,
    category: "kesantrian",
  },
  "pelanggaran-saya": {
    key: "pelanggaran-saya",
    to: "/pelanggaran-saya",
    label: "Pelanggaran Saya",
    icon: ShieldAlert,
    category: "kesantrian",
  },

  "input-nilai-tahfiz": {
    key: "input-nilai-tahfiz",
    to: "/input-nilai-tahfiz",
    label: "Input Nilai Tahfiz",
    icon: Sparkles,
    category: "tahfiz",
  },
  "nilai-tahfiz-saya": {
    key: "nilai-tahfiz-saya",
    to: "/nilai-tahfiz-saya",
    label: "Nilai Tahfiz Saya",
    icon: BookMarked,
    category: "tahfiz",
  },

  kalender: {
    key: "kalender",
    to: "/kalender",
    label: "Kalender Pendidikan",
    icon: CalendarDays,
    category: "pendidikan",
  },
  "perangkat-ajar": {
    key: "perangkat-ajar",
    to: "/perangkat-ajar",
    label: "Perangkat Ajar (CP/TP)",
    icon: BookOpen,
    category: "pendidikan",
  },
  "rekap-perangkat-ajar": {
    key: "rekap-perangkat-ajar",
    to: "/rekap-perangkat-ajar",
    label: "Rekap Perangkat Ajar",
    icon: FileSpreadsheet,
    category: "rekap",
  },
  "input-nilai": {
    key: "input-nilai",
    to: "/input-nilai",
    label: "Input Nilai",
    icon: PenLine,
    category: "pendidikan",
  },
  "input-kokur": {
    key: "input-kokur",
    to: "/input-kokur",
    label: "Input Kokurikuler (P5)",
    icon: Compass,
    category: "pendidikan",
  },
  "nilai-pelajaran": {
    key: "nilai-pelajaran",
    to: "/nilai-pelajaran",
    label: "Nilai Pelajaran",
    icon: GraduationCap,
    category: "pendidikan",
  },
  "manajemen-mapel": {
    key: "manajemen-mapel",
    to: "/manajemen-mapel",
    label: "Manajemen Mapel",
    icon: BookMarked,
    category: "manajemen",
  },
  "jadwal-pelajaran": {
    key: "jadwal-pelajaran",
    to: "/jadwal-pelajaran",
    label: "Jadwal Pelajaran",
    icon: CalendarDays,
    category: "pendidikan",
  },

  profil: { key: "profil", to: "/profil", label: "Profil Saya", icon: UserCog, category: "akun" },
};

const CATEGORY_ORDER: NavCategory[] = [
  "utama",
  "manajemen",
  "rekap",
  "presensi",
  "kesantrian",
  "tahfiz",
  "pendidikan",
  "akun",
];

const REKAP_ALL: NavKey[] = [
  "presensi",
  "rekap-nilai",
  "rekap-perangkat-ajar",
  "rekap-pelanggaran",
  "rekap-mutabaah",
  "rekap-tahfiz",
];

const MENUS: Record<AccountType, NavKey[]> = {
  super_admin: [
    "dashboard",
    "anggota",
    "manajemen-kelas",
    "manajemen-asrama",
    "manajemen-halaqoh",
    "manajemen-mapel",
    ...REKAP_ALL,
    "scan-presensi",
    "presensi-insidental",
    "pengaturan-sesi",
    "input-mutabaah",
    "catat-pelanggaran",
    "perizinan",
    "input-nilai-tahfiz",
    "kalender",
    "jadwal-pelajaran",
    "perangkat-ajar",
    "input-nilai",
    "input-kokur",
    "profil",
  ],
  mudir: [
    "dashboard",
    "anggota",
    "manajemen-kelas",
    "manajemen-asrama",
    "manajemen-halaqoh",
    "manajemen-mapel",
    ...REKAP_ALL,
    "scan-presensi",
    "presensi-insidental",
    "pengaturan-sesi",
    "absensi-diri",
    "input-mutabaah",
    "catat-pelanggaran",
    "perizinan",
    "input-nilai-tahfiz",
    "kalender",
    "jadwal-pelajaran",
    "perangkat-ajar",
    "input-nilai",
    "input-kokur",
    "profil",
  ],
  kepala_sekolah: [
    "dashboard",
    "anggota",
    "manajemen-kelas",
    "manajemen-asrama",
    "manajemen-halaqoh",
    "manajemen-mapel",
    ...REKAP_ALL,
    "scan-presensi",
    "presensi-insidental",
    "pengaturan-sesi",
    "absensi-diri",
    "input-mutabaah",
    "catat-pelanggaran",
    "perizinan",
    "input-nilai-tahfiz",
    "kalender",
    "jadwal-pelajaran",
    "perangkat-ajar",
    "input-nilai",
    "input-kokur",
    "profil",
  ],
  kepala_tu: [
    "dashboard",
    "anggota",
    "manajemen-kelas",
    "manajemen-asrama",
    "manajemen-halaqoh",
    "manajemen-mapel",
    "scan-presensi",
    "presensi-insidental",
    "absensi-diri",
    "catat-pelanggaran",
    "perizinan",
    "kalender",
    "jadwal-pelajaran",
    "profil",
  ],

  waka_kurikulum: [
    "dashboard",
    "manajemen-mapel",
    ...REKAP_ALL,
    "scan-presensi",
    "presensi-insidental",
    "absensi-diri",
    "catat-pelanggaran",
    "perizinan",
    "kalender",
    "jadwal-pelajaran",
    "perangkat-ajar",
    "input-nilai",
    "input-kokur",
    "profil",
  ],
  kabid_kesantrian: [
    "dashboard",
    ...REKAP_ALL,
    "scan-presensi",
    "presensi-insidental",
    "absensi-diri",
    "input-mutabaah",
    "catat-pelanggaran",
    "perizinan",
    "input-nilai-tahfiz",
    "kalender",
    "profil",
  ],

  musyrif_asrama: [
    "dashboard",
    "scan-presensi",
    "presensi-insidental",
    "absensi-diri",
    "input-mutabaah",
    "catat-pelanggaran",
    "perizinan",
    "input-nilai-tahfiz",
    "kalender",
    "profil",
  ],
  musyrif_halaqoh: [
    "dashboard",
    "scan-presensi",
    "presensi-insidental",
    "absensi-diri",
    "input-mutabaah",
    "catat-pelanggaran",
    "perizinan",
    "input-nilai-tahfiz",
    "kalender",
    "profil",
  ],
  wali_kelas: [
    "dashboard",
    "scan-presensi",
    "presensi-insidental",
    "absensi-diri",
    "input-mutabaah",
    "catat-pelanggaran",
    "perizinan",
    "kalender",
    "jadwal-pelajaran",
    "perangkat-ajar",
    "input-nilai",
    "input-kokur",
    "profil",
  ],
  guru_mapel: [
    "dashboard",
    "scan-presensi",
    "presensi-insidental",
    "absensi-diri",
    "catat-pelanggaran",
    "kalender",
    "jadwal-pelajaran",
    "perangkat-ajar",
    "input-nilai",
    "input-kokur",
    "profil",
  ],
  kepala_rt_sarpras: ["dashboard", "presensi-insidental", "absensi-diri", "kalender", "profil"],
  tendik: ["dashboard", "scan-presensi", "presensi-insidental", "absensi-diri", "kalender", "profil"],
  santri: [
    "dashboard",
    "absensi-diri",
    "mutabaah-saya",
    "pelanggaran-saya",
    "perizinan",
    "nilai-tahfiz-saya",
    "kalender",
    "jadwal-pelajaran",
    "nilai-pelajaran",
    "profil",
  ],
};

export function navItemsFor(accountType?: string | null): NavItem[] {
  const keys = MENUS[accountType as AccountType] ?? ["dashboard", "profil"];
  return keys.map((key) => NAV_ITEMS[key]);
}

export function navGroupsFor(accountType?: string | null): NavGroup[] {
  const items = navItemsFor(accountType);
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    tone: CATEGORY_TONES[category],
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}
