import { createFileRoute } from "@tanstack/react-router";
import Treatments, { SEO } from "@/pages/Treatments";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/lechenie/")({
  head: () => seoHead(SEO),
  component: Treatments,
});
