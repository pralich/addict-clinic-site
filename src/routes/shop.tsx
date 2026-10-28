import { createFileRoute } from "@tanstack/react-router";
import Shop, { shopSeo } from "@/pages/Shop";
import { seoHead } from "@/lib/seo";
import { fetchProducts, SHOP_CATEGORIES, type ShopCategory } from "@/lib/shop";

const categoryOf = (search: unknown): ShopCategory | "" => {
  const c = (search as Record<string, unknown> | undefined)?.category;
  return typeof c === "string" && c in SHOP_CATEGORIES ? (c as ShopCategory) : "";
};

export const Route = createFileRoute("/shop")({
  // Каталог — сразу в HTML.
  loader: async () => ({ products: await fetchProducts().catch(() => null) }),
  staleTime: 60_000,
  head: ({ loaderData, match }) => seoHead(shopSeo(loaderData?.products?.items ?? [], categoryOf(match.search))),
  component: ShopRoute,
});

function ShopRoute() {
  const { products } = Route.useLoaderData();
  return <Shop initial={products} />;
}
