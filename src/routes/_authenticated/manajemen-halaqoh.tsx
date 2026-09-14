import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { OrgManager } from "@/components/org-manager";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { isMemberAdmin } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/manajemen-halaqoh")({
  head: () => ({
    meta: [
      { title: "Manajemen Halaqoh | SIM-AHIBS" },
      {
        name: "description",
        content:
          "Atur jumlah halaqoh, nama halaqoh, musyrif halaqoh, dan anggota setiap halaqoh di SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Manajemen Halaqoh | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Atur nama halaqoh, musyrif halaqoh, dan anggota setiap halaqoh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HalaqohPage,
});

function HalaqohPage() {
  const profileQuery = useCurrentProfile();
  const accountType = profileQuery.data?.account_type ?? null;

  return (
    <AppShell accountType={accountType}>
      {isMemberAdmin(accountType) ? (
        <OrgManager
          kind="halaqoh"
          title="Manajemen Halaqoh"
          description="Tentukan daftar halaqoh, musyrif pembimbing, dan anggota tiap halaqoh."
          leaderLabel="Musyrif Halaqoh"
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Halaman ini hanya dapat diakses oleh Super Admin, Mudir, Kepala Sekolah, dan Kepala Tata
          Usaha.
        </p>
      )}
    </AppShell>
  );
}
