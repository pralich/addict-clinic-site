import { createFileRoute, notFound } from "@tanstack/react-router";
import ArticlePage, { articleSeo } from "@/pages/ArticlePage";
import { seoHead } from "@/lib/seo";
import { fetchArticleForPage } from "@/lib/articles";

export const Route = createFileRoute("/articles/$slug")({
  loader: async ({ params }) => {
    const r = await fetchArticleForPage(params.slug);
    if (r.missing) throw notFound();
    return { article: r.data };
  },
  staleTime: 60_000,
  head: ({ loaderData, params }) => seoHead(articleSeo(params.slug, loaderData?.article?.item)),
  component: ArticleRoute,
});

function ArticleRoute() {
  const { article } = Route.useLoaderData();
  return <ArticlePage initial={article} />;
}
