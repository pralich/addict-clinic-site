import { createFileRoute, notFound } from "@tanstack/react-router";
import ServicePage, { serviceSeo } from "@/pages/ServicePage";
import { seoHead } from "@/lib/seo";
import { getService } from "@/lib/services";

export const Route = createFileRoute("/uslugi/$slug")({
  loader: ({ params }) => {
    if (!getService(params.slug)) throw notFound();
  },
  head: ({ params }) => seoHead(serviceSeo(params.slug)),
  component: ServicePage,
});
