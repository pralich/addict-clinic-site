import { Link } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import Reveal from "./Reveal";

const PILLARS = [
  {
    icon: "Sparkles",
    tag: "Инновационно",
    title: "ИИ-психолог, обученный нашими специалистами",
    text: "Репетируйте трудный разговор с близким, получайте разбор ошибок и готовый план — в любое время суток.",
  },
  {
    icon: "Gem",
    tag: "Уникально",
    title: "Один кабинет для всей поддержки семьи",
    text: "ИИ, живые психологи клиники, группы поддержки и вебинары с врачами — в одном месте и полностью анонимно.",
  },
  {
    icon: "Target",
    tag: "Действенно",
    title: "Методики, которые приводят к лечению",
    text: "Мотивационные стратегии и ведение семьи специалистом помогают близкому самому прийти к решению лечиться.",
  },
];

const FEATURES = [
  { icon: "MessageCircleHeart", text: "Вопросы психологу с ответом за 24 часа" },
  { icon: "CalendarHeart", text: "Группы поддержки и вебинары с врачами" },
  { icon: "ShieldPlus", text: "Экстренное консультирование 24/7" },
  { icon: "Lock", text: "Анонимно: без паспорта и настоящего имени" },
];

const FamilyCabinet = () => (
  <section id="cabinet" className="scroll-mt-16 bg-night py-20 text-night-foreground md:py-28">
    <div className="relative mx-auto max-w-site px-5 md:px-16">
      <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-primary/25 blur-[100px]" />

      <Reveal className="relative grid gap-6 lg:grid-cols-[1fr_380px] lg:items-end">
        <div>
          <span className="flex items-center gap-[9px] text-[0.97em] font-medium tracking-tight text-night-muted">
            <i className="block h-2.5 w-2.5 rotate-45 bg-primary" />
            Личный кабинет для близких
          </span>
          <h2
            className="mt-4 font-heading font-medium"
            style={{ fontSize: "clamp(30px, 4.2vw, 46px)", lineHeight: 1.08, letterSpacing: "-0.045em" }}
          >
            Помогите близкому —<br className="hidden md:block" /> и не потеряйте себя.
          </h2>
        </div>
        <p className="text-[1.07em] leading-[1.45] text-night-muted">
          Первое в России пространство, где семья зависимого получает поддержку ИИ и специалистов клиники одновременно.
        </p>
      </Reveal>

      <div className="relative mt-10 grid gap-[7px] md:grid-cols-3">
        {PILLARS.map((p, i) => (
          <Reveal
            key={p.tag}
            delay={i * 90}
            className="group flex flex-col rounded-[14px] border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.07]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Icon name={p.icon} size={20} />
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-night-foreground/80">{p.tag}</span>
            </div>
            <h3 className="mt-8 font-heading text-[1.25em] font-semibold leading-snug tracking-tight">{p.title}</h3>
            <p className="mt-2 text-[0.95em] leading-snug text-night-muted">{p.text}</p>
          </Reveal>
        ))}
      </div>

      <div className="relative mt-[7px] grid gap-[7px] lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="grid gap-x-6 gap-y-4 rounded-[14px] border border-white/10 bg-white/[0.04] p-6 sm:grid-cols-2 md:p-8">
          {FEATURES.map((f) => (
            <div key={f.text} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-night-foreground">
                <Icon name={f.icon} size={17} />
              </span>
              <span className="text-[0.97em] leading-snug">{f.text}</span>
            </div>
          ))}
        </Reveal>

        <Reveal delay={120} className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-[14px] bg-primary p-6 text-primary-foreground md:p-8">
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-52 w-52 rounded-full bg-white/20 blur-3xl" />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
              <Icon name="Gift" size={16} />
              Есть сомнения?
            </p>
            <p className="mt-3 font-heading text-[2.2em] font-semibold leading-none tracking-[-0.04em]">3 дня бесплатно</p>
            <p className="mt-3 text-[0.97em] leading-snug text-primary-foreground/85">
              Попробуйте все возможности кабинета без оплаты и решите, подходит ли он вашей семье.
            </p>
          </div>
          <Link
            to="/family"
            className="group relative inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 font-medium text-primary transition-transform hover:-translate-y-0.5"
          >
            Начать пробный период
            <Icon name="ArrowRight" size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </div>
  </section>
);

export default FamilyCabinet;
