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