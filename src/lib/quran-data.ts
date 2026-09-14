export type SurahInfo = {
  number: number;
  name: string;
  arabic: string;
  totalVerses: number;
  juz: number;
};

export const SURAH_LIST: SurahInfo[] = [
  { number: 1, name: "Al-Fatihah", arabic: "الفاتحة", totalVerses: 7, juz: 1 },
  { number: 2, name: "Al-Baqarah", arabic: "البقرة", totalVerses: 286, juz: 1 },
  { number: 3, name: "Ali 'Imran", arabic: "آل عمران", totalVerses: 200, juz: 3 },
  { number: 4, name: "An-Nisa'", arabic: "النساء", totalVerses: 176, juz: 4 },
  { number: 5, name: "Al-Ma'idah", arabic: "المائدة", totalVerses: 120, juz: 6 },
  { number: 6, name: "Al-An'am", arabic: "الأنعام", totalVerses: 165, juz: 7 },
  { number: 7, name: "Al-A'raf", arabic: "الأعراف", totalVerses: 206, juz: 8 },
  { number: 8, name: "Al-Anfal", arabic: "الأنفال", totalVerses: 75, juz: 9 },
  { number: 9, name: "At-Taubah", arabic: "التوبة", totalVerses: 129, juz: 10 },
  { number: 10, name: "Yunus", arabic: "يونس", totalVerses: 109, juz: 11 },
  { number: 11, name: "Hud", arabic: "هود", totalVerses: 123, juz: 11 },
  { number: 12, name: "Yusuf", arabic: "يوسف", totalVerses: 111, juz: 12 },
  { number: 13, name: "Ar-Ra'd", arabic: "الرعد", totalVerses: 43, juz: 13 },
  { number: 14, name: "Ibrahim", arabic: "إبراهيم", totalVerses: 52, juz: 13 },
  { number: 15, name: "Al-Hijr", arabic: "الحجر", totalVerses: 99, juz: 14 },
  { number: 16, name: "An-Nahl", arabic: "النحل", totalVerses: 128, juz: 14 },
  { number: 17, name: "Al-Isra'", arabic: "الإسراء", totalVerses: 111, juz: 15 },
  { number: 18, name: "Al-Kahf", arabic: "الكهف", totalVerses: 110, juz: 15 },
  { number: 19, name: "Maryam", arabic: "مريم", totalVerses: 98, juz: 16 },
  { number: 20, name: "Thaha", arabic: "طه", totalVerses: 135, juz: 16 },
  { number: 21, name: "Al-Anbiya'", arabic: "الأنبياء", totalVerses: 112, juz: 17 },
  { number: 22, name: "Al-Hajj", arabic: "الحج", totalVerses: 78, juz: 17 },
  { number: 23, name: "Al-Mu'minun", arabic: "المؤمنون", totalVerses: 118, juz: 18 },
  { number: 24, name: "An-Nur", arabic: "النور", totalVerses: 64, juz: 18 },
  { number: 25, name: "Al-Furqan", arabic: "الفرقان", totalVerses: 77, juz: 18 },
  { number: 26, name: "Asy-Syu'ara'", arabic: "الشعراء", totalVerses: 227, juz: 19 },
  { number: 27, name: "An-Naml", arabic: "النمل", totalVerses: 93, juz: 19 },
  { number: 28, name: "Al-Qashas", arabic: "القصص", totalVerses: 88, juz: 20 },
  { number: 29, name: "Al-'Ankabut", arabic: "العنكبوت", totalVerses: 69, juz: 20 },
  { number: 30, name: "Ar-Rum", arabic: "الروم", totalVerses: 60, juz: 21 },
  { number: 31, name: "Luqman", arabic: "لقمان", totalVerses: 34, juz: 21 },
  { number: 32, name: "As-Sajdah", arabic: "السجدة", totalVerses: 30, juz: 21 },
  { number: 33, name: "Al-Ahzab", arabic: "الأحزاب", totalVerses: 73, juz: 21 },
  { number: 34, name: "Saba'", arabic: "سبأ", totalVerses: 54, juz: 22 },
  { number: 35, name: "Fathir", arabic: "فاطر", totalVerses: 45, juz: 22 },
  { number: 36, name: "Yasin", arabic: "يس", totalVerses: 83, juz: 22 },
  { number: 37, name: "Ash-Shaffat", arabic: "الصافات", totalVerses: 182, juz: 23 },
  { number: 38, name: "Shad", arabic: "ص", totalVerses: 88, juz: 23 },
  { number: 39, name: "Az-Zumar", arabic: "الزmer", totalVerses: 75, juz: 23 },
  { number: 40, name: "Ghafir", arabic: "غافر", totalVerses: 85, juz: 24 },
  { number: 41, name: "Fushshilat", arabic: "فصلت", totalVerses: 54, juz: 24 },
  { number: 42, name: "Asy-Syura", arabic: "الشورى", totalVerses: 53, juz: 25 },
  { number: 43, name: "Az-Zukhruf", arabic: "الزخرف", totalVerses: 89, juz: 25 },
  { number: 44, name: "Ad-Dukhan", arabic: "الدخان", totalVerses: 59, juz: 25 },
  { number: 45, name: "Al-Jatsiyah", arabic: "الجاثية", totalVerses: 37, juz: 25 },
  { number: 46, name: "Al-Ahqaf", arabic: "الأحقاف", totalVerses: 35, juz: 26 },
  { number: 47, name: "Muhammad", arabic: "محمد", totalVerses: 38, juz: 26 },
  { number: 48, name: "Al-Fath", arabic: "الفتح", totalVerses: 29, juz: 26 },
  { number: 49, name: "Al-Hujurat", arabic: "الحجرات", totalVerses: 18, juz: 26 },
  { number: 50, name: "Qaf", arabic: "ق", totalVerses: 45, juz: 26 },
  { number: 51, name: "Adz-Dzariyat", arabic: "الذاريات", totalVerses: 60, juz: 26 },
  { number: 52, name: "Ath-Thur", arabic: "الطور", totalVerses: 49, juz: 27 },
  { number: 53, name: "An-Najm", arabic: "النجم", totalVerses: 62, juz: 27 },
  { number: 54, name: "Al-Qamar", arabic: "القمر", totalVerses: 55, juz: 27 },
  { number: 55, name: "Ar-Rahman", arabic: "الرحمن", totalVerses: 78, juz: 27 },
  { number: 56, name: "Al-Waqi'ah", arabic: "الواقعة", totalVerses: 96, juz: 27 },
  { number: 57, name: "Al-Hadid", arabic: "الحديد", totalVerses: 29, juz: 27 },
  { number: 58, name: "Al-Mujadilah", arabic: "المجادلة", totalVerses: 22, juz: 28 },
  { number: 59, name: "Al-Hasyr", arabic: "الحشر", totalVerses: 24, juz: 28 },
  { number: 60, name: "Al-Mumtahanah", arabic: "الممتحنة", totalVerses: 13, juz: 28 },
  { number: 61, name: "Ash-Shaff", arabic: "الصف", totalVerses: 14, juz: 28 },
  { number: 62, name: "Al-Jumu'ah", arabic: "الجمعة", totalVerses: 11, juz: 28 },
  { number: 63, name: "Al-Munafiqun", arabic: "المنافقون", totalVerses: 11, juz: 28 },
  { number: 64, name: "At-Taghabun", arabic: "التغابن", totalVerses: 18, juz: 28 },
  { number: 65, name: "Ath-Thalaq", arabic: "الطلاق", totalVerses: 12, juz: 28 },
  { number: 66, name: "At-Tahrim", arabic: "التحريم", totalVerses: 12, juz: 28 },
  { number: 67, name: "Al-Mulk", arabic: "الملك", totalVerses: 30, juz: 29 },
  { number: 68, name: "Al-Qalam", arabic: "القلم", totalVerses: 52, juz: 29 },
  { number: 69, name: "Al-Haqqah", arabic: "الحاقة", totalVerses: 52, juz: 29 },
  { number: 70, name: "Al-Ma'arij", arabic: "المعارج", totalVerses: 44, juz: 29 },
  { number: 71, name: "Nuh", arabic: "نوح", totalVerses: 28, juz: 29 },
  { number: 72, name: "Al-Jinn", arabic: "الجن", totalVerses: 28, juz: 29 },
  { number: 73, name: "Al-Muzzammil", arabic: "المزمل", totalVerses: 20, juz: 29 },
  { number: 74, name: "Al-Muddatstsir", arabic: "المدثر", totalVerses: 56, juz: 29 },
  { number: 75, name: "Al-Qiyamah", arabic: "القيامة", totalVerses: 40, juz: 29 },
  { number: 76, name: "Al-Insan", arabic: "الإنسان", totalVerses: 31, juz: 29 },
  { number: 77, name: "Al-Mursalat", arabic: "المرسلات", totalVerses: 50, juz: 29 },
  { number: 78, name: "An-Naba'", arabic: "النبأ", totalVerses: 40, juz: 30 },
  { number: 79, name: "An-Nazi'at", arabic: "النازعات", totalVerses: 46, juz: 30 },
  { number: 80, name: "'Abasa", arabic: "عبس", totalVerses: 42, juz: 30 },
  { number: 81, name: "At-Takwir", arabic: "التكوير", totalVerses: 29, juz: 30 },
  { number: 82, name: "Al-Infithar", arabic: "الانفطار", totalVerses: 19, juz: 30 },
  { number: 83, name: "Al-Muthaffifin", arabic: "المطففين", totalVerses: 36, juz: 30 },
  { number: 84, name: "Al-Insyiqaq", arabic: "الانشقاق", totalVerses: 25, juz: 30 },
  { number: 85, name: "Al-Buruj", arabic: "البروج", totalVerses: 22, juz: 30 },
  { number: 86, name: "Ath-Thariq", arabic: "الطارق", totalVerses: 17, juz: 30 },
  { number: 87, name: "Al-A'la", arabic: "الأعلى", totalVerses: 19, juz: 30 },
  { number: 88, name: "Al-Ghasyiyah", arabic: "الغاشية", totalVerses: 26, juz: 30 },
  { number: 89, name: "Al-Fajr", arabic: "الفجر", totalVerses: 30, juz: 30 },
  { number: 90, name: "Al-Balad", arabic: "البلد", totalVerses: 20, juz: 30 },
  { number: 91, name: "Asy-Syams", arabic: "الشمس", totalVerses: 15, juz: 30 },
  { number: 92, name: "Al-Lail", arabic: "الليل", totalVerses: 21, juz: 30 },
  { number: 93, name: "Adh-Dhuha", arabic: "الضحى", totalVerses: 11, juz: 30 },
  { number: 94, name: "Asy-Syarh", arabic: "الشرح", totalVerses: 8, juz: 30 },
  { number: 95, name: "At-Tin", arabic: "التين", totalVerses: 8, juz: 30 },
  { number: 96, name: "Al-'Alaq", arabic: "العلق", totalVerses: 19, juz: 30 },
  { number: 97, name: "Al-Qadr", arabic: "القدر", totalVerses: 5, juz: 30 },
  { number: 98, name: "Al-Bayyinah", arabic: "البينة", totalVerses: 8, juz: 30 },
  { number: 99, name: "Az-Zalzalah", arabic: "الزلزلة", totalVerses: 8, juz: 30 },
  { number: 100, name: "Al-'Adiyat", arabic: "العاديات", totalVerses: 11, juz: 30 },
  { number: 101, name: "Al-Qari'ah", arabic: "القارعة", totalVerses: 11, juz: 30 },
  { number: 102, name: "At-Takatsur", arabic: "التكاثر", totalVerses: 8, juz: 30 },
  { number: 103, name: "Al-'Ashr", arabic: "العصر", totalVerses: 3, juz: 30 },
  { number: 104, name: "Al-Humazah", arabic: "الهمزة", totalVerses: 9, juz: 30 },
  { number: 105, name: "Al-Fil", arabic: "الفيل", totalVerses: 5, juz: 30 },
  { number: 106, name: "Quraisy", arabic: "قريش", totalVerses: 4, juz: 30 },
  { number: 107, name: "Al-Ma'un", arabic: "الماعون", totalVerses: 7, juz: 30 },
  { number: 108, name: "Al-Kautsar", arabic: "الكوثر", totalVerses: 3, juz: 30 },
  { number: 109, name: "Al-Kafirun", arabic: "الكافرون", totalVerses: 6, juz: 30 },
  { number: 110, name: "An-Nashr", arabic: "النصر", totalVerses: 3, juz: 30 },
  { number: 111, name: "Al-Lahab", arabic: "اللهب", totalVerses: 5, juz: 30 },
  { number: 112, name: "Al-Ikhlash", arabic: "الإخلاص", totalVerses: 4, juz: 30 },
  { number: 113, name: "Al-Falaq", arabic: "الفلق", totalVerses: 5, juz: 30 },
  { number: 114, name: "An-Nas", arabic: "الناس", totalVerses: 6, juz: 30 },
];

export const IQRO_STAGES = [
  "Makhroj & Sifat Huruf",
  "Harokat (Fathah/Kasroh/Dhommah) & Sukun",
  "Menyambung Huruf (Awal, Tengah, Akhir)",
  "Tanwin & Mad Thobi'i (Panjang-Pendek)",
  "Al-Qamariyah & Asy-Syamsiyah",
  "Ghunnah, Tasydid & Idghom",
  "Waqaf & Ibtida' Dasar",
] as const;

export type IqroStage = (typeof IQRO_STAGES)[number];

export const TAHFIZ_TARGET_STANDARDS: Record<
  string,
  {
    semesterGasal: {
      title: string;
      level: "iqro" | "tilawah" | "tahfiz";
      detail: string;
    };
    semesterGenap: {
      title: string;
      level: "iqro" | "tilawah" | "tahfiz";
      detail: string;
    };
  }
> = {
  VII: {
    semesterGasal: {
      title: "IQRO 1-6 & TILAWAH",
      level: "iqro",
      detail: "Metode Itqon pengenalan makhroj, harokat, sambung huruf hingga lancar tilawah Al-Qur'an.",
    },
    semesterGenap: {
      title: "1/2 Juz 30 (An-Naas s/d Al-Fajr)",
      level: "tahfiz",
      detail: "Surat An-Naas sampai Surat Al-Fajr (Mutqin Sabq, Sabqy, & Manzil).",
    },
  },
  VIII: {
    semesterGasal: {
      title: "1/2 Juz 30 (Al-Ghasyiyyah s/d An-Naba')",
      level: "tahfiz",
      detail: "Surat Al-Ghasyiyyah sampai Surat An-Naba' (Menuntaskan Juz 30).",
    },
    semesterGenap: {
      title: "1/2 Juz 29 (Al-Mulk s/d Nuh)",
      level: "tahfiz",
      detail: "Surat Al-Mulk sampai Surat Nuh.",
    },
  },
  IX: {
    semesterGasal: {
      title: "1/2 Juz 29 (Al-Jin s/d Al-Mursalat)",
      level: "tahfiz",
      detail: "Surat Al-Jinn sampai Surat Al-Mursalat (Menuntaskan Juz 29).",
    },
    semesterGenap: {
      title: "1/2 Juz 28 (Al-Mujaadalah s/d Al-Mumtahanah)",
      level: "tahfiz",
      detail: "Surat Al-Mujaadalah sampai Surat Al-Mumtahanah.",
    },
  },
  X: {
    semesterGasal: {
      title: "1/2 Juz 28 (As-Shoff s/d At-Tahriim)",
      level: "tahfiz",
      detail: "Surat Ash-Shaff sampai Surat At-Tahrim (Menuntaskan Juz 28).",
    },
    semesterGenap: {
      title: "1/2 Juz 01 (Al-Baqarah Ayat 01-76)",
      level: "tahfiz",
      detail: "Surat Al-Baqarah ayat 1 sampai 76.",
    },
  },
  XI: {
    semesterGasal: {
      title: "1/2 Juz 01 (Al-Baqarah Ayat 77-141)",
      level: "tahfiz",
      detail: "Surat Al-Baqarah ayat 77 sampai 141 (Menuntaskan Juz 1).",
    },
    semesterGenap: {
      title: "1/2 Juz 02 (Al-Baqarah Ayat 177-202)",
      level: "tahfiz",
      detail: "Surat Al-Baqarah ayat 177 sampai 202.",
    },
  },
  XII: {
    semesterGasal: {
      title: "1/2 Juz 02 (Al-Baqarah Ayat 231-252)",
      level: "tahfiz",
      detail: "Surat Al-Baqarah ayat 231 sampai 252 (Menuntaskan Juz 2).",
    },
    semesterGenap: {
      title: "Itqon 5 Juz (Juz 28 s/d Juz 02)",
      level: "tahfiz",
      detail: "Ujian Itqon Tasmi' 5 Juz (Juz 28, 29, 30, 1, 2) sekali duduk.",
    },
  },
};

export function getGradeCodeFromClassName(className?: string | null): string {
  if (!className) return "VII";
  const upper = className.toUpperCase().trim();
  if (upper.startsWith("XII") || upper.startsWith("12")) return "XII";
  if (upper.startsWith("XI") || upper.startsWith("11")) return "XI";
  if (upper.startsWith("X") || upper.startsWith("10")) return "X";
  if (upper.startsWith("IX") || upper.startsWith("9")) return "IX";
  if (upper.startsWith("VIII") || upper.startsWith("8")) return "VIII";
  if (upper.startsWith("VII") || upper.startsWith("7")) return "VII";
  return "VII";
}
