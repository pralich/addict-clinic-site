import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Reveal from "./Reveal";
import { PHONE_DISPLAY, PHONE_HREF } from "./contacts";

const ARTICLE = "/articles/rodstvennik-otricaet-problemu-ne-hochet-lechitsya";
const COVER = "https://cdn.poehali.dev/projects/1eb84f6e-14c3-4877-b42b-93b6450a03c2/files/4e8ff9fc-4d97-4e9b-aea8-f60030ad1fd8.jpg";

const PHRASES = ["«У меня всё под контролем»", "«Брошу, когда захочу»", "«Все так живут»"];

const POINTS = [
  { icon: "History", title: "Десятки лет опыта", text: "Знаем, как зависимость и её отрицание выглядят у разных поколений — от старшего до молодёжи." },
  { icon: "Users", title: "Мотивационная команда", text: "Квалифицированные психологи, которые работают именно с теми, кто «не хочет лечиться»." },
  { icon: "HeartHandshake", title: "Убеждение, а не давление", text: "Без обмана и скандалов: помогаем человеку самому принять решение о лечении." },
];

const Denial = () => (
  <section id="denial" className="mx-auto max-w-[1280px] scroll-mt-16 px-5 py-20 md:px-16 md:py-28">
    <Reveal className="overflow-hidden rounded-[10px] bg-ink text-ink-foreground">
      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col p-6 md:p-10">
          <p className="text-[0.85em] font-medium uppercase tracking-[0.12em] text-ink-foreground/60">Помощь родственникам</p>
          <h2 className="mt-4 font-heading text-[clamp(28px,4vw,46px)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Если родственник отрицает наличие проблемы и не хочет лечиться?
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {PHRASES.map((p) => (
              <span key={p} className="rounded-full border border-ink-foreground/20 px-3 py-1 text-[0.9em] text-ink-foreground/80">{p}</span>
            ))}
          </div>
          <p className="mt-5 max-w-[560px] text-[1.05em] leading-relaxed text-ink-foreground/75">
            Отрицание — не упрямство, а часть болезни. Специалисты addict.clinic работают в этой сфере десятки лет. Наша мотивационная команда психологов методом убеждения помогает близкому самому встать на путь выздоровления.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {POINTS.map((p) => (
              <div key={p.title}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Icon name={p.icon} size={17} /></span>
                <p className="mt-3 font-heading font-semibold">{p.title}</p>
                <p className="mt-1 text-[0.9em] leading-snug text-ink-foreground/65">{p.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5">
            <a href={PHONE_HREF} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground transition-transform hover:-translate-y-0.5">
              <Icon name="Phone" size={16} />
              {PHONE_DISPLAY}
            </a>
            <Link to={ARTICLE} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-foreground px-5 font-medium text-ink transition-transform hover:-translate-y-0.5">
              Читать статью
              <Icon name="ArrowRight" size={16} />
            </Link>
          </div>
          <p className="mt-3 text-[0.85em] text-ink-foreground/55">Консультация для родственников — бесплатно и анонимно</p>
        </div>

        <Link to={ARTICLE} className="group relative min-h-[260px] overflow-hidden">
          <img src={COVER} alt="Психолог беседует с мужчиной и его дочерью" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <p className="absolute bottom-5 left-5 right-5 font-heading text-[1.1em] font-medium leading-snug text-white">
            «Мы не тащим человека в клинику. Мы помогаем ему самому захотеть туда пойти».
          </p>
        </Link>
      </div>
    </Reveal>
  </section>
);

export default Denial;
