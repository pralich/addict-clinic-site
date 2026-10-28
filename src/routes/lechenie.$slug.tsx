import { createFileRoute, notFound } from "@tanstack/react-router";
import TreatmentPage, { treatmentSeo } from "@/pages/TreatmentPage";
import { seoHead } from "@/lib/seo";
import { getTreatment } from "@/lib/treatments";
import { fetchArticles } from "@/lib/articles";
import { useSeedQuery } from "@/lib/seed-query";

export const Route = createFileRoute("/lechenie/$slug")({
  loader: async ({ params }) => {
    if (!getTreatment(params.slug)) throw notFound();
    return { articles: await fetchArticles().catch(() => null) };
  },
  staleTime: 60_000,
  head: ({ params }) => seoHead(treatmentSeo(params.slug)),
  component: TreatmentRoute,
});

function TreatmentRoute() {
  const { articles } = Route.useLoaderData();
  useSeedQuery(["articles"], articles);
  return <TreatmentPage />;
}
