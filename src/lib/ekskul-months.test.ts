import { describe, expect, it } from 'vitest';
import { attendsMonth, semesterMonths } from './ekskul-months';

describe('monthly extracurricular participation', () => {
  it('only permits attendance in selected participation months', () => {
    const enrollment = { participation_months: ['2026-10', '2026-12'] };
    expect(attendsMonth(enrollment, '2026-10')).toBe(true);
    expect(attendsMonth(enrollment, '2026-11')).toBe(false);
    expect(attendsMonth(enrollment, '2026-12')).toBe(true);
  });
  it('preserves legacy semester-wide attendance', () => {
    expect(attendsMonth({ participation_months: null }, '2026-11')).toBe(true);
  });
  it('uses the correct calendar year for each academic semester', () => {
    expect(semesterMonths('2026/2027', '1')).toEqual(['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12']);
    expect(semesterMonths('2026/2027', '2')).toEqual(['2027-01','2027-02','2027-03','2027-04','2027-05','2027-06']);
  });
});