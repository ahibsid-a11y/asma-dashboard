import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | ASMA" },
      { name: "description", content: "Dashboard Aplikasi Sistem Manajemen AHIBS." },
      { property: "og:title", content: "Dashboard | ASMA" },
      { property: "og:description", content: "Dashboard Aplikasi Sistem Manajemen AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-lg bg-primary-foreground text-lg font-extrabold text-primary">A</div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-primary-foreground">ASMA</span>
          <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-extrabold text-accent-foreground">AHIBS</span>
        </div>
        <span className="text-[10px] font-medium text-primary-foreground/65">SMPIT Putra Al-Hanif</span>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-primary p-5 md:flex">
        <Brand />
        <nav aria-label="Navigasi utama" className="mt-10">
          <a href="/dashboard" aria-current="page" className="flex h-11 items-center gap-3 rounded-lg bg-primary-foreground/12 px-3 text-sm font-bold text-primary-foreground">
            <LayoutDashboard className="size-5 text-accent" />
            Dashboard
          </a>
        </nav>
        <Button type="button" variant="ghost" className="mt-auto justify-start text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={handleSignOut}>
          <LogOut /> Keluar
        </Button>
      </aside>

      <div className="min-w-0 flex-1 md:ml-64">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5 md:px-8">
          <div className="md:hidden"><Brand /></div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-muted-foreground">Aplikasi Sistem Manajemen AHIBS</p>
            <p className="text-sm font-bold text-foreground">SMPIT Putra Al-Hanif</p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Keluar" className="md:hidden" onClick={handleSignOut}><LogOut /></Button>
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-5 pb-24 md:p-8">
          <div className="border-b border-border pb-5">
            <p className="mb-1 text-xs font-bold uppercase text-accent">Ringkasan</p>
            <h1 className="text-2xl font-extrabold text-foreground">Dashboard</h1>
          </div>
        </main>
      </div>

      <nav aria-label="Navigasi bawah" className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border bg-card px-4 md:hidden">
        <a href="/dashboard" aria-current="page" className="flex min-w-20 flex-col items-center gap-1 text-primary">
          <LayoutDashboard className="size-5" />
          <span className="text-[11px] font-bold">Dashboard</span>
        </a>
      </nav>
    </div>
  );
}