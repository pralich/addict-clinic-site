import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";
import { PHONE_DISPLAY, PHONE_HREF } from "./contacts";

const CDN = "https://cdn.poehali.dev/projects/1eb84f6e-14c3-4877-b42b-93b6450a03c2/files";

const ARTICLES = [
  {
    slug: "kak-ponyat-chto-rebenok-upotreblyaet",
    tag: "Признаки",
    icon: "Eye",
    title: "Как определить, что ваш ребёнок употребляет",
    text: "Изменения в поведении, внешности и учёбе. Что искать дома и как начать разговор.",
    cover: `${CDN}/d423f856-d7ef-4cb7-962b-cef9106e203f.jpg`,
  },
  {
    slug: "reabilitatsiya-podrostkov-korvalol-i-energetiki",
    tag: "Новый тренд",
    icon: "Pill",
    title: "Корвалол с энергетиком: опасный «коктейль» школьников",
    text: "Чем опасен фенобарбитал в сочетании с энергетиком и как проходит реабилитация подростков.",
    cover: `${CDN}/91e921a8-72c4-4c92-b3ab-77c3e0e52231.jpg`,
  },
  {
    slug: "sniffing-sredi-podrostkov",
    tag: "Смертельно опасно",
    icon: "Wind",
    title: "Сниффинг: почему вдыхание газа может убить с первого раза",
    text: "Газ, аэрозоли, клей. Признаки токсикомании и что делать, если застали ребёнка.",
    cover: `${CDN}/7a767403-4a0a-4dab-9b49-50d20b21b04b.jpg`,
  },
];

const Teens = () => (
  <section id="teens" className="mx-auto max-w-site scroll-mt-16 px-5 py-20 md:px-16 md:py-28">
    <SectionHead
      label="Помощь подросткам"
      title={<>Подросток в беде?<br className="hidden md:block" /> Заметить рано — значит помочь быстро.</>}
      text="У подростков зависимость формируется быстрее, чем у взрослых. Рассказываем родителям о новых опасных трендах и признаках, которые нельзя пропустить."
    />

    <div className="grid gap-[7px] md:grid-cols-3">
      {ARTICLES.map((a, i) => (
        <Reveal key={a.slug} delay={i * 80}>
          <Link
            to={`/articles/${a.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-[10px] bg-card transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img src={a.cover} alt={a.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 text-[0.8em] font-medium text-foreground backdrop-blur">
                <Icon name={a.icon} size={13} className="text-primary" />
                {a.tag}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="font-heading text-[1.15em] font-semibold leading-snug tracking-tight">{a.title}</h3>
              <p className="mt-2 flex-1 text-[0.95em] leading-snug text-muted-foreground">{a.text}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[0.95em] font-medium text-primary">
                Читать статью
                <Icon name="ArrowRight" size={15} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>

    <Reveal className="mt-[7px] flex flex-col gap-4 rounded-[10px] bg-secondary p-5 md:flex-row md:items-center md:justify-between md:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Icon name="ShieldCheck" size={19} />
        </span>
        <div>
          <p className="font-heading font-semibold text-foreground">Анонимная консультация для родителей</p>
          <p className="mt-1 text-[0.95em] text-muted-foreground">Бесплатно, без постановки на учёт. Ребёнок не узнает о звонке.</p>
        </div>
      </div>
      <a
        href={PHONE_HREF}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
      >
        <Icon name="Phone" size={16} />
        {PHONE_DISPLAY}
      </a>
    </Reveal>
  </section>
);

export default Teens;
