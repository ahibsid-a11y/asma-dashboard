import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/catat-pelanggaran")({
  head: () => ({
    meta: [
      { title: "Catat Pelanggaran | ASMA" },
      { name: "description", content: "Pencatatan pelanggaran dan poin kedisiplinan santri AHIBS." },
      { property: "og:title", content: "Catat Pelanggaran | ASMA" },
      { property: "og:description", content: "Pencatatan pelanggaran dan poin kedisiplinan santri AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Kesantrian"
      title="Catat Pelanggaran"
      description="Pencatatan pelanggaran beserta kategori dan poin oleh petugas akan dibangun pada tahap berikutnya."
    />
  ),
});
