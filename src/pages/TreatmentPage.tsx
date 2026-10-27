import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Header from "@/components/clinic/Header";
import Footer from "@/components/clinic/Footer";
import Doctors from "@/components/clinic/Doctors";
import TreatmentLeadForm from "@/components/treatment/TreatmentLeadForm";
import ArticleCard from "@/components/articles/ArticleCard";
import { PHONE_DISPLAY, PHONE_HREF } from "@/components/clinic/contacts";
import { fetchArticles } from "@/lib/articles";
import { getTreatment, ogImage, TREATMENTS, type Treatment } from "@/lib/treatments";
import { SITE_URL, useSeo } from "@/lib/seo";
import { CLINIC_ID, clinicNode, graph, logoNode, websiteNode, webPage } from "@/lib/schema";
import NotFound from "./NotFound";

const buildLd = (t: Treatment) =>
  graph(
    clinicNode,
    logoNode,
    websiteNode,
    webPage({
      type: ["MedicalWebPage", "WebPage"],
      path: t.path,
      name: t.h1,
      description: t.description,
      crumbs: [["Лечение", "/lechenie"], [t.h1, t.path]],
      extra: {
        primaryImageOfPage: { "@type": "ImageObject", url: t.image },
        about: { "@id": `${SITE_URL}${t.path}#condition` },
        mainEntity: { "@id": `${SITE_URL}${t.path}#condition` },
        specialty: "Psychiatric",
        medicalAudience: [{ "@type": "MedicalAudience", audienceType: "Patient" }, { "@type": "PeopleAudience", audienceType: "Родственники" }],
        lastReviewed: "2026-10-10",
        reviewedBy: { "@id": CLINIC_ID },
      },
    }),
    {
      "@type": "MedicalCondition",
      "@id": `${SITE_URL}${t.path}#condition`,
      name: t.condition,
      alternateName: t.alt,
      signOrSymptom: t.signs.map((s) => ({ "@type": "MedicalSignOrSymptom", name: s })),
      possibleTreatment: t.programs.map((p) => ({ "@type": "MedicalTherapy", name: p.name, description: p.text })),
      relevantSpecialty: "Psychiatric",
    },
    ...t.programs.map((p, i) => ({
      "@type": ["Service", "MedicalTherapy"],
      "@id": `${SITE_URL}${t.path}#program-${i + 1}`,
      name: `${p.name} — ${t.condition.toLowerCase()}`,
      description: p.text,
      provider: { "@id": CLINIC_ID },
      areaServed: { "@type": "City", name: "Москва" },
      relevantSpecialty: "Psychiatric",
    })),
    {
      "@type": "HowTo",
      name: `Этапы: ${t.h1.toLowerCase()}`,
      step: t.stages.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.text })),
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}${t.path}#faq`,
      mainEntity: t.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  );

const Section = ({ label, title, children, id }: { label: string; title: string; children: React.ReactNode; id?: string }) => (
  <section id={id} className="mx-auto max-w-site scroll-mt-20 px-5 py-14 md:px-16 md:py-20">
    <span className="flex items-center gap-[9px] text-[0.97em] font-medium tracking-tight text-muted-foreground"><i className="block h-2.5 w-2.5 rotate-45 bg-primary" />{label}</span>
    <h2 className="mb-8 mt-4 max-w-[760px] font-heading font-medium" style={{ fontSize: "clamp(28px, 3.6vw, 42px)", lineHeight: 1.1, letterSpacing: "-0.04em" }}>{title}</h2>
    {children}
  </section>
);

const TreatmentPage = () => {
  const { slug = "" } = useParams();
  const t = getTreatment(slug);
  const ld = useMemo(() => (t ? buildLd(t) : undefined), [t]);
  const { data } = useQuery({ queryKey: ["articles"], queryFn: () => fetchArticles(), enabled: !!t });
  const articles = useMemo(() => (data?.items ?? []).filter((a) => a.category === t?.category).slice(0, 3), [data, t]);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  useSeo({
    title: t?.title || "Страница не найдена — addict.clinic",
    description: t?.description || "",
    path: t?.path || `/lechenie/${slug}`,
    image: t ? ogImage(t) : undefined,
    noindex: !t,
    jsonLd: ld,
  });

  if (!t) return <NotFound />;
  const others = TREATMENTS.filter((x) => x.slug !== t.slug);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />
      <main>
        <section className="mx-auto max-w-site px-5 pb-10 pt-6 md:px-16 md:pb-16 md:pt-10">
          <nav aria-label="Хлебные крошки" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Главная</Link>
            <Icon name="ChevronRight" size={13} />
            <Link to="/lechenie" className="hover:text-foreground">Лечение</Link>
            <Icon name="ChevronRight" size={13} />
            <span className="text-foreground">{t.menu}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm">
                <i className="live-dot block h-2 w-2 rounded-full bg-live" />Анонимно · без учёта · 24/7
              </span>
              <h1 className="mt-5 font-heading font-medium" style={{ fontSize: "clamp(34px, 5.2vw, 64px)", lineHeight: 1.02, letterSpacing: "-0.05em" }}>{t.h1}</h1>
              <p className="mt-5 max-w-[640px] text-[1.12em] leading-relaxed text-muted-foreground">{t.lead}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href={PHONE_HREF} className="accent-glow inline-flex h-12 items-center gap-2.5 rounded-full bg-primary pl-2 pr-5 font-medium text-primary-foreground transition-transform hover:-translate-y-0.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"><Icon name="Phone" size={15} /></span>{PHONE_DISPLAY}
                </a>
                <a href="#form" className="inline-flex h-12 items-center gap-2 rounded-full border bg-card px-5 font-medium hover:border-foreground/30">
                  <Icon name="MessageCircle" size={16} />Анонимная заявка
                </a>
              </div>
              <div className="mt-9 grid grid-cols-3 gap-2">
                {t.facts.map((f) => (
                  <div key={f.label} className="rounded-xl bg-card p-4">
                    <p className="font-heading text-[1.5em] font-semibold leading-none tracking-tight md:text-[1.9em]">{f.value}</p>
                    <p className="mt-2 text-xs leading-snug text-muted-foreground md:text-sm">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="form" className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.3)] md:p-6">
              <p className="font-heading text-xl font-medium tracking-tight">Бесплатная консультация</p>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">Нарколог или психотерапевт ответит на вопросы и подберёт формат лечения</p>
              <TreatmentLeadForm topic={t.condition} form={`treatment_${t.slug}`} />
            </div>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl">
            <img src={t.image} alt={t.h1} className="aspect-[21/9] w-full object-cover" />
          </div>
        </section>

        <Section label="Признаки" title="Когда пора обратиться за помощью">
          <div className="grid gap-[7px] lg:grid-cols-[1.4fr_1fr]">
            <ul className="grid gap-[7px] sm:grid-cols-2">
              {t.signs.map((s) => (
                <li key={s} className="flex items-start gap-3 rounded-xl bg-card p-4">
                  <Icon name="CircleAlert" size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl bg-night p-6 text-night-foreground">
              <p className="flex items-center gap-2 font-heading text-lg font-medium"><Icon name="Siren" size={20} className="text-primary" />Звоните немедленно, если</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {t.urgent.map((u) => <li key={u} className="flex items-start gap-2.5 text-night-muted"><i className="mt-2 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{u}</li>)}
              </ul>
              <a href={PHONE_HREF} className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground"><Icon name="Phone" size={15} />{PHONE_DISPLAY}</a>
            </div>
          </div>
        </Section>

        <Section label="Программы" title="Подбираем формат под состояние человека">
          <div className="grid gap-[7px] md:grid-cols-3">
            {t.programs.map((p) => (
              <article key={p.name} className="flex flex-col rounded-xl bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon name={p.icon} size={22} /></span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{p.term}</span>
                </div>
                <h3 className="mt-5 font-heading text-[1.4em] font-medium tracking-tight">{p.name}</h3>
                <p className="mt-2 text-muted-foreground">{p.text}</p>
                <ul className="mt-5 flex flex-col gap-2 border-t pt-4 text-sm">
                  {p.points.map((x) => <li key={x} className="flex items-start gap-2"><Icon name="Check" size={15} className="mt-0.5 shrink-0 text-teal-a" />{x}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </Section>

        <Section label="Этапы" title="Как проходит лечение">
          <ol className="grid gap-[7px] sm:grid-cols-2 lg:grid-cols-3">
            {t.stages.map((s, i) => (
              <li key={s.title} className={`rounded-xl p-5 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                <span className={`font-heading text-[2.2em] font-medium leading-none tracking-[-0.05em] ${i === 0 ? "" : "text-muted-foreground/50"}`}>{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-4 font-heading text-lg font-medium">{s.title}</p>
                <p className={`mt-1 text-sm ${i === 0 ? "text-primary-foreground/85" : "text-muted-foreground"}`}>{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            {t.methods.map((m) => <span key={m} className="rounded-full border bg-card px-3.5 py-1.5 text-sm">{m}</span>)}
          </div>
        </Section>

        <section className="bg-night py-14 text-night-foreground md:py-16">
          <div className="mx-auto grid max-w-site gap-6 px-5 md:grid-cols-3 md:px-16">
            {[
              { icon: "ShieldCheck", title: "Полная анонимность", text: "Без паспорта, без постановки на учёт, без передачи данных." },
              { icon: "Clock", title: "Круглосуточно", text: "Отвечаем и выезжаем 24/7, включая праздники." },
              { icon: "HeartHandshake", title: "Поддержка семьи", text: "Бесплатный кабинет для близких с психологом." },
            ].map((x) => (
              <div key={x.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10"><Icon name={x.icon} size={20} /></span>
                <div><p className="font-heading text-lg font-medium">{x.title}</p><p className="mt-1 text-sm text-night-muted">{x.text}</p></div>
              </div>
            ))}
          </div>
        </section>

        <Doctors />

        <Section label="Вопросы" title="Частые вопросы" id="faq">
          <Accordion type="single" collapsible className="max-w-[860px]">
            {t.faq.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`}>
                <AccordionTrigger className="text-left font-heading text-[1.1em] font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-[1em] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>

        {articles.length > 0 && (
          <Section label="Статьи" title="Полезно почитать">
            <div className="grid gap-4 md:grid-cols-3">{articles.map((a) => <ArticleCard key={a.id} a={a} />)}</div>
          </Section>
        )}

        <Section label="Лечение" title="Другие направления">
          <div className="grid gap-[7px] sm:grid-cols-2 lg:grid-cols-4">
            {others.map((o) => (
              <Link key={o.slug} to={o.path} className="group flex items-center gap-3 rounded-xl bg-card p-4 transition-colors hover:bg-secondary">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground"><Icon name={o.icon} size={18} /></span>
                <span className="min-w-0 flex-1 font-medium leading-tight">{o.menu}</span>
                <Icon name="ArrowRight" size={15} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </Section>

        <section className="mx-auto max-w-site px-5 pb-20 md:px-16">
          <div className="flex flex-col items-start gap-5 rounded-2xl bg-primary p-7 text-primary-foreground md:flex-row md:items-center md:justify-between md:p-10">
            <div>
              <p className="font-heading text-[1.8em] font-medium leading-tight tracking-tight">Первый шаг — просто позвонить</p>
              <p className="mt-1 text-primary-foreground/85">Консультация бесплатная и анонимная. Ответим за 30 секунд.</p>
            </div>
            <a href={PHONE_HREF} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-white px-6 font-medium text-foreground"><Icon name="Phone" size={16} />{PHONE_DISPLAY}</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TreatmentPage;
