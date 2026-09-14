import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/nilai-pelajaran")({
  head: () => ({
    meta: [
      { title: "Nilai Pelajaran | ASMA" },
      { name: "description", content: "Nilai pelajaran pribadi santri AHIBS." },
      { property: "og:title", content: "Nilai Pelajaran | ASMA" },
      { property: "og:description", content: "Nilai pelajaran pribadi santri AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Pendidikan"
      title="Nilai Pelajaran"
      description="Nilai pelajaran pribadi per mata pelajaran akan tampil di sini setelah fitur Input Nilai siap."
    />
  ),
});
