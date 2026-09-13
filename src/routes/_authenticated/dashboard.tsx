import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { useCurrentProfile } from "@/hooks/use-current-profile";

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
  const { data } = useCurrentProfile();

  return (
    <AppShell accountType={data?.account_type ?? null}>
      <div className="border-b border-border pb-5">
        <p className="mb-1 text-xs font-bold uppercase text-accent">Ringkasan</p>
        <h1 className="text-2xl font-extrabold text-foreground">Dashboard</h1>
      </div>
    </AppShell>
  );
}
