import { createFileRoute } from "@tanstack/react-router";
import Cookies, { SEO } from "@/pages/legal/Cookies";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/cookies")({
  head: () => seoHead(SEO),
  component: Cookies,
});
