import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/pelanggaran-saya")({
  head: () => ({
    meta: [
      { title: "Pelanggaran Saya | ASMA" },
      { name: "description", content: "Riwayat catatan pelanggaran dan pembinaan santri." },
      { property: "og:title", content: "Pelanggaran Saya | ASMA" },
      { property: "og:description", content: "Riwayat catatan pelanggaran dan pembinaan santri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Pembinaan"
      title="Pelanggaran Saya"
      description="Riwayat pelanggaran dan tindak lanjut pembinaan akan tersedia pada tahap berikutnya."
    />
  ),
});
