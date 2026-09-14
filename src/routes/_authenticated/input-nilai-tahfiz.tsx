import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/input-nilai-tahfiz")({
  head: () => ({
    meta: [
      { title: "Input Nilai Tahfiz | ASMA" },
      { name: "description", content: "Pencatatan setoran dan nilai hafalan santri oleh musyrif AHIBS." },
      { property: "og:title", content: "Input Nilai Tahfiz | ASMA" },
      { property: "og:description", content: "Pencatatan setoran dan nilai hafalan santri oleh musyrif AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Tahfiz"
      title="Input Nilai Tahfiz"
      description="Pencatatan setoran hafalan, murojaah, dan nilai per santri oleh musyrif akan dibangun pada tahap berikutnya."
    />
  ),
});
