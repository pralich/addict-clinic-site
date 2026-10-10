import Icon from "@/components/ui/icon";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";

export const STEPS = [
  { icon: "Phone", title: "Звонок или заявка", text: "Звоните или оставляете анонимную заявку. Имя и паспорт не нужны.", time: "1 минута" },
  { icon: "Headset", title: "Консультация", text: "Врач уточняет состояние и предлагает формат: выезд, амбулаторно или стационар.", time: "10–15 минут" },
  { icon: "Ambulance", title: "Выезд или приём", text: "Бригада приезжает в течение часа или вас встречают в клинике.", time: "от 40 минут" },
  { icon: "ClipboardList", title: "План лечения", text: "Детокс, диагностика и индивидуальная программа на весь курс.", time: "в первый день" },
  { icon: "HeartPulse", title: "Сопровождение", text: "Психолог на связи после выписки — год поддержки ремиссии.", time: "до 12 месяцев" },
];

const Steps = () => (
  <section id="steps" className="mx-auto max-w-[1280px] scroll-mt-16 px-5 py-20 md:px-16 md:py-28">
    <SectionHead
      label="Как проходит обращение"
      title={<>Пять шагов<br className="hidden md:block" /> от звонка до ремиссии.</>}
      text="Первый шаг самый сложный. Мы сделали его максимально простым: один звонок — и дальше вас ведут специалисты."
    />
    <div className="relative grid gap-[7px] md:grid-cols-5">
      {STEPS.map((s, i) => (
        <Reveal
          key={s.title}
          delay={i * 90}
          className={`relative flex flex-col rounded-[10px] p-5 ${i === 0 ? "bg-primary text-primary-foreground accent-glow" : "bg-card"}`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-heading text-[2.4em] font-medium leading-none tracking-[-0.05em] ${i === 0 ? "" : "text-muted-foreground/50"}`}>
              0{i + 1}
            </span>
            <Icon name={s.icon} size={20} className={i === 0 ? "" : "text-primary"} fallback="Circle" />
          </div>
          <h3 className="mt-10 font-heading text-[1.15em] font-semibold tracking-tight">{s.title}</h3>
          <p className={`mt-2 flex-1 text-[0.93em] leading-snug ${i === 0 ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {s.text}
          </p>
          <span
            className={`mt-5 inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.8em] ${
              i === 0 ? "bg-primary-foreground/20" : "bg-secondary"
            }`}
          >
            <Icon name="Clock" size={12} />
            {s.time}
          </span>
        </Reveal>
      ))}
    </div>
  </section>
);

export default Steps;
