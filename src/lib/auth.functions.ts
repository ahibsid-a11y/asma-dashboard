import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Ubah "nama" menjadi email akun agar pengguna bisa masuk dengan nama terdaftar
 * maupun email. Tidak mengembalikan data lain apa pun.
 */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ identifier: z.string().trim().min(2).max(160) }).parse(data),
  )
  .handler(async ({ data }) => {
    const identifier = data.identifier.trim();
    if (identifier.includes("@")) return { email: identifier };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Cari berdasarkan nama lengkap atau nomor induk (NIS/NIY)
      const { data: rows, error } = await supabaseAdmin
        .from("profiles")
        .select("email,name,nis_nip,status")
        .or(`name.ilike.${identifier},nis_nip.ilike.${identifier}`)
        .limit(5);

      if (error) {
        console.error("Gagal memeriksa akun:", error);
        return { email: null as string | null };
      }

      const activeRows = (rows ?? []).filter((r) => r.status !== "Nonaktif");
      if (activeRows.length === 0) return { email: null as string | null };
      if (activeRows.length > 1) {
        throw new Error("Nama/nomor ini dipakai lebih dari satu akun. Silakan masuk menggunakan email terdaftar.");
      }

      const match = activeRows[0]!;
      // Prioritaskan email profil, atau gunakan akun internal berdasarkan nomor induk bila email kosong
      const email =
        match.email ||
        (match.nis_nip
          ? `${match.nis_nip.toLowerCase().replace(/[^a-z0-9]/g, "")}@ahibs.local`
          : null);

      return { email };
    } catch (err: any) {
      if (err.message && err.message.includes("lebih dari satu akun")) throw err;
      console.error("resolveLoginEmail error:", err);
      // Jika lookup internal gagal, kembalikan null agar user dapat mencoba email langsung
      return { email: null as string | null };
    }
  });
