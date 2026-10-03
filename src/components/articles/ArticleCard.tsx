import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { CATEGORIES, type Article } from "@/lib/articles";

const ArticleCard = ({ a, large = false }: { a: Article; large?: boolean }) => (
  <Link to={`/articles/${a.slug}`} className={`group flex w-full flex-col overflow-hidden rounded-2xl bg-card transition-shadow hover:shadow-lg ${large ? "md:col-span-2 md:flex-row" : ""}`}>
    <div className={`relative overflow-hidden ${large ? "aspect-[16/10] md:aspect-auto md:w-[55%]" : "aspect-[16/10]"}`}>
      {a.cover_url ? (
        <img src={a.cover_url} alt={a.cover_alt || a.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary"><Icon name={CATEGORIES[a.category]?.icon || "FileText"} size={40} className="text-muted-foreground" /></div>
      )}
      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium backdrop-blur">
        <Icon name={CATEGORIES[a.category]?.icon || "Tag"} size={12} className="text-primary" />
        {CATEGORIES[a.category]?.label || a.category}
      </span>
    </div>
    <div className={`flex flex-1 flex-col p-5 ${large ? "md:p-8" : ""}`}>
      <h3 className={`font-heading font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary ${large ? "text-[1.5em] md:text-[1.9em]" : "text-[1.15em]"}`}>{a.title}</h3>
      {a.excerpt && <p className={`mt-2 text-[0.95em] leading-relaxed text-muted-foreground ${large ? "" : "line-clamp-3"}`}>{a.excerpt}</p>}
      <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
        <span>{a.published_at ? new Date(a.published_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : ""}</span>
        <span className="inline-flex items-center gap-1 font-medium text-foreground">Читать<Icon name="ArrowRight" size={13} className="transition-transform group-hover:translate-x-1" /></span>
      </div>
    </div>
  </Link>
);

export default ArticleCard;
