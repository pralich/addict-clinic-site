import Icon from "@/components/ui/icon";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";

const ITEMS = [
  { icon: "UserX", title: "Без постановки на учёт", text: "Не передаём сведения в ПНД, наркодиспансер и другие государственные базы." },
  { icon: "FileLock2", title: "Договор о неразглашении", text: "Конфиденциальность закреплена юридически: врачебная тайна по ст. 13 ФЗ-323." },
  { icon: "VenetianMask", title: "Можно под псевдонимом", text: "Паспорт не обязателен. Лечение возможно под любым именем." },
  { icon: "Car", title: "Неприметный выезд", text: "Врач приезжает без формы и маркировки на машине, соседи ничего не узнают." },
  { icon: "BriefcaseMedical", title: "Без записей в больничном", text: "При необходимости выдаём документы с нейтральным диагнозом." },
  { icon: "ShieldCheck", title: "Лицензия Минздрава", text: "Медицинская лицензия на наркологию, психиатрию и психотерапию." },
];

const STATS = [
  { value: "14 лет", label: "работы центра" },
  { value: "9 400+", label: "пациентов в ремиссии" },
  { value: "0", label: "случаев разглашения" },
];

const Privacy = () => (
  <section id="privacy" className="mx-auto max-w-[1280px] scroll-mt-16 px-5 pb-20 md:px-16 md:pb-28">
    <SectionHead
      label="Конфиденциальность и гарантии"
      title={<>О лечении узнаете<br className="hidden md:block" /> только вы.</>}
      text="Анонимность — не обещание, а процесс: от того, как мы принимаем звонок, до того, как хранятся данные."
    />

    <div className="mb-[7px] grid grid-cols-1 gap-[7px] sm:grid-cols-3">
      {STATS.map((s, i) => (
        <Reveal key={s.label} delay={i * 80} className="rounded-[10px] bg-secondary p-6">
          <p className="font-heading text-[clamp(36px,4.5vw,52px)] font-medium leading-none tracking-[-0.05em]">
            {s.value}
          </p>
          <p className="mt-2 text-muted-foreground">{s.label}</p>
        </Reveal>
      ))}
    </div>

    <div className="grid gap-[7px] sm:grid-cols-2 lg:grid-cols-3">
      {ITEMS.map((it, i) => (
        <Reveal key={it.title} delay={i * 60} className="group flex gap-4 rounded-[10px] bg-card p-5 transition-shadow hover:shadow-[0_12px_30px_-12px_hsl(var(--foreground)/0.18)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name={it.icon} size={19} fallback="Shield" />
          </span>
          <div>
            <h3 className="font-heading text-[1.1em] font-semibold tracking-tight">{it.title}</h3>
            <p className="mt-1.5 text-[0.95em] leading-snug text-muted-foreground">{it.text}</p>
          </div>
        </Reveal>
      ))}
    </div>
  </section>
);

export default Privacy;
