import { Construction } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { useCurrentProfile } from "@/hooks/use-current-profile";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  const { data } = useCurrentProfile();

  return (
    <AppShell accountType={data?.account_type ?? null}>
      <div className="border-b border-border pb-5">
        <p className="mb-1 text-xs font-bold uppercase text-accent">{eyebrow}</p>
        <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
      </div>
      <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <Construction className="mb-4 size-10 text-accent" />
        <p className="text-lg font-extrabold text-foreground">Segera Hadir</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </AppShell>
  );
}
