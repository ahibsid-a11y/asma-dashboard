import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/input-mutabaah")({
  head: () => ({
    meta: [
      { title: "Input Mutaba'ah | ASMA" },
      { name: "description", content: "Pencatatan amal yaumi santri oleh musyrif AHIBS." },
      { property: "og:title", content: "Input Mutaba'ah | ASMA" },
      { property: "og:description", content: "Pencatatan amal yaumi santri oleh musyrif AHIBS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      eyebrow="Kesantrian"
      title="Input Mutaba'ah"
      description="Pencatatan amal yaumi santri per hari oleh musyrif dan admin akan dibangun pada tahap berikutnya."
    />
  ),
});
