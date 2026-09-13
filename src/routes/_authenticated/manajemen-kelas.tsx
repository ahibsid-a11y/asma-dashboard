import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { OrgManager } from "@/components/org-manager";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { isMemberAdmin } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/manajemen-kelas")({
  head: () => ({
    meta: [
      { title: "Manajemen Kelas | ASMA" },
      {
        name: "description",
        content:
          "Atur jumlah kelas 7-12, rombel per angkatan, wali kelas, dan daftar siswa per kelas di SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Manajemen Kelas | ASMA" },
      {
        property: "og:description",
        content: "Atur rombel per angkatan, wali kelas, dan daftar siswa per kelas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassPage,
});

function ClassPage() {
  const profileQuery = useCurrentProfile();
  const accountType = profileQuery.data?.account_type ?? null;

  return (
    <AppShell accountType={accountType}>
      {isMemberAdmin(accountType) ? (
        <OrgManager
          kind="class"
          title="Manajemen Kelas"
          description="Tentukan rombel setiap angkatan kelas 7 sampai 12, wali kelas, dan daftar siswanya."
          leaderLabel="Wali Kelas"
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
