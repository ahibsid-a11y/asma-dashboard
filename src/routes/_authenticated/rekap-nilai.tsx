import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/rekap-nilai")({
  head: () => ({
    meta: [
      { title: "Rekap Nilai | ASMA" },
      { name: "description", content: "Rekap nilai pelajaran santri AHIBS per kelas dan periode." },
      { property: "og:title", content: "Rekap Nilai | ASMA" },
      { property: "og:description", content: "Rekap nilai pelajaran santri AHIBS per kelas dan periode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Rekap Kegiatan"
      title="Rekap Nilai"
      description="Rekap nilai pelajaran per kelas, mata pelajaran, dan periode akan dibangun setelah fitur Input Nilai siap."
    />
  ),
});
