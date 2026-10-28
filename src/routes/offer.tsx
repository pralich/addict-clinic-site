import { createFileRoute } from "@tanstack/react-router";
import Offer, { SEO } from "@/pages/legal/Offer";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/offer")({
  head: () => seoHead(SEO),
  component: Offer,
});
