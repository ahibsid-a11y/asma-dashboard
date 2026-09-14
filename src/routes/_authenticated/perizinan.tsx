import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/perizinan")({
  head: () => ({
    meta: [
      { title: "Perizinan | ASMA" },
      { name: "description", content: "Pengajuan dan persetujuan izin santri AHIBS." },
      { property: "og:title", content: "Perizinan | ASMA" },
      { property: "og:description", content: "Pengajuan dan persetujuan izin santri AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Kesantrian"
      title="Perizinan"
      description="Pengajuan izin oleh santri serta persetujuan musyrif dan pimpinan akan dibangun pada tahap berikutnya."
    />
  ),
});
