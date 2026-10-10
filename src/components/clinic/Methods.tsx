import { useState } from "react";
import Icon from "@/components/ui/icon";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";
import Cross3D from "./Cross3D";

export const METHODS = [
  {
    icon: "Stethoscope",
    name: "Наркология",
    term: "от 1 дня",
    text: "Медицинская часть лечения: вывод из запоя, снятие ломки, детоксикация, восстановление органов. Работаем в стационаре и на выезде.",
    points: ["Капельницы и детокс", "Вывод из запоя на дому", "Кодирование", "Контроль состояния 24/7"],
  },
  {
    icon: "Brain",
    name: "Психология",
    term: "весь курс",
    text: "Работа с причинами зависимости: травмы, тревога, отношения. Индивидуальные и групповые сессии, семейная терапия.",
    points: ["КПТ и мотивационное интервью", "Группы поддержки", "Семейная терапия", "Кризисная помощь"],
  },
  {
    icon: "Sprout",
    name: "Реабилитация",
    term: "28–90 дней",
    text: "Программа восстановления в комфортном загородном центре: режим, терапия, трудотерапия, спорт и работа с ценностями.",
    points: ["Программа «12 шагов»", "Проживание и питание", "Личный куратор", "Постреабилитационный план"],
  },
  {
    icon: "Compass",
    name: "Абилитация",
    term: "индивидуально",
    text: "Для тех, у кого зависимость началась рано и не сложились навыки взрослой жизни: учимся планировать, общаться, работать.",
    points: ["Социальные навыки", "Профориентация", "Финансовая грамотность", "Сопровождение на 1 год"],
  },
  {
    icon: "Sparkles",
    name: "Инновационные методики",
    term: "по показаниям",
    text: "Современные доказательные подходы: транскраниальная стимуляция, биологическая обратная связь, нейропсихологическая коррекция.",
    points: ["ТМС-терапия", "Биообратная связь", "Нейрокоррекция", "Цифровой мониторинг ремиссии"],
  },
];

const Methods = () => {
  const [active, setActive] = useState(0);
  const m = METHODS[active];

  return (
    <section id="methods" className="scroll-mt-16 bg-night py-20 text-night-foreground md:py-28">
      <div className="mx-auto max-w-[1280px] px-5 md:px-16">
        <SectionHead
          dark
          label="Методы лечения"
          title={<>Пять направлений —<br className="hidden md:block" /> один план под человека.</>}
          text="Комбинируем методы в зависимости от стадии, вещества и состояния. План составляется на первой консультации и корректируется каждую неделю."
        />

        <div className="grid gap-[7px] lg:grid-cols-[340px_1fr]">
          <Reveal className="flex flex-col gap-[7px]">
            {METHODS.map((item, i) => (
              <button
                key={item.name}
                onClick={() => setActive(i)}
                className={`flex items-center justify-between rounded-[10px] px-5 py-4 text-left transition-all duration-300 ${
                  active === i ? "bg-primary text-primary-foreground accent-glow" : "bg-night-foreground/[0.06] hover:bg-night-foreground/[0.12]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="font-heading text-[0.85em] opacity-60">0{i + 1}</span>
                  <span className="font-heading text-[1.15em] font-semibold tracking-tight">{item.name}</span>
                </span>
                <Icon name="ArrowUpRight" size={16} className={active === i ? "" : "opacity-40"} />
              </button>
            ))}
          </Reveal>

          <Reveal delay={120} className="relative min-h-[380px] overflow-hidden rounded-[10px] bg-night-foreground/[0.06] p-6 md:p-10">
            <div key={active} className="animate-fade-in relative z-10 max-w-[520px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-night-foreground text-night">
                  <Icon name={m.icon} size={22} />
                </span>
                <span className="rounded-md bg-night-foreground/[0.16] px-2.5 py-[5px] text-[0.8em]">Срок: {m.term}</span>
              </div>
              <h3 className="mt-6 font-heading text-[2.2em] font-medium leading-[1.05] tracking-[-0.045em]">{m.name}</h3>
              <p className="mt-4 text-[1.07em] leading-[1.5] text-night-muted">{m.text}</p>
              <ul className="mt-7 grid gap-2 sm:grid-cols-2">
                {m.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2.5 rounded-lg bg-night-foreground/[0.06] px-3 py-2.5 text-[0.95em]">
                    <i className="block h-1.5 w-1.5 rotate-45 bg-primary" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pointer-events-none absolute bottom-6 right-10 hidden opacity-90 xl:block">
              <Cross3D size={120} />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default Methods;