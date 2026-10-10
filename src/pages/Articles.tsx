import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Header from "@/components/clinic/Header";
import Footer from "@/components/clinic/Footer";
import ArticleCard from "@/components/articles/ArticleCard";
import ArticleCta from "@/components/articles/ArticleCta";
import { CATEGORIES, fetchArticles } from "@/lib/articles";
import { SITE_URL, useSeo } from "@/lib/seo";
import { CLINIC_ID, clinicNode, isoDate, graph, logoNode, websiteNode, webPage } from "@/lib/schema";

const Articles = () => {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const [search, setSearch] = useState(() => params.get("q") || "");
  const { data, isLoading } = useQuery({ queryKey: ["articles"], queryFn: () => fetchArticles() });
  const all = useMemo(() => data?.items ?? [], [data]);
  const items = useMemo(
    () => all.filter((a) => (!category || a.category === category) && (!search || (a.title + (a.excerpt || "")).toLowerCase().includes(search.toLowerCase()))),
    [all, category, search],
  );

  const catLabel = CATEGORIES[category]?.label;
  const listed = useMemo(() => all.filter((a) => !category || a.category === category), [all, category]);
  const jsonLd = useMemo(
    () =>
      graph(
        clinicNode,
        logoNode,
        websiteNode,
        webPage({
          type: "CollectionPage",
          path: category ? `/articles?category=${category}` : "/articles",
          name: catLabel ? `${catLabel}: статьи о лечении и помощи` : "Статьи о зависимостях и их лечении",
          description: "Полезные материалы врачей addict.clinic о зависимостях, лечении и помощи близким.",
          crumbs: [["Статьи", "/articles"], ...(catLabel ? [[catLabel, `/articles?category=${category}`] as [string, string]] : [])],
          extra: {
            about: catLabel ? { "@type": "MedicalCondition", name: catLabel } : undefined,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: listed.length,
              itemListElement: listed.map((a, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: {
                  "@type": "Article",
                  "@id": `${SITE_URL}/articles/${a.slug}#article`,
                  url: `${SITE_URL}/articles/${a.slug}`,
                  headline: a.title,
                  description: a.excerpt || undefined,
                  image: a.cover_url || undefined,
                  datePublished: isoDate(a.published_at),
                  author: a.author ? { "@type": "Person", name: a.author } : { "@id": CLINIC_ID },
                  publisher: { "@id": CLINIC_ID },
                },
              })),
            },
          },
        }),
      ),
    [listed, category, catLabel],
  );

  useSeo({
    title: catLabel ? `${catLabel}: статьи о лечении и помощи — addict.clinic` : "Статьи о зависимостях и их лечении — addict.clinic",
    description: "Полезные материалы врачей addict.clinic: признаки зависимостей, как помочь близкому, вывод из запоя, лечение наркомании, игромании, РПП и депрессии. Анонимная помощь 24/7.",
    path: category ? `/articles?category=${category}` : "/articles",
    jsonLd,
  });

  const counts = useMemo(() => all.reduce<Record<string, number>>((acc, a) => ((acc[a.category] = (acc[a.category] || 0) + 1), acc), {}), [all]);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1280px] px-5 pb-20 pt-10 md:px-16 md:pt-16">
        <nav aria-label="Хлебные крошки" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Главная</Link>
          <Icon name="ChevronRight" size={14} />
          <span className="text-foreground">Статьи</span>
        </nav>
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-medium">
              <Icon name="BookOpen" size={13} className="text-primary" />Материалы врачей клиники
            </p>
            <h1 className="font-heading text-[2.4em] font-medium leading-[1.05] tracking-[-0.045em] md:text-[3.4em]">
              {catLabel ? catLabel : <>Статьи о зависимостях<br className="hidden md:block" /> и их лечении</>}
            </h1>
          </div>
          <p className="text-[1.05em] leading-relaxed text-muted-foreground">
            Честно и понятно о признаках, лечении и помощи близким. Все материалы проверены нашими наркологами, психиатрами и психологами.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
            <button onClick={() => setParams({})} className={`shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${!category ? "bg-ink text-ink-foreground" : "bg-card hover:bg-secondary"}`}>
              Все <span className="opacity-60">{all.length}</span>
            </button>
            {Object.entries(CATEGORIES).filter(([k]) => counts[k]).map(([k, c]) => (
              <button key={k} onClick={() => setParams({ category: k })}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors ${category === k ? "bg-ink text-ink-foreground" : "bg-card hover:bg-secondary"}`}>
                <Icon name={c.icon} size={14} />{c.label}
              </button>
            ))}
          </div>
          <div className="relative lg:w-[280px]">
            <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по статьям" className="h-11 w-full rounded-full border bg-card pl-11 pr-4 text-sm outline-none focus:border-foreground/30" />
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[360px] animate-pulse rounded-2xl bg-card" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">По вашему запросу статей пока нет</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((a, i) => (
              <ArticleCard key={a.id} a={a} large={i === 0 && !category && !search} />
            ))}
          </div>
        )}

        <ArticleCta type="consult" source="Список статей" />
      </main>
      <Footer />
    </div>
  );
};

export default Articles;
