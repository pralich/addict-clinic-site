import { createFileRoute } from "@tanstack/react-router";
import Premium, { SEO } from "@/pages/Premium";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/premium")({
  head: () => seoHead(SEO),
  component: Premium,
});
