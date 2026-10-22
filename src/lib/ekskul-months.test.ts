import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { attendsMonth, semesterMonths } from './ekskul-months';

describe('monthly extracurricular participation', () => {
  it('only permits attendance in selected participation months', () => {
    const enrollment = { participation_months: ['2026-10', '2026-12'] };
    assert.equal(attendsMonth(enrollment, '2026-10'), true);
    assert.equal(attendsMonth(enrollment, '2026-11'), false);
    assert.equal(attendsMonth(enrollment, '2026-12'), true);
  });
  it('preserves legacy semester-wide attendance', () => {
    assert.equal(attendsMonth({ participation_months: null }, '2026-11'), true);
  });
  it('uses the correct calendar year for each academic semester', () => {
    assert.deepEqual(semesterMonths('2026/2027', '1'), ['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12']);
    assert.deepEqual(semesterMonths('2026/2027', '2'), ['2027-01','2027-02','2027-03','2027-04','2027-05','2027-06']);
  });
});