/** Resolve class assignments without changing catalog IDs or saved grades. */
export function selectAssignedSubjects<T extends { id: string; is_active: boolean }>(
  subjects: T[],
  assignments: { subject_id: string }[],
  fallbackToCatalog = true,
): T[] {
  const active = subjects.filter((subject) => subject.is_active);
  if (assignments.length === 0) return fallbackToCatalog ? active : [];
  const assignedIds = new Set(assignments.map((assignment) => assignment.subject_id));
  return active.filter((subject) => assignedIds.has(subject.id));
}

type ReportItem = {
  subject: { id: string; code: string; name: string; group: string; kkm: number; order_index: number; is_active: boolean };
  finalScore: number;
  letterGrade: string;
  highestDesc: string | null;
  lowestDesc: string | null;
  teacherNotes: string | null;
  components?: { name: string; score: number }[];
};

/** Keep explicit subject grades; combine assigned components only when needed. */
export function selectDinasReportSubjects(
  items: ReportItem[],
  letterGrade: (score: number) => string,
): ReportItem[] {
  const result = items.filter((item) => item.subject.group === "Umum" || item.subject.group === "Muatan Lokal");
  const appendCombined = (group: string, code: string, name: string, id: string, order: number) => {
    if (result.some((item) => item.subject.code === code)) return;
    const sources = items.filter((item) => item.subject.group === group);
    if (sources.length === 0) return;
    const components = sources.map((item) => ({ name: item.subject.name, score: Number(item.finalScore) || 0 }));
    const scored = components.filter((item) => item.score > 0);
    const finalScore = scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length * 10) / 10 : 0;
    const best = scored.reduce<typeof scored[number] | undefined>((current, item) => !current || item.score > current.score ? item : current, undefined);
    const worst = scored.reduce<typeof scored[number] | undefined>((current, item) => !current || item.score < current.score ? item : current, undefined);
    result.push({
      subject: { id, code, name, group: code === "PAI" ? "Umum" : "Muatan Lokal", kkm: 75, order_index: order, is_active: true },
      finalScore,
      letterGrade: finalScore > 0 ? letterGrade(finalScore) : "-",
      highestDesc: best && best.score >= 75 ? `Menunjukkan penguasaan yang sangat baik dalam ${best.name}.` : null,
      lowestDesc: worst && worst.score < 75 ? `Perlu bimbingan dan peningkatan pemahaman dalam ${worst.name}.` : null,
      teacherNotes: null,
      components,
    });
  };
  appendCombined("Diniyyah", "PAI", "Pendidikan Agama Islam & Budi Pekerti", "pai_combined", 1);
  appendCombined("Bahasa Arab", "MULOK", "Muatan Lokal (Bahasa Arab)", "mulok_combined", 90);
  return result.sort((a, b) => a.subject.order_index - b.subject.order_index);
}