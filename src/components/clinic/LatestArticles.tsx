import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";
import ArticleCard from "@/components/articles/ArticleCard";
import { fetchArticles } from "@/lib/articles";

const LatestArticles = () => {
  const { data, isLoading } = useQuery({ queryKey: ["articles"], queryFn: () => fetchArticles() });
  const items = (data?.items ?? []).slice(0, 3);

  if (!isLoading && items.length === 0) return null;

  return (
    <section id="articles" className="mx-auto max-w-site scroll-mt-16 px-5 py-20 md:px-16 md:py-28">
      <SectionHead
        label="Полезные статьи"
        title={<>Разбираемся вместе<br className="hidden md:block" /> с врачами клиники.</>}
        text="Честно о признаках зависимости, лечении, реабилитации и о том, как помочь близкому."
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[380px] animate-pulse rounded-2xl bg-card" />)
          : items.map((a, i) => (
              <Reveal key={a.id} delay={i * 100} className="flex">
                <ArticleCard a={a} />
              </Reveal>
            ))}
      </div>
      <Reveal delay={200} className="mt-8 flex justify-center">
        <Link
          to="/articles"
          className="group inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 font-medium tracking-tight text-ink-foreground transition-transform hover:-translate-y-0.5"
        >
          Все статьи
          <Icon name="ArrowRight" size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>
    </section>
  );
};

export default LatestArticles;
