import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import Header from "@/components/clinic/Header";
import Footer from "@/components/clinic/Footer";
import ArticleContent, { slugifyHeading } from "@/components/articles/ArticleContent";
import ArticleCta from "@/components/articles/ArticleCta";
import ArticleCard from "@/components/articles/ArticleCard";
import { CATEGORIES, fetchArticle, readingTime } from "@/lib/articles";
import { PHONE_HREF } from "@/components/clinic/contacts";
import { SITE_URL, useSeo } from "@/lib/seo";
import { CLINIC_ID, clinicNode, isoDate, graph, logoNode, websiteNode, webPage } from "@/lib/schema";
import { fmtMskDate } from "@/lib/msk";

const splitContent = (content: string): [string, string] => {
  const lines = content.split("\n");
  const heads = lines.map((l, i) => (l.startsWith("## ") ? i : -1)).filter((i) => i > 0);
  if (heads.length < 3) return [content, ""];
  const mid = heads[Math.floor(heads.length / 2)];
  return [lines.slice(0, mid).join("\n"), lines.slice(mid).join("\n")];
};

const ArticlePage = () => {
  const { slug = "" } = useParams();
  const { data, isLoading, isError } = useQuery({ queryKey: ["article", slug], queryFn: () => fetchArticle(slug), retry: false });
  const a = data?.item;
  const [progress, setProgress] = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      setProgress(Math.min(100, (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100));
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const toc = useMemo(() => (a?.content || "").split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3).trim()), [a]);
  const [first, second] = useMemo(() => splitContent(a?.content || ""), [a]);
  const cat = a ? CATEGORIES[a.category] : undefined;

  const jsonLd = useMemo(() => {
    if (!a) return undefined;
    const url = `${SITE_URL}/articles/${a.slug}`;
    const text = (a.content || "").replace(/[#*_>`[\]()!-]/g, " ");
    const words = text.split(/\s+/).filter(Boolean).length;
    const image = a.cover_url ? { "@type": "ImageObject", url: a.cover_url, width: 1360, height: 768 } : { "@id": `${SITE_URL}/#logo` };
    const author = a.author
      ? { "@type": "Person", name: a.author, worksFor: { "@id": CLINIC_ID } }
      : { "@id": CLINIC_ID };
    return graph(
      clinicNode,
      logoNode,
      websiteNode,
      webPage({
        type: ["MedicalWebPage", "WebPage"],
        path: `/articles/${a.slug}`,
        name: a.meta_title || a.title,
        description: a.meta_description || a.excerpt || undefined,
        crumbs: [["Статьи", "/articles"], ...(cat ? [[cat.label, `/articles?category=${a.category}`] as [string, string]] : []), [a.title, `/articles/${a.slug}`]],
        extra: {
          primaryImageOfPage: image,
          datePublished: isoDate(a.published_at),
          dateModified: isoDate(a.updated_at || a.published_at),
          lastReviewed: (a.updated_at || a.published_at)?.slice(0, 10),
          reviewedBy: { "@id": CLINIC_ID },
          medicalAudience: [{ "@type": "MedicalAudience", audienceType: "Patient" }, { "@type": "PeopleAudience", audienceType: "Родственники зависимых" }],
          specialty: "Psychiatric",
          about: cat ? { "@type": "MedicalCondition", name: cat.label } : undefined,
          mainEntity: { "@id": `${url}#article` },
        },
      }),
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: a.title.slice(0, 110),
        alternativeHeadline: a.meta_title && a.meta_title !== a.title ? a.meta_title : undefined,
        description: a.meta_description || a.excerpt || undefined,
        image,
        thumbnailUrl: a.cover_url || undefined,
        url,
        mainEntityOfPage: { "@id": `${url}#webpage` },
        isPartOf: { "@id": `${url}#webpage` },
        inLanguage: "ru-RU",
        datePublished: isoDate(a.published_at),
        dateModified: isoDate(a.updated_at || a.published_at),
        author,
        publisher: { "@id": CLINIC_ID },
        articleSection: cat?.label,
        about: cat ? { "@type": "MedicalCondition", name: cat.label } : undefined,
        keywords: [cat?.label, "лечение зависимости", "анонимно"].filter(Boolean).join(", "),
        wordCount: words,
        timeRequired: `PT${readingTime(a.content || "")}M`,
        hasPart: toc.map((h) => ({ "@type": "WebPageElement", name: h, url: `${url}#${slugifyHeading(h)}` })),
        isAccessibleForFree: true,
        copyrightHolder: { "@id": CLINIC_ID },
        copyrightYear: (a.published_at || "").slice(0, 4) || undefined,
      },
    );
  }, [a, cat, toc]);

  useSeo({
    title: a ? a.meta_title || `${a.title} — addict.clinic` : isError ? "Статья не найдена — addict.clinic" : "Статьи — addict.clinic",
    description: a?.meta_description || a?.excerpt || "Статьи врачей addict.clinic о зависимостях и их лечении.",
    path: `/articles/${slug}`,
    image: a?.cover_url || "/og-image.jpg?v=3",
    noindex: isError,
    jsonLd,
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="fixed inset-x-0 top-0 z-[60] h-[3px] bg-transparent">
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
      <Header />
      <main className="mx-auto max-w-site px-5 pb-16 pt-8 md:px-16 md:pt-12">
        {isLoading && (
          <div className="mx-auto max-w-[760px] space-y-4">
            <div className="h-6 w-40 animate-pulse rounded bg-card" />
            <div className="h-24 animate-pulse rounded bg-card" />
            <div className="aspect-[16/9] animate-pulse rounded-3xl bg-card" />
          </div>
        )}
        {isError && (
          <div className="py-24 text-center">
            <h1 className="font-heading text-3xl font-semibold">Статья не найдена</h1>
            <Link to="/articles" className="mt-6 inline-flex items-center gap-2 font-medium text-primary"><Icon name="ArrowLeft" size={16} />Все статьи</Link>
          </div>
        )}
        {a && (
          <>
            <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Главная</Link>
              <Icon name="ChevronRight" size={14} />
              <Link to="/articles" className="hover:text-foreground">Статьи</Link>
              {cat && (<><Icon name="ChevronRight" size={14} /><Link to={`/articles?category=${a.category}`} className="hover:text-foreground">{cat.label}</Link></>)}
            </nav>

            <header className="mt-6 max-w-[900px]">
              {cat && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium">
                  <Icon name={cat.icon} size={13} className="text-primary" />{cat.label}
                </span>
              )}
              <h1 className="mt-4 font-heading text-[2.1em] font-medium leading-[1.08] tracking-[-0.04em] md:text-[3.1em]">{a.title}</h1>
              {a.excerpt && <p className="mt-5 max-w-[720px] text-[1.15em] leading-relaxed text-muted-foreground">{a.excerpt}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Icon name="UserRoundCheck" size={15} className="text-primary" />{a.author || "Врачи addict.clinic"}</span>
                {a.published_at && <span className="inline-flex items-center gap-1.5"><Icon name="Calendar" size={15} /><time dateTime={a.published_at}>{fmtMskDate(a.published_at, { day: "numeric", month: "long", year: "numeric" })}</time></span>}
                <span className="inline-flex items-center gap-1.5"><Icon name="Clock" size={15} />{readingTime(a.content)} мин чтения</span>
              </div>
            </header>

            {a.cover_url && (
              <figure className="mt-8 overflow-hidden rounded-3xl">
                <img src={a.cover_url} alt={a.cover_alt || a.title} fetchPriority="high" className="aspect-[16/9] w-full object-cover md:aspect-[21/9]" />
              </figure>
            )}

            <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]">
              <article className="min-w-0">
                <ArticleContent content={first} />
                {second && <ArticleCta type={a.cta_type} source={a.title} />}
                {second && <ArticleContent content={second} />}
                {!second && <ArticleCta type={a.cta_type} source={a.title} />}
                <div className="mt-12 flex items-start gap-4 rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
                  <Icon name="ShieldCheck" size={22} className="shrink-0 text-primary" />
                  <p>Материал носит информационный характер и проверен врачами клиники. Он не заменяет консультацию специалиста — для диагностики и назначения лечения обратитесь к врачу.</p>
                </div>
              </article>

              <aside className="hidden lg:block">
                <div className="sticky top-20 flex flex-col gap-4">
                  {toc.length > 1 && (
                    <nav className="rounded-2xl bg-card p-5" aria-label="Содержание">
                      <p className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">Содержание</p>
                      <ol className="space-y-2 text-sm">
                        {toc.map((h, i) => (
                          <li key={h}><a href={`#${slugifyHeading(h)}`} className="flex gap-2 text-foreground/80 hover:text-primary"><span className="text-muted-foreground">{i + 1}.</span>{h}</a></li>
                        ))}
                      </ol>
                    </nav>
                  )}
                  <ArticleCta type={a.cta_type} source={a.title} compact />
                </div>
              </aside>
            </div>

            {data.related.length > 0 && (
              <section className="mt-16">
                <h2 className="font-heading text-[1.8em] font-medium tracking-[-0.03em]">Читайте также</h2>
                <div className="mt-6 grid gap-5 md:grid-cols-3">
                  {data.related.map((r) => <ArticleCard key={r.id} a={r} />)}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
      {a && (
        <a href={PHONE_HREF} className="accent-glow fixed bottom-4 left-4 right-4 z-40 flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground lg:hidden">
          <Icon name="Phone" size={16} />{a.cta_type === "crisis" ? "Психолог 24/7" : a.cta_type === "family" ? "Консультация для близких" : "Срочная помощь 24/7"}
        </a>
      )}
    </div>
  );
};

export default ArticlePage;