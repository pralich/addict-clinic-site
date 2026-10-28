import { createFileRoute } from "@tanstack/react-router";
import Index, { SEO } from "@/pages/Index";
import { seoHead } from "@/lib/seo";
import { fetchArticles } from "@/lib/articles";
import { useSeedQuery } from "@/lib/seed-query";

export const Route = createFileRoute("/")({
  // Статьи для блоков «С чем помогаем» и «Полезные статьи» — сразу в HTML.
  loader: async () => ({ articles: await fetchArticles().catch(() => null) }),
  staleTime: 60_000,
  head: () => seoHead(SEO),
  component: HomePage,
});

function HomePage() {
  const { articles } = Route.useLoaderData();
  useSeedQuery(["articles"], articles);
  return <Index />;
}
