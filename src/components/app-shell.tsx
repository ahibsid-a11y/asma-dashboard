import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Menu } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { navGroupsFor } from "@/lib/nav";
import { cn } from "@/lib/utils";


function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo-alhanif.png"
        alt="Logo AHIBS"
        className="size-10 shrink-0 rounded-lg object-contain bg-white p-0.5 shadow-sm"
      />
      <div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xl font-extrabold tracking-tight", inverted ? "text-primary-foreground" : "text-foreground")}>
            SIM-AHIBS
          </span>
        </div>
        <span className={cn("text-[10px] font-medium", inverted ? "text-primary-foreground/75" : "text-muted-foreground")}>
          SMPIT Putra Al-Hanif
        </span>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  accountType,
}: {
  children: ReactNode;
  accountType?: string | null;
}) {
  const navigate = useNavigate();

  const currentProfile = useCurrentProfile();
  const effectiveAccountType = accountType ?? currentProfile.data?.account_type ?? null;
  const effectivePositions = (currentProfile.data as any)?.positions ?? null;
  const groups = navGroupsFor(effectiveAccountType, effectivePositions);


  async function handleSignOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-primary p-5 md:flex">
        <Brand inverted />
        <nav aria-label="Navigasi utama" className="mt-8 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.category}>
              <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground/50">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    activeProps={{ className: "bg-primary-foreground/12" }}
                    className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-bold text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Icon className="size-5 shrink-0 text-accent" />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <Button
          type="button"
          variant="ghost"
          className="mt-auto justify-start text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          onClick={handleSignOut}
        >
          <LogOut /> Keluar
        </Button>
      </aside>

      <div className="min-w-0 flex-1 md:ml-64">
        <header className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 md:flex md:px-8">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Buka semua menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[86%] max-w-80 flex-col border-none bg-primary p-5 text-primary-foreground">
                <SheetHeader className="text-left">
                  <SheetTitle className="sr-only">Semua fitur SIM-AHIBS</SheetTitle>
                  <SheetDescription className="sr-only">Pilih fitur sesuai akses akun Anda.</SheetDescription>
                  <Brand inverted />
                </SheetHeader>
                <p className="mt-8 px-3 text-xs font-bold uppercase text-primary-foreground/55">Semua fitur</p>
                <nav aria-label="Semua fitur" className="mt-3 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
                  {groups.map((group) => (
                    <div key={group.category}>
                      <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground/50">
                        {group.label}
                      </p>
                      <div className="flex flex-col gap-1">
                        {group.items.map(({ to, label, icon: Icon }) => (
                          <SheetClose asChild key={to}>
                            <Link
                              to={to}
                              activeProps={{ className: "bg-primary-foreground/12" }}
                              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold text-primary-foreground hover:bg-primary-foreground/10"
                            >
                              <Icon className="size-5 shrink-0 text-accent" />
                              <span>{label}</span>
                            </Link>
                          </SheetClose>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-4 justify-start text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut /> Keluar
                </Button>
              </SheetContent>
            </Sheet>
          </div>
          <div className="min-w-0 md:hidden">
            <Brand />
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-primary">SIM-AHIBS</p>
            <p className="text-sm font-bold text-foreground">SMPIT Putra Al-Hanif Cilegon</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {accountType && accountType !== "santri" && (
              <Link
                to="/perizinan"
                className="relative flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Antrean & Notifikasi Perizinan"
              >
                <Bell className="size-5" />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-amber-500 ring-2 ring-card animate-pulse" />
              </Link>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Keluar"
              className="md:hidden"
              onClick={handleSignOut}
            >
              <LogOut />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden md:flex gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" /> Keluar
            </Button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
