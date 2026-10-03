import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchArticles } from "@/lib/articles";
import Icon from "@/components/ui/icon";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";

const PROBLEMS = [
  {
    icon: "Wine",
    name: "Алкоголизм",
    category: "alcohol",
    short: "Запои, абстиненция, потеря контроля",
    signs: ["Запои и тяжёлое похмелье", "Выпивка «для снятия стресса» каждый день", "Провалы в памяти", "Агрессия и тревога без алкоголя"],
    help: ["Вывод из запоя на дому за 1–3 часа", "Детоксикация и капельницы", "Кодирование и блокирующая терапия", "Реабилитация и психотерапия"],
  },
  {
    icon: "Syringe",
    name: "Наркомания",
    category: "drugs",
    short: "Опиаты, стимуляторы, соли, каннабис",
    signs: ["Резкая смена поведения и круга общения", "Пропажа денег и вещей", "Ломка, бессонница, паранойя", "Вспышки агрессии"],
    help: ["Купирование ломки под наблюдением", "Сверхбыстрая детоксикация", "Мотивационная работа с пациентом", "Стационарная реабилитация"],
  },
  {
    icon: "Pill",
    name: "Лекарственная зависимость",
    category: "meds",
    short: "Снотворные, транквилизаторы, обезболивающие",
    signs: ["Препараты без назначения или сверх дозы", "Невозможность уснуть без таблеток", "Поиск рецептов у разных врачей", "Заторможенность"],
    help: ["Плавная отмена по схеме врача", "Замещающая терапия", "Лечение тревоги и бессонницы", "Психологическое сопровождение"],
  },
  {
    icon: "Dices",
    name: "Игромания",
    category: "gambling",
    short: "Ставки, казино, онлайн-игры на деньги",
    signs: ["Долги и кредиты ради игры", "Попытки «отыграться»", "Ложь близким о деньгах", "Раздражительность без игры"],
    help: ["Когнитивно-поведенческая терапия", "Финансовые ограничения вместе с семьёй", "Групповая терапия", "Профилактика срывов"],
  },
  {
    icon: "HeartHandshake",
    name: "Созависимость",
    category: "codependency",
    short: "Помощь родственникам зависимых",
    signs: ["Жизнь вращается вокруг зависимого", "Постоянный контроль и тревога", "Чувство вины и бессилия", "Своя жизнь отложена"],
    help: ["Консультации для семьи", "Подготовка к разговору и мотивации", "Группы поддержки для близких", "Личная терапия"],
  },
  {
    icon: "Utensils",
    name: "Расстройства пищевого поведения",
    category: "eating",
    short: "Анорексия, булимия, компульсивное переедание",
    signs: ["Навязчивый контроль веса", "Приступы переедания и чистки", "Страх еды", "Резкие колебания веса"],
    help: ["Совместная работа психиатра и диетолога", "Психотерапия", "Восстановление режима питания", "Наблюдение после выписки"],
  },
  {
    icon: "Cigarette",
    name: "Никотин",
    category: "nicotine",
    short: "Сигареты, вейпы, снюс",
    signs: ["Больше пачки в день", "Безуспешные попытки бросить", "Кашель и одышка", "Раздражение без сигареты"],
    help: ["Медикаментозная поддержка", "Работа с привычкой и триггерами", "Поддержка психолога", "План на первые 30 дней"],
  },
  {
    icon: "Smartphone",
    name: "Интернет-зависимость",
    category: "internet",
    short: "Соцсети, игры, сериалы до утра",
    signs: ["Многие часы у экрана каждый день", "Нарушение сна", "Отказ от учёбы, работы, общения", "Тревога без телефона"],
    help: ["Диагностика сопутствующих расстройств", "Цифровая гигиена с психологом", "Семейная терапия для подростков", "Восстановление режима"],
  },
  {
    icon: "Brain",
    name: "Сопутствующие расстройства",
    category: "mental",
    short: "Депрессия, тревога, панические атаки",
    signs: ["Апатия и потеря интереса", "Панические атаки", "Мысли о самоповреждении", "Хроническая бессонница"],
    help: ["Консультация психиатра", "Подбор терапии", "Кризисная психологическая помощь 24/7", "Длительное сопровождение"],
  },
];

const Problems = () => {
  const [active, setActive] = useState(0);
  const p = PROBLEMS[active];
  const { data } = useQuery({ queryKey: ["articles"], queryFn: () => fetchArticles() });
  const related = useMemo(() => (data?.items ?? []).filter((a) => a.category === p.category), [data, p.category]);

  return (
    <section id="problems" className="mx-auto max-w-[1280px] scroll-mt-16 px-5 py-20 md:px-16 md:py-28">
      <SectionHead
        label="С чем помогаем"
        title={<>Все виды зависимостей —<br className="hidden md:block" /> в одном центре.</>}
        text="Выберите проблему, чтобы увидеть признаки и то, как мы с ней работаем. Каждого пациента ведёт команда: нарколог, психиатр, психолог."
      />

      <div className="grid gap-[7px] lg:grid-cols-[1fr_1.1fr]">
        <Reveal className="grid grid-cols-1 gap-[7px] sm:grid-cols-2">
          {PROBLEMS.map((item, i) => (
            <button
              key={item.name}
              onClick={() => setActive(i)}
              className={`group flex items-start gap-3 rounded-[10px] p-4 text-left transition-all duration-300 ${
                active === i
                  ? "bg-ink text-ink-foreground"
                  : "bg-secondary text-foreground hover:-translate-y-0.5 hover:bg-card"
              } ${i === PROBLEMS.length - 1 ? "sm:col-span-2" : ""}`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  active === i ? "bg-primary text-primary-foreground" : "bg-card text-primary"
                }`}
              >
                <Icon name={item.icon} size={18} />
              </span>
              <span>
                <span className="block font-heading text-[1.1em] font-semibold tracking-tight">{item.name}</span>
                <span className={`mt-0.5 block text-[0.88em] ${active === i ? "text-ink-foreground/60" : "text-muted-foreground"}`}>
                  {item.short}
                </span>
              </span>
            </button>
          ))}
        </Reveal>

        <Reveal delay={120} className="relative overflow-hidden rounded-[10px] bg-card p-6 md:p-8">
          <div key={active} className="animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground accent-glow">
                <Icon name={p.icon} size={24} />
              </span>
              <span className="rounded-md bg-secondary px-2.5 py-[5px] text-[0.8em]">
                {String(active + 1).padStart(2, "0")} / {String(PROBLEMS.length).padStart(2, "0")}
              </span>
            </div>
            <h3 className="mt-6 font-heading text-[2em] font-medium leading-[1.08] tracking-[-0.04em]">{p.name}</h3>

            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-3 text-[0.82em] font-medium uppercase tracking-[0.08em] text-muted-foreground">Тревожные признаки</p>
                <ul className="space-y-2.5">
                  {p.signs.map((s) => (
                    <li key={s} className="flex gap-2.5 leading-snug">
                      <Icon name="CircleAlert" size={16} className="mt-0.5 shrink-0 text-primary" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-[0.82em] font-medium uppercase tracking-[0.08em] text-muted-foreground">Как мы помогаем</p>
                <ul className="space-y-2.5">
                  {p.help.map((s) => (
                    <li key={s} className="flex gap-2.5 leading-snug">
                      <Icon name="CircleCheck" size={16} className="mt-0.5 shrink-0 text-teal-a" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {related.length > 0 && (
              <div className="mt-7 rounded-xl bg-secondary p-4">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[0.82em] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    <Icon name="BookOpen" size={14} className="text-primary" />
                    Статьи по теме
                  </p>
                  <Link
                    to={`/articles?category=${p.category}`}
                    className="group inline-flex shrink-0 items-center gap-1 text-[0.88em] font-medium text-foreground hover:text-primary"
                  >
                    Все статьи{related.length > 2 ? ` (${related.length})` : ""}
                    <Icon name="ArrowRight" size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <ul className="space-y-1">
                  {related.slice(0, 2).map((a) => (
                    <li key={a.id}>
                      <Link
                        to={`/articles/${a.slug}`}
                        className="group flex items-start gap-2 rounded-lg px-2 py-1.5 leading-snug transition-colors hover:bg-card"
                      >
                        <Icon name="FileText" size={15} className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                        <span className="group-hover:text-primary">{a.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <a
                href="#contacts"
                className="accent-glow inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-[0.94em] font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Анонимная консультация
                <Icon name="ArrowRight" size={15} />
              </a>
              <span className="text-[0.85em] text-muted-foreground">Ответим в течение 5 минут</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Problems;