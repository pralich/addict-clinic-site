import { createFileRoute } from "@tanstack/react-router";
import Services, { SEO } from "@/pages/Services";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/uslugi/")({
  head: () => seoHead(SEO),
  component: Services,
});
