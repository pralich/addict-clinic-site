import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicy, { SEO } from "@/pages/legal/PrivacyPolicy";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => seoHead(SEO),
  component: PrivacyPolicy,
});
