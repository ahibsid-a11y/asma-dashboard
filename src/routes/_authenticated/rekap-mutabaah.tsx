import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/rekap-mutabaah")({
  head: () => ({
    meta: [
      { title: "Rekap Mutaba'ah | ASMA" },
      { name: "description", content: "Rekap amal yaumi dan mutaba'ah santri AHIBS." },
      { property: "og:title", content: "Rekap Mutaba'ah | ASMA" },
      { property: "og:description", content: "Rekap amal yaumi dan mutaba'ah santri AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Rekap Kegiatan"
      title="Rekap Mutaba'ah"
      description="Rekap capaian amal yaumi per santri dan halaqoh akan dibangun setelah fitur Input Mutaba'ah siap."
    />
  ),
});
