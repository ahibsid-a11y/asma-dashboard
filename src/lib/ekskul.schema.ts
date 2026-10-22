import { z } from "zod";

export const manageEkskulSchema = z.object({
  action: z.enum(["save", "delete"]),
  item: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    category: z.enum(["wajib", "pilihan"]),
    fee: z.number().optional(),
    fee_period: z.enum(["per_bulan", "per_semester", "sekali"]).optional(),
    available_months: z.array(z.number().int().min(1).max(12)).min(1).nullish(),
    coach_name: z.string().optional(),
    coach_id: z.string().nullish(),
    schedule_day: z.string().optional(),
    schedule_time: z.string().optional(),
    location: z.string().optional(),
    quota: z.number().nullish(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  }).optional(),
  deleteId: z.string().optional(),
});

// Omitted fields are not edits. Keep explicit null, zero, false and empty strings.
export function ekskulUpdateFields(item: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(item).filter(([key, value]) =>
    key !== "id" && key !== "created_at" && key !== "updated_at" && value !== undefined,
  ));
}