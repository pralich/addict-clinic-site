import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Reveal from "./Reveal";
import { PHONE_DISPLAY, PHONE_HREF } from "./contacts";

export const FAQ = [
  {
    q: "Действительно ли лечение анонимное?",
    a: "Да. Мы не ставим на учёт, не передаём данные в государственные органы и работодателю. Можно не называть настоящее имя и не показывать паспорт. Конфиденциальность закрепляется договором.",
  },
  {
    q: "Как быстро приедет врач?",
    a: "По Москве и области — в течение 40–60 минут после звонка, круглосуточно. Врач приезжает на машине без опознавательных знаков и в гражданской одежде.",
  },
  {
    q: "Что делать, если человек не хочет лечиться?",
    a: "Позвоните нам сами. Психолог бесплатно проконсультирует родственников, поможет подготовить разговор и подобрать мотивационную стратегию. Принудительного лечения мы не проводим.",
  },
  {
    q: "Сколько длится лечение?",
    a: "Детоксикация занимает от 1 до 5 дней, полный курс реабилитации — от 28 до 90 дней. Точный срок врач называет после диагностики, с учётом вещества, стажа и общего состояния.",
  },
  {
    q: "Сколько стоит лечение?",
    a: "Консультация по телефону бесплатная. Стоимость курса зависит от выбранных методов и формата. Мы фиксируем цену в договоре и не добавляем скрытых платежей.",
  },
  {
    q: "Можно ли лечиться, не прерывая работу?",
    a: "Да, есть амбулаторный формат: процедуры и сессии с психологом в удобное время, в том числе вечером и в выходные. Больничный при необходимости выдаём с нейтральной формулировкой.",
  },
];

const Faq = () => (
  <section
    id="faq"
    className="scroll-mt-16 border-y border-border/60 bg-secondary/70 py-20 md:py-28"
  >
    <div className="mx-auto max-w-[1280px] px-5 md:px-16">
      <Reveal className="relative overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-[0_1px_0_rgba(0,0,0,0.03),0_30px_60px_-40px_rgba(0,0,0,0.25)]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid lg:grid-cols-[0.9fr_1.4fr]">
          <div className="flex flex-col justify-between gap-10 border-b border-border/70 p-6 md:p-10 lg:border-b-0 lg:border-r">
            <div className="lg:sticky lg:top-24">
              <span className="flex items-center gap-[9px] text-[0.97em] font-medium tracking-tight text-muted-foreground">
                <i className="block h-2.5 w-2.5 rotate-45 bg-primary" />
                Вопросы и ответы
              </span>
              <h2
                className="mt-4 font-heading font-medium"
                style={{
                  fontSize: "clamp(30px, 4.2vw, 46px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.045em",
                }}
              >
                Отвечаем
                <br /> честно.
              </h2>
              <p className="mt-4 max-w-[340px] text-[1.03em] leading-[1.45] text-muted-foreground">
                Собрали то, о чём спрашивают чаще всего. Не нашли свой вопрос —
                задайте его анонимно.
              </p>
            </div>
            <div className="rounded-2xl bg-ink p-5 text-ink-foreground">
              <p className="flex items-center gap-2 text-[0.85em] text-white/60">
                <i className="live-dot block h-2 w-2 rounded-full bg-live" />
                Психолог на линии
              </p>
              <a
                href={PHONE_HREF}
                className="mt-2 block font-heading text-[1.5em] font-medium tracking-[-0.03em] hover:text-white/80"
              >
                {PHONE_DISPLAY}
              </a>
              <p className="mt-1 text-[0.85em] text-white/60">
                Анонимно и бесплатно, 24/7
              </p>
            </div>
          </div>

          <Accordion
            type="single"
            collapsible
            defaultValue="item-0"
            className="flex flex-col p-3 md:p-6"
          >
            {FAQ.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`item-${i}`}
                className="group rounded-2xl border-0 px-3 transition-colors data-[state=open]:bg-background md:px-5"
              >
                <AccordionTrigger className="gap-4 py-5 text-left font-heading text-[1.08em] font-semibold tracking-tight hover:no-underline">
                  <span className="flex items-start gap-4">
                    <span className="mt-0.5 w-6 shrink-0 font-sans text-[0.8em] font-medium tabular-nums text-muted-foreground transition-colors group-data-[state=open]:text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {f.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 pl-10 text-[0.98em] leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
                {i < FAQ.length - 1 && (
                  <div className="h-px bg-border/70 group-data-[state=open]:opacity-0" />
                )}
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Reveal>
    </div>
  </section>
);

export default Faq;
