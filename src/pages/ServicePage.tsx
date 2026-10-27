import { useEffect, useMemo } from "react";
import { Link, useParams } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Header from "@/components/clinic/Header";
import Footer from "@/components/clinic/Footer";
import TreatmentLeadForm from "@/components/treatment/TreatmentLeadForm";
import PriceTable from "@/components/services/PriceTable";
import { PHONE_DISPLAY, PHONE_HREF } from "@/components/clinic/contacts";
import { getService, SERVICES, type Service } from "@/lib/services";
import { SITE_URL, useSeo } from "@/lib/seo";
import { CLINIC_ID, clinicNode, graph, logoNode, websiteNode, webPage } from "@/lib/schema";
import NotFound from "./NotFound";

const num = (p: string) => {
  const m = p.replace(/\s/g, "").match(/\d+/);
  return m ? Number(m[0]) : 0;
};

const buildLd = (s: Service) =>
  graph(
    clinicNode,
    logoNode,
    websiteNode,
    webPage({
      type: ["MedicalWebPage", "WebPage"],
      path: s.path,
      name: s.h1,
      description: s.description,
      crumbs: [["Услуги и цены", "/uslugi"], [s.menu, s.path]],
      extra: { primaryImageOfPage: { "@type": "ImageObject", url: s.image } },
    }),
    {
      "@type": "OfferCatalog",
      "@id": `${SITE_URL}${s.path}#prices`,
      name: `${s.menu} — цены`,
      itemListElement: s.prices.flatMap((g) => g.items).map((i) => ({
        "@type": "Offer",
        itemOffered: { "@type": ["Service", "MedicalTherapy"], name: i.name, description: i.note, provider: { "@id": CLINIC_ID }, areaServed: { "@type": "City", name: "Москва" } },
        priceSpecification: { "@type": "PriceSpecification", priceCurrency: "RUB", ...(num(i.price) ? { minPrice: num(i.price) } : { price: 0 }) },
      })),
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}${s.path}#faq`,
      mainEntity: s.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  );

const Section = ({ label, title, children, id }: { label: string; title: string; children: React.ReactNode; id?: string }) => (
  <section id={id} className="mx-auto max-w-site scroll-mt-20 px-5 py-12 md:px-16 md:py-16">
    <span className="flex items-center gap-[9px] text-[0.97em] font-medium tracking-tight text-muted-foreground"><i className="block h-2.5 w-2.5 rotate-45 bg-primary" />{label}</span>
    <h2 className="mb-8 mt-4 max-w-[760px] font-heading font-medium" style={{ fontSize: "clamp(28px, 3.6vw, 42px)", lineHeight: 1.1, letterSpacing: "-0.04em" }}>{title}</h2>
    {children}
  </section>
);

const ServicePage = () => {
  const { slug = "" } = useParams();
  const s = getService(slug);
  const ld = useMemo(() => (s ? buildLd(s) : undefined), [s]);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  useSeo({
    title: s?.title || "Страница не найдена — addict.clinic",
    description: s?.description || "",
    path: s?.path || `/uslugi/${slug}`,
    noindex: !s,
    jsonLd: ld,
  });

  if (!s) return <NotFound />;
  const others = SERVICES.filter((x) => x.slug !== s.slug);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />
      <main>
        <section className="mx-auto max-w-site px-5 pb-8 pt-6 md:px-16 md:pb-12 md:pt-10">
          <nav aria-label="Хлебные крошки" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Главная</Link>
            <Icon name="ChevronRight" size={13} />
            <Link to="/uslugi" className="hover:text-foreground">Услуги и цены</Link>
            <Icon name="ChevronRight" size={13} />
            <span className="text-foreground">{s.menu}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm">
                <i className="live-dot block h-2 w-2 rounded-full bg-live" />Анонимно · без учёта · 24/7
              </span>
              <h1 className="mt-5 font-heading font-medium" style={{ fontSize: "clamp(32px, 5vw, 60px)", lineHeight: 1.03, letterSpacing: "-0.05em" }}>{s.h1}</h1>
              <p className="mt-5 max-w-[640px] text-[1.12em] leading-relaxed text-muted-foreground">{s.lead}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#prices" className="accent-glow inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground transition-transform hover:-translate-y-0.5">
                  <Icon name="Receipt" size={16} />Цены {s.from}
                </a>
                <a href={PHONE_HREF} className="inline-flex h-12 items-center gap-2 rounded-full border bg-card px-5 font-medium hover:border-foreground/30">
                  <Icon name="Phone" size={16} />{PHONE_DISPLAY}
                </a>
              </div>
              <div className="mt-9 grid grid-cols-3 gap-2">
                {s.facts.map((f) => (
                  <div key={f.label} className="rounded-xl bg-card p-4">
                    <p className="font-heading text-[1.3em] font-semibold leading-none tracking-tight md:text-[1.7em]">{f.value}</p>
                    <p className="mt-2 text-xs leading-snug text-muted-foreground md:text-sm">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="form" className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.3)] md:p-6">
              <p className="font-heading text-xl font-medium tracking-tight">Бесплатная консультация</p>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">Специалист подберёт программу и рассчитает стоимость</p>
              <TreatmentLeadForm topic={s.menu} form={`service_${s.slug}`} />
            </div>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl">
            <img src={s.image} alt={s.h1} className="aspect-[21/9] w-full object-cover" />
          </div>
        </section>

        <Section label="Кому подходит" title="Когда нужна эта помощь">
          <ul className="grid gap-[7px] sm:grid-cols-2 lg:grid-cols-4">
            {s.forWhom.map((x) => (
              <li key={x} className="flex items-start gap-3 rounded-xl bg-card p-4">
                <Icon name="CircleCheck" size={18} className="mt-0.5 shrink-0 text-primary" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section label="Что входит" title="Из чего состоит помощь">
          <div className="grid gap-[7px] sm:grid-cols-2 lg:grid-cols-4">
            {s.includes.map((x) => (
              <article key={x.title} className="rounded-xl bg-card p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon name={x.icon} size={20} /></span>
                <h3 className="mt-4 font-heading text-[1.15em] font-medium tracking-tight">{x.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{x.text}</p>
              </article>
            ))}
          </div>
          {s.cta && (
            <Link to={s.cta.to} className="mt-[7px] flex flex-col gap-4 rounded-xl bg-night p-6 text-night-foreground transition-transform hover:-translate-y-0.5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-heading text-[1.3em] font-medium">{s.cta.title}</p>
                <p className="mt-1 text-night-muted">{s.cta.text}</p>
              </div>
              <span className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full bg-primary px-5 font-medium text-primary-foreground md:self-auto">{s.cta.label}<Icon name="ArrowRight" size={15} /></span>
            </Link>
          )}
        </Section>

        <Section id="prices" label="Цены" title={`${s.menu}: стоимость услуг`}>
          <PriceTable groups={s.prices} />
          <p className="mt-4 text-sm text-muted-foreground">Цены носят информационный характер и не являются публичной офертой. Итоговая стоимость зависит от состояния пациента и согласуется до начала лечения.</p>
        </Section>

        <Section label="Этапы" title="Как это проходит">
          <ol className="grid gap-[7px] sm:grid-cols-2 lg:grid-cols-4">
            {s.stages.map((x, i) => (
              <li key={x.title} className={`rounded-xl p-5 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                <span className={`font-heading text-[2.2em] font-medium leading-none tracking-[-0.05em] ${i === 0 ? "" : "text-muted-foreground/50"}`}>{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-4 font-heading text-lg font-medium">{x.title}</p>
                <p className={`mt-1 text-sm ${i === 0 ? "text-primary-foreground/85" : "text-muted-foreground"}`}>{x.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section label="Вопросы" title="Частые вопросы">
          <Accordion type="single" collapsible className="max-w-[860px]">
            {s.faq.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`}>
                <AccordionTrigger className="text-left font-heading text-[1.1em] font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-[1em] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>

        <Section label="Другие услуги" title="Смотрите также">
          <div className="grid gap-[7px] sm:grid-cols-2 lg:grid-cols-4">
            {others.map((o) => (
              <Link key={o.slug} to={o.path} className="group flex flex-col rounded-xl bg-card p-5 hover:shadow-lg">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name={o.icon} size={18} /></span>
                <p className="mt-4 font-heading font-medium leading-tight group-hover:text-primary">{o.menu}</p>
                <p className="mt-1 text-sm text-muted-foreground">{o.hint}</p>
                <p className="mt-auto pt-3 text-sm font-medium">{o.from}</p>
              </Link>
            ))}
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
};

export default ServicePage;
