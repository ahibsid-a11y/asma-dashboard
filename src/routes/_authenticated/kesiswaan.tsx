import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/kesiswaan")({
  head: () => ({
    meta: [
      { title: "Kesiswaan | ASMA" },
      { name: "description", content: "Pembinaan dan catatan kesiswaan santri AHIBS." },
      { property: "og:title", content: "Kesiswaan | ASMA" },
      { property: "og:description", content: "Pembinaan dan catatan kesiswaan santri AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Pembinaan"
      title="Kesiswaan"
      description="Pembinaan, mutaba'ah, dan catatan pelanggaran santri akan tersedia pada tahap berikutnya."
    />
  ),
});
