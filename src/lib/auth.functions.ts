import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Ubah nama lengkap, nama panggilan, nomor induk (NIS/NIP), atau email
 * menjadi email login akun Supabase.
 */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ identifier: z.string().trim().min(1).max(160) }).parse(data),
  )
  .handler(async ({ data }) => {
    const raw = data.identifier.trim();
    if (raw.includes("@")) return { email: raw };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Bersihkan karakter petik yang mengganggu query
      const safe = raw.replace(/["\\]/g, "");

      // 1. Query langsung dengan pencarian per kolom agar 100% aman terhadap spasi pada nama
      const [byNis, byName, byDisplay] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id,email,name,display_name,nis_nip,status")
          .ilike("nis_nip", safe)
          .limit(5),
        supabaseAdmin
          .from("profiles")
          .select("id,email,name,display_name,nis_nip,status")
          .ilike("name", safe)
          .limit(5),
        supabaseAdmin
          .from("profiles")
          .select("id,email,name,display_name,nis_nip,status")
          .ilike("display_name", safe)
          .limit(5),
      ]);

      const pool = new Map<string, any>();
      for (const row of [
        ...(byNis.data ?? []),
        ...(byName.data ?? []),
        ...(byDisplay.data ?? []),
      ]) {
        pool.set(row.id, row);
      }

      let activeRows = Array.from(pool.values()).filter((r) => r.status !== "Nonaktif");

      // 2. Jika belum ditemukan dan input >= 3 karakter, coba pencarian sebagian (partial match)
      if (activeRows.length === 0 && safe.length >= 3) {
        const [pName, pDisplay] = await Promise.all([
          supabaseAdmin
            .from("profiles")
            .select("id,email,name,display_name,nis_nip,status")
            .ilike("name", `%${safe}%`)
            .limit(5),
          supabaseAdmin
            .from("profiles")
            .select("id,email,name,display_name,nis_nip,status")
            .ilike("display_name", `%${safe}%`)
            .limit(5),
        ]);
        for (const row of [...(pName.data ?? []), ...(pDisplay.data ?? [])]) {
          pool.set(row.id, row);
        }
        activeRows = Array.from(pool.values()).filter((r) => r.status !== "Nonaktif");
      }

      if (activeRows.length === 0) return { email: null as string | null };

      if (activeRows.length > 1) {
        // Jika ada beberapa hasil, prioritaskan yang sama persis (exact match)
        const exact = activeRows.find(
          (r) =>
            r.nis_nip?.toLowerCase() === safe.toLowerCase() ||
            r.name?.toLowerCase() === safe.toLowerCase() ||
            r.display_name?.toLowerCase() === safe.toLowerCase(),
        );
        if (exact) {
          activeRows = [exact];
        } else {
          throw new Error(
            "Ditemukan beberapa akun dengan nama/nomor yang mirip. Silakan masuk menggunakan nama lengkap yang lebih spesifik atau email terdaftar.",
          );
        }
      }

      const match = activeRows[0]!;
      const email =
        match.email ||
        (match.nis_nip
          ? `${match.nis_nip.toLowerCase().replace(/[^a-z0-9]/g, "")}@ahibs.local`
          : null);

      return { email };
    } catch (err: any) {
      if (err.message && err.message.includes("Ditemukan beberapa akun")) throw err;
      console.error("resolveLoginEmail error:", err);
      return { email: null as string | null };
    }
  });
