import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Ubah "nama" menjadi email akun agar pengguna bisa masuk dengan nama terdaftar
 * maupun email. Tidak mengembalikan data lain apa pun.
 */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ identifier: z.string().trim().min(2).max(160) }).parse(data),
  )
  .handler(async ({ data }) => {
    const identifier = data.identifier.trim();
    if (identifier.includes("@")) return { email: identifier };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("email,name,status")
      .ilike("name", identifier)
      .limit(5);
    if (error) throw new Error("Gagal memeriksa nama akun");

    const matches = (rows ?? []).filter((r) => r.email);
    if (matches.length === 0) return { email: null as string | null };
    if (matches.length > 1) {
      throw new Error("Nama ini dipakai lebih dari satu akun. Silakan masuk memakai email.");
    }
    return { email: matches[0]!.email as string };
  });
