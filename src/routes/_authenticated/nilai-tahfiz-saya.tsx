import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/nilai-tahfiz-saya")({
  head: () => ({
    meta: [
      { title: "Nilai Tahfiz Saya | ASMA" },
      { name: "description", content: "Capaian hafalan Al-Qur'an pribadi santri AHIBS." },
      { property: "og:title", content: "Nilai Tahfiz Saya | ASMA" },
      { property: "og:description", content: "Capaian hafalan Al-Qur'an pribadi santri AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Tahfiz"
      title="Nilai Tahfiz Saya"
      description="Riwayat setoran dan capaian hafalan pribadi akan tampil di sini setelah fitur Input Nilai Tahfiz siap."
    />
  ),
});
