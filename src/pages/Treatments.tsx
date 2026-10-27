import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import Header from "@/components/clinic/Header";
import Footer from "@/components/clinic/Footer";
import { PHONE_DISPLAY, PHONE_HREF } from "@/components/clinic/contacts";
import { TREATMENTS } from "@/lib/treatments";
import { SITE_URL, type SeoInput } from "@/lib/seo";
import { clinicNode, graph, logoNode, websiteNode, webPage } from "@/lib/schema";

const LD = graph(
  clinicNode,
  logoNode,
  websiteNode,
  webPage({
    type: ["CollectionPage", "MedicalWebPage"],
    path: "/lechenie",
    name: "Лечение зависимостей в Москве",
    description: "Направления лечения в addict.clinic: наркомания, алкоголизм, игромания, игровая зависимость, расстройства пищевого поведения.",
    crumbs: [["Лечение", "/lechenie"]],
    extra: {
      mainEntity: {
        "@type": "ItemList",
        itemListElement: TREATMENTS.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}${t.path}`, name: t.h1 })),
      },
    },
  }),
);

export const SEO: SeoInput = {
  title: "Лечение зависимостей в Москве анонимно 24/7 — addict.clinic",
  description: "Анонимное лечение наркомании, алкоголизма, игромании, игровой зависимости и РПП в Москве. Выезд врача 24/7, стационар, реабилитация, психотерапия. Звоните: 8-800-222-11-25.",
  path: "/lechenie",
  jsonLd: LD,
};

const Treatments = () => {
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-site px-5 pb-20 pt-6 md:px-16 md:pt-10">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Главная</Link><Icon name="ChevronRight" size={13} /><span className="text-foreground">Лечение</span>
        </nav>
        <h1 className="font-heading font-medium" style={{ fontSize: "clamp(34px, 5vw, 60px)", lineHeight: 1.04, letterSpacing: "-0.05em" }}>Лечение зависимостей в Москве</h1>
        <p className="mt-4 max-w-[640px] text-[1.1em] text-muted-foreground">Выберите направление, чтобы узнать о признаках, программах и этапах лечения. Все программы — анонимно и без постановки на учёт.</p>
        <div className="mt-10 grid gap-[7px] md:grid-cols-2 lg:grid-cols-3">
          {TREATMENTS.map((t) => (
            <Link key={t.slug} to={t.path} className="group flex flex-col overflow-hidden rounded-2xl bg-card transition-shadow hover:shadow-lg">
              <div className="aspect-[16/9] overflow-hidden"><img src={t.image} alt={t.h1} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /></div>
              <div className="flex flex-1 flex-col p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name={t.icon} size={18} /></span>
                <h2 className="mt-4 font-heading text-[1.3em] font-medium leading-tight tracking-tight group-hover:text-primary">{t.h1}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{t.lead}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-primary">Подробнее<Icon name="ArrowRight" size={14} /></span>
              </div>
            </Link>
          ))}
          <a href={PHONE_HREF} className="flex flex-col justify-between rounded-2xl bg-primary p-6 text-primary-foreground">
            <Icon name="PhoneCall" size={28} />
            <div>
              <p className="mt-10 font-heading text-[1.5em] font-medium leading-tight">Не знаете, с чего начать?</p>
              <p className="mt-2 text-primary-foreground/85">Врач бесплатно подскажет формат лечения</p>
              <p className="mt-5 font-heading text-xl font-semibold">{PHONE_DISPLAY}</p>
            </div>
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Treatments;