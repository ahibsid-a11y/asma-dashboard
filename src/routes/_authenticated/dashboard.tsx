import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/app-shell";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/roles";

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

  return (
    <AppShell accountType={profile?.account_type ?? null}>
      <div className="border-b border-border pb-5">
        <p className="mb-1 text-xs font-bold uppercase text-accent">Ringkasan</p>
        <h1 className="text-2xl font-extrabold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile?.name ?? "Pengguna"}
          {roleLabel ? ` · ${roleLabel}` : ""}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
            ))
          : (stats ?? []).map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-bold uppercase text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-3xl font-extrabold text-primary">{stat.value}</p>
                {stat.hint ? (
                  <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                ) : null}
              </div>
            ))}
      </div>
    </AppShell>
  );
}
