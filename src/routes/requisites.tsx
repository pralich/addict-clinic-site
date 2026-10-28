import { createFileRoute } from "@tanstack/react-router";
import Requisites, { SEO } from "@/pages/legal/Requisites";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/requisites")({
  head: () => seoHead(SEO),
  component: Requisites,
});
