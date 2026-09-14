import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { OrgManager } from "@/components/org-manager";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { isMemberAdmin } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/manajemen-asrama")({
  head: () => ({
    meta: [
      { title: "Manajemen Asrama | SIM-AHIBS" },
      {
        name: "description",
        content:
          "Atur jumlah asrama, nama asrama, musyrif asrama, dan anggota setiap asrama di SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Manajemen Asrama | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Atur nama asrama, musyrif asrama, dan anggota setiap asrama.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DormPage,
});

function DormPage() {
  const profileQuery = useCurrentProfile();
  const accountType = profileQuery.data?.account_type ?? null;

  return (
    <AppShell accountType={accountType}>
      {isMemberAdmin(accountType) ? (
        <OrgManager
          kind="dorm"
          title="Manajemen Asrama"
          description="Tentukan daftar asrama, musyrif penanggung jawab, dan anggota tiap asrama."
          leaderLabel="Musyrif Asrama"
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
