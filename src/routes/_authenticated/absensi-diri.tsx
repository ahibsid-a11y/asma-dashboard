import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/absensi-diri")({
  head: () => ({
    meta: [
      { title: "Absensi Diri | ASMA" },
      { name: "description", content: "Catatan absensi pribadi di lingkungan AHIBS." },
      { property: "og:title", content: "Absensi Diri | ASMA" },
      { property: "og:description", content: "Catatan absensi pribadi di lingkungan AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Kehadiran"
      title="Absensi Diri"
      description="Pencatatan kehadiran pribadi akan tersedia pada tahap berikutnya."
    />
  ),
});
