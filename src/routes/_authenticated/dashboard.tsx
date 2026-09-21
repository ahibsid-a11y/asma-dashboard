import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { navGroupsFor } from "@/lib/nav";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | SIM-AHIBS" },
      { name: "description", content: "Dashboard SIM-AHIBS (Sistem Informasi Manajemen AHIBS)." },
      { property: "og:title", content: "Dashboard | SIM-AHIBS" },
      { property: "og:description", content: "Dashboard SIM-AHIBS (Sistem Informasi Manajemen AHIBS)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useCurrentProfile();
  const fetchStats = useServerFn(getDashboardStats);
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetchStats(),
  });

  const roleLabel = profile?.account_type
    ? ACCOUNT_TYPE_LABELS[profile.account_type as AccountType]
    : null;
  const groups = navGroupsFor(profile?.account_type, (profile as any)?.positions)
    .map((group) => ({ ...group, items: group.items.filter((item) => item.key !== "dashboard") }))
    .filter((group) => group.items.length > 0);
  const featureCount = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <section className="relative overflow-hidden rounded-2xl bg-primary px-5 py-7 text-primary-foreground shadow-lg md:px-8 md:py-9">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-primary-foreground/70">
            <Sparkles className="size-4 text-accent" />
            Selamat datang di SIM-AHIBS
          </div>
          <h1 className="text-2xl font-extrabold md:text-3xl">Assalamu'alaikum, {profile?.name ?? "Pengguna"}</h1>
          <p className="mt-2 text-sm text-primary-foreground/75">
            {roleLabel ?? "Pengguna AHIBS"} · Pilih fitur yang ingin Anda gunakan hari ini.
          </p>
        </div>
        <div aria-hidden="true" className="absolute -bottom-10 -right-8 size-40 rounded-full border-[24px] border-primary-foreground/5" />
      </section>

      <section className="mt-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-accent-foreground">Akses cepat</p>
            <h2 className="mt-1 text-xl font-extrabold text-foreground">Semua fitur Anda</h2>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{featureCount} fitur</span>
        </div>
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <div key={group.category}>
              <div className="mb-4 flex items-center gap-3">
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-semibold text-muted-foreground">{group.items.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className="group flex min-w-0 flex-col items-center gap-2 text-center">
                    <span className="grid size-16 place-items-center rounded-2xl border border-border bg-card shadow-sm transition duration-200 group-hover:-translate-y-1 group-hover:shadow-md group-active:scale-95">
                      <span className={`grid size-10 place-items-center rounded-xl ${group.tone}`}>
                        <Icon className="size-5" />
                      </span>
                    </span>
                    <span className="w-full text-balance text-[11px] font-bold leading-tight text-foreground sm:text-xs">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-9 border-t border-border pt-7">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Ringkasan akun</p>
            <h2 className="mt-1 text-lg font-extrabold text-foreground">Informasi hari ini</h2>
          </div>
          <ArrowRight className="size-5 text-accent" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
            ))
          : (stats ?? []).map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold uppercase text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-2xl font-extrabold text-primary">{stat.value}</p>
                {stat.hint ? (
                  <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                ) : null}
              </div>
            ))}
        </div>
      </section>
    </AppShell>
  );
}
