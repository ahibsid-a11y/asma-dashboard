import type { EkskulEnrollment } from './ekskul.types';

export const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export function semesterMonths(year: string, semester: string) {
  const [first, second] = year.split('/');
  const start = semester === '1' ? 7 : 1;
  return Array.from({ length: 6 }, (_, i) => `${semester === '1' ? first : second}-${String(start + i).padStart(2, '0')}`);
}
export function monthLabel(key: string) {
  return `${MONTH_NAMES[Number(key.slice(5, 7)) - 1] ?? key} ${key.slice(0, 4)}`;
}
// Null represents existing semester-wide participation, not an empty selection.
export function attendsMonth(enrollment: Pick<EkskulEnrollment, 'participation_months'>, month: string) {
  return enrollment.participation_months == null || enrollment.participation_months.includes(month);
}
export function enrollmentMonthsLabel(enrollment: Pick<EkskulEnrollment, 'participation_months'>) {
  return enrollment.participation_months == null ? 'Seluruh semester (pendaftaran lama)' : enrollment.participation_months.map(monthLabel).join(', ');
}