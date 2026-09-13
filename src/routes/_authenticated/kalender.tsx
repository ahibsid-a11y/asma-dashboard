import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/kalender")({
  head: () => ({
    meta: [
      { title: "Kalender Pendidikan | ASMA" },
      { name: "description", content: "Agenda dan kalender pendidikan SMPIT Putra Al-Hanif." },
      { property: "og:title", content: "Kalender Pendidikan | ASMA" },
      { property: "og:description", content: "Agenda dan kalender pendidikan SMPIT Putra Al-Hanif." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Agenda"
      title="Kalender Pendidikan"
      description="Kalender kegiatan pesantren dan sekolah akan tersedia pada tahap berikutnya."
    />
  ),
});
