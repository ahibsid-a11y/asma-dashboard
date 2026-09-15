const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value?: string | null): boolean {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/**
 * Pastikan ada baris curriculum_plans untuk kombinasi mapel/kelas/tahun,
 * lalu kembalikan UUID-nya. Dipakai bersama oleh Perangkat Ajar & Input Nilai
 * agar TP tersimpan pada perangkat ajar yang sama.
 */
export async function resolvePlanUuid(
  supabaseAdmin: any,
  params: {
    subject_id: string;
    class_name: string;
    academic_year: string;
    teacher_id?: string | null;
    plan_id?: string | null;
  },
): Promise<string | null> {
  if (isUuid(params.plan_id)) return params.plan_id!.trim();

  const { data: existing } = await supabaseAdmin
    .from("curriculum_plans")
    .select("id")
    .eq("subject_id", params.subject_id)
    .eq("class_name", params.class_name)
    .eq("academic_year", params.academic_year)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabaseAdmin
    .from("curriculum_plans")
    .insert({
      subject_id: params.subject_id,
      class_name: params.class_name,
      academic_year: params.academic_year,
      teacher_id: params.teacher_id ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error || !created?.id) return null;
  return created.id as string;
}

/** Varian nama kelas agar data lama ("7A") tetap cocok dengan master ("Kelas 7A"). */
export function classNameVariants(className: string): string[] {
  const raw = (className || "").trim();
  if (!raw) return [];
  const bare = raw.replace(/^kelas\s*/i, "").trim();
  const set = new Set([raw, bare, `Kelas ${bare}`]);
  return Array.from(set).filter((v) => v.length > 0);
}
