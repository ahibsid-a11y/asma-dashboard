import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { resolveLoginEmail } from "@/lib/auth.functions";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Masuk | SIM-AHIBS" },
      { name: "description", content: "Masuk ke SIM-AHIBS (Sistem Informasi Manajemen AHIBS)." },
      { property: "og:title", content: "Masuk | SIM-AHIBS" },
      { property: "og:description", content: "Masuk ke SIM-AHIBS (Sistem Informasi Manajemen AHIBS)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  const navigate = useNavigate();
  const lookupEmail = useServerFn(resolveLoginEmail);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { email: resolved } = await lookupEmail({ data: { identifier: email } });
      if (!resolved) {
        setError("Nama atau email tidak ditemukan.");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolved,
        password,
      });
      if (signInError) {
        setError("Nama/email atau kata sandi tidak sesuai.");
        return;
      }
      await navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError((err as Error).message || "Gagal masuk. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-accent" />
      <section className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <img
            src="/logo-alhanif.png"
            alt="Logo Al-Hanif"
            className="size-16 shrink-0 rounded-xl object-contain bg-white p-1 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-primary">SIM-AHIBS</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">SMPIT Putra Al-Hanif Cilegon</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-xl shadow-primary/8 sm:p-8">
          <header className="mb-7 text-center">
            <h1 className="text-2xl font-bold text-card-foreground">Selamat datang</h1>
            <p className="mt-2 text-sm text-muted-foreground">Masuk untuk melanjutkan ke sistem manajemen sekolah.</p>
          </header>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">Nama Lengkap, Panggilan, atau Email</label>
              <div className="relative">
                <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="text" autoComplete="username" placeholder="Nama lengkap, panggilan, atau email" className="h-11 pl-10" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">Kata sandi</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan kata sandi" className="h-11 px-10" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            {error ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p> : null}
            <Button type="submit" className="h-11 w-full font-bold" disabled={loading}>
              {loading ? "Memproses…" : "Masuk"}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">SIM-AHIBS • Sistem Informasi Manajemen SMPIT Putra Al-Hanif</p>
      </section>
    </main>
  );
}
