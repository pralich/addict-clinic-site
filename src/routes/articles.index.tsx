import { createFileRoute } from "@tanstack/react-router";
import Articles, { articlesSeo } from "@/pages/Articles";
import { seoHead } from "@/lib/seo";
import { fetchArticles } from "@/lib/articles";
import { useSeedQuery } from "@/lib/seed-query";

const categoryOf = (search: unknown) => {
  const c = (search as Record<string, unknown> | undefined)?.category;
  return typeof c === "string" ? c : "";
};

export const Route = createFileRoute("/articles/")({
  loader: async () => ({ articles: await fetchArticles().catch(() => null) }),
  staleTime: 60_000,
  head: ({ loaderData, match }) => seoHead(articlesSeo(loaderData?.articles?.items ?? [], categoryOf(match.search))),
  component: ArticlesPage,
});

function ArticlesPage() {
  const { articles } = Route.useLoaderData();
  useSeedQuery(["articles"], articles);
  return <Articles />;
}
