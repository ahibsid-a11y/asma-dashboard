import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/mutabaah-saya")({
  head: () => ({
    meta: [
      { title: "Mutaba'ah Saya | ASMA" },
      { name: "description", content: "Catatan mutaba'ah ibadah harian santri." },
      { property: "og:title", content: "Mutaba'ah Saya | ASMA" },
      { property: "og:description", content: "Catatan mutaba'ah ibadah harian santri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Ibadah Harian"
      title="Mutaba'ah Saya"
      description="Catatan mutaba'ah ibadah harian akan tersedia pada tahap berikutnya."
    />
  ),
});
