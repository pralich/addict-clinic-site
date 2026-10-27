import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Header from "@/components/clinic/Header";
import Footer from "@/components/clinic/Footer";
import { PHONE_DISPLAY, PHONE_HREF } from "@/components/clinic/contacts";
import { SERVICES } from "@/lib/services";
import { SITE_URL, useSeo } from "@/lib/seo";
import { clinicNode, graph, logoNode, websiteNode, webPage } from "@/lib/schema";

const LD = graph(
  clinicNode,
  logoNode,
  websiteNode,
  webPage({
    type: ["CollectionPage", "MedicalWebPage"],
    path: "/uslugi",
    name: "Услуги и цены",
    description: "Услуги и цены addict.clinic: наркологическая клиника, реабилитационный центр, психотерапия, мотивация на лечение, поддержка родственников.",
    crumbs: [["Услуги и цены", "/uslugi"]],
    extra: {
      mainEntity: {
        "@type": "ItemList",
        itemListElement: SERVICES.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}${s.path}`, name: s.h1 })),
      },
    },
  }),
);

const Services = () => {
  useSeo({
    title: "Услуги и цены на лечение зависимостей в Москве — addict.clinic",
    description: "Цены на услуги addict.clinic: выезд нарколога, стационар, реабилитационный центр, психотерапия, мотивация на лечение и поддержка родственников. Анонимно 24/7. Звоните: 8-800-222-11-25.",
    path: "/uslugi",
    jsonLd: LD,
  });
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-site px-5 pb-20 pt-6 md:px-16 md:pt-10">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Главная</Link><Icon name="ChevronRight" size={13} /><span className="text-foreground">Услуги и цены</span>
        </nav>
        <h1 className="font-heading font-medium" style={{ fontSize: "clamp(34px, 5vw, 60px)", lineHeight: 1.04, letterSpacing: "-0.05em" }}>Услуги и цены</h1>
        <p className="mt-4 max-w-[680px] text-[1.1em] text-muted-foreground">Полный путь — от первого звонка и мотивации до реабилитации и поддержки семьи. Анонимно, без постановки на учёт. Точную стоимость врач называет после бесплатной консультации.</p>

        <div className="mt-10 grid gap-[7px] md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link key={s.slug} to={s.path} className="group flex flex-col overflow-hidden rounded-2xl bg-card transition-shadow hover:shadow-lg">
              <div className="aspect-[16/9] overflow-hidden"><img src={s.image} alt={s.h1} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /></div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name={s.icon} size={18} /></span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">{s.from}</span>
                </div>
                <h2 className="mt-4 font-heading text-[1.3em] font-medium leading-tight tracking-tight group-hover:text-primary">{s.menu}</h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{s.hint}</p>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.lead}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-primary">Услуги и цены<Icon name="ArrowRight" size={14} /></span>
              </div>
            </Link>
          ))}
          <a href={PHONE_HREF} className="flex flex-col justify-between rounded-2xl bg-primary p-6 text-primary-foreground">
            <Icon name="PhoneCall" size={28} />
            <div>
              <p className="mt-10 font-heading text-[1.5em] font-medium leading-tight">Не знаете, что выбрать?</p>
              <p className="mt-2 text-primary-foreground/85">Врач бесплатно подберёт программу и рассчитает стоимость</p>
              <p className="mt-5 font-heading text-xl font-semibold">{PHONE_DISPLAY}</p>
            </div>
          </a>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">Цены на сайте носят информационный характер и не являются публичной офертой. Итоговая стоимость зависит от состояния пациента и согласуется до начала лечения.</p>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
