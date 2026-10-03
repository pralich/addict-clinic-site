import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";

export const FAQ = [
  { q: "Действительно ли лечение анонимное?", a: "Да. Мы не ставим на учёт, не передаём данные в государственные органы и работодателю. Можно не называть настоящее имя и не показывать паспорт. Конфиденциальность закрепляется договором." },
  { q: "Как быстро приедет врач?", a: "По Москве и области — в течение 40–60 минут после звонка, круглосуточно. Врач приезжает на машине без опознавательных знаков и в гражданской одежде." },
  { q: "Что делать, если человек не хочет лечиться?", a: "Позвоните нам сами. Психолог бесплатно проконсультирует родственников, поможет подготовить разговор и подобрать мотивационную стратегию. Принудительного лечения мы не проводим." },
  { q: "Сколько длится лечение?", a: "Детоксикация занимает от 1 до 5 дней, полный курс реабилитации — от 28 до 90 дней. Точный срок врач называет после диагностики, с учётом вещества, стажа и общего состояния." },
  { q: "Сколько стоит лечение?", a: "Консультация по телефону бесплатная. Стоимость курса зависит от выбранных методов и формата. Мы фиксируем цену в договоре и не добавляем скрытых платежей." },
  { q: "Можно ли лечиться, не прерывая работу?", a: "Да, есть амбулаторный формат: процедуры и сессии с психологом в удобное время, в том числе вечером и в выходные. Больничный при необходимости выдаём с нейтральной формулировкой." },
];

const Faq = () => (
  <section id="faq" className="mx-auto max-w-[1280px] scroll-mt-16 px-5 pb-20 md:px-16 md:pb-28">
    <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
      <SectionHead
        label="Вопросы и ответы"
        title={<>Отвечаем<br /> честно.</>}
        text="Не нашли свой вопрос? Задайте его анонимно по телефону — психолог ответит сразу."
      />
      <Reveal delay={100}>
        <Accordion type="single" collapsible defaultValue="item-0" className="flex flex-col gap-[7px]">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`} className="rounded-[10px] border-0 bg-card px-5">
              <AccordionTrigger className="text-left font-heading text-[1.1em] font-semibold tracking-tight hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-[0.98em] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </div>
  </section>
);

export default Faq;
