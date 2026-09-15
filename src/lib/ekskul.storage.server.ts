import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type EkskulCategory = "wajib" | "pilihan";
export type EkskulFeePeriod = "per_bulan" | "per_semester" | "sekali";

export interface EkskulItem {
  id: string;
  name: string;
  category: EkskulCategory;
  fee: number; // 0 untuk wajib, nominal rupiah untuk pilihan
  fee_period: EkskulFeePeriod;
  coach_name: string;
  coach_id?: string | undefined;
  schedule_day: string; // Misal "Sabtu", "Ahad"
  schedule_time: string; // Misal "16:00 - 17:30"
  location: string; // Misal "Lapangan Pesantren", "Lab Komputer"
  quota?: number | undefined;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EkskulEnrollment {
  id: string;
  ekskul_id: string;
  student_id: string;
  semester: string;
  academic_year: string;
  enrolled_at: string;
  status: "aktif" | "menunggu_konfirmasi" | "selesai" | "keluar";
}

export interface EkskulPayment {
  id: string;
  enrollment_id: string;
  student_id: string;
  ekskul_id: string;
  period_label: string; // Misal: "Juli 2026", "Semester 1 (Ganjil)"
  amount: number;
  status: "lunas" | "belum_bayar";
  payment_date?: string | undefined;
  payment_method?: "tunai" | "transfer" | "potong_tabungan" | undefined;
  notes?: string | undefined;
  receipt_no?: string | undefined;
  verified_by?: string | undefined;
  updated_at: string;
}

export interface EkskulSession {
  id: string;
  ekskul_id: string;
  date: string; // YYYY-MM-DD
  topic: string;
  academic_year: string;
  semester: string;
  created_at: string;
}

export interface EkskulAttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: "hadir" | "izin" | "sakit" | "alpa";
  notes?: string | undefined;
}

export interface EkskulGrade {
  id: string;
  ekskul_id: string;
  student_id: string;
  semester: string;
  academic_year: string;
  grade: "A" | "B" | "C" | "D";
  predicate: "Sangat Baik" | "Baik" | "Cukup" | "Kurang";
  description: string;
  updated_at: string;
}

interface EkskulStoreData {
  ekskuls: EkskulItem[];
  enrollments: EkskulEnrollment[];
  payments: EkskulPayment[];
  sessions: EkskulSession[];
  attendances: EkskulAttendanceRecord[];
  grades: EkskulGrade[];
}

const STORE_PATH = path.resolve(process.cwd(), "data", "ekskul_store.json");

export const DEFAULT_EKSKULS: EkskulItem[] = [
  {
    id: "ekskul-pramuka",
    name: "Praja Muda Karana (Pramuka)",
    category: "wajib",
    fee: 0,
    fee_period: "sekali",
    coach_name: "Kak Rahmat Hidayat",
    schedule_day: "Sabtu",
    schedule_time: "14:00 - 15:30",
    location: "Lapangan Utama Pesantren",
    quota: 200,
    description: "Kegiatan kepanduan, kepemimpinan, kemandirian, dan kedisiplinan santri.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ekskul-tapak-suci",
    name: "Seni Bela Diri Tapak Suci",
    category: "wajib",
    fee: 0,
    fee_period: "sekali",
    coach_name: "Ust. Supriyadi, S.Pd.I",
    schedule_day: "Ahad",
    schedule_time: "08:00 - 10:00",
    location: "Aula Serbaguna / Lapangan Olahraga",
    quota: 200,
    description: "Seni bela diri bela Islam, kebugaran fisik, ketangkasan, dan pembentukan mental tangguh.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ekskul-panahan",
    name: "Panahan Tradisional & Horsebow",
    category: "pilihan",
    fee: 75000,
    fee_period: "per_bulan",
    coach_name: "Coach Farhan Al-Fatih",
    schedule_day: "Sabtu",
    schedule_time: "16:00 - 17:30",
    location: "Area Panahan Terbuka",
    quota: 25,
    description: "Olahraga sunnah memanah melatih fokus, kesabaran, kekuatan otot bahu, dan ketenangan jiwa.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ekskul-futsal",
    name: "Futsal & Sepak Bola Santri",
    category: "pilihan",
    fee: 50000,
    fee_period: "per_bulan",
    coach_name: "Coach Dedi Kurniawan",
    schedule_day: "Kamis",
    schedule_time: "16:00 - 17:30",
    location: "Lapangan Futsal AHIBS",
    quota: 30,
    description: "Pembinaan teknik sepak bola mini, kerja sama tim, stamina, dan sportivitas santri.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ekskul-robotik",
    name: "Robotik & Coding Arduino",
    category: "pilihan",
    fee: 100000,
    fee_period: "per_bulan",
    coach_name: "Eng. Teguh Prasetyo, S.T",
    schedule_day: "Sabtu",
    schedule_time: "09:00 - 11:00",
    location: "Lab Komputer & Multimedia",
    quota: 20,
    description: "Pengenalan teknologi IoT, perakitan mikrokontroler, algoritma logika, dan robot cerdas.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ekskul-english-club",
    name: "English Conversation Club",
    category: "pilihan",
    fee: 50000,
    fee_period: "per_bulan",
    coach_name: "Miss Nurul Fauziyah, M.Pd",
    schedule_day: "Rabu",
    schedule_time: "16:00 - 17:15",
    location: "Ruang Diskusi Perpustakaan",
    quota: 25,
    description: "Praktik percakapan bahasa Inggris aktif, storytelling, pidato (speech), dan debat santri.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ekskul-desain-multimedia",
    name: "Desain Grafis & Multimedia Dakwah",
    category: "pilihan",
    fee: 65000,
    fee_period: "per_bulan",
    coach_name: "Ust. M. Rizky Pratama",
    schedule_day: "Ahad",
    schedule_time: "10:30 - 12:00",
    location: "Lab Komputer",
    quota: 20,
    description: "Kreativitas pembuatan poster dakwah, editing video dasar, tipografi, dan media islami.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function ensureStoreDir(): void {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadEkskulStore(): EkskulStoreData {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_PATH)) {
      const initial: EkskulStoreData = {
        ekskuls: DEFAULT_EKSKULS,
        enrollments: [],
        payments: [],
        sessions: [],
        attendances: [],
        grades: [],
      };
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ekskuls: parsed.ekskuls?.length ? parsed.ekskuls : DEFAULT_EKSKULS,
      enrollments: parsed.enrollments || [],
      payments: parsed.payments || [],
      sessions: parsed.sessions || [],
      attendances: parsed.attendances || [],
      grades: parsed.grades || [],
    };
  } catch (err) {
    console.error("Failed to load ekskul store:", err);
    return {
      ekskuls: DEFAULT_EKSKULS,
      enrollments: [],
      payments: [],
      sessions: [],
      attendances: [],
      grades: [],
    };
  }
}

export function saveEkskulStore(data: EkskulStoreData): void {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save ekskul store:", err);
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

export function getEkskulById(id: string): EkskulItem | undefined {
  const store = loadEkskulStore();
  return store.ekskuls.find((e) => e.id === id);
}

export function saveOrUpdateEkskul(item: Partial<EkskulItem> & { name: string; category: EkskulCategory }): EkskulItem {
  const store = loadEkskulStore();
  const now = new Date().toISOString();
  if (item.id) {
    const idx = store.ekskuls.findIndex((e) => e.id === item.id);
    if (idx !== -1) {
      store.ekskuls[idx] = {
        ...store.ekskuls[idx]!,
        ...item,
        updated_at: now,
      };
      saveEkskulStore(store);
      return store.ekskuls[idx]!;
    }
  }

  const newItem: EkskulItem = {
    id: item.id || `ekskul-${crypto.randomUUID().slice(0, 8)}`,
    name: item.name,
    category: item.category,
    fee: item.fee ?? 0,
    fee_period: item.fee_period ?? "per_bulan",
    coach_name: item.coach_name || "Belum Ditentukan",
    coach_id: item.coach_id ?? undefined,
    schedule_day: item.schedule_day || "Sabtu",
    schedule_time: item.schedule_time || "16:00 - 17:30",
    location: item.location || "Pesantren",
    quota: item.quota ?? 30,
    description: item.description || "",
    is_active: item.is_active ?? true,
    created_at: now,
    updated_at: now,
  };

  store.ekskuls.push(newItem);
  saveEkskulStore(store);
  return newItem;
}

export function deleteEkskulItem(id: string): boolean {
  const store = loadEkskulStore();
  const beforeLen = store.ekskuls.length;
  store.ekskuls = store.ekskuls.filter((e) => e.id !== id);
  if (store.ekskuls.length !== beforeLen) {
    saveEkskulStore(store);
    return true;
  }
  return false;
}

// Enrollment helpers
export function enrollStudentToEkskul(data: {
  ekskul_id: string;
  student_id: string;
  semester: string;
  academic_year: string;
}): EkskulEnrollment {
  const store = loadEkskulStore();
  const existing = store.enrollments.find(
    (e) =>
      e.ekskul_id === data.ekskul_id &&
      e.student_id === data.student_id &&
      e.semester === data.semester &&
      e.academic_year === data.academic_year
  );
  if (existing) {
    if (existing.status === "keluar") {
      existing.status = "aktif";
      saveEkskulStore(store);
    }
    return existing;
  }

  const enrollment: EkskulEnrollment = {
    id: `enr-${crypto.randomUUID().slice(0, 8)}`,
    ekskul_id: data.ekskul_id,
    student_id: data.student_id,
    semester: data.semester,
    academic_year: data.academic_year,
    enrolled_at: new Date().toISOString(),
    status: "aktif",
  };
  store.enrollments.push(enrollment);

  // Jika ekskul berbayar, otomatis buat tagihan awal jika belum ada
  const ekskul = store.ekskuls.find((e) => e.id === data.ekskul_id);
  if (ekskul && ekskul.category === "pilihan" && ekskul.fee > 0) {
    const periodLabel =
      ekskul.fee_period === "per_semester"
        ? `Semester ${data.semester}`
        : "Tagihan Awal Masuk";
    const payment: EkskulPayment = {
      id: `pay-${crypto.randomUUID().slice(0, 8)}`,
      enrollment_id: enrollment.id,
      student_id: data.student_id,
      ekskul_id: data.ekskul_id,
      period_label: periodLabel,
      amount: ekskul.fee,
      status: "belum_bayar",
      updated_at: new Date().toISOString(),
    };
    store.payments.push(payment);
  }

  saveEkskulStore(store);
  return enrollment;
}

export function unenrollStudentFromEkskul(enrollmentId: string): boolean {
  const store = loadEkskulStore();
  const enr = store.enrollments.find((e) => e.id === enrollmentId);
  if (enr) {
    enr.status = "keluar";
    saveEkskulStore(store);
    return true;
  }
  return false;
}

// Payment helpers
export function recordPaymentUpdate(data: {
  paymentId: string;
  status: "lunas" | "belum_bayar";
  payment_method?: "tunai" | "transfer" | "potong_tabungan" | undefined;
  notes?: string | undefined;
  verified_by?: string | undefined;
}): EkskulPayment | null {
  const store = loadEkskulStore();
  const payment = store.payments.find((p) => p.id === data.paymentId);
  if (!payment) return null;

  payment.status = data.status;
  if (data.status === "lunas") {
    payment.payment_date = new Date().toISOString().split("T")[0];
    payment.receipt_no = `REC-EKSKUL-${Date.now().toString().slice(-6)}`;
  } else {
    delete payment.payment_date;
    delete payment.receipt_no;
  }
  if (data.payment_method) payment.payment_method = data.payment_method;
  if (data.notes !== undefined) payment.notes = data.notes;
  if (data.verified_by) payment.verified_by = data.verified_by;
  payment.updated_at = new Date().toISOString();

  saveEkskulStore(store);
  return payment;
}

export function createBillingForStudent(data: {
  enrollment_id: string;
  student_id: string;
  ekskul_id: string;
  period_label: string;
  amount: number;
}): EkskulPayment {
  const store = loadEkskulStore();
  const payment: EkskulPayment = {
    id: `pay-${crypto.randomUUID().slice(0, 8)}`,
    enrollment_id: data.enrollment_id,
    student_id: data.student_id,
    ekskul_id: data.ekskul_id,
    period_label: data.period_label,
    amount: data.amount,
    status: "belum_bayar",
    updated_at: new Date().toISOString(),
  };
  store.payments.push(payment);
  saveEkskulStore(store);
  return payment;
}

// Session & Attendance helpers
export function createSessionAndAttendance(data: {
  ekskul_id: string;
  date: string;
  topic: string;
  academic_year: string;
  semester: string;
  records: { student_id: string; status: "hadir" | "izin" | "sakit" | "alpa"; notes?: string | undefined }[];
  created_by?: string | undefined;
}): EkskulSession {
  const store = loadEkskulStore();
  const session: EkskulSession = {
    id: `sess-${crypto.randomUUID().slice(0, 8)}`,
    ekskul_id: data.ekskul_id,
    date: data.date,
    topic: data.topic,
    academic_year: data.academic_year,
    semester: data.semester,
    created_at: new Date().toISOString(),
  };

  store.sessions.push(session);

  for (const rec of data.records) {
    store.attendances.push({
      id: `att-${crypto.randomUUID().slice(0, 8)}`,
      session_id: session.id,
      student_id: rec.student_id,
      status: rec.status,
      notes: rec.notes || "",
    });
  }

  saveEkskulStore(store);
  return session;
}

// Grades helpers (Untuk Rapor Dinas Seksi C)
export function saveStudentEkskulGrade(data: {
  ekskul_id: string;
  student_id: string;
  semester: string;
  academic_year: string;
  grade: "A" | "B" | "C" | "D";
  predicate: "Sangat Baik" | "Baik" | "Cukup" | "Kurang";
  description: string;
}): EkskulGrade {
  const store = loadEkskulStore();
  const existingIdx = store.grades.findIndex(
    (g) =>
      g.ekskul_id === data.ekskul_id &&
      g.student_id === data.student_id &&
      g.semester === data.semester &&
      g.academic_year === data.academic_year
  );

  const now = new Date().toISOString();
  if (existingIdx !== -1) {
    store.grades[existingIdx] = {
      ...store.grades[existingIdx]!,
      ...data,
      updated_at: now,
    };
    saveEkskulStore(store);
    return store.grades[existingIdx]!;
  }

  const newGrade: EkskulGrade = {
    id: `grd-${crypto.randomUUID().slice(0, 8)}`,
    ...data,
    updated_at: now,
  };
  store.grades.push(newGrade);
  saveEkskulStore(store);
  return newGrade;
}

export function getStudentReportEkskulGrades(
  studentId: string,
  semester: string,
  academicYear: string
): { name: string; grade: string; description: string }[] {
  const store = loadEkskulStore();
  // 1. Cari grades tersimpan
  const studentGrades = store.grades.filter(
    (g) =>
      g.student_id === studentId &&
      g.semester === semester &&
      g.academic_year === academicYear
  );

  const result: { name: string; grade: string; description: string }[] = [];

  for (const g of studentGrades) {
    const ekskul = store.ekskuls.find((e) => e.id === g.ekskul_id);
    if (ekskul) {
      result.push({
        name: ekskul.name,
        grade: g.grade,
        description:
          g.description ||
          `Menunjukkan keaktifan dan penguasaan teknik yang ${g.predicate.toLowerCase()} dalam kegiatan ${ekskul.name}.`,
      });
    }
  }

  // 2. Jika belum ada nilai formal tapi santri aktif terdaftar di ekskul, tampilkan sebagai aktif
  if (result.length === 0) {
    const activeEnrollments = store.enrollments.filter(
      (enr) =>
        enr.student_id === studentId &&
        enr.semester === semester &&
        enr.academic_year === academicYear &&
        enr.status === "aktif"
    );

    for (const enr of activeEnrollments) {
      const ekskul = store.ekskuls.find((e) => e.id === enr.ekskul_id);
      if (ekskul) {
        result.push({
          name: ekskul.name,
          grade: "B",
          description: `Aktif mengikuti seluruh rangkaian kegiatan ${ekskul.name} semester ini dengan disiplin.`,
        });
      }
    }
  }

  return result;
}
