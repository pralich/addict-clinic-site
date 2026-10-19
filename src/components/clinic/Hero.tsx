import Icon from "@/components/ui/icon";
import Cross3D from "./Cross3D";
import { PHONE_HREF } from "./contacts";

export const ADDICTIONS = [
  "Алкоголизм",
  "Наркомания",
  "Игромания",
  "Лекарственная зависимость",
  "Созависимость",
  "Расстройства пищевого поведения",
  "Никотин",
  "Интернет-зависимость",
];
const MARKS = ["◆", "◇", "●"];

const chips = [
  { label: "Реабилитация", cls: "left-[14px] top-[60px]", delay: "0s" },
  { label: "Наркология", cls: "right-[30px] top-[46px]", delay: "-1.2s" },
  { label: "Психология", cls: "right-[16px] top-[180px]", delay: "-2.4s" },
  { label: "Абилитация", cls: "left-[26px] top-[200px]", delay: "-3.1s" },
  { label: "Инновации", cls: "left-[150px] top-[290px]", delay: "-0.6s" },
];

const Hero = () => {
  return (
    <section id="top" className="mx-auto max-w-site overflow-hidden">
      {/* headline */}
      <div className="grid gap-8 px-5 pt-12 md:px-14 lg:grid-cols-[556px_330px] lg:gap-0 lg:pl-[206px] min-[1800px]:grid-cols-[640px_380px] min-[1800px]:pl-[260px] lg:pt-[68px] lg:min-h-[316px]">
        <h1
          className="animate-up font-heading font-medium text-foreground"
          style={{
            fontSize: "clamp(38px, 6vw, 59px)",
            lineHeight: 1.08,
            letterSpacing: "-0.045em",
            animationDelay: ".1s",
          }}
        >
          Анонимное лечение зависимостей в&nbsp;Москве
        </h1>
        <div className="animate-up pt-1.5" style={{ animationDelay: ".25s" }}>
          <p className="text-[1.12em] leading-[1.38] tracking-[-0.012em]">
            Наркологи, психологи и реабилитологи одной командой. Без учёта — и с вами на каждом этапе.
          </p>
          <div className="mt-[30px] flex flex-col items-start gap-2.5">
            <a
              href={PHONE_HREF}
              className="accent-glow inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 text-[0.94em] font-medium tracking-tight text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Icon name="Phone" size={16} />
              Срочная помощь 24/7
            </a>
            <a
              href="#contacts"
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-secondary px-[18px] text-[0.94em] font-medium tracking-tight text-foreground transition-transform hover:-translate-y-0.5"
            >
              <Icon name="Lock" size={15} className="text-primary" />
              Анонимная консультация
            </a>
          </div>
          <p className="mt-[22px] text-[0.78em] font-medium">Без постановки на учёт и передачи данных</p>
        </div>
      </div>

      {/* marquee */}
      <div className="marquee-mask mt-8 flex h-14 items-center overflow-hidden lg:mt-0" aria-label="С чем помогаем">
        <ul className="flex animate-marquee gap-[58px] whitespace-nowrap pl-5">
          {[...ADDICTIONS, ...ADDICTIONS].map((a, i) => (
            <li
              key={i}
              aria-hidden={i >= ADDICTIONS.length}
              className="flex items-center gap-2.5 font-heading text-[1.5em] font-medium tracking-[-0.03em] text-muted-foreground"
            >
              <span className="text-[0.6em]">{MARKS[i % 3]}</span>
              {a}
            </li>
          ))}
        </ul>
      </div>

      {/* bento */}
      <div className="mt-2 grid gap-[7px] px-3 pb-3 md:px-16 lg:h-[356px] lg:grid-cols-[1fr_281px_137px] min-[1800px]:h-[400px] min-[1800px]:grid-cols-[1fr_360px_240px]">
        <article
          className="animate-up relative min-h-[420px] overflow-hidden rounded-[10px] bg-gradient-to-r from-lavender to-rose px-4 pt-4 lg:min-h-0"
          style={{ animationDelay: ".35s", backgroundImage: "linear-gradient(110deg, hsl(var(--lavender)), hsl(var(--rose)))" }}
        >
          <div className="flex h-7 items-center justify-between">
            <span className="flex items-center gap-[9px] text-[0.97em] font-medium tracking-tight">
              <i className="block h-2.5 w-2.5 rotate-45 bg-current" />
              Методы
            </span>
            <span className="rounded-md bg-foreground/[0.09] px-2.5 py-[5px] text-[0.8em]">5 направлений</span>
          </div>
          <h2 className="relative z-10 mt-10 font-heading text-[2em] font-medium leading-[1.08] tracking-[-0.045em]">
            Не один метод —<br />весь набор.
          </h2>
          <p className="relative z-10 mt-4 max-w-[340px] text-[1.12em] leading-[1.38] tracking-[-0.012em]">
            Абилитация, реабилитация, наркология, психология и инновационные методики — под одного человека.
          </p>
          <a href="#methods" className="relative z-10 mt-5 inline-flex items-center gap-1.5 text-[0.94em] font-medium story-link">
            Подробнее о методах <Icon name="ArrowRight" size={14} />
          </a>
          <div className="relative mx-auto mt-2 h-[340px] w-[380px] max-w-full lg:absolute lg:right-0 lg:top-0 lg:mx-0 lg:mt-0 lg:h-full">
            <Cross3D size={140} className="absolute left-[120px] top-[76px]" />
            {chips.map((c) => (
              <span
                key={c.label}
                className={`chip-shadow absolute animate-float rounded-full bg-card px-3 py-[7px] text-[0.8em] font-medium text-foreground ${c.cls}`}
                style={{ animationDelay: c.delay }}
              >
                {c.label}
              </span>
            ))}
          </div>
        </article>

        <div className="grid grid-cols-[1.6fr_1fr] gap-[7px] lg:contents">
          <article
            className="animate-up relative overflow-hidden rounded-[10px] bg-night px-4 pb-5 pt-4 text-night-foreground"
            style={{ animationDelay: ".45s" }}
          >
            <div className="flex h-7 items-center justify-between gap-2">
              <span className="flex items-center gap-[9px] text-[0.97em] font-medium tracking-tight">
                <i className="block h-3 w-3 rotate-45 rounded-[3px] border-[1.6px] border-current" />
                Психологи
              </span>
              <span className="rounded-md bg-night-foreground/[0.16] px-2.5 py-[5px] text-[0.8em]">Своя служба</span>
            </div>
            <p className="mt-[42px] flex items-center gap-2 text-[0.82em] text-night-muted">
              <i className="live-dot block h-2 w-2 rounded-full bg-live" />
              На связи сейчас
            </p>
            <p className="mt-2.5 font-heading text-[4.6em] font-medium leading-none tracking-[-0.06em]">24/7</p>
            <p className="mt-2.5 text-[1.05em] tracking-tight text-night-muted">Поддержка на всех этапах</p>
          </article>

          <article
            className="animate-up relative overflow-hidden rounded-[10px] px-4 pt-4 text-teal-foreground"
            style={{ animationDelay: ".55s", backgroundImage: "linear-gradient(170deg, hsl(var(--teal-a)), hsl(var(--teal-b)))" }}
          >
            <div className="flex h-7 items-center">
              <span className="flex items-center gap-[9px] text-[0.97em] font-medium tracking-tight">
                <i className="block h-3 w-3 rotate-45 rounded-[3px] border-[1.6px] border-current" />
                Тайна
              </span>
            </div>
            <p className="relative z-10 mt-11 font-heading text-[1.3em] font-medium leading-[1.1] tracking-[-0.035em]">
              100% конфиден&shy;циально
            </p>
            <div className="absolute bottom-10 left-[30px] h-[70px] w-[70px] animate-drift rounded-full bg-card/75 blur-[14px]" />
            <div className="absolute -bottom-2.5 -left-5 h-[90px] w-[90px] animate-drift-slow rounded-full bg-teal-b blur-[14px]" />
          </article>
        </div>
      </div>
    </section>
  );
};

export default Hero;