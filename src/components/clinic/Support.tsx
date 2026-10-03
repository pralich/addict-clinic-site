import Icon from "@/components/ui/icon";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";
import { PHONE_DISPLAY, PHONE_HREF } from "./contacts";

const CARDS = [
  { icon: "PhoneCall", title: "Горячая линия", text: "Звонок бесплатный. Психолог ответит за 30 секунд — днём и ночью." },
  { icon: "MessagesSquare", title: "Чат без имени", text: "Можно написать в мессенджер, не называя себя и не показывая номер." },
  { icon: "Users", title: "Помощь семье", text: "Подскажем, как говорить с близким и убедить его начать лечение." },
  { icon: "Siren", title: "Кризисная ситуация", text: "Острое состояние, срыв, угроза жизни — выезд бригады в течение часа." },
];

const Support = () => (
  <section id="support" className="mx-auto max-w-[1280px] scroll-mt-16 px-5 py-20 md:px-16 md:py-28">
    <SectionHead
      label="Психологическая служба"
      title={<>Своя служба психологов.<br className="hidden md:block" /> На связи круглосуточно.</>}
      text="Не нужно ждать утра или записи. Позвоните или напишите — профессиональный психолог поддержит и подскажет, что делать прямо сейчас."
    />

    <div className="grid gap-[7px] lg:grid-cols-[1.1fr_1fr]">
      <Reveal className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[10px] p-6 text-teal-foreground md:p-8"
      >
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "linear-gradient(150deg, hsl(var(--teal-a)), hsl(var(--teal-b)))" }}
        />
        <div className="absolute bottom-6 right-10 h-40 w-40 animate-drift rounded-full bg-card/60 blur-2xl" />
        <div className="absolute -bottom-10 right-40 h-52 w-52 animate-drift-slow rounded-full bg-teal-b blur-2xl" />
        <div className="relative z-10">
          <p className="flex items-center gap-2 text-[0.9em] font-medium">
            <i className="live-dot block h-2 w-2 rounded-full bg-live" />
            Сейчас на линии 6 специалистов
          </p>
          <p className="mt-6 font-heading text-[clamp(56px,9vw,104px)] font-medium leading-none tracking-[-0.06em]">24/7</p>
          <p className="mt-3 max-w-[360px] text-[1.07em] leading-snug">Без выходных и праздников. Среднее время ответа — 30 секунд.</p>
        </div>
        <div className="relative z-10 mt-8 flex flex-wrap gap-2.5">
          <a
            href={PHONE_HREF}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 font-medium text-ink-foreground transition-transform hover:-translate-y-0.5"
          >
            <Icon name="Phone" size={16} />
            {PHONE_DISPLAY}
          </a>
          <a
            href="#contacts"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-card/80 px-5 font-medium text-foreground transition-transform hover:-translate-y-0.5"
          >
            <Icon name="MessageCircle" size={16} />
            Написать анонимно
          </a>
        </div>
      </Reveal>

      <div className="grid gap-[7px] sm:grid-cols-2">
        {CARDS.map((c, i) => (
          <Reveal
            key={c.title}
            delay={i * 80}
            className="group rounded-[10px] bg-card p-5 transition-transform duration-300 hover:-translate-y-1"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon name={c.icon} size={19} />
            </span>
            <h3 className="mt-8 font-heading text-[1.2em] font-semibold tracking-tight">{c.title}</h3>
            <p className="mt-2 text-[0.95em] leading-snug text-muted-foreground">{c.text}</p>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default Support;
