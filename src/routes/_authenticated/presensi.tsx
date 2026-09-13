import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/presensi")({
  head: () => ({
    meta: [
      { title: "Presensi | ASMA" },
      { name: "description", content: "Presensi santri dan pegawai SMPIT Putra Al-Hanif." },
      { property: "og:title", content: "Presensi | ASMA" },
      { property: "og:description", content: "Presensi santri dan pegawai SMPIT Putra Al-Hanif." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Kehadiran"
      title="Presensi"
      description="Rekap presensi santri dan pegawai akan tersedia pada tahap berikutnya."
    />
  ),
});
