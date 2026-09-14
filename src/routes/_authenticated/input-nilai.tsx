import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/input-nilai")({
  head: () => ({
    meta: [
      { title: "Input Nilai | ASMA" },
      { name: "description", content: "Pencatatan nilai pelajaran santri oleh guru AHIBS." },
      { property: "og:title", content: "Input Nilai | ASMA" },
      { property: "og:description", content: "Pencatatan nilai pelajaran santri oleh guru AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Pendidikan"
      title="Input Nilai"
      description="Pencatatan nilai tugas, ulangan, dan ujian per mata pelajaran akan dibangun pada tahap berikutnya."
    />
  ),
});
