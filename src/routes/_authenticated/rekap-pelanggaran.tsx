import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/rekap-pelanggaran")({
  head: () => ({
    meta: [
      { title: "Rekap Pelanggaran | ASMA" },
      { name: "description", content: "Rekap poin dan catatan pelanggaran santri AHIBS." },
      { property: "og:title", content: "Rekap Pelanggaran | ASMA" },
      { property: "og:description", content: "Rekap poin dan catatan pelanggaran santri AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Rekap Kegiatan"
      title="Rekap Pelanggaran"
      description="Rekap poin pelanggaran per santri, kelas, dan periode akan dibangun setelah fitur Catat Pelanggaran siap."
    />
  ),
});
