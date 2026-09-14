import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/rekap-tahfiz")({
  head: () => ({
    meta: [
      { title: "Rekap Tahfiz | ASMA" },
      { name: "description", content: "Rekap capaian hafalan Al-Qur'an santri AHIBS." },
      { property: "og:title", content: "Rekap Tahfiz | ASMA" },
      { property: "og:description", content: "Rekap capaian hafalan Al-Qur'an santri AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Rekap Kegiatan"
      title="Rekap Tahfiz"
      description="Rekap capaian hafalan per halaqoh, juz, dan periode akan dibangun setelah fitur Input Nilai Tahfiz siap."
    />
  ),
});
