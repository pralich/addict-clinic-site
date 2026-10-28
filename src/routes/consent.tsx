import { createFileRoute } from "@tanstack/react-router";
import Consent, { SEO } from "@/pages/legal/Consent";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/consent")({
  head: () => seoHead(SEO),
  component: Consent,
});
